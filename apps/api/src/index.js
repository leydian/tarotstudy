import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { cards, getCardById, buildCardDescriptions } from './data/cards.js';
import { courses, lessonsByCourse, getCourseById, getLessonById } from './data/courses.js';
import { spreads } from './data/spreads.js';
import { buildCardExplanation, buildSpreadReading, chooseReadingExperimentVariant } from './content.js';
import { makeExternalGenerator, makeSpreadReadingEnhancer } from './external-ai.js';
import { TTLCache } from './cache.js';
import { generateQuiz, gradeQuiz } from './quiz.js';
import { createTelemetryStore } from './telemetry.js';
import { createProgressStore } from './progress-store.js';
import { buildLearningKpi } from './learning-kpi.js';
import { buildLearningFunnel, buildNextActions, buildReviewInbox } from './learning-read-models.js';
import {
  buildReadingModel,
  deriveReadingV3FromModel,
  deriveTonePayloadFromModel
} from './reading-model-builder.js';
import { loadPersonaPolicy } from './persona-policy-loader.js';
import {
  getTarotPredictedQuestions,
  getTarotPredictedQuestionsByTopic
} from './data/question-intents.js';
import {
  analyzeQuestionContext,
  analyzeQuestionContextSync,
  analyzeQuestionContextV2,
  analyzeQuestionContextV2Sync
} from './question-understanding/index.js';
import { registerSpreadsV3Routes } from './routes/spreads-v3.routes.js';

// Refactored Imports
import { buildReadingV2 } from './domains/reading/v2.js';
import { buildReadingV3 } from './domains/reading/v3.js';
import { tryEnhanceReadingV3Bridge } from './domains/reading/enhancer.js';
import { summarizeSpread, summarizeSpreadForQa } from './domains/summaries/aggregator.js';
import { buildSpreadCatalog } from './domains/spreads/catalog.js';
import { makeDrawEngine } from './domains/spreads/draw-engine.js';
import { runImageHealthCheck } from './domains/common/health.js';

dotenv.config();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const readingToneMode = String(process.env.READING_TONE_MODE || 'conversational').toLowerCase().trim();
const personaPolicy = loadPersonaPolicy();
const expectedToneMode = String(personaPolicy.toneMode || '').toLowerCase().trim();
if (expectedToneMode && expectedToneMode !== readingToneMode) {
  throw new Error(
    `persona-onepager policy violation: READING_TONE_MODE(${readingToneMode}) must match policy tone mode(${expectedToneMode})`
  );
}

const cache = new TTLCache(Number(process.env.CACHE_TTL_SECONDS || 86400));
const externalGenerator = makeExternalGenerator(process.env);
const spreadReadingEnhancer = makeSpreadReadingEnhancer(process.env);
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 8000); // Optimized timeout
const telemetryStore = createTelemetryStore({
  filePath: process.env.TELEMETRY_STORE_PATH
});
const progressStore = createProgressStore({
  filePath: process.env.PROGRESS_STORE_PATH
});
let imageHealthSnapshot = null;
const TARGET_SPREAD_COUNT = 100;
const spreadCatalog = buildSpreadCatalog(spreads, TARGET_SPREAD_COUNT);
const performSpreadDraw = makeDrawEngine({
  spreadCatalog,
  progressStore,
  telemetryStore,
  personaPolicy
});
const allowedOrigins = (process.env.CORS_ORIGIN
  || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'), false);
  }
});

await app.register(compress, { global: true });

app.get('/api/health', async () => ({ ok: true }));
app.get('/api/spreads', async () => spreadCatalog);
app.get('/api/questions/predicted', async (request) => {
  const rawLimit = Number(request.query?.limit || 100000);
  const safeLimit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200000, Math.floor(rawLimit))) : 100000;
  const questions = getTarotPredictedQuestions();
  return {
    total: questions.length,
    returned: Math.min(questions.length, safeLimit),
    questions: questions.slice(0, safeLimit),
    byTopic: getTarotPredictedQuestionsByTopic()
  };
});
app.post('/api/question-understanding', async (request, reply) => {
  const text = String(request.body?.text || '').trim();
  if (!text) {
    reply.code(400);
    return { message: 'text is required' };
  }

  const mode = String(request.body?.mode || process.env.QUESTION_UNDERSTANDING_MODE || 'hybrid');
  if (mode === 'hybrid') {
    return analyzeQuestionContext(text, { mode, flag: true });
  }
  return analyzeQuestionContextSync(text, { mode, flag: true });
});
app.post('/api/v2/question-understanding', async (request, reply) => {
  const text = String(request.body?.text || '').trim();
  if (!text) {
    reply.code(400);
    return { message: 'text is required' };
  }

  const mode = String(request.body?.mode || process.env.QUESTION_UNDERSTANDING_MODE || 'hybrid');
  const payload = mode === 'hybrid'
    ? await analyzeQuestionContextV2(text, { mode, flag: true })
    : analyzeQuestionContextV2Sync(text, { mode, flag: true });
  return {
    ok: true,
    analysis: payload
  };
});
app.get('/api/telemetry/image-fallback', async () => telemetryStore.getImageFallbackStats());
app.get('/api/telemetry/spread-events', async () => telemetryStore.getSpreadTelemetryStats());
app.get('/api/analytics/learning-kpi', async () =>
  buildLearningKpi({
    progressRows: progressStore.listAllProgress(),
    courses,
    lessonsByCourse,
    spreadTelemetryStats: telemetryStore.getSpreadTelemetryStats()
  })
);
app.get('/api/analytics/funnel', async (request) =>
  buildLearningFunnel({
    progressRows: progressStore.listAllProgress(),
    window: request.query?.window === '30d' ? '30d' : '7d'
  })
);

app.get('/api/learning/next-actions', async (request, reply) => {
  const userId = String(request.query?.userId || '').trim();
  if (!userId) {
    reply.code(400);
    return { message: 'userId query is required' };
  }

  const snapshot = progressStore.getUserProgress(userId);
  return buildNextActions({
    userId,
    snapshot,
    courses,
    lessonsByCourse
  });
});

app.get('/api/reviews/inbox', async (request, reply) => {
  const userId = String(request.query?.userId || '').trim();
  if (!userId) {
    reply.code(400);
    return { message: 'userId query is required' };
  }

  const snapshot = progressStore.getUserProgress(userId);
  return buildReviewInbox({
    snapshot,
    spreadId: String(request.query?.spreadId || ''),
    limit: Number(request.query?.limit || 20)
  });
});

app.get('/api/progress/:userId', async (request, reply) => {
  const { userId } = request.params;
  if (!String(userId || '').trim()) {
    reply.code(400);
    return { message: 'userId is required' };
  }
  return progressStore.getUserProgress(userId);
});

app.post('/api/progress/:userId/sync', async (request, reply) => {
  const { userId } = request.params;
  const snapshot = request.body || {};
  if (!String(userId || '').trim()) {
    reply.code(400);
    return { message: 'userId is required' };
  }
  try {
    const saved = progressStore.syncUserProgress(userId, snapshot);
    return { ok: true, userId, snapshot: saved };
  } catch (error) {
    reply.code(400);
    return { message: error instanceof Error ? error.message : 'sync failed' };
  }
});

app.post('/api/telemetry/image-fallback', async (request, reply) => {
  const { stage = 'unknown', cardId = 'unknown', source = '' } = request.body || {};
  if (typeof stage !== 'string') {
    reply.code(400);
    return { message: 'stage is required' };
  }

  telemetryStore.recordImageFallbackEvent({
    stage,
    cardId,
    source
  });
  return { ok: true };
});

app.post('/api/telemetry/spread-events', async (request, reply) => {
  const {
    type = 'unknown',
    spreadId = 'unknown',
    level = 'unknown',
    context = ''
  } = request.body || {};

  if (!['spread_drawn', 'spread_review_saved'].includes(String(type))) {
    reply.code(400);
    return { message: 'type must be spread_drawn or spread_review_saved' };
  }

  telemetryStore.recordSpreadEvent({
    type,
    spreadId,
    level,
    context
  });
  return { ok: true };
});

app.post('/api/events/batch', async (request, reply) => {
  const events = Array.isArray(request.body?.events) ? request.body.events : [];
  if (!events.length) {
    reply.code(400);
    return { message: 'events[] is required' };
  }

  let accepted = 0;
  let rejected = 0;
  for (const event of events.slice(0, 200)) {
    const type = String(event?.type || '');
    if (!type) {
      rejected += 1;
      continue;
    }

    if (type === 'spread_drawn' || type === 'spread_review_saved') {
      telemetryStore.recordSpreadEvent({
        type,
        spreadId: String(event?.spreadId || 'unknown'),
        level: String(event?.level || 'unknown'),
        context: String(event?.context || '')
      });
      accepted += 1;
      continue;
    }

    if (type === 'image_fallback') {
      telemetryStore.recordImageFallbackEvent({
        stage: String(event?.stage || event?.metadata?.stage || 'unknown'),
        cardId: String(event?.cardId || event?.metadata?.cardId || 'unknown'),
        source: String(event?.source || event?.metadata?.source || '')
      });
      accepted += 1;
      continue;
    }

    telemetryStore.recordAppEvent({
      type,
      path: String(event?.path || event?.metadata?.path || ''),
      userId: String(event?.userId || ''),
      context: String(event?.context || '')
    });
    accepted += 1;
  }

  return {
    ok: true,
    accepted,
    rejected
  };
});

app.get('/api/images/health-check', async () => {
  imageHealthSnapshot = await runImageHealthCheck();
  return imageHealthSnapshot;
});

app.get('/api/images/alerts', async (request) => {
  const failRateThreshold = Number(request.query?.failRateThreshold || 20);
  const minChecks = Number(request.query?.minChecks || 6);
  const health = imageHealthSnapshot ?? await runImageHealthCheck();
  imageHealthSnapshot = health;
  const failRate = health.summary.total > 0 ? (health.summary.fail / health.summary.total) * 100 : 0;
  const imageFallbackStats = telemetryStore.getImageFallbackStats();
  const fallbackRate = imageFallbackStats.totalEvents > 0
    ? ((imageFallbackStats.byStage.fallback_svg_used || 0) / imageFallbackStats.totalEvents) * 100
    : 0;
  const alert = health.summary.total >= minChecks && failRate >= failRateThreshold;

  if (alert) {
    app.log.warn({
      msg: 'Image source health alert',
      failRatePercent: Number(failRate.toFixed(1)),
      fallbackRatePercent: Number(fallbackRate.toFixed(1)),
      threshold: failRateThreshold
    });
  }

  return {
    alert,
    evaluatedAt: new Date().toISOString(),
    metrics: {
      totalChecks: health.summary.total,
      failChecks: health.summary.fail,
      failRatePercent: Number(failRate.toFixed(1)),
      fallbackRatePercent: Number(fallbackRate.toFixed(1))
    },
    threshold: { failRateThreshold, minChecks }
  };
});

app.post('/api/cards/:cardId/explain', async (request, reply) => {
  const { cardId } = request.params;
  const { level = 'beginner', context = '' } = request.body || {};

  const explanation = await buildCardExplanation({
    cardId,
    level,
    context,
    cache,
    externalGenerator
  });

  if (!explanation) {
    reply.code(404);
    return { message: 'Card not found' };
  }

  return explanation;
});

app.post('/api/quiz/generate', async (request, reply) => {
  const {
    lessonId,
    level = 'beginner',
    count = 5,
    quizMode = 'guided',
    recentAccuracy = null
  } = request.body || {};
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    reply.code(404);
    return { message: 'Lesson not found' };
  }

  const lessonCards = lesson.cardIds.map((cardId) => getCardById(cardId)).filter(Boolean);
  const generated = generateQuiz({
    lessonCards,
    lessonMeta: {
      lessonId: lesson.id,
      title: lesson.title,
      summary: lesson.summary
    },
    level,
    count: Number(count) || 5,
    quizMode,
    recentAccuracy
  });

  return {
    lessonId,
    level,
    quizMode: generated.policy.quizMode,
    policy: generated.policy,
    questions: generated.questions
  };
});

app.post('/api/quiz/grade', async (request, reply) => {
  const { questions, answers } = request.body || {};

  if (!Array.isArray(questions) || typeof answers !== 'object' || !answers) {
    reply.code(400);
    return { message: 'questions array and answers object are required' };
  }

  return gradeQuiz({ questions, answers });
});

app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({ message: 'Not found' });
});

const shouldStartApiServer = process.env.START_API_SERVER !== 'false';
if (shouldStartApiServer) {
  app.listen({ port, host }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

// Re-export for testing
export { summarizeSpread, summarizeSpreadForQa };

export function buildReadingV3ForQa(payload = {}) {
  const rawReadingV3 = buildReadingV3(payload);
  const readingModel = buildReadingModel({
    spreadId: payload.spreadId || '',
    items: Array.isArray(payload.items) ? payload.items : [],
    context: String(payload.context || ''),
    summary: String(payload.summary || ''),
    readingV3: rawReadingV3
  });
  return deriveReadingV3FromModel(readingModel) || rawReadingV3;
}

function pickRandomCards(deck, count) {
  const pool = [...deck];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
