import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { cards, getCardById, buildCardDescriptions } from './data/cards.js';
import { courses, lessonsByCourse, getCourseById, getLessonById } from './data/courses.js';
import { spreads } from './data/spreads.js';
import { buildCardExplanation, buildSpreadReading, chooseReadingExperimentVariant } from './content.js';
import { makeExternalGenerator } from './external-ai.js';
import { TTLCache } from './cache.js';
import { generateQuiz, gradeQuiz } from './quiz.js';
import { createTelemetryStore } from './telemetry.js';
import { createProgressStore } from './progress-store.js';
import { buildLearningKpi } from './learning-kpi.js';
import { buildLearningFunnel, buildNextActions, buildReviewInbox } from './learning-read-models.js';
import {
  getTarotPredictedQuestions,
  getTarotPredictedQuestionsByTopic
} from './data/question-intents.js';
import {
  analyzeQuestionContext,
  analyzeQuestionContextSync,
  analyzeQuestionContextV2,
  analyzeQuestionContextV2Sync,
  parseChoiceOptions as parseChoiceOptionsEnhanced
} from './question-understanding/index.js';
import { inferShortUtterance } from './question-understanding/short-utterance-rules.js';

dotenv.config();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const cache = new TTLCache(Number(process.env.CACHE_TTL_SECONDS || 86400));
const externalGenerator = makeExternalGenerator(process.env);
const telemetryStore = createTelemetryStore({
  filePath: process.env.TELEMETRY_STORE_PATH
});
const progressStore = createProgressStore({
  filePath: process.env.PROGRESS_STORE_PATH
});
let imageHealthSnapshot = null;
const allowedOrigins = (process.env.CORS_ORIGIN
  || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow non-browser tools (no Origin header) and configured browser origins.
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'), false);
  }
});

app.get('/api/health', async () => ({ ok: true }));
app.get('/api/spreads', async () => spreads);
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

function performSpreadDraw({ spreadId, variantId = '', level = 'beginner', context = '', experimentVariant }) {
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) {
    return { error: { status: 404, message: 'Spread not found' } };
  }

  const variant = spread.variants?.find((item) => item.id === variantId) ?? null;
  const positions = variant?.positions ?? spread.positions;
  if (!positions?.length) {
    return { error: { status: 400, message: 'Spread positions are not configured' } };
  }
  if (positions.length > cards.length) {
    return { error: { status: 400, message: 'Requested draw exceeds deck size' } };
  }

  const forcedExperiment = experimentVariant === 'A' || experimentVariant === 'B' ? experimentVariant : null;
  const readingExperiment = forcedExperiment
    ?? chooseReadingExperimentVariant(`${spread.id}:${level}:${context}:${new Date().toISOString().slice(0, 13)}`);
  const drawnCards = pickRandomCards(cards, positions.length);
  const items = positions.map((position, index) => {
    const card = drawnCards[index];
    const orientation = Math.random() < 0.3 ? 'reversed' : 'upright';
    const reading = buildSpreadReading({
      card,
      spreadId: spread.id,
      position,
      orientation,
      level,
      context,
      experimentVariant: readingExperiment
    });
    return {
      position,
      orientation,
      card: {
        id: card.id,
        name: card.name,
        nameKo: card.nameKo,
        imageUrl: card.imageUrl,
        imageSources: card.imageSources,
        imageAttribution: card.imageAttribution,
        keywords: card.keywords
      },
      interpretation: reading.interpretation,
      coreMessage: reading.coreMessage,
      learningPoint: reading.learningPoint
    };
  });

  const summary = summarizeSpread({
    spreadId: spread.id,
    spreadName: spread.name,
    items,
    context,
    level
  });

  return {
    spreadId: spread.id,
    spreadName: spread.name,
    variantId: variant?.id ?? null,
    variantName: variant?.name ?? null,
    level,
    context,
    readingExperiment,
    drawnAt: new Date().toISOString(),
    items,
    summary
  };
}

app.post('/api/spreads/:spreadId/draw', async (request, reply) => {
  const { spreadId } = request.params;
  const { variantId = '', level = 'beginner', context = '', experimentVariant } = request.body || {};
  const payload = performSpreadDraw({ spreadId, variantId, level, context, experimentVariant });
  if (payload?.error) {
    reply.code(payload.error.status);
    return { message: payload.error.message };
  }
  return payload;
});

app.post('/api/v2/spreads/:spreadId/draw', async (request, reply) => {
  const { spreadId } = request.params;
  const { variantId = '', level = 'beginner', context = '', experimentVariant, styleMode = '' } = request.body || {};
  const payload = performSpreadDraw({ spreadId, variantId, level, context, experimentVariant });
  if (payload?.error) {
    reply.code(payload.error.status);
    return { message: payload.error.message };
  }

  const renderingMode = String(styleMode || process.env.READING_STYLE_MODE || 'immersive_safe').toLowerCase();
  return {
    ...payload,
    readingV2: buildReadingV2({
      spreadId: payload.spreadId,
      spreadName: payload.spreadName,
      items: payload.items,
      summary: payload.summary,
      context: payload.context,
      level: payload.level,
      renderingMode
    })
  };
});

app.get('/api/courses', async () => {
  const ordered = [...courses].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return ordered.map((course, index) => ({
    ...course,
    lessonCount: lessonsByCourse[course.id]?.length ?? 0,
    lessonOutline: (lessonsByCourse[course.id] || []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title
    })),
    nextCourseId: ordered[index + 1]?.id ?? null
  }));
});

app.get('/api/courses/:courseId/lessons', async (request, reply) => {
  const { courseId } = request.params;
  const course = getCourseById(courseId);
  if (!course) {
    reply.code(404);
    return { message: 'Course not found' };
  }

  return (lessonsByCourse[courseId] || []).map((lesson) => ({
    ...lesson,
    cards: lesson.cardIds
      .map((cardId) => getCardById(cardId))
      .filter(Boolean)
      .map((card) => ({ id: card.id, name: card.name, nameKo: card.nameKo, arcana: card.arcana, suit: card.suit }))
  }));
});

app.get('/api/cards', async (request) => {
  const { arcana, suit, difficulty, q, context = '' } = request.query;

  return cards.filter((card) => {
    if (arcana && card.arcana !== arcana) return false;
    if (suit && card.suit !== suit) return false;
    if (difficulty && card.difficulty !== difficulty) return false;
    if (q) {
      const keyword = String(q).toLowerCase();
      const hay = `${card.name} ${card.nameKo} ${(card.keywords || []).join(' ')}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  }).map((card) => ({
    ...card,
    descriptions: buildCardDescriptions(card, {
      context: String(context || '')
    })
  }));
});

app.get('/api/cards/:cardId', async (request, reply) => {
  const { cardId } = request.params;
  const { context = '' } = request.query || {};
  const card = getCardById(cardId);
  if (!card) {
    reply.code(404);
    return { message: 'Card not found' };
  }

  return {
    ...card,
    descriptions: buildCardDescriptions(card, {
      context: String(context || '')
    }),
    relatedCardIds: cards
      .filter((candidate) => candidate.id !== card.id)
      .filter((candidate) =>
        card.arcana === 'major' ? candidate.arcana === 'major' : candidate.suit === card.suit
      )
      .slice(0, 5)
      .map((candidate) => candidate.id)
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

function pickRandomCards(deck, count) {
  const pool = [...deck];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function summarizeSpread({ spreadId = '', spreadName, items, context = '', level = 'beginner' }) {
  const normalizedContext = normalizeContextForSpread({ spreadName, context });
  const oneCardAnalysis = spreadId === 'one-card' ? analyzeQuestionContextSync(context) : null;
  const shouldForceYesNoConclusion = spreadId === 'one-card'
    && (Boolean(inferShortUtterance(context)) || oneCardAnalysis?.questionType === 'yes_no');
  if (spreadId === 'one-card' && shouldForceYesNoConclusion) {
    const lead = items[0];
    const keyword = lead?.card?.keywords?.[0] || '흐름';
    const direction = lead?.orientation === 'upright' ? '정방향' : '역방향';
    const analysis = analyzeSpreadSignal(items, oneCardAnalysis?.intent || 'general');
    const conclusion = buildOneCardSummaryConclusion({
      orientation: lead?.orientation || 'upright',
      analysisLabel: analysis.label
    });
    const action = analysis.label === '우세'
      ? '지금 할 행동 1개만 정해서 가볍게 해보세요.'
      : analysis.label === '박빙'
        ? '강도를 조금 낮춰서 행동 1개만 해보고 반응을 확인해보세요.'
        : '10분만 정리하고 다시 판단해보세요.';
    return [
      conclusion,
      `판정: ${analysis.label} · ${keyword} 신호(${direction})를 보면, 지금은 속도 조절이 핵심이에요.`,
      `실행: ${action}`,
      '복기: 해본 뒤 체감 변화를 1줄만 남겨주세요.'
    ].join('\n');
  }
  let rawSummary = '';
  if (spreadId === 'yearly-fortune') {
    rawSummary = summarizeYearlyFortune({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  if (spreadId === 'weekly-fortune') {
    rawSummary = summarizeWeeklyFortune({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  if (spreadId === 'monthly-fortune') {
    rawSummary = summarizeMonthlyFortune({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  if (spreadId === 'three-card') {
    rawSummary = summarizeThreeCard({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  if (spreadId === 'relationship-recovery') {
    rawSummary = summarizeRelationshipRecovery({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  if (spreadId === 'celtic-cross') {
    rawSummary = summarizeCelticCross({ items, context: normalizedContext, level });
    return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
  }
  const contextTone = inferSummaryContextTone(normalizedContext);
  const topKeywords = pickTopKeywords(items, 3);
  const keywordText = topKeywords.join(', ');
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;
  const leadLine = buildSummaryLead({
    spreadName,
    context: normalizedContext,
    firstItem: items[0],
    topKeywords,
    uprightCount,
    reversedCount
  });
  const focusLine = buildSummaryFocus({
    spreadName,
    firstItem: items[0],
    lastItem: items[items.length - 1],
    items,
    context: normalizedContext,
    contextTone
  });
  const actionLine = buildSummaryAction({
    spreadName,
    level,
    context: normalizedContext,
    firstItem: items[0],
    contextTone
  });
  const polishedActionLine = polishActionVoice({
    line: actionLine,
    spreadName,
    context: normalizedContext
  });
  const themeLine = buildSummaryTheme({ spreadName, context: normalizedContext, items, topKeywords });
  rawSummary = polishSummary([leadLine, focusLine, polishedActionLine, themeLine].filter(Boolean).join(' '));
  return finalizeSpreadSummary({ spreadName, items, context: normalizedContext, rawSummary });
}

function buildOneCardSummaryConclusion({ orientation = 'upright', analysisLabel = '조건부' }) {
  if (analysisLabel === '우세') {
    return orientation === 'upright'
      ? '결론: 예. 지금 진행해도 괜찮아요.'
      : '결론: 조건부 예. 강도만 낮추면 가능해요.';
  }
  if (analysisLabel === '박빙') return '결론: 조건부 예. 속도 조절이 필요해요.';
  return orientation === 'upright'
    ? '결론: 조건부 예. 지금은 조절하면서 가는 쪽이 좋아요.'
    : '결론: 아니오. 지금은 멈추고 정비부터 하는 게 좋아요.';
}

export function summarizeSpreadForQa(payload = {}) {
  return summarizeSpread(payload);
}

function buildReadingV2({
  spreadId = '',
  spreadName = '',
  items = [],
  summary = '',
  context = '',
  level = 'beginner',
  renderingMode = 'immersive_safe'
}) {
  const questionAnalysis = analyzeQuestionContextV2Sync(context, { mode: 'hybrid', flag: true });
  const signal = analyzeSpreadSignal(items, questionAnalysis.intent);
  const verdictLead = signal.label === '우세'
    ? '핵심 신호가 비교적 선명합니다.'
    : signal.label === '박빙'
      ? '신호가 팽팽해 작은 운영 차이가 결과를 가릅니다.'
      : '마찰 신호가 있어 속도 조절이 필요합니다.';

  const narrative = buildNarrativeBlock({
    spreadName,
    context,
    items,
    verdict: signal.label,
    renderingMode
  });

  return {
    verdict: {
      label: signal.label,
      confidenceBand: questionAnalysis.confidenceBand,
      cautionLevel: signal.label === '조건부' ? 'high' : signal.label === '박빙' ? 'medium' : 'low',
      reason: verdictLead
    },
    narrative,
    evidence: signal.topEvidence.slice(0, 3).map((entry) => ({
      position: entry.position,
      card: entry.card,
      orientation: entry.orientation,
      keyword: entry.keyword,
      reason: entry.reason
    })),
    actionPlan: {
      now: buildImmediateAction({ spreadId, context, verdict: signal.label }),
      today: buildTodayAction({ spreadId, context, level }),
      thisWeek: buildWeekAction({ spreadId, context })
    },
    reviewPlan: {
      metric: buildReviewMetric({ spreadId, questionType: questionAnalysis.questionType }),
      checkIn: questionAnalysis.timeHorizon === 'immediate' ? '오늘 밤/내일 아침 체감 변화를 1줄 기록하세요.' : '다음 체크 시점에 실제 반응/결과를 1줄로 기록하세요.',
      failSafe: signal.label === '조건부' ? '과열/과속 신호가 보이면 강도를 즉시 1단계 낮추세요.' : '리듬이 흔들리면 핵심 행동 1개만 남기고 나머지는 보류하세요.'
    },
    safety: {
      disallowedToneTriggered: false,
      downtoned: renderingMode !== 'immersive_safe' ? false : true
    },
    meta: {
      spreadId,
      spreadName,
      intent: questionAnalysis.intent,
      subIntent: questionAnalysis.subIntent,
      questionType: questionAnalysis.questionType,
      source: questionAnalysis.source,
      templateVersion: 'reading-v2.0'
    },
    summary
  };
}

function buildNarrativeBlock({ spreadName = '', context = '', items = [], verdict = '조건부', renderingMode = 'immersive_safe' }) {
  const primary = items[0];
  const cardName = primary?.card?.nameKo || '첫 카드';
  const keyword = primary?.card?.keywords?.[0] || '핵심 신호';
  const contextLine = context?.trim() ? `"${context.trim()}"` : '현재 질문';
  const opening = `${contextLine}를 두고 망설이는 지점이 분명합니다.`;
  const scene = `${cardName}의 "${keyword}" 신호가 지금 흐름의 중심에 놓여 있습니다.`;
  const bridge = verdict === '우세'
    ? '흐름을 살리되 과신하지 않고 유지 조건을 먼저 고정하는 편이 좋습니다.'
    : verdict === '박빙'
      ? '같은 카드라도 운영 속도에 따라 결과가 달라질 수 있어 작은 조정이 핵심입니다.'
      : '지금은 결론을 밀어붙이기보다 강도를 낮추고 관찰값을 먼저 확보하는 쪽이 안전합니다.';
  const closing = renderingMode === 'immersive_safe'
    ? `${spreadName} 리딩의 핵심은 감정 몰입보다 근거-실행-복기의 리듬을 지키는 것입니다.`
    : `${spreadName} 리딩은 근거 중심으로 짧게 운영하는 것이 유리합니다.`;
  return { mode: renderingMode, opening, scene, bridge, closing };
}

function buildImmediateAction({ spreadId = '', context = '', verdict = '조건부' }) {
  if (spreadId === 'choice-a-b') return '각 선택지의 단기 비용 1개와 장기 이득 1개를 2줄로 적어 비교하세요.';
  if (/(잠|수면|sleep)/i.test(context)) return verdict === '우세' ? '지금 바로 휴식 루틴 1개를 실행하고 화면 노출을 줄이세요.' : '지금은 10분 정리 루틴 후 수면 여부를 다시 판단하세요.';
  return '지금 10분 안에 끝낼 수 있는 행동 1개만 실행하세요.';
}

function buildTodayAction({ spreadId = '', context = '', level = 'beginner' }) {
  if (spreadId === 'yearly-fortune' || spreadId === 'monthly-fortune') return '오늘 해야 할 핵심 1개와 미룰 것 1개를 분리해 운영하세요.';
  if (/관계|재회|연락|연애/.test(context)) return '대화에서는 사실 1문장 + 요청 1문장 순서로 전달하세요.';
  return level === 'intermediate'
    ? '가설 1개와 반례 1개를 같이 적고 실행 결과를 비교하세요.'
    : '핵심 키워드 1개를 오늘 행동 1개로 바꿔 실행하세요.';
}

function buildWeekAction({ spreadId = '', context = '' }) {
  if (spreadId === 'weekly-fortune') return '요일별 강도 차이를 반영해 고강도 일정은 2일 이내로 제한하세요.';
  if (/이직|면접|career|job/.test(context)) return '이번 주에는 준비(근거 정리)와 실행(지원/면접)을 분리해 운영하세요.';
  return '이번 주 말에 실행 결과와 체감 변화를 3줄 이내로 복기하세요.';
}

function buildReviewMetric({ spreadId = '', questionType = 'open' }) {
  if (spreadId === 'choice-a-b') return '선택 후 만족도(1~5) + 피로도(1~5)';
  if (questionType === 'yes_no') return '실행 여부 + 결과 체감(좋아짐/유지/악화)';
  return '핵심 행동 수행률 + 결과 일치도';
}

function finalizeSpreadSummary({ spreadName = '', items = [], context = '', rawSummary = '' }) {
  const decisionBlock = buildSpreadDecisionBlock({ spreadName, items, context });
  const intent = inferYearlyIntent(context);
  const shouldLeadWithNarrative = intent === 'relationship' || intent === 'relationship-repair';
  const merged = shouldLeadWithNarrative
    ? [rawSummary, decisionBlock].filter(Boolean).join('\n\n')
    : [decisionBlock, rawSummary].filter(Boolean).join('\n\n');
  return polishSummaryRhythm(merged);
}

function buildSpreadDecisionBlock({ spreadName = '', items = [], context = '' }) {
  if (!Array.isArray(items) || !items.length) return '';
  const intent = inferYearlyIntent(context);
  const analysis = analyzeSpreadSignal(items, intent);
  const evidenceSource = spreadName === '양자택일 (A/B)'
    ? prioritizeChoiceEvidence(items, analysis.topEvidence, intent)
    : analysis.topEvidence;
  const lexicon = pickSpreadLexicon(spreadName, intent);
  const lead = analysis.label === '우세'
    ? `${lexicon.main} 기준으로 전개 여지가 비교적 선명합니다.`
    : analysis.label === '박빙'
      ? `${lexicon.main} 기준이 비슷해 미세 조정이 결과를 가를 가능성이 큽니다.`
      : `${lexicon.main} 구간의 마찰 신호가 있어 조건부 접근이 맞습니다.`;
  const evidence = evidenceSource.slice(0, 3).map((entry, idx) =>
    `근거 ${idx + 1}: ${entry.position}(${entry.card}, ${entry.orientation}, '${entry.keyword}') · ${entry.reason}`
  );
  return [`판정: ${analysis.label} · ${lead}`, ...evidence].join('\n');
}

function prioritizeChoiceEvidence(items = [], fallbackEvidence = [], intent = 'general') {
  const priorityPositions = ['현재 상황', 'A 선택 시 결과', 'B 선택 시 결과', 'A 선택 시 가까운 미래', 'B 선택 시 가까운 미래'];
  const itemByPosition = new Map(items.map((item) => [item?.position?.name || '', item]));
  const prioritized = [];
  for (const position of priorityPositions) {
    const item = itemByPosition.get(position);
    if (!item) continue;
    const keyword = item?.card?.keywords?.[0] || '핵심';
    const score = (item?.orientation === 'upright' ? 1.1 : -1.0) - (scoreCardRisk(item) * 0.35);
    prioritized.push({
      position,
      card: item?.card?.nameKo || '카드',
      keyword,
      orientation: item?.orientation === 'upright' ? '정방향' : '역방향',
      reason: buildSpreadEvidenceReason({ position, keyword, score, intent })
    });
    if (prioritized.length >= 3) break;
  }
  if (prioritized.length >= 3) return prioritized;
  return [...prioritized, ...fallbackEvidence].slice(0, 3);
}

function analyzeSpreadSignal(items = [], intent = 'general') {
  const scored = items.map((item) => {
    const risk = scoreCardRisk(item);
    const orientationBase = item?.orientation === 'upright' ? 1.1 : -1.0;
    const score = orientationBase - (risk * 0.35);
    return { item, score, risk };
  });
  const total = scored.reduce((acc, row) => acc + row.score, 0);
  const uprightRatio = scored.filter((row) => row.item?.orientation === 'upright').length / scored.length;
  const avgRisk = scored.reduce((acc, row) => acc + row.risk, 0) / scored.length;
  let label = Math.abs(total) < 0.7
    ? '박빙'
    : (total > 1.2 && uprightRatio >= 0.52 && avgRisk < 2.1)
      ? '우세'
      : '조건부';
  const hasHighRiskReversed = scored.some((row) => row.item?.orientation === 'reversed' && row.risk >= 2);
  const severeRiskCount = scored.filter((row) => row.risk >= 3).length;
  if (label === '우세' && (hasHighRiskReversed || severeRiskCount >= 2 || avgRisk >= 1.6)) {
    label = '조건부';
  }

  const sorted = [...scored].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const positive = sorted.filter((row) => row.score >= 0);
  const negative = sorted.filter((row) => row.score < 0);
  const picks = [];
  if (positive[0]) picks.push(positive[0]);
  if (negative[0]) picks.push(negative[0]);
  for (const row of sorted) {
    if (picks.length >= 3) break;
    if (picks.includes(row)) continue;
    const hasSamePosition = picks.some((picked) => picked.item?.position?.name === row.item?.position?.name);
    if (hasSamePosition) continue;
    picks.push(row);
  }
  while (picks.length < 3 && sorted[picks.length]) {
    picks.push(sorted[picks.length]);
  }

  const topEvidence = picks.slice(0, 3).map((row) => {
    const position = row.item?.position?.name || '포지션';
    const card = row.item?.card?.nameKo || '카드';
    const keyword = row.item?.card?.keywords?.[0] || '핵심';
    const orientation = row.item?.orientation === 'upright' ? '정방향' : '역방향';
    const reason = buildSpreadEvidenceReason({ position, keyword, score: row.score, intent });
    return { position, card, keyword, orientation, reason };
  });

  return { label, topEvidence };
}

function buildSpreadEvidenceReason({ position = '', keyword = '핵심', score = 0, intent = 'general' }) {
  if (intent === 'relationship' || intent === 'relationship-repair') {
    if (score >= 0) {
      if (/현재 관계 상태|현재 상황|상대 관점 신호|현재/.test(position)) {
        return `"${keyword}" 신호가 살아 있어 대화 여지를 남겨주는 카드`;
      }
      return `"${keyword}" 신호가 있어 관계를 풀 실마리를 잡기 좋은 구간`;
    }
    if (/거리\/갈등|교차\/장애|결과|3주차|다음 7일/.test(position)) {
      return `"${keyword}" 구간에서 오해가 커지기 쉬워 속도 조절이 필요함`;
    }
    return `"${keyword}" 구간에서 감정 피로가 누적될 수 있어 톤 조율이 필요함`;
  }
  if (score >= 0) {
    if (/월간 테마|현재 상황|현재 관계 상태|현재/.test(position)) {
      return `${keyword} 기준축을 안정적으로 잡아주는 신호`;
    }
    if (/1주차|2주차|가까운 미래|행동/.test(position)) {
      return `${keyword} 축에서 실행 탄력이 확인됨`;
    }
    return `가용 에너지가 ${keyword} 축에서 살아 있음`;
  }
  if (/3주차|결과|교차\/장애|거리\/갈등/.test(position)) {
    return `${keyword} 축의 소모가 누적되기 쉬워 완급 조절이 필요함`;
  }
  return `${keyword} 축의 소모/지연 리스크가 큼`;
}

function pickSpreadLexicon(spreadName = '', intent = 'general') {
  const base = {
    main: '핵심 흐름'
  };
  if (spreadName === '양자택일 (A/B)') return { main: '선택 유지성' };
  if (spreadName === '3카드 스프레드') return { main: '상황-행동-결과 연결' };
  if (spreadName === '일별 운세') return { main: '하루 운영 리듬' };
  if (spreadName === '주별 운세') return { main: '요일별 완급' };
  if (spreadName === '월별 운세') return { main: '월간 운영 축' };
  if (spreadName === '연간 운세 (12개월)') return { main: '분기별 전략 축' };
  if (spreadName === '켈틱 크로스') return { main: '서사 중심축' };
  if (spreadName === '관계 회복 5카드') return { main: '회복 대화 구조' };
  if (intent === 'finance') return { main: '손실 방어와 지속성' };
  if (intent === 'relationship' || intent === 'relationship-repair') return { main: '대화 지속성' };
  return base;
}

function polishSummaryRhythm(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return text;
  const paragraphs = text.split('\n\n').map((p) => p.trim()).filter(Boolean);
  const seen = new Set();
  const normalized = (s) => String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”"'`]/g, '')
    .replace(/[!?.,]+$/g, '')
    .trim();

  const refined = paragraphs.map((paragraph) => {
    const sentences = splitSentences(paragraph);
    const uniqueSentences = [];
    for (const sentence of sentences) {
      const key = normalized(sentence);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueSentences.push(sentence.trim());
    }
    return uniqueSentences.join(' ').trim();
  }).filter(Boolean);

  return refined.join('\n\n');
}

function summarizeThreeCard({ items, context = '', level = 'beginner' }) {
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const intent = inferThreeCardIntent(context);
  const contextLabel = normalizeContextText(context) || '현재 질문';
  const seed = hashText([
    context,
    ...items.map((item) => `${item?.position?.name || ''}:${item?.card?.id || ''}:${item?.orientation || ''}`)
  ].join(':'));
  const topKeywords = pickTopKeywords(items, 3);
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;

  const positionOf = (name) => items.find((item) => item.position?.name === name) || null;
  const first = positionOf('상황') || positionOf('과거') || positionOf('문제') || items[0] || null;
  const second = positionOf('행동') || positionOf('현재') || positionOf('해결방법') || items[1] || null;
  const third = positionOf('결과') || positionOf('미래') || positionOf('조언') || items[2] || null;

  const cardLabel = (item) => item?.card?.nameKo
    ? `${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'}`
    : '신호 확인 필요';
  const cardKeyword = (item) => item?.card?.keywords?.[0] || '흐름';
  const positionRole = (item, fallback) => item?.position?.name || fallback;
  const risk = (item) => scoreCardRisk(item);
  const isOpen = (item) => item?.orientation === 'upright' && risk(item) < 2;

  const outcomeScore = (isOpen(third) ? 2 : 0) + (isOpen(second) ? 1 : 0) - (first?.orientation === 'reversed' ? 1 : 0);
  const verdict = outcomeScore >= 2
    ? '진행 권장'
    : outcomeScore >= 1
      ? '조건부 진행'
      : '보류 후 정비';

  const verdictLine = (() => {
    if (verdict === '진행 권장') {
      return pickByNumber([
        `질문 "${contextLabel}"의 현재 흐름은 실행 쪽이 우세합니다. 다만 속도보다 루틴 유지가 결과 안정성을 만듭니다.`,
        `지금 카드 조합은 "${contextLabel}"에서 전진 가능성이 열려 있습니다. 무리한 확장보다 기준 고정이 성과를 지켜줍니다.`
      ], seed);
    }
    if (verdict === '조건부 진행') {
      return pickByNumber([
        `질문 "${contextLabel}"은 가능성은 있으나 조건이 붙는 흐름입니다. 병목을 줄이는 운영을 먼저 두면 결과가 따라옵니다.`,
        `현재 조합은 "${contextLabel}"에서 무리한 가속보다 정비형 실행이 맞습니다. 속도 조절이 성패를 가릅니다.`
      ], seed);
    }
    return pickByNumber([
      `질문 "${contextLabel}"은 지금 당장 밀어붙이기보다 정비가 우선인 구간입니다. 기준을 재정렬한 뒤 다시 실행하는 편이 안전합니다.`,
      `현재 흐름에서는 "${contextLabel}"의 결과를 서두를수록 변동성이 커질 수 있습니다. 우선 병목 1개를 정리하세요.`
    ], seed);
  })();

  const situationLine = `${positionRole(first, '첫 카드')}(${cardLabel(first)})에서는 "${cardKeyword(first)}" 신호가 핵심 변수입니다.`;
  const actionLine = `${positionRole(second, '두 번째 카드')}(${cardLabel(second)})는 실행 강도를 정하는 자리라, 과속보다 반복 가능한 단위로 줄이는 편이 효과적입니다.`;
  const outcomeLine = `${positionRole(third, '세 번째 카드')}(${cardLabel(third)})는 결과를 확정하는 카드가 아니라, 지금 실행 품질이 좋아질 때 체감이 커지는 구간으로 읽는 편이 정확합니다.`;

  const contradictionAlert = first?.orientation === 'reversed' && verdict === '진행 권장'
    ? '주의: 초반 경고 카드가 있어도 후반 카드가 열려 있습니다. 즉시 확장보다 리스크 관리형 실행이 우선입니다.'
    : first?.orientation === 'upright' && verdict === '보류 후 정비'
      ? '주의: 시작 신호가 나쁘지 않아도 결과 카드 마찰이 큽니다. 중간 실행 품질을 먼저 점검하세요.'
      : '';

  const studyAction = buildThreeCardStudyActionGuide({
    first,
    second,
    third,
    verdict,
    seed: seed + 7
  });

  const genericAction = pickByNumber([
    `실행 기준: 오늘은 카드 흐름에서 가장 마찰이 큰 지점 1개만 줄이고, 내일 같은 기준으로 재점검하세요.`,
    `실행 기준: 실행 항목을 1개로 줄인 뒤 결과를 사실/해석으로 분리해 기록하면 카드 해석 정확도가 올라갑니다.`
  ], seed + 8);

  const actionGuide = intent === 'study' ? studyAction : genericAction;
  const themeLine = `한 줄 테마: ${topKeywords.length ? topKeywords.join(' · ') : '흐름 점검'} 중심으로, ${verdict === '진행 권장' ? '전진하되 과속은 줄이는' : verdict === '조건부 진행' ? '조건을 붙여 실행하는' : '정비를 먼저 두는'} 운영이 맞습니다.`;

  return [
    `결론: ${verdict} · ${verdictLine}`,
    `근거: ${situationLine} ${actionLine} ${outcomeLine}`,
    contradictionAlert ? `충돌 점검: ${contradictionAlert}` : '',
    `실행 가이드: ${actionGuide} ${levelHint}`,
    themeLine
  ].filter(Boolean).join('\n\n');
}

function inferThreeCardIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (inferred === 'study') return 'study';
  if (inferred === 'relationship' || inferred === 'relationship-repair') return 'relationship';
  if (inferred === 'career') return 'career';
  if (inferred === 'finance') return 'finance';
  return 'general';
}

function buildThreeCardStudyActionGuide({ first, second, third, verdict = '조건부 진행', seed = 0 }) {
  const firstLabel = first?.card?.nameKo || '상황 카드';
  const secondLabel = second?.card?.nameKo || '행동 카드';
  const thirdLabel = third?.card?.nameKo || '결과 카드';
  const isHeavyOutcome = third?.orientation === 'reversed' || scoreCardRisk(third) >= 2;
  const opening = verdict === '진행 권장'
    ? `학습 질문에서는 ${secondLabel} 실행축을 중심으로 루틴을 유지하면 ${thirdLabel} 결과축이 따라올 가능성이 큽니다.`
    : verdict === '조건부 진행'
      ? `학습 질문은 ${firstLabel}의 병목 신호를 먼저 줄일 때 ${thirdLabel} 결과축이 살아납니다.`
      : `학습 질문은 지금 ${firstLabel} 정비가 우선이며, 정비 없는 확장은 ${thirdLabel} 구간 마찰을 키울 수 있습니다.`;
  const today = pickByNumber([
    '오늘 할 일: 취약 파트 1개 + 기출 1세트 + 오답 20분만 고정하고 분량 확장은 금지하세요.',
    '오늘 할 일: 40~60분 집중 블록 2회만 수행하고, 끝난 뒤 오답 유형 3개를 기록하세요.',
    '오늘 할 일: 암기보다 기출 회독 우선으로 전환하고, 틀린 문항의 근거 문장만 짧게 복기하세요.'
  ], seed + 1);
  const week = pickByNumber([
    '이번 주 할 일: 점수보다 반복률을 지표로 두고, 3일 연속 같은 시간대 학습 리듬을 먼저 고정하세요.',
    '이번 주 할 일: 과목 확장보다 취약 영역 1개를 3회전 복습해 체감 안정도를 올리세요.',
    '이번 주 할 일: 시험 시간표와 같은 조건으로 1회 리허설을 넣어 시간 배분 오차를 줄이세요.'
  ], seed + 2);
  const avoid = isHeavyOutcome
    ? '피할 것: 막판에 새 교재/새 범위를 늘리는 확장 전략은 피하고, 기존 틀린 유형 정리에 집중하세요.'
    : '피할 것: 컨디션 좋은 날 분량을 과도하게 늘려 다음날 루틴이 무너지는 패턴은 피하세요.';
  return `${opening} ${today} ${week} ${avoid}`;
}

function summarizeRelationshipRecovery({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const current = pick('현재 관계 상태');
  const friction = pick('거리/갈등의 핵심');
  const signal = pick('상대 관점 신호');
  const action = pick('회복 행동');
  const week = pick('다음 7일 흐름');
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const intent = inferYearlyIntent(context);
  const contextText = String(context || '').toLowerCase();
  const repairMode = (() => {
    if (/(재회|다시 만나|헤어|연락 재개|재접촉)/.test(contextText)) return 'reconnect';
    if (/(사과|갈등|싸움|다툼|오해|서운|충돌)/.test(contextText)) return 'conflict';
    if (/(거리|경계|빈도|장거리|부담|속도)/.test(contextText)) return 'distance';
    return intent === 'relationship-repair' ? 'conflict' : 'general';
  })();

  const cautionCardIds = new Set([
    'minor-swords-three', 'minor-swords-five', 'minor-swords-six', 'minor-swords-nine', 'minor-swords-ten',
    'minor-cups-five', 'minor-wands-five', 'minor-wands-seven',
    'major-15', 'major-16', 'major-18'
  ]);
  const orientationLabel = (item) => {
    if (!item) return '신호 확인 필요';
    const cautious = cautionCardIds.has(item?.card?.id || '');
    if (item.orientation === 'upright') return cautious ? '회복 여지는 있으나 경계 신호' : '열림 신호';
    return cautious ? '긴장 조정 신호' : '조정 신호';
  };
  const keyword = (item) => item?.card?.keywords?.[0] || '관계 흐름';
  const combinedKeywords = [
    ...(friction?.card?.keywords || []),
    ...(week?.card?.keywords || []),
    ...(action?.card?.keywords || [])
  ].map((word) => String(word || '').toLowerCase());
  const hasKeyword = (list) => list.some((word) => combinedKeywords.some((kw) => kw.includes(word)));
  const riskTheme = (() => {
    if (hasKeyword(['오해', '의심', '집착', '불안', '혼란', '달', '검', '소드'])) return 'misread';
    if (hasKeyword(['속도', '충동', '지연', '멈춤', '정체', '기사', '전차'])) return 'timing';
    if (hasKeyword(['거리', '경계', '방어', '권태', '서먹', '은둔'])) return 'distance';
    if (hasKeyword(['실망', '후회', '상처', '탑', '악마'])) return 'hurt';
    return 'general';
  })();
  const variationSeed = hashText([
    context,
    current?.card?.id || '',
    friction?.card?.id || '',
    signal?.card?.id || '',
    action?.card?.id || '',
    week?.card?.id || ''
  ].join(':'));

  const signalLine = pickByNumber([
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이므로 마음 추측보다 확인 질문으로 반응 단서를 모으는 접근이 유리합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}로 읽혀, 해석 확정 대신 실제 반응 기록을 먼저 쌓는 편이 안전합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이어서, 결론을 서두르기보다 짧은 확인 대화부터 두는 편이 좋겠습니다.`
  ], variationSeed);
  const empathyLine = pickByNumber([
    '먼저, 재회를 바라는 마음이 큰 질문일수록 결론을 서두르기보다 서로의 속도를 맞추는 과정이 중요합니다.',
    '이 질문은 마음이 크게 흔들릴 수 있는 주제라서, 카드도 정답 단정보다 대화 리듬 조절을 먼저 권하고 있습니다.',
    '재회 질문에서는 가능성보다 타이밍과 대화 방식이 더 크게 작동하니, 오늘은 감정 소모를 줄이는 쪽으로 읽어보겠습니다.'
  ], variationSeed + 40);

  const diagnosis = [
    `핵심 진단: 현재 관계 상태(${current?.card?.nameKo || '-'})는 ${orientationLabel(current)}로 읽힙니다.`,
    `거리/갈등의 핵심(${friction?.card?.nameKo || '-'})에서는 "${keyword(friction)}" 테마가 반복 포인트로 보입니다.`,
    signalLine
  ].join(' ');

  const weekCautious = cautionCardIds.has(week?.card?.id || '');
  const riskActionLine = week?.orientation === 'upright' && !weekCautious
    ? pickByNumber([
      '대화를 열 수 있는 창은 있으니 표현 강도만 낮추면 오해를 줄일 수 있습니다.',
      '반응 창이 비교적 열려 있어, 짧은 확인 문장으로 접점을 만드는 방식이 유효합니다.',
      '감정 설명보다 사실 확인 대화를 우선하면 다음 흐름을 안정적으로 이어가기 좋겠습니다.'
    ], variationSeed + 1)
    : pickByNumber([
      '지금은 결론을 서두르면 오해가 커질 수 있어, 확인 대화와 속도 조절을 먼저 두는 편이 좋습니다.',
      '감정 해석이 과열되기 쉬운 구간이라, 단정 대신 확인 질문 1개로 속도를 낮추는 편이 좋겠습니다.',
      '빠른 정리보다 오해 요인을 하나씩 줄이는 대화 설계가 먼저 필요해 보입니다.'
    ], variationSeed + 1);
  const riskThemeLine = (() => {
    if (riskTheme === 'misread') {
      return pickByNumber([
        '이번 주에는 마음 해석을 줄이고 사실 확인 질문을 늘리지 않으면 엇갈림이 커지기 쉽습니다.',
        '감정 단정이 먼저 나오면 작은 문장도 공격처럼 들릴 수 있어 확인 루틴을 먼저 두는 편이 안전합니다.',
        '추측 대화가 길어질수록 피로가 누적되는 구간이라, 관찰 가능한 사실 중심으로 대화를 정리하세요.'
      ], variationSeed + 11);
    }
    if (riskTheme === 'timing') {
      return pickByNumber([
        '접촉 타이밍을 급히 당기면 반응이 닫힐 수 있어, 간격을 정해 두고 천천히 접근하는 편이 유리합니다.',
        '지금은 속도 불일치가 갈등을 키우기 쉬워 먼저 대화 간격과 길이를 합의하는 단계가 필요합니다.',
        '빠른 결론을 내리기보다 리듬을 맞추는 데 집중해야 다음 대화의 안정성이 올라갑니다.'
      ], variationSeed + 12);
    }
    if (riskTheme === 'distance') {
      return pickByNumber([
        '거리감 자체보다 경계선이 불명확한 상태가 더 큰 리스크라, 허용 범위를 먼저 말로 확인하세요.',
        '관계 온도차를 방치하면 침묵이 오해로 번지기 쉬우니 연락 규칙을 짧게라도 맞춰두는 게 좋습니다.',
        '지금 구간은 접근보다 경계 조율이 우선이라, 불편 기준을 먼저 공유해야 소모를 줄일 수 있습니다.'
      ], variationSeed + 13);
    }
    if (riskTheme === 'hurt') {
      return pickByNumber([
        '상처 기억이 활성화된 흐름이라 해명부터 길게 하면 방어가 커질 수 있어 짧은 인정부터 시작하세요.',
        '후폭풍이 남아 있는 상태라 결론 대화보다 감정 안정 단계를 먼저 두는 편이 회복 확률을 높입니다.',
        '미해결 감정이 다시 올라오기 쉬운 구간이므로 잘잘못 정리보다 진정 루틴이 먼저 필요합니다.'
      ], variationSeed + 14);
    }
    return pickByNumber([
      '핵심은 속도와 톤을 함께 조절하는 것이며, 하나만 밀어붙이면 반작용이 커질 수 있습니다.',
      '관계 회복 신호가 있어도 단계 설계를 건너뛰면 오해가 다시 누적될 수 있습니다.',
      '지금은 감정 표현과 사실 확인의 균형이 무너지지 않도록 대화 구조를 단순하게 유지하세요.'
    ], variationSeed + 15);
  })();

  const risk = [
    `관계 리스크: 다음 7일 흐름(${week?.card?.nameKo || '-'}) 기준으로 "${keyword(week)}" 구간에서 대화 오해가 커질 수 있는 타이밍이 보입니다.`,
    riskActionLine,
    riskThemeLine
  ].join(' ');

  const planOpening = pickByNumber([
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})의 "${keyword(action)}" 신호를 기준으로 오늘 먼저 보낼 1문장을 정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})에서 읽힌 ${orientationLabel(action)} 흐름을 따라 이번 주 대화 목표 1문장을 고정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})을 바탕으로 오늘 시도할 행동 1개와 멈출 행동 1개를 같이 정하고 바로 실행하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'}) 기준으로 연락 시간대 1개와 대화 길이 기준 1개를 먼저 정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})의 카드 근거를 살려, 감정 설명보다 확인 질문 1개를 먼저 준비하세요.`
  ], variationSeed + 2);
  const planRoutine = (() => {
    if (riskTheme === 'misread') {
      return pickByNumber([
        '대화 전에는 추측 문장을 지우고 사실 질문 1개만 남기고, 대화 후에는 확인된 사실 2가지만 기록하세요.',
        '연락 전에 해석 대신 관찰 문장 1개를 적고, 대화 후에는 들은 표현을 그대로 한 줄로 남기세요.',
        '오해 구간에서는 질문 1개와 요청 1개만 준비하고, 통화가 끝나면 사실/해석을 분리해 점검하세요.'
      ], variationSeed + 31);
    }
    if (riskTheme === 'timing') {
      return pickByNumber([
        '이번 주는 대화 간격을 먼저 정하고 그 간격을 지키며, 매 대화 뒤 반응 속도를 짧게 기록하세요.',
        '속도 불일치가 핵심이니 연락 주기 1개를 먼저 합의하고, 대화 후에는 과속 징후를 점검하세요.',
        '첫 메시지 이후 바로 추가 설명을 붙이지 말고 1회 대기 규칙을 두고, 반응 시간을 기준으로 조정하세요.'
      ], variationSeed + 32);
    }
    if (riskTheme === 'distance') {
      return pickByNumber([
        '관계 온도차 구간이라 경계선 1개를 먼저 공유하고, 대화 뒤에는 부담 신호가 있었는지 확인하세요.',
        '거리감이 커지는 주간에는 접촉 횟수보다 허용 범위 문장을 먼저 정하고, 반응을 기록하세요.',
        '접근보다 조율이 우선이니 요청 가능한 범위 1개와 보류할 범위 1개를 분리해 대화 전에 준비하세요.'
      ], variationSeed + 33);
    }
    if (riskTheme === 'hurt') {
      return pickByNumber([
        '상처 반응이 쉽게 올라오니 길게 해명하지 말고 인정 문장 1개를 먼저 말한 뒤 반응을 기록하세요.',
        '후폭풍 구간에서는 잘잘못 정리보다 감정 안정 문장을 먼저 준비하고, 대화 뒤 에너지 소모를 점검하세요.',
        '방어를 낮추기 위해 사과 표현 1개와 재발 방지 문장 1개를 분리해 준비하고 실행하세요.'
      ], variationSeed + 34);
    }
    return pickByNumber([
      '대화 전에는 사실 1개/요청 1개만 준비하고, 대화 후에는 상대 반응을 한 줄 복기로 남기세요.',
      '대화 전에는 확인 질문 1개만 정하고, 대화 후에는 상대 반응과 내 감정 변화를 각각 한 줄씩 남기세요.',
      '연락 전에는 전달할 핵심 문장 1개만 적고, 이후에는 결과를 사실/해석으로 분리해 짧게 기록하세요.'
    ], variationSeed + 35);
  })();
  const modePlan = (() => {
    if (repairMode === 'reconnect') {
      return pickByNumber([
        '재접촉은 강도보다 예측 가능성이 중요하니, 연락 빈도와 응답 기대치를 먼저 짧게 합의하세요.',
        '재회 시도 단계에서는 감정 호소보다 일정 제안이 효과적이므로 만남 시간과 주제를 미리 정리하세요.',
        '다시 연결하는 주간에는 긴 설명보다 짧은 안부-확인-마무리 구조로 대화를 닫는 연습을 하세요.'
      ], variationSeed + 21);
    }
    if (repairMode === 'conflict') {
      return pickByNumber([
        '갈등 회복은 사과 문장과 재발 방지 문장을 분리할 때 효과가 커지니 둘을 따로 준비하세요.',
        '충돌 직후에는 주장보다 인정 문장이 우선이므로, 내 책임 1개를 먼저 명확히 말하는 순서를 고정하세요.',
        '화해 시도에서는 설명 길이를 줄이고 확인 질문을 늘리는 쪽이 방어를 낮추니 대화 비율을 점검하세요.'
      ], variationSeed + 22);
    }
    if (repairMode === 'distance') {
      return pickByNumber([
        '거리 조정 단계에서는 접촉 횟수보다 기준 합의가 중요하니, 부담되는 패턴 1개를 먼저 공유하세요.',
        '관계 온도차를 줄이려면 기대치 문장을 먼저 맞춰야 하므로 연락 규칙을 짧게 문장으로 고정하세요.',
        '경계 설정이 필요한 흐름이라 요청 가능한 범위와 보류할 범위를 나눠 기록하고 대화에 반영하세요.'
      ], variationSeed + 23);
    }
    return pickByNumber([
      '이번 주는 감정 표현과 사실 확인의 순서를 섞지 말고, 먼저 확인 후 요청하는 패턴으로 고정하세요.',
      '관계 조율의 초점은 한 번의 긴 대화가 아니라 짧은 대화를 꾸준히 이어가는 리듬에 두세요.',
      '회복 구간에서는 결론보다 관찰이 우선이므로, 반응 로그를 남기고 다음 문장을 조정해 실행하세요.'
    ], variationSeed + 24);
  })();
  const planCheckpoint = pickByNumber([
    `점검 기준은 다음 7일 흐름(${week?.card?.nameKo || '-'})의 "${keyword(week)}" 신호가 완화되는지로 잡고, 48시간 간격으로 기록하세요.`,
    `중간 점검은 거리/갈등의 핵심(${friction?.card?.nameKo || '-'}) 키워드 "${keyword(friction)}"가 대화에서 줄어드는지 확인하는 방식이 좋습니다.`,
    `주간 마무리에서는 상대 관점 신호(${signal?.card?.nameKo || '-'}) 반응을 기준으로 다음 주 문장 톤을 조정하세요.`
  ], variationSeed + 4);

  const reconnectTrack = pickByNumber([
    '재회를 시도하고 싶다면: 안부 1문장 + 확인 질문 1문장으로 시작하고, 답을 재촉하지 않는 템포를 유지하세요.',
    '재회를 열어보려면: 긴 설명 대신 짧은 연락 1회로 접점을 만들고, 상대 반응을 본 뒤 다음 대화를 여세요.',
    '연결을 다시 만들고 싶다면: 하루 감정 정리 후 저강도 메시지 1개만 보내고, 반응 기록을 기준으로 다음 행동을 정하세요.'
  ], variationSeed + 41);
  const recoveryTrack = pickByNumber([
    '지금은 나를 먼저 회복하고 싶다면: 연락 시도 횟수를 줄이고 수면/루틴/일상 리듬을 먼저 안정화하세요.',
    '마음 회복을 우선한다면: 상대 해석을 멈추고 하루 1회 감정 기록으로 생각 과열을 낮추는 편이 좋습니다.',
    '감정 소모가 크다면: 관계 결론을 잠시 보류하고, 내 생활 리듬을 되찾는 행동 1개를 매일 고정하세요.'
  ], variationSeed + 42);
  const plan = [
    planOpening,
    planRoutine,
    modePlan,
    `선택지: ${reconnectTrack} ${recoveryTrack}`,
    planCheckpoint,
    levelHint
  ].join(' ');
  const closingLine = pickByNumber([
    '마무리: 이번 주는 큰 결론보다, 오해를 줄이는 한 번의 대화 성공을 목표로 두면 훨씬 안정적입니다.',
    '마무리: 재회 가능성은 속도보다 리듬에서 갈리니, 오늘은 짧고 안전한 대화 1회만 목표로 잡아보세요.',
    '마무리: 관계의 방향을 당장 확정하기보다, 서로 덜 다치게 대화를 이어갈 기반을 먼저 만드는 것이 핵심입니다.'
  ], variationSeed + 43);

  return [empathyLine, diagnosis, risk, plan, closingLine].join('\n\n');
}

function summarizeWeeklyFortune({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const monday = pick('월요일');
  const tuesday = pick('화요일');
  const wednesday = pick('수요일');
  const thursday = pick('목요일');
  const friday = pick('금요일');
  const saturday = pick('토요일');
  const sunday = pick('일요일');
  const intent = inferYearlyIntent(context);
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;
  const dayCards = [
    { dayLabel: '월요일', item: monday },
    { dayLabel: '화요일', item: tuesday },
    { dayLabel: '수요일', item: wednesday },
    { dayLabel: '목요일', item: thursday },
    { dayLabel: '금요일', item: friday },
    { dayLabel: '토요일', item: saturday },
    { dayLabel: '일요일', item: sunday }
  ];
  const dayScores = dayCards.map(({ dayLabel, item }) => ({
    dayLabel,
    item,
    score: scoreWeeklyDayStrength(item, intent)
  }));
  const riskTotal = dayScores.reduce((acc, row) => acc + scoreCardRisk(row.item), 0);
  const strongestDay = [...dayScores].sort((a, b) => b.score - a.score)[0];
  const weakestDay = [...dayScores].sort((a, b) => a.score - b.score)[0];
  const seed = hashText([
    context,
    monday?.card?.id || '',
    tuesday?.card?.id || '',
    wednesday?.card?.id || '',
    thursday?.card?.id || '',
    friday?.card?.id || '',
    saturday?.card?.id || '',
    sunday?.card?.id || ''
  ].join(':'));

  const mondayKeyword = monday?.card?.keywords?.[0] || '주간 흐름';
  const mondayLabel = monday?.card?.nameKo ? `${monday.card.nameKo} ${monday?.orientation === 'reversed' ? '역방향' : '정방향'}` : '신호 확인 필요';
  const unstableWeek = riskTotal >= 8 || reversedCount >= 3;
  const overallFlow = intent === 'relationship'
    ? (unstableWeek
        ? '호감은 남아 있지만 오해 관리가 더 중요한 주간'
        : uprightCount >= reversedCount
          ? '대화의 문이 조금씩 열리는 주간'
          : '감정 거리 조절이 필요한 주간')
    : unstableWeek
      ? '기회는 있으나 방어를 우선해야 하는 주간'
      : uprightCount >= reversedCount
        ? '전개가 열려 있는 주간'
        : '속도 조절이 필요한 주간';
  const overallIntentLine = buildWeeklyIntentLine({ intent, orientation: monday?.orientation || 'upright', keyword: mondayKeyword });
  const strongestHint = strongestDay?.item?.card?.nameKo
    ? `이번 주 힘이 실리는 날은 ${strongestDay.dayLabel}(${strongestDay.item.card.nameKo})이고, 조심할 날은 ${weakestDay.dayLabel}(${weakestDay?.item?.card?.nameKo || '-'})입니다.`
    : '';

  const overall = [
    `이번 주 시작 카드(월요일)는 ${mondayLabel}이며, 핵심 키워드는 "${mondayKeyword}"입니다.`,
    `전체적으로는 ${overallFlow}으로 보입니다.`,
    overallIntentLine,
    strongestHint
  ].join(' ');

  const phraseMemory = new Set();
  const mondayLine = buildWeeklyDayLine({
    item: monday,
    dayLabel: '월요일',
    roleHint: intent === 'relationship' ? '관계 시동' : '주간 시동',
    intent,
    openHint: intent === 'relationship'
      ? '월요일에는 답을 내리기보다 서로의 현재 상태를 확인하는 짧은 대화가 좋습니다.'
      : '월요일에는 일정과 우선순위를 빠르게 고정하면 흐름을 선점하기 좋습니다.',
    adjustHint: intent === 'relationship'
      ? '월요일에는 결론을 서두르지 말고 감정 온도를 먼저 맞추는 편이 안정적입니다.'
      : '월요일에는 무리한 확장보다 속도 조절과 기준 정리가 먼저입니다.',
    seed: seed + 1,
    memory: phraseMemory
  });
  const tuesdayLine = buildWeeklyDayLine({
    item: tuesday,
    dayLabel: '화요일',
    roleHint: intent === 'relationship' ? '대화 톤 조율' : '초반 안정화',
    intent,
    openHint: intent === 'relationship'
      ? '화요일에는 어제 나온 반응을 바탕으로 메시지 톤을 부드럽게 다듬어보세요.'
      : '화요일에는 전날 정한 기준을 반복 실행하면 체감 안정성이 올라갑니다.',
    adjustHint: intent === 'relationship'
      ? '화요일에는 단정 표현을 줄이고 질문형 문장으로 오해를 줄이는 편이 좋습니다.'
      : '화요일에는 일정 과적재를 줄이고 실행 항목을 하나로 줄이는 편이 좋겠습니다.',
    seed: seed + 2,
    memory: phraseMemory
  });
  const wednesdayLine = buildWeeklyDayLine({
    item: wednesday,
    dayLabel: '수요일',
    roleHint: intent === 'relationship' ? '중반 감정 점검' : '중반 전환',
    intent,
    openHint: intent === 'relationship'
      ? '수요일에는 감정이 쌓이기 전에 짧게 정리 대화를 해두면 후반이 편해집니다.'
      : '수요일에는 외부 변수 대응 여지가 있어 핵심 한 가지를 밀어붙이기 좋은 구간입니다.',
    adjustHint: intent === 'relationship'
      ? '수요일에는 피로와 예민함을 먼저 낮춘 뒤 대화 강도를 조절하는 편이 좋습니다.'
      : '수요일에는 해석 충돌이나 피로 누적을 먼저 줄여야 후반 흐름이 살아납니다.',
    seed: seed + 3,
    memory: phraseMemory
  });
  const thursdayLine = buildWeeklyDayLine({
    item: thursday,
    dayLabel: '목요일',
    roleHint: intent === 'relationship' ? '관계 안정화' : '중반 마무리',
    intent,
    openHint: intent === 'relationship'
      ? '목요일에는 신뢰를 쌓는 현실적 배려 한 가지를 보여주기 좋은 날입니다.'
      : '목요일에는 진행 중인 일을 정리해 금요일 마감 품질을 높이는 데 유리합니다.',
    adjustHint: intent === 'relationship'
      ? '목요일에는 해결보다 경청을 먼저 두면 불필요한 충돌을 줄일 수 있습니다.'
      : '목요일에는 진행 중인 이슈를 정리하고 충돌 요인을 줄이는 편이 좋겠습니다.',
    seed: seed + 4,
    memory: phraseMemory
  });
  const fridayLine = buildWeeklyDayLine({
    item: friday,
    dayLabel: '금요일',
    roleHint: intent === 'relationship' ? '주 후반 조율' : '성과 점검',
    intent,
    openHint: intent === 'relationship'
      ? '금요일에는 한 주 대화를 가볍게 복기하고 고마움을 짧게 전해보세요.'
      : '금요일에는 결과 확인과 마감 정리를 함께 잡으면 주간 완성도가 올라갑니다.',
    adjustHint: intent === 'relationship'
      ? '금요일에는 서운함을 한 번에 쏟기보다 핵심 한 가지씩 나눠 말하는 편이 안전합니다.'
      : '금요일에는 성과 집착보다 누락 정리와 손실 방어를 먼저 두는 편이 안전합니다.',
    seed: seed + 5,
    memory: phraseMemory
  });

  const saturdayLine = buildWeeklyDayLine({
    item: saturday,
    dayLabel: '토요일',
    roleHint: '회복/정비',
    intent,
    openHint: intent === 'relationship'
      ? '토요일은 함께 쉬는 리듬을 맞추면 관계 긴장이 자연스럽게 내려갑니다.'
      : '토요일은 회복과 관계 정비를 균형 있게 가져가면 다음 주 체력이 남습니다.',
    adjustHint: intent === 'relationship'
      ? '토요일은 각자 회복 시간을 보장해 주며 대화 밀도를 낮추는 편이 좋겠습니다.'
      : '토요일은 일정 과적재를 줄이고 회복 루틴을 먼저 고정하는 편이 좋겠습니다.',
    seed: seed + 6,
    memory: phraseMemory
  });
  const sundayLine = buildWeeklyDayLine({
    item: sunday,
    dayLabel: '일요일',
    roleHint: '복기/준비',
    intent,
    openHint: intent === 'relationship'
      ? '일요일은 다음 주에 맞출 약속 한 가지만 정해두면 마음이 편해집니다.'
      : '일요일은 복기와 다음 주 준비를 짧게 끝내면 월요일 진입이 훨씬 부드러워집니다.',
    adjustHint: intent === 'relationship'
      ? '일요일은 감정 소모를 줄이고 기대치를 한 단계 낮춰 정리하는 편이 안정적입니다.'
      : '일요일은 감정 소모를 줄이고 다음 주 우선순위 1개만 남기는 편이 안정적입니다.',
    seed: seed + 7,
    memory: phraseMemory
  });

  const actionGuide = buildWeeklyActionGuide({
    intent,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    strongestDayLabel: strongestDay?.dayLabel || '월요일',
    weakestDayLabel: weakestDay?.dayLabel || '금요일',
    riskTotal,
    seed: seed + 8
  });
  const themeKeyword = pickTopKeywords(items, 1)[0] || '주간 리듬';
  const themeLine = `한 줄 테마: 이번 주는 '${themeKeyword}' 신호를 기준으로 강한 날 실행, 약한 날 정비로 리듬을 나누면 안정적입니다.`;

  return [
    `총평: ${overall}`,
    `일별 흐름: ${mondayLine} ${tuesdayLine} ${wednesdayLine} ${thursdayLine} ${fridayLine} ${saturdayLine} ${sundayLine}`,
    `실행 가이드: ${actionGuide} ${levelHint}`,
    themeLine
  ].join('\n\n');
}

function buildWeeklyIntentLine({ intent = 'general', orientation = 'upright', keyword = '흐름' }) {
  if (intent === 'career') {
    return orientation === 'upright'
      ? `커리어 관점에서는 "${keyword}" 키워드가 살아 있어 외부 실행(지원/제안/협업)을 조금 넓혀보기 좋습니다.`
      : `커리어 관점에서는 "${keyword}" 키워드가 조정 구간이라, 실행 수보다 완성도 점검을 우선하는 편이 좋겠습니다.`;
  }
  if (intent === 'relationship') {
    return orientation === 'upright'
      ? `관계 관점에서는 "${keyword}" 키워드가 열려 있어 짧고 명확한 대화 시도가 효과적일 수 있습니다.`
      : `관계 관점에서는 "${keyword}" 키워드가 예민해 단정보다 확인 대화를 먼저 두는 편이 좋겠습니다.`;
  }
  if (intent === 'finance') {
    return orientation === 'upright'
      ? `재정 관점에서는 "${keyword}" 키워드가 열려 있어 계획형 지출/저축 리듬을 유지하기 좋습니다.`
      : `재정 관점에서는 "${keyword}" 키워드가 흔들릴 수 있어 신규 지출보다 손실 방어를 먼저 두는 편이 안전합니다.`;
  }
  return orientation === 'upright'
    ? `"${keyword}" 흐름이 살아 있어 우선순위를 정해 실행하면 주간 체감이 커질 수 있습니다.`
    : `"${keyword}" 흐름이 조정 구간이라, 속도를 늦추고 핵심 하나에 집중하는 편이 좋겠습니다.`;
}

function buildWeeklyPositionLine({
  item,
  slot,
  intent = 'general',
  openHint = '',
  adjustHint = '',
  seed = 0
}) {
  const label = item?.card?.nameKo ? `${slot}(${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'})` : slot;
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const open = item?.orientation !== 'reversed';

  const intentHint = (() => {
    if (intent === 'finance') {
      return open
        ? pickByNumber([
          `"${keyword}" 기준으로 지출/저축 기준표를 유지하면 안정성이 올라갑니다.`,
          `"${keyword}" 구간에서는 금액 한도를 먼저 정하면 흔들림이 줄어듭니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 구간에서 충동 지출이 늘 수 있어 결제 전 점검 루틴이 필요합니다.`,
          `"${keyword}" 축에서는 비용 누수를 먼저 막아야 후반 안정성이 올라갑니다.`
        ], seed);
    }
    if (intent === 'relationship') {
      return open
        ? pickByNumber([
          `"${keyword}" 기운이 열려 있어 가볍고 솔직한 확인 대화를 시도해보기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 요청과 감정을 분리해 말하면 오해를 줄일 수 있습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 해석이 엇갈릴 수 있어 단정 대신 확인 질문을 먼저 두는 편이 좋습니다.`,
          `"${keyword}" 흐름이 예민해 반응을 확인한 뒤 다음 대화로 넘어가면 안정적입니다.`
        ], seed);
    }
    if (intent === 'career') {
      return open
        ? pickByNumber([
          `"${keyword}" 신호가 살아 있어 외부 실행을 작은 단위로 늘리기 좋습니다.`,
          `"${keyword}" 축에서는 제출/미팅/정리 중 하나를 확실히 완료하는 편이 좋습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 구간에서는 실행 폭보다 품질 보완을 먼저 두는 편이 안정적입니다.`,
          `"${keyword}" 축에서는 일정 과부하를 줄이고 핵심 산출물 완성도를 우선하세요.`
        ], seed);
    }
    return open
      ? `"${keyword}" 흐름이 열려 있어 핵심 한 가지를 밀어붙이기 좋습니다.`
      : `"${keyword}" 흐름이 흔들릴 수 있어 속도 조절이 먼저입니다.`;
  })();

  const slotHint = open ? openHint : adjustHint;
  return `${label}에서는 ${intentHint} ${slotHint}`;
}

function buildWeeklyDayLine({
  item,
  dayLabel,
  roleHint = '',
  intent = 'general',
  openHint = '',
  adjustHint = '',
  seed = 0,
  memory = null
}) {
  const label = item?.card?.nameKo ? `${dayLabel}(${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'})` : dayLabel;
  const rolePrefix = roleHint ? `${roleHint} 관점에서` : '흐름 관점에서';
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const riskScore = scoreCardRisk(item);
  const open = item?.orientation !== 'reversed' && riskScore < 2;

  const intentHint = (() => {
    if (intent === 'finance') {
      return buildFinanceDayHint({ item, dayLabel, open, riskScore, seed, memory });
    }
    if (intent === 'relationship') {
      return open
        ? pickByNumber([
          `"${keyword}" 기운이 열려 있어 짧고 솔직한 확인 대화를 시도해보기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 내 감정과 요청을 나눠 전달하면 반응을 읽기 쉽습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 해석이 엇갈릴 수 있어 단정 문장을 줄이고 확인 질문을 먼저 두는 편이 좋겠습니다.`,
          `"${keyword}" 흐름이 예민해 반응을 확인한 뒤 다음 대화를 여는 편이 안정적입니다.`
        ], seed);
    }
    if (intent === 'career') {
      return open
        ? pickByNumber([
          `"${keyword}" 축이 열려 있어 외부 실행을 작은 단위로 이어가기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 제출/정리/소통 중 핵심 1개를 밀어붙이기 좋습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 마찰이 생길 수 있어 실행 수보다 품질 보완을 먼저 두는 편이 좋겠습니다.`,
          `"${keyword}" 구간에서는 일정 과부하를 줄이고 핵심 산출물 완성도를 우선하세요.`
        ], seed);
    }
    return open
      ? `"${keyword}" 흐름이 열려 있어 핵심 한 가지를 밀어붙이기 좋습니다.`
      : `"${keyword}" 흐름이 흔들릴 수 있어 속도 조절이 먼저입니다.`;
  })();

  const uniqueIntentHint = pickDistinctWeeklyPhrase(intentHint, `${dayLabel}:intent:${seed}`, memory);
  const dayHint = pickDistinctWeeklyPhrase(open ? openHint : adjustHint, `${dayLabel}:hint:${seed}`, memory);
  return `${label}은 ${rolePrefix} ${uniqueIntentHint} ${dayHint}`.trim();
}

function summarizeMonthlyFortune({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const theme = pick('월간 테마');
  const week1 = pick('1주차');
  const week2 = pick('2주차');
  const week3 = pick('3주차');
  const week4 = pick('4주차·정리');
  const intent = inferYearlyIntent(context);
  const tone = inferSummaryContextTone(context);
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const topKeyword = pickTopKeywords(items, 1)[0] || theme?.card?.keywords?.[0] || '월간 흐름';
  const unstable = [week3, week4].some((item) => item?.orientation === 'reversed' || scoreCardRisk(item) >= 2);
  const monthLabel = intent === 'relationship'
    ? (uprightCount >= 3 ? '관계 진전 여지가 있으나 중반 리스크 관리가 필요한 달' : '속도 조절과 오해 관리가 우선인 달')
    : uprightCount >= 3
      ? '실행 여지가 살아 있으나 중반 완급 조절이 중요한 달'
      : '정비 우선 운영이 필요한 달';
  const cardLabel = (item) => item?.card?.nameKo
    ? `${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'}`
    : '신호 확인 필요';
  const weekHint = (item, role) => {
    if (!item) return `${role}는 카드 신호 확인이 필요합니다.`;
    const keyword = item.card?.keywords?.[0] || '흐름';
    const open = item.orientation !== 'reversed' && scoreCardRisk(item) < 2;
    if (open) return `${role}(${cardLabel(item)})는 "${keyword}" 축이 열려 있어 실행 리듬을 붙이기 좋습니다.`;
    return `${role}(${cardLabel(item)})는 "${keyword}" 축 마찰이 있어 속도보다 정비를 우선해야 합니다.`;
  };
  const bridge = (() => {
    if (unstable) {
      return '주별 운세와 연결할 때는 3주차 성격으로 보고, 주중에는 결론보다 확인 질문을 먼저 두는 운영이 맞습니다.';
    }
    return '주별 운세와 연결할 때는 1~2주차 성격으로 보고, 힘이 실리는 요일에 짧고 일관된 실행을 붙이면 체감이 좋아집니다.';
  })();
  const action = buildSummaryAction({
    spreadName: '월별 운세',
    level,
    context,
    firstItem: theme,
    contextTone: tone
  });
  const polishedAction = polishActionVoice({
    line: action,
    spreadName: '월별 운세',
    context
  });
  const overall = [
    `월간 테마 카드는 ${cardLabel(theme)}이고, 핵심 키워드는 "${topKeyword}"입니다.`,
    `전체적으로는 ${monthLabel}으로 보입니다.`
  ].join(' ');

  return [
    `총평: ${overall}`,
    `주차 흐름: ${weekHint(week1, '1주차')} ${weekHint(week2, '2주차')} ${weekHint(week3, '3주차')} ${weekHint(week4, '4주차·정리')}`,
    `월-주 연결: ${bridge}`,
    `실행 가이드: ${polishedAction}`,
    `한 줄 테마: 이번 달은 '${topKeyword}' 기준으로 초반 실행-중반 완급-후반 정리 리듬을 분리하면 안정적입니다.`
  ].join('\n\n');
}

function buildWeeklyActionGuide({
  intent = 'general',
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
  strongestDayLabel = '월요일',
  weakestDayLabel = '금요일',
  riskTotal = 0,
  seed = 0
}) {
  const cards = [monday, tuesday, wednesday, thursday, friday, saturday, sunday].filter(Boolean);
  const reversedCount = cards.filter((item) => item?.orientation === 'reversed').length;
  const key = cards.map((item) => item?.card?.keywords?.[0]).filter(Boolean)[0] || '실행';
  const unstable = reversedCount >= 3 || riskTotal >= 8;

  if (intent === 'finance') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 구간의 변동성이 있어 ${weakestDayLabel}에는 신규 결제를 보류하고, ${strongestDayLabel}에 예산 재배치를 진행하세요.`,
        `이번 주는 "${key}" 신호가 흔들릴 수 있으니 ${weakestDayLabel}은 손실 방어, ${strongestDayLabel}은 계획형 집행에 배정하는 편이 좋습니다.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 ${strongestDayLabel}에 핵심 집행을 두고, ${weakestDayLabel}은 점검일로 운영하면 안정성이 올라갑니다.`,
        `이번 주는 "${key}" 축을 기준으로 ${strongestDayLabel} 실행 1개와 ${weakestDayLabel} 통제 1개를 짝으로 고정하면 흐름이 안정됩니다.`
      ], seed);
  }
  if (intent === 'relationship') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 흐름이 예민하니, 확인 질문 1개를 중심으로 대화 속도를 천천히 맞추세요.`,
        `이번 주는 "${key}" 신호가 흔들릴 수 있어 단정 대신 사실 확인 문장으로 관계 피로를 줄이세요.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 짧고 분명한 대화를 하루 한 번 정도 꾸준히 이어가면 좋겠습니다.`,
        `이번 주는 "${key}" 기준으로 요청 1개와 감정 1개를 분리해 전달하면 반응을 읽기 쉽습니다.`
      ], seed);
  }
  if (intent === 'career') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 구간의 마찰이 있어 실행 수를 줄이고 핵심 산출물 완성도 1개에 집중하는 편이 좋겠습니다.`,
        `이번 주는 "${key}" 축이 조정 구간이니 외부 실행보다 자료 보완/일정 정리를 먼저 고정하세요.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 외부 실행 1개와 내부 정리 1개를 짝으로 유지하면 체감이 좋습니다.`,
        `이번 주는 "${key}" 축을 기준으로 우선순위 1개를 밀어붙이고, 매일 짧은 복기로 리듬을 유지하세요.`
      ], seed);
  }

  return unstable
    ? pickByNumber([
      `이번 주는 "${key}" 구간의 변동성이 있어 ${strongestDayLabel} 실행 1개에 집중하고 ${weakestDayLabel}에는 정비를 배치하는 편이 좋겠습니다.`,
      `이번 주는 "${key}" 축에서 병목이 생길 수 있으니 ${weakestDayLabel}은 속도 조절, ${strongestDayLabel}은 핵심 실행으로 분리하세요.`
    ], seed)
    : pickByNumber([
      `이번 주는 "${key}" 흐름이 살아 있어 ${strongestDayLabel} 실행을 중심축으로 두면 주간 체감이 커질 수 있습니다.`,
      `이번 주는 "${key}" 축을 중심으로 ${strongestDayLabel} 추진, ${weakestDayLabel} 복기 리듬을 나누면 안정됩니다.`
    ], seed);
}

function scoreCardRisk(item) {
  if (!item?.card) return 1;
  let score = item.orientation === 'reversed' ? 2 : 0;
  const riskyCardIds = new Set([
    'major-15', 'major-16', 'major-18', 'minor-swords-nine', 'minor-swords-ten',
    'minor-wands-ten', 'minor-cups-five', 'minor-swords-five'
  ]);
  if (riskyCardIds.has(item.card.id)) score += 2;
  const text = `${item.card.nameKo} ${(item.card.keywords || []).join(' ')}`.toLowerCase();
  if (/(붕괴|집착|혼란|불안|갈등|소모|손실|과부하|두려움|속박)/.test(text)) score += 1;
  return score;
}

function scoreWeeklyDayStrength(item, intent = 'general') {
  if (!item?.card) return -1;
  const orientationScore = item.orientation === 'reversed' ? -1 : 1;
  const riskPenalty = scoreCardRisk(item) * 0.45;
  let suitBonus = 0;
  if (intent === 'finance') {
    if (item.card.suit === 'Pentacles') suitBonus += 0.8;
    if (item.card.suit === 'Swords') suitBonus += 0.2;
    if (item.card.suit === 'Cups') suitBonus -= 0.2;
    if (item.card.suit === 'Wands') suitBonus -= 0.1;
  }
  return orientationScore + suitBonus - riskPenalty;
}

function buildFinanceDayHint({ item, dayLabel, open, riskScore, seed = 0, memory = null }) {
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const cardName = item?.card?.nameKo || '이 카드';
  const cardId = item?.card?.id || '';
  const bank = FINANCE_WEEKLY_CARD_ACTIONS[cardId];
  const role = dayLabel;

  const openFallback = [
    `${cardName}의 "${keyword}" 신호가 살아 있어 ${role}에는 예산 한도를 지키며 집행하기 좋습니다.`,
    `${cardName} 기준으로 "${keyword}" 축이 열려 있어 ${role}에는 지출/저축 균형을 맞추기 수월합니다.`
  ];
  const cautiousFallback = [
    `${cardName}의 "${keyword}" 변동성이 있어 ${role}에는 결제 전 점검을 먼저 두는 편이 좋겠습니다.`,
    `${cardName} 기준으로 "${keyword}" 구간의 리스크가 있어 ${role}에는 손실 방어를 우선하는 편이 안전합니다.`
  ];

  const options = open && riskScore < 3
    ? (bank?.open?.length ? bank.open : openFallback)
    : (bank?.cautious?.length ? bank.cautious : cautiousFallback);

  const raw = pickByNumber(options, seed);
  return pickDistinctWeeklyPhrase(raw, `${dayLabel}:finance:${seed}`, memory);
}

function pickDistinctWeeklyPhrase(text = '', keySeed = '', memory = null) {
  const value = String(text || '').trim();
  if (!value || !memory) return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!memory.has(normalized)) {
    memory.add(normalized);
    return value;
  }
  const variants = [
    normalized
      .replace('좋습니다.', '좋겠습니다.')
      .replace('필요합니다.', '필요해 보입니다.')
      .replace('안전합니다.', '안정적입니다.'),
    normalized
      .replace('먼저', '우선')
      .replace('좋겠습니다.', '권장됩니다.')
  ].filter((v) => v && !memory.has(v));
  if (variants.length) {
    const picked = pickByNumber(variants, hashText(keySeed));
    memory.add(picked);
    return picked;
  }
  return value;
}

const FINANCE_WEEKLY_CARD_ACTIONS = {
  'major-0': {
    open: [
      '탐색 성향이 강한 날이라 소액 실험 예산만 허용하고 큰 결제는 분리해 두세요.',
      '새 시도를 해보기 좋은 흐름이지만, 금액 상한을 먼저 정한 뒤 집행하는 편이 안정적입니다.'
    ],
    cautious: [
      '새로운 소비 시도가 과해질 수 있어 오늘은 필수 지출만 집행하는 편이 좋겠습니다.',
      '호기심 지출이 늘 수 있으니 테스트성 결제는 한 건으로 제한해 두세요.'
    ]
  },
  'major-4': {
    open: [
      '통제력이 살아 있는 카드라 고정비/변동비 기준을 다시 세우고 집행하면 좋습니다.',
      '규칙 기반 운영이 잘 맞는 흐름이라 예산 룰을 엄격히 적용해도 무리가 적습니다.'
    ],
    cautious: [
      '통제가 과해져 필요한 집행까지 늦출 수 있으니 우선순위 1개만 먼저 집행하세요.',
      '지출 억제가 과도해지지 않도록 필수 항목은 일정대로 처리하는 편이 좋습니다.'
    ]
  },
  'major-15': {
    open: [
      '유혹 신호가 강한 카드라 계획 외 결제는 24시간 유예 규칙을 두는 편이 좋겠습니다.',
      '충동 지출 가능성이 있어 쇼핑/구독 결제는 오늘 즉시 처리하지 않는 편이 안전합니다.'
    ],
    cautious: [
      '손실 위험이 큰 카드라 오늘은 비필수 결제를 보류하고 자동결제 항목부터 점검하세요.',
      '의존 소비 패턴이 올라올 수 있어 현금흐름 점검과 지출 차단이 먼저입니다.'
    ]
  },
  'major-16': {
    open: [
      '변동 카드이므로 예비비를 먼저 확보하고 지출 집행 순서를 조정해 두세요.',
      '예상 밖 지출에 대비해 오늘은 고정비 안정화부터 끝내는 편이 좋습니다.'
    ],
    cautious: [
      '급변 리스크가 큰 카드라 신규 결제는 미루고 손실 한도부터 고정하세요.',
      '예상치 못한 비용이 생기기 쉬워 오늘은 방어형 운영으로 전환하는 편이 안전합니다.'
    ]
  },
  'minor-pentacles-ace': {
    open: [
      '현금흐름 시작점 카드라 저축 자동이체나 예산 템플릿 고정을 시작하기 좋습니다.',
      '소액이더라도 자산 형성 루틴을 오늘부터 고정하면 효과를 보기 쉽습니다.'
    ],
    cautious: [
      '기초 세팅 카드가 흔들리면 지출 누수가 생기니 예산표 정리를 먼저 하세요.',
      '새로운 집행보다 계좌/지출 분류 기준을 먼저 정돈하는 편이 좋겠습니다.'
    ]
  },
  'minor-pentacles-seven': {
    open: [
      '점검 카드가 열린 날이라 투자/저축 성과를 검토하고 유지 항목을 확정하기 좋습니다.',
      '중간 점검 흐름이 좋아 수익보다 유지비 관점으로 재배치하면 안정성이 올라갑니다.'
    ],
    cautious: [
      '결과를 서두르면 실수가 생길 수 있어 오늘은 재평가와 기록 정리에 집중하세요.',
      '수익 기대보다 비용 구조 점검을 우선하면 변동성을 줄일 수 있습니다.'
    ]
  },
  'minor-swords-nine': {
    open: [
      '불안 신호가 있어 지출 결정을 밤에 미루지 말고 낮에 기준표로 확정하는 편이 좋습니다.',
      '심리 변동이 큰 카드라 체감 불안에 따른 충동 결제를 경계해야 합니다.'
    ],
    cautious: [
      '불안 기반 판단 오류가 생기기 쉬워 오늘은 큰 금액 결제를 보류하는 편이 안전합니다.',
      '심리적 압박 소비를 막기 위해 결제 전 2단계 확인 루틴을 두세요.'
    ]
  }
};

function summarizeCelticCross({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const current = pick('현재');
  const obstacle = pick('교차/장애');
  const root = pick('기반');
  const recentPast = pick('가까운 과거');
  const potential = pick('가능성');
  const nearFuture = pick('가까운 미래');
  const selfView = pick('자기 인식');
  const outer = pick('외부 환경');
  const fearHope = pick('희망·두려움');
  const outcome = pick('결과');
  const contextLabel = normalizeContextText(context);
  const tone = inferSummaryContextTone(context);
  const intent = inferCelticIntent(contextLabel);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const seed = hashText([
    contextLabel,
    current?.card?.id || '',
    obstacle?.card?.id || '',
    outcome?.card?.id || ''
  ].join(':'));

  const intro = contextLabel
    ? `질문 "${contextLabel}"로 켈틱 크로스를 펼쳐보면, 지금은 마음 정리와 행동 결단을 함께 맞춰야 흐름이 풀리는 국면입니다.`
    : '켈틱 크로스를 펼쳐보면, 지금은 중심 갈등을 정확히 짚고 행동 순서를 정하면 흐름이 빠르게 정리되는 국면입니다.';

  const lines = [
    intro,
    buildCelticPositionLine({ name: '현재', item: current, intent, seed: seed + 1 }),
    buildCelticPositionLine({ name: '교차/장애', item: obstacle, intent, seed: seed + 2 }),
    buildCelticPositionLine({ name: '기반', item: root, intent, seed: seed + 3 }),
    buildCelticPositionLine({ name: '가까운 과거', item: recentPast, intent, seed: seed + 4 }),
    buildCelticPositionLine({ name: '가능성', item: potential, intent, seed: seed + 5 }),
    buildCelticPositionLine({ name: '가까운 미래', item: nearFuture, intent, seed: seed + 6 }),
    buildCelticPositionLine({ name: '자기 인식', item: selfView, intent, seed: seed + 7 }),
    buildCelticPositionLine({ name: '외부 환경', item: outer, intent, seed: seed + 8 }),
    buildCelticPositionLine({ name: '희망·두려움', item: fearHope, intent, seed: seed + 9 }),
    buildCelticPositionLine({ name: '결과', item: outcome, intent, seed: seed + 10 }),
    buildCelticConclusion({
      current,
      obstacle,
      nearFuture,
      outcome,
      intent,
      levelHint,
      seed: seed + 11
    })
  ];

  return lines.filter(Boolean).join('\n\n');
}

function inferCelticIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (['relationship-repair', 'relationship', 'career', 'finance'].includes(inferred)) return inferred;
  return 'general';
}

function formatCelticCard(item) {
  if (!item?.card) return '카드 신호 확인 필요';
  return `${item.card.nameKo} ${item.orientation === 'upright' ? '정방향' : '역방향'}`;
}

function buildCelticPositionLine({ name, item, intent = 'general', seed = 0 }) {
  const cardLabel = formatCelticCard(item);
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const orientation = item?.orientation === 'reversed' ? 'reversed' : 'upright';

  const relationLines = {
    현재: {
      upright: [
        `현재 상황은 ${cardLabel}입니다. 지금 두 사람 사이에는 아직 대화를 다시 열 수 있는 여지가 남아 있고, 감정을 정리하면 화해의 문이 열릴 수 있습니다.`,
        `현재 상황 카드가 ${cardLabel}로 나왔습니다. 마음이 복잡해도 관계를 완전히 끊고 싶은 마음보다는 정리하고 풀고 싶은 의지가 더 크게 보입니다.`
      ],
      reversed: [
        `현재 상황은 ${cardLabel}입니다. 지금은 감정이 겉으로 표현되기보다 안에서 꼬여 있어, 말 한마디가 더 크게 상처로 번질 수 있는 시기입니다.`,
        `현재 상황 카드가 ${cardLabel}로 보입니다. 화해 의지는 있지만 감정 피로가 쌓여 있어 바로 해결하려고 밀면 오히려 경직될 가능성이 큽니다.`
      ]
    },
    '교차/장애': {
      upright: [
        `현재의 장애물은 ${cardLabel}입니다. "${keyword}" 이슈가 두 사람 사이에서 반복되며, 서로의 의도를 추측하는 패턴이 화해를 늦추고 있습니다.`,
        `교차/장애 카드가 ${cardLabel}로 나타났습니다. 갈등 자체보다 "${keyword}"을 둘러싼 해석 차이가 커져 대화가 어긋나는 흐름입니다.`
      ],
      reversed: [
        `현재의 장애물은 ${cardLabel}입니다. 이미 소모된 감정이 남아 있어 사소한 말도 방어적으로 받아들여질 가능성이 높습니다.`,
        `교차/장애 카드가 ${cardLabel}입니다. 문제보다 감정의 잔여 열기가 더 큰 벽이 되어, 화해 시도를 주저하게 만드는 모습입니다.`
      ]
    },
    기반: {
      upright: [
        `이 상황의 기반에는 ${cardLabel}이 있습니다. 겉으로는 다툼이 보여도 바닥에는 관계를 지키고 싶은 마음이 아직 남아 있습니다.`,
        `기반 카드는 ${cardLabel}입니다. 핵심 원인은 사건 하나보다 오래 쌓인 "${keyword}" 패턴에 가까워 보여, 원인 정리가 먼저 필요합니다.`
      ],
      reversed: [
        `이 상황의 기반은 ${cardLabel}입니다. 마음속 불편을 제때 말하지 못한 채 쌓아둔 것이 지금의 거리감으로 번진 흐름입니다.`,
        `기반 카드가 ${cardLabel}로 나왔습니다. 속마음과 겉표현이 어긋난 시간이 길어져 오해가 고착된 흔적이 보입니다.`
      ]
    },
    '가까운 과거': {
      upright: [
        `가까운 과거에는 ${cardLabel}이 보입니다. 원래 관계의 결은 따뜻했지만, 최근 "${keyword}" 사건에서 리듬이 무너진 것으로 읽힙니다.`,
        `가까운 과거 카드가 ${cardLabel}입니다. 이전에는 충분히 회복 가능했던 관계였으나, 최근 한 번의 어긋남이 크게 확대된 흐름입니다.`
      ],
      reversed: [
        `가까운 과거에는 ${cardLabel}이 놓여 있습니다. 최근 대화에서 감정 소통이 막히면서 작은 불편이 갈등으로 커졌을 가능성이 높습니다.`,
        `가까운 과거 카드가 ${cardLabel}입니다. 이미 관계 피로 신호가 있었는데 제때 정리되지 않아 지금의 충돌로 이어진 모습입니다.`
      ]
    },
    가능성: {
      upright: [
        `당신이 바라는 가능성은 ${cardLabel}입니다. 결국 이 관계를 건강한 방식으로 회복하고 싶다는 의지가 분명하게 드러납니다.`,
        `가능성 카드가 ${cardLabel}로 보여요. 지금 마음속 목표는 승패가 아니라 관계의 균형을 되찾는 데 있습니다.`
      ],
      reversed: [
        `당신이 바라는 가능성은 ${cardLabel}입니다. 화해하고 싶지만 자존심이 상할까 두려워 스스로 속도를 늦추는 모습도 함께 보입니다.`,
        `가능성 카드가 ${cardLabel}입니다. 관계를 풀고 싶은 마음과 상처받기 싫은 마음이 동시에 작동해 망설임이 커진 상태입니다.`
      ]
    },
    '가까운 미래': {
      upright: [
        `가까운 미래에는 ${cardLabel}이 나왔습니다. 먼저 짧은 대화를 열 기회가 들어오며, 타이밍을 놓치지 않으면 흐름이 부드럽게 바뀔 수 있습니다.`,
        `가까운 미래 카드가 ${cardLabel}입니다. 곧 감정 충돌 대신 사실 확인 중심으로 대화를 시작할 수 있는 창이 열릴 가능성이 큽니다.`
      ],
      reversed: [
        `가까운 미래는 ${cardLabel}입니다. 서두르면 다시 어긋날 수 있으니, 바로 결론을 내기보다 대화 강도를 낮추는 전략이 필요합니다.`,
        `가까운 미래 카드가 ${cardLabel}로 보여요. 화해 시도는 가능하지만 타이밍을 급히 잡으면 재충돌 위험이 있어 단계적 접근이 필요합니다.`
      ]
    },
    '자기 인식': {
      upright: [
        `당신의 현재 인식은 ${cardLabel}입니다. 관계를 소중히 여기고 있고, 내가 먼저 정리하면 풀릴 수 있다는 감각도 살아 있습니다.`,
        `자기 인식 카드가 ${cardLabel}입니다. 마음속에는 여전히 이 우정을 지키고 싶다는 중심이 분명하게 남아 있습니다.`
      ],
      reversed: [
        `자기 인식은 ${cardLabel}입니다. 상처받은 마음이 커서 먼저 다가가고 싶으면서도 동시에 방어적으로 굳어지는 모습이 보입니다.`,
        `자기 인식 카드가 ${cardLabel}입니다. 진심은 있지만 표현 방식에서 불안이 커져 말을 고르기 어려운 상태입니다.`
      ]
    },
    '외부 환경': {
      upright: [
        `외부 환경은 ${cardLabel}입니다. 주변 조건이 완전히 불리하지는 않아서, 대화 통로만 잘 잡으면 화해를 도울 요소가 있습니다.`,
        `외부 환경 카드가 ${cardLabel}입니다. 상황이 천천히라도 정리될 여지는 있으니, 제3의 변수에 휘둘리지 않는 것이 중요합니다.`
      ],
      reversed: [
        `외부 환경은 ${cardLabel}입니다. 지금은 일정·상황·주변 반응이 대화를 지연시키는 요인으로 작동할 수 있어 답답함이 커질 수 있습니다.`,
        `외부 환경 카드가 ${cardLabel}입니다. 관계 문제 외에도 외부 스트레스가 겹쳐 화해 시도가 자꾸 뒤로 밀리는 흐름입니다.`
      ]
    },
    '희망·두려움': {
      upright: [
        `희망과 두려움 자리에는 ${cardLabel}이 있습니다. 다시 잘 풀고 싶은 기대가 크지만, 또 충돌할까 걱정하는 마음도 함께 존재합니다.`,
        `희망·두려움 카드가 ${cardLabel}입니다. 관계를 살리고 싶은 의지와 다시 상처받을까 두려운 감정이 동시에 올라오는 상태입니다.`
      ],
      reversed: [
        `희망과 두려움은 ${withKoreanParticle(cardLabel, '으로', '로')} 드러납니다. 마음이 예민해져 있어 상대 반응을 과하게 해석할 수 있으니 감정 속도 조절이 필요합니다.`,
        `희망·두려움 카드가 ${cardLabel}입니다. 화해를 바라면서도 실패 장면을 먼저 떠올려 스스로 시도를 멈추게 할 수 있는 흐름입니다.`
      ]
    },
    결과: {
      upright: [
        `결과 카드는 ${cardLabel}입니다. 지금 흐름대로 가면 관계를 다시 맞춰갈 가능성이 충분하며, 먼저 대화의 물꼬를 트는 쪽이 유리합니다.`,
        `마지막 결과는 ${cardLabel}입니다. 결론적으로는 화해 가능성이 살아 있으니, 진심을 짧고 분명하게 전하는 행동이 핵심입니다.`
      ],
      reversed: [
        `결과 카드는 ${cardLabel}입니다. 망설임이 길어지면 관계 피로가 커질 수 있으니, 지나친 계산보다 실행 타이밍을 잡는 결단이 필요합니다.`,
        `마지막 결과가 ${cardLabel}입니다. 균형을 계속 재기만 하면 흐름이 정체되므로, 작은 화해 행동을 먼저 실행해야 결과가 바뀝니다.`
      ]
    }
  };

  const generalLines = {
    upright: `${name} 포지션은 ${cardLabel}입니다. "${keyword}" 신호가 비교적 열려 있어 핵심 포인트를 잡고 실행하면 흐름이 정리될 가능성이 큽니다.`,
    reversed: `${name} 포지션은 ${cardLabel}입니다. "${keyword}" 신호가 조정 구간이라 속도를 낮추고 기준을 재정렬하는 접근이 필요합니다.`
  };

  if (intent === 'relationship-repair' || intent === 'relationship') {
    const bank = relationLines[name];
    if (bank) {
      return pickByNumber(orientation === 'upright' ? bank.upright : bank.reversed, seed);
    }
  }

  return orientation === 'upright' ? generalLines.upright : generalLines.reversed;
}

function buildCelticConclusion({
  current,
  obstacle,
  nearFuture,
  outcome,
  intent = 'general',
  levelHint = '',
  seed = 0
}) {
  const currentLabel = formatCelticCard(current);
  const obstacleLabel = formatCelticCard(obstacle);
  const futureLabel = formatCelticCard(nearFuture);
  const outcomeLabel = formatCelticCard(outcome);
  const resultIsOpen = outcome?.orientation === 'upright';

  const relationshipClose = [
    `정리하면, 중심축(${currentLabel})과 장애축(${obstacleLabel})의 긴장을 먼저 풀어야 가까운 미래(${futureLabel})와 결과(${outcomeLabel})가 좋은 쪽으로 이어집니다.`,
    resultIsOpen
      ? '결론은 화해 가능성이 충분히 열려 있습니다. 이번에는 누가 맞았는지보다 관계를 다시 안전하게 만드는 대화 방식이 핵심입니다.'
      : '결론은 아직 망설임이 크지만, 지금 행동을 바꾸면 결과 흐름을 충분히 전환할 수 있습니다. 멈춰 있는 시간보다 작은 접촉이 더 중요합니다.',
    pickByNumber([
      '지금 실행할 한 문장: "내가 먼저 감정 정리해서 이야기하고 싶어. 네 입장도 먼저 듣고 싶어."',
      '지금 실행할 한 문장: "서운했던 부분은 천천히 풀고 싶어. 네가 느낀 점을 먼저 들려줄래?"',
      '지금 실행할 한 문장: "다툰 건 마음에 남지만, 관계를 풀고 싶어. 짧게라도 대화할 수 있을까?"'
    ], seed),
    '한 줄 테마: 관계 켈틱은 갈등 원인보다 대화 순서와 속도 조절을 먼저 맞출 때 결과 전환 가능성이 커집니다.',
    levelHint
  ];

  const generalClose = [
    `정리하면, 중심축(${currentLabel})과 장애축(${obstacleLabel})을 먼저 해소할 때 가까운 미래(${futureLabel})에서 결과(${outcomeLabel})로 넘어가는 흐름이 안정됩니다.`,
    resultIsOpen
      ? '결론은 실행 가능성이 비교적 열려 있습니다. 우선순위 하나를 정해 작은 실행으로 흐름을 붙여보세요.'
      : '결론은 조정이 필요한 흐름입니다. 무리한 확장보다 핵심 병목 하나를 먼저 줄이는 쪽이 유리합니다.',
    '지금 실행할 한 문장: "이번 이슈에서 가장 먼저 정리할 핵심 한 가지를 지금 바로 결정하겠습니다."',
    '한 줄 테마: 켈틱은 중심축-장애축-결과축을 한 줄로 연결해 읽을 때 실행 기준이 가장 선명해집니다.',
    levelHint
  ];

  const lines = intent === 'relationship-repair' || intent === 'relationship' ? relationshipClose : generalClose;
  return lines.filter(Boolean).join(' ');
}

function summarizeYearlyFortune({ items, context = '', level = 'beginner' }) {
  const contextLabel = normalizeContextText(context);
  const yearlyIntent = inferYearlyIntent(contextLabel);
  const monthly = items
    .map((item) => {
      const match = String(item.position?.name || '').match(/^([1-9]|1[0-2])월$/);
      if (!match) return null;
      return {
        month: Number(match[1]),
        cardName: item.card.nameKo,
        orientation: item.orientation,
        keywords: item.card.keywords || []
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.month - b.month);

  const q1 = monthly.filter((m) => m.month >= 1 && m.month <= 3);
  const q2 = monthly.filter((m) => m.month >= 4 && m.month <= 6);
  const q3 = monthly.filter((m) => m.month >= 7 && m.month <= 9);
  const q4 = monthly.filter((m) => m.month >= 10 && m.month <= 12);
  const quarters = [
    { label: '1분기(1~3월)', months: q1 },
    { label: '2분기(4~6월)', months: q2 },
    { label: '3분기(7~9월)', months: q3 },
    { label: '4분기(10~12월)', months: q4 }
  ];

  const scoreQuarter = (months) =>
    months.reduce((acc, m) => acc + (m.orientation === 'upright' ? 1 : -1), 0);
  const quarterScores = quarters.map((q) => ({ ...q, score: scoreQuarter(q.months) }));
  const strongest = [...quarterScores].sort((a, b) => b.score - a.score)[0];
  let weakest = [...quarterScores].sort((a, b) => a.score - b.score)[0];
  if (weakest.label === strongest.label) {
    weakest = [...quarterScores].sort((a, b) => a.score - b.score)
      .find((q) => q.label !== strongest.label) ?? weakest;
  }
  const topKeywords = pickTopKeywords(items, 3);
  const keywordText = topKeywords.length ? topKeywords.join(', ') : '핵심 테마';
  const isJobTimingQuestion = isCareerTimingContext(contextLabel);
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;

  const overall = buildYearlyOverallLine({
    contextLabel,
    keywordText,
    strongestLabel: strongest.label,
    weakestLabel: weakest.label
  });

  const quarterLines = buildQuarterNarratives({
    quarterScores,
    intent: yearlyIntent,
    isJobTimingQuestion
  }).join(' ');

  const monthlyLines = buildYearlyMonthlyNarratives({
    monthly,
    intent: yearlyIntent,
    isJobTimingQuestion
  }).join(' ');

  const timingClose = isJobTimingQuestion
    ? `취직 시기 관점으로 정리하면, 언제 무엇을 할지 기준은 분명합니다. ${strongest.label}에는 지원서 제출과 면접 일정을 본격적으로 열고, ${weakest.label}에는 이력서·포트폴리오 보완과 직무 정합성 점검에 집중해 주세요. ${levelHint}`
    : yearlyIntent === 'finance'
      ? `재물운 관점에서는 두 갈래로 운영하시면 됩니다. 확장 구간인 ${strongest.label}에는 계획형 집행 1~2개만 기준 안에서 실행하고, 조정 구간인 ${weakest.label}에는 신규 지출을 줄이며 누수 점검과 현금 보존을 우선해 주세요. ${levelHint}`
    : `마지막으로 ${strongest.label}은 확장 구간, ${weakest.label}은 정비 구간으로 나눠 운영하시면 올해 리딩을 실제 행동으로 옮기기가 훨씬 수월해집니다. ${levelHint}`;
  const yearlyThemeKeyword = monthly.map((m) => m.keywords?.[0]).find(Boolean) || '연간 리듬';
  const yearlyThemeLine = `한 줄 테마: 올해는 '${yearlyThemeKeyword}' 키워드를 분기 기준으로 나눠 운영할 때 변동성을 줄이기 좋습니다.`;

  return [
    `총평: ${overall}`,
    `분기별 운세: ${quarterLines}`,
    `월별 운세: ${monthlyLines}`,
    yearlyThemeLine,
    timingClose
  ].join('\n\n');
}

function inferYearlyIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (inferred === 'career' && !isCareerTimingContext(context)) {
    return 'general';
  }
  if (inferred === 'health') return 'daily';
  return inferred;
}

function isCareerTimingContext(context = '') {
  const text = String(context || '').toLowerCase();
  const hardCareerSignals = [
    '취업',
    '이직',
    '면접',
    '지원',
    '지원서',
    '이력서',
    '포트폴리오',
    '오퍼',
    '협상',
    '직무',
    '입사',
    '퇴사',
    '채용'
  ];
  return hardCareerSignals.some((keyword) => text.includes(keyword));
}

function buildNonCareerMonthlyAction({ intent, orientation }) {
  if (intent === 'social') {
    return orientation === 'upright'
      ? '주변과의 접점을 늘리되 짧고 일관된 태도를 유지하면 평판 안정에 도움이 됩니다.'
      : '해명보다 말투와 반응 템포를 정리해 인상 피로를 먼저 줄이는 편이 좋습니다.';
  }
  if (intent === 'relationship') {
    return orientation === 'upright'
      ? '관계를 조금 더 가까이 가져갈 대화나 제안을 해보기에 좋은 달입니다.'
      : '감정 해석을 서두르기보다 오해를 줄이는 대화가 더 중요한 달입니다.';
  }
  if (intent === 'finance') {
    return orientation === 'upright'
      ? '예산 범위 안에서 계획적으로 운영하면 안정적인 성과를 만들기 좋은 달입니다.'
      : '확장보다 지출 통제와 위험 점검을 먼저 두는 편이 좋은 달입니다.';
  }
  return orientation === 'upright'
    ? '실행 반경을 넓혀도 흐름이 받쳐주는 달입니다.'
    : '속도를 낮추고 정리부터 해야 흔들림이 줄어드는 달입니다.';
}

function buildYearlyOverallLine({ contextLabel, keywordText, strongestLabel, weakestLabel }) {
  const base = contextLabel
    ? `"${contextLabel}"를 기준으로 보면`
    : '올해 전체 흐름을 보면';
  const templates = [
    `${base} 초반부터 끝까지 같은 템포로 밀기보다 분기마다 강약을 조절해 가는 편이 더 안정적입니다. 올해를 관통하는 키워드는 ${keywordText}이며, 특히 ${strongestLabel} 쪽에서 흐름이 가장 잘 살아날 가능성이 큽니다. 다만 ${weakestLabel}은 무리한 확장보다 점검과 보완을 우선하는 편이 좋겠습니다.`,
    `${base} 한 번에 크게 확장하기보다 분기별로 전략을 나눠 운영하는 방식이 더 정확합니다. 핵심 키워드는 ${keywordText}로 읽히고, 실행 탄력은 ${strongestLabel}에서 상대적으로 높게 나타납니다. 반대로 ${weakestLabel}은 속도를 낮춰 리듬을 정리하는 구간으로 보입니다.`,
    `${base} 올해는 직선형 추진보다 분기별 조정형 운영이 더 잘 맞습니다. 키워드 축은 ${keywordText}이고, 실제 반응이 붙기 쉬운 구간은 ${strongestLabel}입니다. ${weakestLabel}은 준비 밀도와 점검 품질을 먼저 끌어올리면 전체 안정성이 좋아집니다.`,
    `${base} 같은 강도로 계속 달리기보다 분기마다 역할을 달리 가져가는 편이 결과적으로 유리합니다. 올해 핵심 키워드는 ${keywordText}이며, ${strongestLabel}은 실행을 조금 넓혀보기 좋은 구간입니다. ${weakestLabel}은 정비 중심으로 운영할 때 흐름이 덜 흔들립니다.`
  ];
  const seed = `${contextLabel}:${keywordText}:${strongestLabel}:${weakestLabel}`;
  let score = 0;
  for (let i = 0; i < seed.length; i += 1) score += seed.charCodeAt(i);
  return templates[score % templates.length];
}

function buildQuarterNarratives({ quarterScores, intent, isJobTimingQuestion }) {
  const quartersWithRole = quarterScores.map((q, idx) => ({
    ...q,
    role: quarterRoleByIndex(idx)
  }));
  return quartersWithRole.map((q, idx) => {
    const mode = q.score >= 1 ? 'open' : q.score <= -1 ? 'adjust' : 'balanced';
    const focus = buildQuarterFocus({ index: idx, role: q.role, intent, mode, isJobTimingQuestion });
    const action = buildQuarterAction({ index: idx, role: q.role, intent, mode, isJobTimingQuestion });
    return `${q.label}은 ${focus} ${action}`;
  });
}

function quarterRoleByIndex(index) {
  const roles = ['기반 다지기', '실행 점검', '확장 조율', '연말 정리'];
  return roles[index] ?? '운영';
}

const MONTH_ROLE_GUIDE = {
  '1월': '출발 전에 기준과 방향을 세우는 자리',
  '2월': '초기 적응 리듬을 맞추는 자리',
  '3월': '초기 실행의 반응을 확인하는 자리',
  '4월': '실행 범위를 조절해 확장 여부를 판단하는 자리',
  '5월': '변수와 마찰을 조정하는 자리',
  '6월': '상반기 성과와 보완점을 정리하는 자리',
  '7월': '하반기 시작 전에 리듬을 재정비하는 자리',
  '8월': '중반 추진력을 회복해 실행을 늘리는 자리',
  '9월': '성과와 피로를 함께 조율하는 자리',
  '10월': '리스크를 점검해 마무리 계획을 세우는 자리',
  '11월': '수확 구간의 완성도를 높이는 자리',
  '12월': '연말 정리와 다음 해 전환을 준비하는 자리'
};

function buildQuarterFocus({ index, role, intent, mode, isJobTimingQuestion }) {
  const roleObject = withKoreanParticle(role, '을', '를');
  if (role === '연말 정리') {
    if (intent === 'career' || isJobTimingQuestion) {
      return '연말 분기인 만큼 새로 넓히는 움직임보다 올해 진행한 결과를 정리하고 최종 방향을 확정하는 데 무게를 두는 편이 좋습니다.';
    }
    if (intent === 'relationship') {
      return '연말 분기에서는 관계의 속도를 올리기보다 올해의 대화 패턴을 정리하고 다음 해 기준을 세우는 편이 좋겠습니다.';
    }
    if (intent === 'finance') {
      return '연말 분기에서는 확장보다 결산과 위험 점검을 우선해 재정 리듬을 정리하는 편이 좋겠습니다.';
    }
    if (intent === 'social') {
      return '연말 분기에서는 관계를 무리하게 넓히기보다, 한 해 동안 쌓인 인상과 대화 패턴을 정리해 다음 해 기준을 세우는 편이 좋겠습니다.';
    }
    return '연말 분기에서는 새로운 확장보다 올해 흐름을 정리하고 다음 해 운영 기준을 세우는 쪽이 맞겠습니다.';
  }

  if (intent === 'career' || isJobTimingQuestion) {
    if (mode === 'open') {
      return pickByNumber([
        `카드 흐름이 비교적 열려 있어 ${roleObject} 진행하기에 부담이 크지 않은 구간입니다.`,
        `리딩 결이 부드럽게 열려 있어 ${role} 단계의 실행을 이어가기 수월한 구간으로 보입니다.`,
        `흐름이 받쳐주는 편이라 ${role} 과정에서 시도한 움직임이 반응으로 이어질 가능성이 있는 구간입니다.`
      ], index);
    }
    if (mode === 'adjust') {
      return pickByNumber([
        `카드 흐름이 조정 구간이라 ${role}에서 속도보다 정비에 무게를 두는 편이 좋습니다.`,
        `리딩이 과속을 경계하고 있어 ${role} 과정에서는 보완과 점검을 먼저 두는 편이 안정적입니다.`,
        `흐름이 다소 거칠 수 있어 ${role} 단계에서는 실행 폭을 줄이고 준비 밀도를 높이는 편이 맞습니다.`
      ], index);
    }
    return pickByNumber([
      `흐름이 중간값에 가까워 ${role} 단계에서 확장과 정비를 균형 있게 가져가는 편이 좋습니다.`,
      `리딩상 강약이 크지 않아 ${role} 과정에서 준비와 실행의 비중을 반반으로 두는 방식이 맞겠습니다.`,
      `한쪽으로 치우치기보다 ${role} 단계에서는 작은 실행과 보완을 함께 가져가기 좋은 구간입니다.`
    ], index);
  }

  if (intent === 'relationship') {
    if (mode === 'open') return '관계 흐름이 열려 있어 대화 접점을 늘리기 좋은 구간입니다.';
    if (mode === 'adjust') return '감정 해석이 엇갈릴 수 있어 속도를 늦추는 편이 좋은 구간입니다.';
    return '대화와 거리 조절을 균형 있게 가져가기 좋은 구간입니다.';
  }

  if (intent === 'finance') {
    if (mode === 'open') return '재정 흐름이 비교적 안정적이라 계획 실행이 수월한 구간입니다.';
    if (mode === 'adjust') return '지출 변동성이 올라갈 수 있어 점검 중심으로 운영해야 하는 구간입니다.';
    return '공격적 확장보다 계획 유지에 초점을 두기 좋은 구간입니다.';
  }

  if (intent === 'social') {
    if (mode === 'open') return '주변 인식 흐름이 열려 있어 협업 접점을 넓히기 좋은 구간입니다.';
    if (mode === 'adjust') return '피로감이 인상에 반영될 수 있어 말투와 반응 속도를 정리하는 편이 좋은 구간입니다.';
    return '신뢰 확장과 거리 조절을 균형 있게 가져가기 좋은 구간입니다.';
  }

  if (mode === 'open') return '흐름이 열려 있어 계획한 일을 무리 없이 이어가기 좋은 구간입니다.';
  if (mode === 'adjust') return '흐름 조정이 필요한 구간이라 정비를 먼저 두는 편이 좋겠습니다.';
  return '강약이 크지 않아 균형 운영이 잘 맞는 구간입니다.';
}

function buildQuarterAction({ index, role, intent, mode, isJobTimingQuestion }) {
  if (role === '연말 정리') {
    if (intent === 'career' || isJobTimingQuestion) {
      return pickByNumber([
        '올해 지원/면접 결과를 한 번 정리하고, 최종 선택 기준을 확정해 다음 해 계획으로 넘겨두시면 좋겠습니다.',
        '진행한 건의 결과를 결산한 뒤, 유지할 전략과 바꿀 전략을 구분해 다음 해 시작점을 정해보세요.',
        '연말에는 성과를 확인하고 남은 과제를 목록화해 내년 1분기 실행 항목으로 연결해두시면 좋겠습니다.'
      ], index);
    }
    if (intent === 'relationship') {
      return '올해 관계에서 효과가 있었던 대화 방식과 부담이 컸던 방식을 구분해 다음 해 기준으로 정리해보세요.';
    }
    if (intent === 'finance') {
      return '연간 지출·저축 흐름을 결산하고 내년 고정비/변동비 기준을 다시 세워두시면 안정적입니다.';
    }
    if (intent === 'social') {
      return '올해 관계에서 반응이 좋았던 말투와 부담이 컸던 반응을 나눠 정리해 다음 해 대화 기준으로 고정해보세요.';
    }
    return '올해 실행과 결과를 짧게 결산해 다음 해의 우선순위를 미리 정리해두시면 흐름이 훨씬 편해집니다.';
  }

  if (intent === 'career' || isJobTimingQuestion) {
    if (mode === 'open') {
      return pickByNumber([
        `${role} 단계에서는 지원 채널을 조금 넓히고 면접 경험을 꾸준히 쌓아두시면 좋겠습니다.`,
        `${role} 구간에서는 작은 지원을 이어가면서 동시에 면접 감각을 유지하는 전략이 잘 맞겠습니다.`,
        `${role} 흐름에서는 접점 확보를 우선해 탐색 범위를 늘려보시면 다음 분기가 편해집니다.`
      ], index);
    }
    if (mode === 'adjust') {
      return pickByNumber([
        `${role} 단계에서는 지원 수를 늘리기보다 서류 완성도와 답변 구조를 정리해두시면 좋겠습니다.`,
        `${role} 구간에서는 결과를 서두르기보다 포트폴리오와 경력 서사 정비를 먼저 두시는 편이 안정적입니다.`,
        `${role} 흐름에서는 실행은 작게 유지하고 보완 루틴을 먼저 확보해두시면 부담이 줄어듭니다.`
      ], index);
    }
    return pickByNumber([
      `${role} 단계에서는 지원과 보완을 함께 가져가며 분기 말에 한 번 점검하는 방식이 잘 맞겠습니다.`,
      `${role} 구간에서는 움직임은 유지하되 제출 전 점검 루틴을 고정해두시면 좋겠습니다.`,
      `${role} 흐름에서는 작은 실행과 품질 보완을 병행하면 안정적으로 이어갈 수 있습니다.`
    ], index);
  }

  if (intent === 'relationship') {
    if (mode === 'open') return '감정 표현과 요청을 짧고 분명하게 전달해보시면 좋겠습니다.';
    if (mode === 'adjust') return '확인 대화를 먼저 두고 해석은 한 템포 늦추는 방식을 권합니다.';
    return '대화 빈도와 감정 강도를 중간값으로 맞춰 보시면 안정적입니다.';
  }

  if (intent === 'finance') {
    if (mode === 'open') return '예산 틀을 유지한 채 필요한 실행을 차분히 늘려보시면 좋겠습니다.';
    if (mode === 'adjust') return '고정비 점검과 소비 우선순위 재배치를 먼저 진행해보세요.';
    return '현금흐름 점검을 유지하면서 보수적으로 운영하시는 편이 좋겠습니다.';
  }

  if (intent === 'social') {
    if (mode === 'open') return '짧은 확인 인사와 명확한 피드백을 유지해 신뢰 접점을 꾸준히 늘려보시면 좋겠습니다.';
    if (mode === 'adjust') return '설명은 짧게 줄이고 반응을 천천히 확인해 오해와 피로를 먼저 낮춰보세요.';
    return '관계 확장과 거리 조절을 반반으로 두고 태도 일관성을 유지해보시면 안정적입니다.';
  }

  if (mode === 'open') return '계획한 실행을 작게라도 이어가며 리듬을 유지해보시면 좋겠습니다.';
  if (mode === 'adjust') return '속도를 조금 낮추고 정리할 부분부터 하나씩 점검해보시면 좋겠습니다.';
  return '확장보다 균형 운영을 우선해 흐름을 안정적으로 가져가시면 좋겠습니다.';
}

function buildYearlyMonthlyNarratives({ monthly, intent, isJobTimingQuestion }) {
  const lines = [];
  let prevSignature = '';

  for (const item of monthly) {
    const keyword = item.keywords?.[0] ?? '흐름';
    const monthLabel = `${item.month}월`;
    const monthRole = MONTH_ROLE_GUIDE[monthLabel] ?? '해당 달 역할';
    const mode = selectMonthlyMode({ intent, orientation: item.orientation, isJobTimingQuestion });
    const toneLine = buildMonthlyToneLine({
      intent,
      mode,
      keyword,
      cardName: item.cardName,
      month: item.month,
      monthRole
    });
    const actionLine = buildMonthlyActionLine({
      intent,
      mode,
      month: item.month,
      cardName: item.cardName,
      monthRole
    });

    const signature = `${mode}:${item.cardName}:${toneLine.slice(0, 18)}:${actionLine.slice(0, 18)}`;
    const adjustedAction = signature === prevSignature
      ? buildMonthlyFallbackAction({ intent, mode, month: item.month, cardName: item.cardName })
      : actionLine;

    lines.push(`${item.month}월(${item.cardName})은 ${toneLine} ${adjustedAction}`);
    prevSignature = signature;
  }

  return lines;
}

function selectMonthlyMode({ intent, orientation, isJobTimingQuestion }) {
  if (intent === 'career' || isJobTimingQuestion) {
    return orientation === 'upright' ? 'advance' : 'prepare';
  }
  if (intent === 'relationship') {
    return orientation === 'upright' ? 'open' : 'care';
  }
  if (intent === 'finance') {
    return orientation === 'upright' ? 'stabilize' : 'guard';
  }
  if (intent === 'social') {
    return orientation === 'upright' ? 'connect' : 'calibrate';
  }
  return orientation === 'upright' ? 'advance' : 'prepare';
}

function pickByNumber(options = [], n = 0) {
  if (!options.length) return '';
  return options[n % options.length];
}

function hashText(text = '') {
  let score = 0;
  const input = String(text);
  for (let i = 0; i < input.length; i += 1) score += input.charCodeAt(i);
  return score;
}

function buildMonthlyToneLine({ intent, mode, keyword, cardName, month, monthRole }) {
  const role = normalizeYearlyMonthRole(monthRole);
  const baseSeed = hashText(`${intent}:${mode}:${month}:${cardName}:${keyword}`);

  if (intent === 'career') {
    if (mode === 'advance') {
      return pickByNumber([
        `${cardName}의 ${keyword} 신호가 살아 있어 ${role}에서 외부 접점을 넓히기 좋은 결입니다.`,
        `${cardName} 기준으로 보면 ${keyword} 흐름이 열려 있어 ${role}의 실행 탄력이 붙기 쉽습니다.`,
        `${cardName} 카드가 ${keyword} 축을 밀어주고 있어 ${role}에서 행동 반경을 조금 넓혀도 무리가 적습니다.`
      ], baseSeed);
    }
    if (mode === 'balanced') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 중간값이라 ${role}에서는 준비와 실행의 비중을 균형 있게 두는 편이 좋겠습니다.`,
        `${cardName} 신호가 강하게 치우치지 않아 ${role}에서는 확장과 점검을 함께 가져가는 구성이 맞습니다.`,
        `${cardName} 흐름상 ${role}에서 속도를 크게 올리기보다 품질 점검을 병행하는 방식이 안정적입니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 조정 구간이라 ${role}에서는 결과를 서두르기보다 준비 밀도를 높이는 편이 맞겠습니다.`,
      `${cardName} 신호는 ${role}에서 병목 점검이 우선임을 보여주며, 실행 폭을 잠시 줄이는 편이 안전합니다.`,
      `${cardName} 카드가 ${keyword} 변동성을 시사하므로 ${role}에서는 보완 중심 운영이 더 유리합니다.`
    ], baseSeed);
  }

  if (intent === 'relationship') {
    if (mode === 'open') {
      return pickByNumber([
        `${cardName}의 ${keyword} 결이 열려 있어 ${role}에서 대화 접점을 늘리기 좋은 분위기입니다.`,
        `${cardName} 흐름에서는 ${keyword} 신호가 비교적 부드러워 ${role}의 관계 회복 시도가 유리합니다.`,
        `${cardName} 카드 기준으로 ${role}에서는 감정 교류를 먼저 열어도 무리가 적겠습니다.`
      ], baseSeed);
    }
    return pickByNumber([
        `${cardName}의 ${keyword} 결이 예민해 ${role}에서는 감정 속도를 낮추는 편이 관계에 도움이 됩니다.`,
        `${cardName} 흐름상 ${role}에서 해석 충돌이 생기기 쉬워 확인 대화를 먼저 두는 편이 좋겠습니다.`,
        `${cardName} 카드가 ${keyword} 변동을 시사하므로 ${role}에서는 단정 대신 반응 확인이 우선입니다.`
      ], baseSeed);
  }

  if (intent === 'finance') {
    if (mode === 'stabilize') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 안정 쪽이라 ${role}에서 계획형 운영이 잘 맞는 달입니다.`,
        `${cardName} 신호를 보면 ${role}에서는 수입·지출 기준을 유지할수록 체감 안정성이 올라갑니다.`,
        `${cardName} 카드가 ${keyword} 축을 받쳐줘 ${role}에서 예산 운영을 확장해도 무리가 적습니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 흔들릴 수 있어 ${role}에서는 지출 통제와 점검을 먼저 두는 편이 좋겠습니다.`,
      `${cardName} 신호는 ${role}에서 손실 방어를 우선하라는 메시지에 가깝습니다.`,
      `${cardName} 카드상 ${keyword} 변동성이 있어 ${role}에서는 보수적 운영이 더 안전합니다.`
    ], baseSeed);
  }

  if (intent === 'social') {
    if (mode === 'connect') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 열려 있어 ${role}에서 주변 신뢰를 쌓기 좋은 구간입니다.`,
        `${cardName} 신호를 보면 ${role}에서는 말투와 반응이 긍정 인상으로 이어지기 쉬운 결입니다.`,
        `${cardName} 카드 기준으로 ${role}에서 협업 접점을 넓혀도 무리가 적은 흐름입니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 예민해 ${role}에서는 해명보다 태도 일관성을 먼저 회복하는 편이 좋겠습니다.`,
      `${cardName} 신호는 ${role}에서 피로감 관리와 거리 조절이 우선임을 보여줍니다.`,
      `${cardName} 카드상 ${keyword} 변동이 있어 ${role}에서는 반응 속도를 낮춰 운영하는 편이 안정적입니다.`
    ], baseSeed);
  }

  if (mode === 'advance') {
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 열려 있어 ${role}에서 계획한 일을 진행하기 좋은 달입니다.`,
      `${cardName} 기준으로 ${keyword} 신호가 살아 있어 ${role}의 실행을 이어가기 수월합니다.`,
      `${cardName} 카드가 ${role} 단계의 추진력을 받쳐줘 작은 확장을 시도해보기 좋겠습니다.`
    ], baseSeed);
  }

  return pickByNumber([
    `${cardName}의 ${keyword} 흐름이 고르지 않아 ${role}에서는 속도를 조금 늦추는 편이 좋겠습니다.`,
    `${cardName} 신호는 ${role}에서 정비가 우선이라는 의미에 가깝습니다.`,
    `${cardName} 카드 기준으로 ${keyword} 변동이 있어 ${role}에서는 실행 폭을 줄여 운영하는 편이 안정적입니다.`
  ], baseSeed);
}

function buildMonthlyActionLine({ intent, mode, month, cardName, monthRole }) {
  const role = normalizeYearlyMonthRole(monthRole);
  const seed = hashText(`${intent}:${mode}:${month}:${cardName}`);

  if (intent === 'career') {
    if (mode === 'advance') {
      return pickByNumber([
        `${role}에서는 지원서 제출 수를 조금 늘리고 면접 일정을 부드럽게 확장해보세요.`,
        `${role} 기준으로 관심 공고 탐색을 넓히고 연락 채널을 한두 개 더 열어두시면 좋겠습니다.`,
        `${role} 구간에서는 작은 지원을 꾸준히 넣으면서 면접 감각을 유지하는 방식이 잘 맞겠습니다.`
      ], seed);
    }
    if (mode === 'balanced') {
      return pickByNumber([
        `${role}에서는 지원과 보완을 1:1로 두고 제출 전 점검 체크리스트를 짧게 돌려보세요.`,
        `${role} 구간에서는 지원은 유지하되 포트폴리오 문장 다듬기를 함께 가져가시면 안정적입니다.`,
        `${role}에서는 바깥 움직임을 작게 유지하면서 면접 답변 완성도를 같이 올려보세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 이력서 핵심 문장과 포트폴리오 흐름을 먼저 정리해두시면 다음 달이 수월합니다.`,
      `${role} 구간에서는 지원 수 확대보다 면접 답변과 경력 서사 보완에 시간을 쓰는 편이 좋겠습니다.`,
      `${role}에서는 직무 정합성 점검과 서류 완성도 보강을 우선해두시면 부담이 줄어듭니다.`
    ], seed);
  }

  if (intent === 'relationship') {
    if (mode === 'open') {
      return pickByNumber([
        `${role}에서는 짧고 솔직한 대화를 먼저 열어보시면 관계 흐름이 자연스럽게 이어질 수 있습니다.`,
        `${role} 구간에서는 요청과 감정을 간단히 나눠 말해보는 시도가 도움이 되겠습니다.`,
        `${role}에서는 상대 반응을 확인하는 가벼운 대화 제안을 해보기에 좋습니다.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 결론을 급히 내리기보다 오해를 줄이는 확인 대화를 먼저 가져가시면 좋겠습니다.`,
      `${role} 구간에서는 감정 표현 강도를 한 단계 낮추고 경계와 요청을 분리해서 전해보세요.`,
      `${role}에서는 거리 조절과 대화 템포 조정을 우선하면 관계 피로가 줄어듭니다.`
    ], seed);
  }

  if (intent === 'finance') {
    if (mode === 'stabilize') {
      return pickByNumber([
        `${role}에서는 예산 범위 안에서 계획한 지출을 유지하면 안정적인 결과를 만들기 좋습니다.`,
        `${role} 구간에서는 고정비와 변동비를 나눠 관리해보면 체감 통제력이 올라갑니다.`,
        `${role}에서는 작은 절약 습관을 유지하면서 필요한 지출만 선별해보세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 새로운 지출 확장보다 지출 항목 점검을 먼저 두는 편이 좋겠습니다.`,
      `${role} 구간에서는 손실 가능성이 있는 선택을 한 템포 늦추고 현금흐름부터 확인해보세요.`,
      `${role}에서는 고정비 정리와 소비 우선순위 재배치를 먼저 하시면 안정적입니다.`
    ], seed);
  }

  if (intent === 'social') {
    if (mode === 'connect') {
      return pickByNumber([
        `${role}에서는 먼저 인사/확인/감사 중 1가지를 분명히 표현해 신뢰를 쌓아보세요.`,
        `${role} 구간에서는 말투를 짧고 명확하게 유지해 주변의 오해 가능성을 낮춰보시면 좋겠습니다.`,
        `${role}에서는 협업 접점을 한 번 더 만들되 반응 확인을 꼭 함께 가져가보세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 설명을 길게 하기보다 핵심 한 문장으로 반응을 확인하는 편이 좋겠습니다.`,
      `${role} 구간에서는 대화 강도를 낮추고 거리 조절을 먼저 두면 피로가 줄어듭니다.`,
      `${role}에서는 경계와 요청을 분리해 말하는 방식으로 오해를 줄여보세요.`
    ], seed);
  }

  return mode === 'advance'
    ? `${role}에서는 계획한 일을 한두 가지라도 꾸준히 진행해보시면 좋겠습니다.`
    : `${role}에서는 속도를 늦추고 정비를 먼저 해두시면 다음 흐름이 훨씬 편안합니다.`;
}

function buildMonthlyFallbackAction({ intent, mode, month, cardName }) {
  const seed = hashText(`fallback:${intent}:${mode}:${month}:${cardName}`);
  if (intent === 'social') {
    return pickByNumber([
      '이번 달은 관계를 넓히기보다 일관된 말투와 반응을 유지해 인상 안정에 집중해보세요.',
      '해명보다 확인 대화 1개를 먼저 두고 주변 반응을 천천히 점검해보시는 편이 좋겠습니다.'
    ], seed);
  }
  if (intent === 'relationship') {
    return pickByNumber([
      '이번 달은 해석보다 반응 확인을 우선해 대화 온도를 안정시키는 데 집중해보세요.',
      '한 번에 많이 풀기보다 짧은 대화를 나눠 관계 리듬을 천천히 회복해보세요.'
    ], seed);
  }
  if (intent === 'finance') {
    return pickByNumber([
      '이번 달은 지출 로그를 짧게 기록해 새는 비용을 먼저 잡아보세요.',
      '확장 판단은 잠시 보류하고 고정비 구조를 먼저 정리해두는 편이 좋겠습니다.'
    ], seed);
  }
  if (intent === 'career') {
    return pickByNumber([
      '이번 달은 외부 실행 1개와 보완 1개를 짝으로 고정해 리듬을 유지해보세요.',
      '우선순위 1개를 명확히 정하고, 나머지는 다음 달로 넘기는 방식이 안정적입니다.'
    ], seed);
  }
  return pickByNumber([
    '이번 달은 실행 항목을 하나로 좁혀 결과를 확인하는 방식이 무리가 적습니다.',
    '이번 달은 과속보다 유지 가능한 리듬을 만드는 데 집중해보세요.'
  ], seed);
}

function normalizeYearlyMonthRole(monthRole = '') {
  const text = String(monthRole || '').trim();
  if (!text) return '해당 달 운영';
  if (text.endsWith('하는 자리')) return text.replace(/하는 자리$/, '하는 단계');
  if (text.endsWith('는 자리')) return text.replace(/는 자리$/, '는 구간');
  if (text.endsWith('자리')) return text.replace(/자리$/, '구간');
  return text;
}

function withKoreanParticle(word = '', consonantParticle = '이', vowelParticle = '가') {
  const text = String(word || '').trim();
  if (!text) return word;
  const ch = text.charCodeAt(text.length - 1);
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  if (ch < HANGUL_START || ch > HANGUL_END) return `${text}${vowelParticle}`;
  const hasFinalConsonant = (ch - HANGUL_START) % 28 !== 0;
  return `${text}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}

function pickTopKeywords(items, count = 3) {
  const counter = new Map();
  for (const item of items) {
    for (const keyword of item.card.keywords || []) {
      const key = String(keyword || '').trim();
      if (!key) continue;
      counter.set(key, (counter.get(key) || 0) + 1);
    }
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([keyword]) => keyword);
}

function inferSummaryContextTone(context = '') {
  const intent = analyzeQuestionContextSync(context).intent;
  if (intent === 'career') {
    return {
      mainHint: '이직/업무 이슈는 기대보다 내 체력과 일정이 버티는지부터 확인하는 게 안전합니다.',
      beginnerHint: '지금 당장 붙잡을 일 하나와 내려놓을 일 하나를 먼저 정해 보세요.',
      intermediateHint: '단기 성과와 장기 방향이 충돌하면, 지금 더 급한 쪽부터 순서를 정하세요.'
    };
  }
  if (intent === 'relationship' || intent === 'relationship-repair') {
    return {
      mainHint: '관계 이슈는 상대 마음을 추측하기보다 내 감정과 요청을 분명히 말할 때 흐름이 풀립니다.',
      beginnerHint: '상대에게 전할 한 문장을 먼저 정해두면 대화가 훨씬 덜 흔들립니다.',
      intermediateHint: '원하는 것과 불편한 것을 분리해서 말하면 갈등이 줄어듭니다.'
    };
  }
  if (intent === 'social') {
    return {
      mainHint: '대인 이슈는 의도 설명보다 반복되는 태도와 반응이 인상을 만듭니다.',
      beginnerHint: '오늘은 말투 하나와 반응 하나만 정돈해도 체감이 달라집니다.',
      intermediateHint: '상황별 대응 문장을 1개씩 고정하면 평판 변동성이 줄어듭니다.'
    };
  }
  if (intent === 'finance') {
    return {
      mainHint: '돈 문제는 수익 기대보다 지출 통제부터 잡을 때 마음이 안정됩니다.',
      beginnerHint: '오늘 줄일 지출 하나만 정해도 흐름이 바로 달라집니다.',
      intermediateHint: '유지 가능한 소비 리듬을 먼저 만들고 확장은 그다음에 보세요.'
    };
  }
  if (intent === 'daily' || intent === 'health') {
    return {
      mainHint: '오늘은 크게 벌리기보다 바로 체감되는 선택 하나에 집중해 보세요.',
      beginnerHint: '지금 할 일 하나와 줄일 일 하나만 나눠 정하면 마음이 훨씬 가벼워집니다.',
      intermediateHint: '오전/오후 페이스만 구분해도 오늘 흐름을 안정적으로 가져갈 수 있습니다.'
    };
  }
  if (intent === 'study') {
    return {
      mainHint: '지금은 완벽한 계획보다 오늘 끝낼 분량 하나를 정하는 편이 훨씬 효과적입니다.',
      beginnerHint: '지금 할 수 있는 가장 작은 단위부터 시작해 보세요.',
      intermediateHint: '무리해서 늘리기보다 꾸준히 이어질 분량으로 맞춰보세요.'
    };
  }
  return {
    mainHint: '핵심 하나만 정해서 움직이면 흐름이 훨씬 선명해집니다.',
    beginnerHint: '오늘 할 수 있는 작은 행동 하나만 바로 잡아보세요.',
    intermediateHint: '속도보다 지속 가능한 리듬을 우선하면 흔들림이 줄어듭니다.'
  };
}

function buildSummaryLead({
  spreadName,
  context = '',
  firstItem = null,
  topKeywords = [],
  uprightCount = 0,
  reversedCount = 0
}) {
  const contextLabel = normalizeContextText(context);
  const intent = inferYearlyIntent(context);
  if (spreadName === '원카드') {
    const yesNo = buildYesNoVerdict({
      contextLabel,
      firstItem,
      topKeywords,
      uprightCount,
      reversedCount
    });
    let keywordLine = topKeywords.length
      ? `핵심 키워드는 ${topKeywords.join(', ')}입니다.`
      : '핵심 키워드는 카드의 기본 의미 그대로 읽는 편이 안정적입니다.';
    if (intent === 'social' && topKeywords.length) {
      const safeKeywords = topKeywords.filter((k) => !/(갈등|충돌|대립|불화)/.test(String(k)));
      const riskKeywords = topKeywords.filter((k) => /(갈등|충돌|대립|불화)/.test(String(k)));
      if (safeKeywords.length && riskKeywords.length) {
        keywordLine = `핵심 키워드는 ${safeKeywords.join(', ')}이며, ${riskKeywords.join(', ')} 신호는 말투 조절 포인트로 보시면 좋겠습니다.`;
      } else if (safeKeywords.length) {
        keywordLine = `핵심 키워드는 ${safeKeywords.join(', ')}입니다.`;
      }
    }
    if (yesNo) {
      return `${yesNo.verdict} 이유: ${yesNo.reason}`;
    }
    const oneCardRisk = scoreOneCardRisk({
      firstItem,
      topKeywords,
      uprightCount,
      reversedCount
    });
    const verdictLine = intent === 'social'
      ? (uprightCount >= reversedCount
          ? '주변 인식은 전반적으로 긍정적인 쪽에 가깝습니다.'
          : '주변 인식은 피로 신호가 비칠 수 있어 조절이 필요한 쪽에 가깝습니다.')
      : intent === 'daily'
        ? (oneCardRisk >= 2
            ? '오늘 흐름은 정비와 속도 조절이 우선인 쪽에 가깝습니다.'
            : oneCardRisk === 1
              ? '오늘 흐름은 과속을 피하면 안정적으로 유지할 수 있는 쪽에 가깝습니다.'
              : '오늘 흐름은 비교적 안정적인 쪽에 가깝습니다.')
      : uprightCount >= reversedCount
        ? '결론은 진행해도 되는 쪽에 가깝습니다.'
        : '결론은 속도를 늦추고 조절하는 쪽에 가깝습니다.';
    return `${verdictLine} ${keywordLine}`;
  }

  const keywordLine = topKeywords.length
    ? `이번 흐름의 중심 키워드는 ${topKeywords.join(', ')}입니다.`
    : '이번 흐름은 한 가지 키워드로 단정하기보다 전체 결을 함께 보는 편이 좋습니다.';
  const flowLine = intent === 'relationship'
    ? (uprightCount >= reversedCount
        ? '전반적으로는 대화의 문이 열릴 여지가 있어도, 감정 속도 조절이 함께 필요합니다.'
        : '전반적으로는 결론을 서두르기보다 감정 온도를 맞추며 오해를 줄이는 쪽이 더 유리합니다.')
    : intent === 'relationship-repair'
      ? (uprightCount >= reversedCount
          ? '전반적으로는 회복 가능성은 남아 있지만, 화해를 서두르기보다 대화 순서를 안정적으로 잡는 편이 좋겠습니다.'
          : '전반적으로는 감정 과열 신호가 있어, 지금은 결론보다 긴장 완화와 반응 조절이 우선입니다.')
    : intent === 'social'
      ? (uprightCount >= reversedCount
          ? '전반적으로는 주변에서 당신을 믿음직하게 보는 흐름이 살아 있지만, 과한 책임감은 거리감을 만들 수 있어 강약 조절이 필요합니다.'
          : '전반적으로는 당신의 피로감이 인상에 반영될 수 있어, 해명보다 태도 안정과 리듬 회복이 더 유리합니다.')
    : intent === 'finance'
      ? (uprightCount >= reversedCount
          ? '전반적으로는 수익 기회가 보이더라도 지출 상한과 통제 규칙을 함께 두는 편이 유리합니다.'
          : '전반적으로는 확장보다 손실 방어와 현금흐름 점검을 먼저 두는 쪽이 더 안전합니다.')
    : intent === 'daily'
      ? (uprightCount >= reversedCount
          ? '전반적으로는 하루 운영 리듬이 비교적 안정적이어서 우선순위를 선명히 두면 무리 없이 지나가기 좋습니다.'
          : '전반적으로는 일정 과속을 줄이고 소모를 정리하는 쪽이 오늘 체감을 더 안정적으로 만듭니다.')
    : uprightCount >= reversedCount
      ? '전반적으로는 추진 신호가 있지만, 우선순위를 좁혀 운영할 때 체감 안정성이 높아집니다.'
      : '전반적으로는 속도를 조절하고 정리 기준을 먼저 세우는 쪽이 더 유리합니다.';
  if (contextLabel) {
    const quotedQuestion = /[?？]$/.test(contextLabel) ? contextLabel : `${contextLabel}?`;
    return `질문 "${quotedQuestion}"에 대한 카드 흐름은 ${keywordLine} ${flowLine}`;
  }
  return `${spreadName} 스프레드의 전체 흐름을 보면 ${keywordLine} ${flowLine}`;
}

function buildSummaryFocus({ spreadName, firstItem, lastItem, items = [], context = '', contextTone }) {
  const intent = inferYearlyIntent(context);
  if (!firstItem || !lastItem) return contextTone.mainHint;
  if (spreadName === '원카드' || firstItem.position.name === '핵심 메시지') {
    if (intent === 'relationship-repair') {
      return '갈등 회복 질문에서는 카드 의미를 과하게 넓히기보다, 대화 순서와 감정 속도 조절 신호를 먼저 읽는 편이 정확합니다. 오늘은 사실 1개, 감정 1개, 요청 1개만 짧게 준비해 충돌을 줄이는 데 집중해보세요.';
    }
    if (intent === 'social') {
      const cardName = firstItem.card?.nameKo || '이 카드';
      const keyword = firstItem.card?.keywords?.[0] || '인상';
      return `${cardName}의 "${keyword}" 신호를 기준으로 보면, 의도 해명보다 반복해서 보이는 태도 관리가 인상에 더 크게 작용합니다. 오늘은 강점 1개를 살리고 줄일 반응 1개를 정해 주변 체감을 안정적으로 맞춰보세요.`;
    }
    if (intent === 'finance') {
      return '재물 질문에서는 카드 한 장을 크게 확장하기보다, 오늘 지출 통제 1개와 확인할 숫자 1개를 같이 정하는 방식이 가장 실용적입니다. 기대 수익보다 현금흐름을 먼저 읽으면 판단이 훨씬 안정됩니다.';
    }
    if (intent === 'relationship') {
      return '연애 질문에서는 카드 한 장을 크게 해석하기보다, 오늘 내 감정 1개와 전달할 요청 1개를 분리해 읽는 방식이 가장 안정적입니다. 상대 마음을 단정하기보다 실제 반응을 확인하는 대화 한 번에 집중해보세요.';
    }
    if (intent === 'daily') {
      return '오늘 운세 질문에서는 무엇을 밀지보다, 오늘 가장 중요한 우선순위 1개와 줄일 소모 1개를 함께 정하는 방식이 가장 정확합니다.';
    }
    return `실행: ${buildOneCardActionLine({ context, firstItem })}`;
  }
  if (spreadName === '양자택일 (A/B)') {
    const choiceSnapshot = buildChoiceABSnapshot({ items, context });
    if (choiceSnapshot.recommendationLine) {
      return choiceSnapshot.recommendationLine;
    }
    if (intent === 'relationship-repair') {
      return '갈등 상황의 양자택일은 누가 맞는지보다, 오해를 덜 키우고 대화를 다시 열 수 있는 선택지를 기준으로 보시는 편이 좋습니다. 각 선택지에서 감정 소모와 회복 가능성을 하나씩 비교해보세요.';
    }
    if (intent === 'social') {
      return '대인관계 양자택일은 누가 맞는지보다, 주변 신뢰를 오래 유지할 수 있는 선택지를 기준으로 보는 편이 좋습니다. 두 선택지에서 피로도와 협업 안정감을 각각 한 가지씩 비교해보세요.';
    }
    if (intent === 'finance') {
      return '재정 양자택일은 높은 기대수익보다 손실 가능성과 유지 비용이 낮은 쪽을 우선 봐야 정확합니다. 두 선택지에서 초기 비용 1개와 숨은 고정비 1개를 나눠 비교해보세요.';
    }
    if (intent === 'relationship') {
      return '연애 양자택일은 누가 더 맞는지보다, 내 감정 소모가 덜하고 대화가 오래 유지되는 쪽을 기준으로 보셔야 정확합니다. 각 선택지에서 마음이 편해지는 순간과 불편해지는 순간을 한 가지씩 비교해보세요.';
    }
    return `양자택일에서는 현재 상황 카드로 판단 기준을 먼저 고정하고, A/B 결과 카드에서 내가 오래 유지할 수 있는 쪽을 우선 보세요. ${contextTone.mainHint}`;
  }
  if (spreadName === '일별 운세') {
    if (intent === 'relationship-repair') {
      return '일간 관계 회복 운은 오늘의 흐름 카드로 감정 온도를 읽고, 주의 카드로 충돌 신호를 확인한 뒤, 행동 조언 카드에서 대화 문장 1개를 정하는 순서가 가장 안정적입니다.';
    }
    if (intent === 'social') {
      return '일간 대인운은 오늘의 흐름 카드로 내 인상 톤을 읽고, 주의할 점 카드로 오해 포인트를 확인한 뒤, 행동 조언 카드에서 말투/반응 1개를 고정하는 순서가 가장 안정적입니다.';
    }
    if (intent === 'finance') {
      return '일간 재물운은 오늘의 흐름 카드로 자금 온도를 먼저 읽고, 주의할 점 카드로 누수 신호를 확인한 뒤, 행동 조언 카드에서 통제 행동 1개를 고정하는 순서가 가장 안정적입니다.';
    }
    if (intent === 'relationship') {
      return `일간 연애운은 오늘의 흐름 카드로 감정 온도를 먼저 읽고, 주의할 점 카드로 오해 신호를 확인한 뒤, 행동 조언 카드에서 대화 문장 1개를 정하는 순서가 가장 안정적입니다. 상대 반응을 해석하려 하기보다 내 감정 1개와 요청 1개를 분리해 전달하면 흐름이 훨씬 자연스러워집니다.`;
    }
    return `일별 운세는 오늘의 흐름 카드로 페이스를 잡고, 행동 조언 카드 한 줄만 실제 일정에 반영하면 충분합니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '주별 운세') {
    if (intent === 'relationship-repair') {
      return '주간 관계 회복 운은 힘이 실리는 날에 짧은 확인 대화를 열고, 조심할 날에는 감정 강도를 낮추는 방식이 효과적입니다. 화해는 설득보다 안전한 대화 리듬이 먼저입니다.';
    }
    if (intent === 'social') {
      return '주간 대인운은 힘이 실리는 날에 협업 접점을 늘리고, 조심할 날에는 설명을 줄이며 태도 일관성을 유지하는 방식이 효과적입니다. 평판은 한 번의 해명보다 반복되는 반응 패턴에서 만들어집니다.';
    }
    if (intent === 'finance') {
      return '주간 재물운은 힘이 실리는 날에 핵심 집행을 두고, 조심할 날에는 결제 통제와 점검을 배치하는 방식이 좋습니다. 한 주를 통틀어 수익 확대보다 누수 차단을 먼저 두면 손실을 줄이기 쉽습니다.';
    }
    if (intent === 'relationship') {
      return '주간 연애운은 힘이 실리는 날에 대화를 열고, 조심할 날에는 감정 템포를 낮추는 운영이 핵심입니다. 하루에 결론을 내기보다 관계 온도를 안정적으로 맞추는 흐름으로 보시면 좋습니다.';
    }
    return `주별 운세는 월요일 시동 카드에서 시작해 일요일 복기 카드까지 일자별 흐름으로 연결해서 보면 판단이 안정됩니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '월별 운세') {
    if (intent === 'relationship-repair') {
      return '월간 관계 회복 운에서는 한 번에 풀어내기보다 갈등 강도를 낮추는 대화 습관을 먼저 고정하는 편이 좋습니다. 회복 속도보다 재충돌 방지가 핵심입니다.';
    }
    if (intent === 'social') {
      return '월간 대인운에서는 순간 감정 대응보다 꾸준한 태도가 더 크게 보입니다. 월간 테마를 기준으로 소통 톤과 거리감을 조절하면 주변 신뢰를 안정적으로 유지할 수 있습니다.';
    }
    if (intent === 'finance') {
      return '월간 재물운에서는 초반 공격적 집행보다 중후반 유지력이 더 중요합니다. 월간 테마를 기준으로 고정비와 변동비를 나눠 관리하면 흐름이 훨씬 안정됩니다.';
    }
    if (intent === 'relationship') {
      return '월간 연애운에서는 초반 감정 반응보다 중후반의 일관된 태도가 더 중요합니다. 월간 테마를 기준으로 대화 빈도와 거리 조절을 맞추면 관계 피로를 크게 줄일 수 있습니다.';
    }
    return `월별 운세는 월간 테마로 방향을 세우고 1~4주차 카드로 강약만 조절하면 됩니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '연간 운세 (12개월)') {
    if (intent === 'relationship-repair') {
      return '연간 관계 회복 운은 사건 단위보다 분기별 감정 안정 흐름을 읽는 방식이 현실적입니다. 대화를 다시 열 시기와 거리 조절 시기를 나눠 운영하면 재충돌을 줄일 수 있습니다.';
    }
    if (intent === 'social') {
      return '연간 대인운은 사건 하나보다 분기별 인상 흐름을 읽는 방식이 현실적입니다. 접점을 넓힐 시기와 숨 고를 시기를 나눠 운영하면 평판의 변동성을 줄일 수 있습니다.';
    }
    if (intent === 'finance') {
      return '연간 재물운은 월별 수익보다 분기별 리스크 관리와 현금흐름 안정화를 먼저 보는 방식이 현실적입니다. 확장 구간과 방어 구간을 나눠 운영하면 연간 변동성을 줄일 수 있습니다.';
    }
    if (intent === 'relationship') {
      return '연간 연애운은 월별 사건보다 분기별 감정 흐름을 읽는 방식이 더 현실적입니다. 가까워지는 시기와 숨 고르는 시기를 나눠 잡으면 관계 안정성이 높아집니다.';
    }
    return `연간 운세는 월별 사건에 매달리기보다 분기별 공통 흐름을 잡을 때 훨씬 선명해집니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '켈틱 크로스') {
    if (intent === 'relationship-repair') {
      return '켈틱 관계 회복 리딩은 현재 갈등, 병목 원인, 결과 흐름을 한 줄로 연결해 읽을 때 정확도가 높습니다. 해결책 제시보다 충돌 패턴을 먼저 특정해보세요.';
    }
    if (intent === 'social') {
      return '켈틱 대인 리딩은 현재 인상, 갈등 포인트, 결과 흐름을 한 줄로 연결해 읽을 때 정확도가 높습니다. 의도 설명보다 반복되는 반응 패턴을 먼저 확인해보세요.';
    }
    if (intent === 'finance') {
      return '켈틱 재물 리딩은 현재 재정 상태, 핵심 장애, 결과 흐름을 한 줄로 연결해 읽을 때 정확도가 높습니다. 분위기 해석보다 반복되는 지출 패턴과 손실 신호를 먼저 특정해보세요.';
    }
    if (intent === 'relationship') {
      return '켈틱 연애 리딩은 현재 감정, 갈등 지점, 결과 흐름을 한 줄로 연결해 읽을 때 정확도가 올라갑니다. 상대 의도 추측보다 반복되는 대화 패턴을 먼저 확인해보세요.';
    }
    return `켈틱 크로스는 현재/교차 카드로 중심 갈등을 확인하고 결과 카드로 연결하면 흐름이 깔끔해집니다. ${contextTone.mainHint}`;
  }
  if (intent === 'relationship-repair') {
    return '이 갈등 흐름은 결론보다 순서를 먼저 잡아 읽는 방식이 가장 안정적입니다. 오늘은 감정 과열을 낮추는 반응 하나만 정해도 관계 회복 가능성이 달라집니다.';
  }
  if (intent === 'social') {
    return '이 대인 흐름은 큰 결론보다 현재 신호와 다음 반응을 짧게 연결해 읽는 방식이 가장 안정적입니다. 오늘은 말투 하나, 반응 하나만 정리해도 인상이 분명해집니다.';
  }
  if (intent === 'finance') {
    return '이 재물 흐름은 큰 결론보다 현재 신호와 다음 통제 행동을 짧게 연결해 읽는 방식이 가장 실용적입니다. 오늘은 지출 상한 1개와 보류 항목 1개를 먼저 정해보세요.';
  }
  if (intent === 'relationship') {
    return '이 연애 흐름은 카드별 결론을 서두르기보다 현재 신호와 다음 행동을 짧게 연결해 읽는 방식이 안정적입니다. 오늘은 감정 1개와 요청 1개를 분리해 전달하는 연습에 집중해보세요.';
  }
  return `먼저 ${firstItem.position.name}의 ${firstItem.card.nameKo} 카드를 중심에 두고, 마지막 ${lastItem.position.name}의 ${lastItem.card.nameKo} 카드를 결론으로 잡아보세요. ${contextTone.mainHint}`;
}

function buildChoiceABSnapshot({ items = [], context = '' }) {
  if (!Array.isArray(items) || !items.length) return { recommendationLine: '' };
  const aNear = items.find((item) => item.position?.name === 'A 선택 시 가까운 미래');
  const aResult = items.find((item) => item.position?.name === 'A 선택 시 결과');
  const bNear = items.find((item) => item.position?.name === 'B 선택 시 가까운 미래');
  const bResult = items.find((item) => item.position?.name === 'B 선택 시 결과');
  const current = items.find((item) => item.position?.name === '현재 상황');
  if (!aNear || !aResult || !bNear || !bResult) return { recommendationLine: '' };

  const score = (item, weight = 1) => {
    const direction = item?.orientation === 'upright' ? 1.2 : -1.1;
    const riskPenalty = scoreCardRisk(item) >= 2 ? 1.1 : scoreCardRisk(item) >= 1 ? 0.5 : 0;
    return (direction - riskPenalty) * weight;
  };
  const aScore = score(aNear, 1) + score(aResult, 1.4);
  const bScore = score(bNear, 1) + score(bResult, 1.4);
  const gap = aScore - bScore;
  const options = parseChoiceOptions(context);
  const intent = inferYearlyIntent(context);
  const relationshipAxis = '감정 소모·대화 안정성·오해 가능성·지속 가능성';
  const axis = (intent === 'relationship' || intent === 'relationship-repair')
    ? relationshipAxis
    : options.isPurchaseChoice
    ? '예산 압박·활용도·3개월 후 만족도'
    : options.isLocationChoice
      ? '이동 거리·정착 난이도·생활비·관계망·지속 가능성'
      : options.isWorkChoice
        ? '통근·생활비·지속 가능성'
        : '시간·비용·감정 소모';
  const axisObject = withKoreanParticle(axis, '을', '를');
  const currentKeyword = current?.card?.keywords?.[0] || '현재 신호';
  const implicitPaths = inferImplicitChoicePaths({ context, intent });

  if (!options.hasExplicitChoice) {
    if (Math.abs(gap) < 0.65) {
      return {
        mode: 'single',
        recommendationLine: `카드 흐름은 단정형 결론보다 조건부 접근이 맞습니다. "${currentKeyword}" 신호를 기준으로 ${axisObject} 먼저 정리하고, 연락 강도는 낮게 시작하는 편이 안전합니다.`
      };
    }
    if (gap > 0) {
      return {
        mode: 'single',
        recommendationLine: `카드 흐름은 "${implicitPaths.pathA}" 쪽이 조금 더 유리합니다. 조건은 저강도 1회 연락 후 반응을 기다리는 운영입니다. 결론을 서두르기보다 ${axisObject} 먼저 점검하며 속도를 조절해 주세요.`
      };
    }
    return {
      mode: 'single',
      recommendationLine: `카드 흐름은 "${implicitPaths.pathB}" 쪽이 조금 더 유리합니다. 조건은 대화 재개보다 감정 리듬 회복을 먼저 두는 운영입니다. 단기 만족보다 3개월 유지 기준으로 ${axisObject} 확인하고 결정하는 편이 안전합니다.`
    };
  }

  if (Math.abs(gap) < 0.65) {
    return {
      mode: 'explicit',
      recommendationLine: `A/B 점수는 박빙입니다. "${currentKeyword}"를 기준으로 ${axis} 체크리스트를 같은 포맷으로 비교한 뒤, 3개월 유지가 더 쉬운 쪽을 최종 선택하세요.`
    };
  }
  if (gap > 0) {
    return {
      mode: 'explicit',
      recommendationLine: `카드 흐름은 ${options.optionA} 쪽이 조금 더 우세합니다. 단기 반응보다 3개월 유지 기준으로 ${axisObject} 점검하면 선택 정확도가 높아집니다.`
    };
  }
  return {
    mode: 'explicit',
    recommendationLine: `카드 흐름은 ${options.optionB} 쪽이 조금 더 우세합니다. 단기 만족보다 3개월 유지 기준으로 ${axisObject} 확인하고 결정하는 편이 안전합니다.`
  };
}

function parseChoiceOptions(context = '') {
  const parsed = parseChoiceOptionsEnhanced(context);
  return {
    optionA: parsed.optionA,
    optionB: parsed.optionB,
    isPurchaseChoice: parsed.isPurchaseChoice,
    isLocationChoice: parsed.isLocationChoice,
    hasExplicitChoice: parsed.hasChoice,
    isWorkChoice: parsed.isWorkChoice
  };
}

function inferImplicitChoicePaths({ context = '', intent = 'general' }) {
  const text = String(context || '');
  if (intent === 'relationship' || intent === 'relationship-repair' || /(재회|연락|애인|관계)/.test(text)) {
    return {
      pathA: '지금 바로 연락해 대화를 여는 선택',
      pathB: '한 템포 쉬고 저강도 재접촉으로 가는 선택'
    };
  }
  if (intent === 'finance') {
    return {
      pathA: '바로 집행하는 선택',
      pathB: '점검 후 집행하는 선택'
    };
  }
  return {
    pathA: '즉시 실행하는 선택',
    pathB: '한 템포 조정 후 실행하는 선택'
  };
}

function buildSummaryTheme({ spreadName, context = '', items = [], topKeywords = [] }) {
  const intent = inferYearlyIntent(context);
  const leadKeyword = topKeywords[0] || items[0]?.card?.keywords?.[0] || '흐름';
  if (spreadName === '일별 운세') {
    return `한 줄 테마: 오늘은 '${leadKeyword}' 신호를 기준으로 우선순위를 좁혀 운영하면 체감이 안정됩니다.`;
  }
  if (spreadName === '주별 운세') {
    return `한 줄 테마: 이번 주는 '${leadKeyword}' 키워드를 중심으로 강한 날 실행, 약한 날 정비 리듬을 나눠 운영해보세요.`;
  }
  if (spreadName === '월별 운세') {
    return `한 줄 테마: 이번 달은 '${leadKeyword}' 축을 중심으로 확장과 조절 타이밍을 분리하면 흐름이 선명해집니다.`;
  }
  if (spreadName === '연간 운세 (12개월)') {
    return `한 줄 테마: 올해는 '${leadKeyword}' 키워드를 분기 기준으로 나눠 운영하면 변동성을 줄이기 좋습니다.`;
  }
  if (spreadName === '양자택일 (A/B)') {
    const choiceSnapshot = buildChoiceABSnapshot({ items, context });
    if (choiceSnapshot.mode === 'single') {
      return `한 줄 테마: '${leadKeyword}' 신호를 기준으로 관계 속도를 낮추고 유지 가능성을 먼저 확인하는 운영이 핵심입니다.`;
    }
    if (choiceSnapshot.recommendationLine.includes('A 쪽이')) {
      return `한 줄 테마: '${leadKeyword}' 기준으로 보면 A축이 조금 우세하니, 단기 반응보다 3개월 지속성을 우선 비교하세요.`;
    }
    if (choiceSnapshot.recommendationLine.includes('B 쪽이')) {
      return `한 줄 테마: '${leadKeyword}' 기준으로 보면 B축이 조금 우세하니, 즉시 만족보다 장기 소모를 함께 확인하세요.`;
    }
    return `한 줄 테마: '${leadKeyword}' 기준으로 A/B가 박빙이라, 같은 체크리스트로 비교해 최종 결정을 좁히는 것이 핵심입니다.`;
  }
  if (spreadName === '3카드 스프레드') {
    return `한 줄 테마: 세 장을 '${leadKeyword}' 한 축으로 연결해 읽으면 실행 문장이 훨씬 또렷해집니다.`;
  }
  if (spreadName === '켈틱 크로스') {
    return `한 줄 테마: 켈틱 리딩은 '${leadKeyword}' 신호를 중심축-결과축으로 연결할 때 해석 일관성이 올라갑니다.`;
  }
  if (intent === 'relationship' || intent === 'relationship-repair') {
    return `한 줄 테마: 지금은 '${leadKeyword}' 신호를 바탕으로 대화 속도와 감정 강도를 함께 조절하는 것이 핵심입니다.`;
  }
  if (intent === 'finance') {
    return `한 줄 테마: 지금은 '${leadKeyword}' 신호를 기준으로 확장보다 손실 방어와 통제 기준을 먼저 두는 편이 좋습니다.`;
  }
  if (intent === 'social') {
    return `한 줄 테마: 지금은 '${leadKeyword}' 신호를 태도 일관성으로 연결할 때 인상 흐름이 안정됩니다.`;
  }
  return `한 줄 테마: 이번 리딩은 '${leadKeyword}' 신호를 한 가지 행동 기준으로 고정할 때 가장 잘 활용됩니다.`;
}

function polishActionVoice({ line = '', spreadName = '', context = '' }) {
  const raw = String(line || '').trim();
  if (!raw) return raw;
  const seed = hashText(`${spreadName}:${context}:${raw}`);
  const dualLead = pickByNumber([
    '상황별로 이렇게 보시면 됩니다',
    '선택지는 두 가지로 정리됩니다',
    '이번 흐름은 두 방향 중 하나를 고르면 됩니다',
    '실행 방향을 두 축으로 나눠 보면 더 분명합니다'
  ], seed);
  let normalized = raw
    .replace(/두 갈래(?:로 보시면 됩니다|로 정리됩니다| 운영이 좋습니다| 조언으로 정리됩니다|입니다)?/g, dualLead)
    .replace(/우선하는 편이 좋습니다/g, '먼저 잡는 편이 안정적입니다')
    .replace(/좋습니다\./g, '좋겠습니다.');

  if (/(재회|연애|관계 회복|관계)/.test(`${context} ${spreadName}`)) {
    normalized = normalized
      .replace(/결론을 미루고/g, '결론을 잠시 늦추고')
      .replace(/방어가 필요하다면/g, '지금 마음이 버겁다면');
  }
  return normalized;
}

function buildSummaryAction({ spreadName, level, context = '', firstItem = null, contextTone }) {
  const intent = inferYearlyIntent(context);
  const levelLine = level === 'intermediate' ? contextTone.intermediateHint : contextTone.beginnerHint;
  if (spreadName === '원카드') {
    if (intent === 'relationship-repair') {
      return `오늘 관계 회복 조언은 두 갈래입니다: 대화를 열고 싶다면 사실-감정-요청 순서로 한 문장만 먼저 보내고, 아직 과열 상태라면 결론을 미루고 감정 정리 후 짧은 확인 메시지로 리듬을 회복하세요. ${levelLine}`;
    }
    if (intent === 'social') {
      return `오늘 대인운 조언은 두 갈래입니다: 신뢰를 더 쌓고 싶다면 짧고 분명한 소통을 먼저 여시고, 피로가 크다면 설명을 줄인 뒤 반응 템포를 낮춰 인상을 안정시키세요. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `오늘 재물운 조언은 두 갈래로 보시면 됩니다. 기회를 잡고 싶다면 예산 상한 안에서 작은 집행 1건만 실행하세요. 방어가 필요하다면 비필수 결제 1건을 보류하고 현금흐름부터 점검하세요. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `오늘 연애운 조언은 두 갈래로 보시면 됩니다. 관계를 더 깊게 이어가고 싶다면 짧고 분명한 감정 표현을 먼저 건네보세요. 반대로 마음이 버겁다면 대화 간격을 잠시 넓히고 내 리듬을 회복한 뒤 다시 이어가는 편이 좋습니다. ${levelLine}`;
    }
    const reviewLine = buildOneCardReviewLine({ context, firstItem });
    return `복기: ${reviewLine} ${levelLine}`;
  }
  if (spreadName === '일별 운세') {
    if (intent === 'relationship-repair') {
      return `오늘 관계 회복 조언은 두 갈래입니다: 여지를 만들고 싶다면 사과/설명/요청 중 하나만 짧게 전달하고 반응을 보세요. 아직 긴장이 높다면 대화 길이를 줄이고 시간 간격을 두는 편이 안전합니다. ${levelLine}`;
    }
    if (intent === 'social') {
      return `오늘 대인운 조언은 두 갈래로 보시면 됩니다. 관계를 열고 싶다면 먼저 인사/확인/감사 중 1가지를 표현하세요. 조절이 필요하다면 말수를 줄이고 핵심 한 문장만 남겨 오해를 줄이는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `오늘 재물운 조언은 두 갈래로 보시면 됩니다. 흐름이 괜찮다면 필요한 집행 1건만 기준 안에서 처리해 리듬을 유지하세요. 불안하면 결제 전 10분 유예를 두고 비필수 지출 1건을 보류하는 편이 안전합니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `오늘 연애운 조언은 두 갈래로 보시면 됩니다. 관계를 더 깊게 이어가고 싶다면 짧고 진솔한 확인 대화를 먼저 열어 감정의 접점을 넓혀보세요. 반대로 지금 조금 버겁다면 감정적 거리를 잠시 두고, 내 마음을 회복한 뒤 천천히 대화 속도를 맞추는 편이 좋습니다. ${levelLine}`;
    }
    return `오늘은 맞추려 하기보다 리듬을 지키는 쪽이 더 좋습니다. ${levelLine}`;
  }
  if (spreadName === '주별 운세') {
    if (intent === 'relationship-repair') {
      return `이번 주 관계 회복 조언은 두 갈래입니다: 회복을 시도한다면 강한 날에 짧은 확인 대화를 열어보세요. 조정이 필요하다면 약한 날에는 결론을 미루고 감정 강도부터 낮추는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'social') {
      return `이번 주 대인운은 두 갈래로 정리됩니다. 신뢰를 넓히고 싶다면 강한 날에 협업 접점을 한 번 더 만드세요. 피로가 크다면 약한 날에는 대화 강도를 낮추고 경계를 분명히 하는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `이번 주 재물운은 두 갈래로 정리됩니다. 확장을 원하면 강한 날에 핵심 집행 1개만 실행하세요. 방어가 우선이면 약한 날에는 신규 결제를 줄이고 누수 점검을 먼저 두는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `이번 주 연애운은 두 갈래 조언으로 정리됩니다. 가까워지고 싶다면 힘이 실리는 날에 확인 대화를 먼저 열어보세요. 거리 조절이 필요하다면 조심할 날에는 결론 대신 감정 정리에 집중하는 편이 좋습니다. ${levelLine}`;
    }
    return `한 주를 한 번에 바꾸려 하지 말고, 중반부터 천천히 페이스를 맞춰 보세요. ${levelLine}`;
  }
  if (spreadName === '월별 운세') {
    if (intent === 'relationship-repair') {
      return `이번 달 관계 회복 조언은 두 갈래입니다: 진전을 원하면 짧은 대화를 반복해 신뢰를 다시 쌓아보세요. 소모가 크다면 접촉 빈도를 낮추고 재충돌 방지 규칙부터 세우는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'social') {
      return `이번 달 대인운은 두 갈래 운영이 좋습니다. 관계 확장을 원하면 일관된 태도와 짧은 피드백을 유지하세요. 소모가 크다면 접촉 빈도를 조절하고 반응 속도를 낮추는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `이번 달 재물운은 두 갈래 운영이 좋습니다. 성장 쪽을 택하면 계획형 집행과 기록 루틴을 함께 가져가세요. 안정 쪽을 택하면 지출 상한을 낮추고 고정비 재점검을 먼저 하는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `이번 달 연애운은 두 갈래 운영이 좋습니다. 관계 진전을 원하면 짧고 일관된 배려 행동을 반복해 신뢰를 쌓아보세요. 부담이 크다면 대화 강도를 낮추고 오해를 줄이는 확인 질문 중심으로 흐름을 조정하세요. ${levelLine}`;
    }
    return `월간 리딩은 초반 스퍼트보다 후반 유지력이 더 중요합니다. ${levelLine}`;
  }
  if (spreadName === '연간 운세 (12개월)') {
    if (intent === 'relationship-repair') {
      return `연간 관계 회복 조언도 두 갈래입니다: 회복 기회를 살리려면 상승 구간에 짧은 대화를 꾸준히 이어가세요. 조정이 필요하면 갈등 구간에서는 거리 조절과 감정 회복을 우선하세요. ${levelLine}`;
    }
    if (intent === 'social') {
      return `연간 대인운도 두 갈래로 보시면 됩니다. 확장을 원하면 상승 구간에 협업/네트워킹을 늘리세요. 안정이 우선이면 조정 구간에는 갈등 소지를 줄이고 내 리듬을 지키는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `연간 재물운도 두 갈래로 보시면 됩니다. 기회를 넓히려면 상승 구간에만 확장 집행을 배치하세요. 안정이 우선이면 조정 구간에는 손실 방어와 현금 보존을 먼저 두는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `연간 연애운도 두 갈래로 보시면 됩니다. 관계를 깊게 가져가고 싶다면 상승 구간에 약속과 계획을 구체화하세요. 숨 고르기가 필요하다면 조정 구간에 감정 소모를 줄이고 경계를 분명히 세우는 편이 좋습니다. ${levelLine}`;
    }
    return `연간 리딩은 월별 성과보다 분기별 균형을 먼저 챙기면 덜 흔들립니다. ${levelLine}`;
  }
  if (spreadName === '양자택일 (A/B)') {
    const choiceMeta = parseChoiceOptions(context);
    const purchaseChecklist = `${choiceMeta.optionA}/${choiceMeta.optionB} 각각에 대해 예산 대비 부담, 주 1회 이상 활용 가능성, 3개월 후 만족도를 같은 포맷으로 적어 보세요.`;
    const workChecklist = choiceMeta.isWorkChoice
      ? `${choiceMeta.optionA}/${choiceMeta.optionB} 각각에 대해 통근 시간, 월 고정비, 체력 소모를 같은 포맷으로 적어 보세요.`
      : 'A/B 각각에 대해 시간, 비용, 감정 소모를 같은 포맷으로 적어 보세요.';
    if (intent === 'relationship-repair') {
      return `선택형 관계 회복 조언도 두 갈래입니다: 화해를 열고 싶다면 오해를 덜 키우는 선택을 고르세요. 소모를 줄이려면 경계가 지켜지는 선택지를 우선하는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'social') {
      return `선택형 대인운 조언도 두 갈래입니다. 신뢰를 원하면 관계가 오래 유지되는 선택지를 고르세요. 소모를 줄이려면 경계가 지켜지고 부담이 적은 선택지를 우선하는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `선택형 재물운 조언도 두 갈래입니다. 수익을 노린다면 유지 비용이 감당되는 선택지를 고르세요. 손실 방어가 우선이면 초기 지출과 변동성이 낮은 선택지를 우선하는 편이 좋습니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `선택형 연애운 조언도 두 갈래입니다. 더 가까워지고 싶다면 대화가 편안하게 이어지는 쪽을 고르세요. 안정이 우선이라면 감정 소모가 적고 경계가 지켜지는 선택지를 우선하는 편이 좋습니다. ${levelLine}`;
    }
    const checklist = choiceMeta.isPurchaseChoice ? purchaseChecklist : workChecklist;
    return `결정 전 실행 기준: ${checklist} 3개월 뒤에도 유지 가능한 쪽을 우선하세요. ${levelLine}`;
  }
  if (spreadName === '3카드 스프레드') {
    if (intent === 'relationship-repair') {
      return `3카드 관계 회복 조언은 두 갈래 실행이 좋습니다: 대화를 열고 싶다면 오늘 한 문장만 먼저 보내세요. 아직 힘들다면 결론을 미루고 감정 과열을 낮추는 반응 하나만 정해두세요. ${levelLine}`;
    }
    if (intent === 'social') {
      return `3카드 대인운은 두 갈래 실행으로 마무리하면 좋습니다. 관계를 열고 싶다면 오늘 먼저 따뜻한 확인 한마디를 건네보세요. 부담이 크다면 설명을 줄이고 핵심 반응 1개만 확인하는 방식이 안전합니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `3카드 재물운은 두 갈래 실행으로 마무리하면 좋습니다. 확장을 원하면 집행 1개를 기준 안에서 실행하세요. 방어가 필요하면 지출 1개를 줄이고 구독/자동결제 1개를 점검하는 편이 안전합니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `3카드 연애운은 두 갈래 실행으로 마무리하면 좋습니다. 관계를 열고 싶다면 오늘 감정 1개를 먼저 솔직하게 말해보세요. 부담이 크다면 판단을 미루고 확인 질문 1개만 남기는 방식이 안전합니다. ${levelLine}`;
    }
    return `세 장의 공통 키워드 하나를 잡아 오늘 행동 한 줄로 바꾸면 충분합니다. ${levelLine}`;
  }
  if (spreadName === '켈틱 크로스') {
    if (intent === 'relationship-repair') {
      return `켈틱 관계 회복 조언은 두 갈래입니다: 회복을 원하면 사실 확인 후 짧게 대화를 여세요. 소모가 크면 충돌 패턴을 먼저 정리하고 결론은 다음 대화로 넘기는 편이 안정적입니다. ${levelLine}`;
    }
    if (intent === 'social') {
      return `켈틱 대인운 조언은 두 갈래입니다. 회복과 확장을 원하면 사실 확인 후 짧게 소통을 여세요. 소모가 크면 대화 속도를 늦추고 갈등 신호를 먼저 정리한 뒤 다음 단계를 여는 편이 안정적입니다. ${levelLine}`;
    }
    if (intent === 'finance') {
      return `켈틱 재물운 조언은 두 갈래입니다. 전진을 원하면 핵심 집행 1개만 정해 실행하세요. 불안이 크면 지출 속도를 늦추고 손실 요인부터 정리한 뒤 다음 결정을 여는 편이 안정적입니다. ${levelLine}`;
    }
    if (intent === 'relationship') {
      return `켈틱 연애운 조언은 두 갈래입니다. 회복과 진전을 원하면 사실-감정-요청 순서로 대화를 짧게 여세요. 소모가 크다면 감정 과열 구간을 먼저 줄이고, 결론은 다음 대화로 넘기는 편이 안정적입니다. ${levelLine}`;
    }
    return `복합 이슈일수록 중심 흐름과 외부 환경을 분리해서 천천히 정리해 보세요. ${levelLine}`;
  }
  if (intent === 'relationship-repair') {
    return `관계 회복 조언은 두 갈래로 정리됩니다: 화해를 열고 싶다면 짧고 안전한 대화를 먼저 두세요. 아직 과열 상태라면 속도를 늦추고 감정 정리부터 하는 편이 좋습니다. ${levelLine}`;
  }
  if (intent === 'social') {
    return `대인운 조언은 두 갈래로 정리됩니다. 관계를 넓히고 싶다면 짧고 분명한 소통을 이어가세요. 소모를 줄이고 싶다면 반응 템포를 늦추고 경계를 분명히 하며 리듬을 지키는 편이 좋습니다. ${levelLine}`;
  }
  if (intent === 'finance') {
    return `재물운 조언은 두 갈래로 정리됩니다. 기회를 잡고 싶다면 집행 기준을 먼저 세운 뒤 작은 실행을 하세요. 방어가 우선이면 신규 결제를 줄이고 누수 점검부터 시작하는 편이 좋습니다. ${levelLine}`;
  }
  if (intent === 'relationship') {
    return `연애운 조언은 두 갈래로 정리됩니다. 가까워지고 싶다면 확인 대화를 짧고 꾸준하게 이어가세요. 거리 조절이 필요하다면 감정 소모를 낮추고 경계를 분명히 하며 속도를 늦추는 편이 좋습니다. ${levelLine}`;
  }
  return `지금은 완벽한 결론보다 바로 실행할 작은 선택 하나가 더 중요합니다. ${levelLine}`;
}

function polishSummary(raw = '') {
  let text = String(raw || '').replace(/\s+/g, ' ').trim();
  text = text
    .replace(/수렴/g, '정리')
    .replace(/기준점/g, '기준')
    .replace(/중심축/g, '중심 흐름')
    .replace(/결과축/g, '결과 흐름')
    .replace(/(^|[\s"'(])변수(?=([\s"'.,!?)]|$))/g, '$1요인')
    .replace(/(^|[\s"'(])축(?=([\s"'.,!?)]|$))/g, '$1기준');

  const sentences = splitSentences(text);
  while (sentences.length < 3) {
    sentences.push('지금은 마음이 끌리는 방향 하나를 정하고 가볍게 움직여 보세요.');
  }
  if (sentences.length > 5) sentences.splice(5);
  let out = sentences.join(' ');
  if (out.length > 620) out = `${out.slice(0, 619).trim()}…`;
  return out;
}

function splitSentences(text = '') {
  const chunks = String(text).match(/[^.!?]+[.!?]?/g) ?? [];
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

function normalizeContextText(context = '') {
  return String(context || '')
    .trim()
    .replace(/\s+([?？!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/[.!?]+$/g, '');
}

function normalizeContextForSpread({ spreadName = '', context = '' }) {
  let text = normalizeContextText(context);
  if (!text) return '';
  const hasComparisonIntent = /(비교|대비|vs|versus|각각|둘 다|차이)/i.test(text);
  const hasMixedPeriod = /이번\s*주/.test(text) && /이번\s*달|이달/.test(text);
  if (hasComparisonIntent || hasMixedPeriod) return text;
  if (spreadName === '월별 운세') {
    text = text
      .replace(/^\s*이번\s*주\b/gi, '이번 달')
      .replace(/^\s*금주\b/gi, '이번 달')
      .replace(/^\s*주별\s*운세/gi, '월별 운세');
  }
  if (spreadName === '주별 운세') {
    text = text
      .replace(/^\s*이번\s*달\b/gi, '이번 주')
      .replace(/^\s*이달\b/gi, '이번 주')
      .replace(/^\s*월별\s*운세/gi, '주별 운세');
  }
  return text;
}

function isYesNoQuestion(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  const lowered = normalized.toLowerCase();
  const decisionPattern = /(할까|될까|말까|해도 될까|괜찮을까|맞을까|좋을까|나을까|가능할까|해도 되나|될지|인가|일까)/;
  const infoPattern = /(운세|흐름|리딩|해석|전망|기운)/;
  if (infoPattern.test(lowered) && !decisionPattern.test(lowered)) return false;
  if (/[?？]$/.test(normalized)) return decisionPattern.test(lowered);
  if (decisionPattern.test(lowered)) {
    return true;
  }
  return false;
}

function buildYesNoVerdict({ contextLabel = '', firstItem = null, topKeywords = [], uprightCount = 0, reversedCount = 0 }) {
  const q = String(contextLabel || '').trim();
  if (!q || !isYesNoQuestion(q)) return null;

  const group = detectYesNoQuestionGroup(q);
  const intent = inferYearlyIntent(q);
  const risk = scoreOneCardRisk({ firstItem, topKeywords, uprightCount, reversedCount });
  if (group === 'caffeine') {
    if (risk >= 2) {
      return {
        verdict: '한 줄 답: 금지 상태에 가까워요. 지금은 마시지 않는 쪽이 더 안전해 보여요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'high' })
      };
    }
    if (risk === 1) {
      return {
        verdict: '한 줄 답: 한 잔만 가능 상태예요. 추가 섭취는 피하는 쪽이 좋아요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'mid' })
      };
    }
    return {
      verdict: '한 줄 답: 완전 가능 상태예요. 지금 마셔도 괜찮아 보여요.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
    };
  }
  if (group === 'exercise') {
    if (risk >= 2) {
      return {
        verdict: '한 줄 답: 보류 상태에 가까워요. 오늘 강한 운동은 피하는 편이 좋아요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'high' })
      };
    }
    if (risk === 1) {
      return {
        verdict: '한 줄 답: 조건부 가능 상태예요. 강도를 낮추면 진행 가능해 보여요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'mid' })
      };
    }
    return {
      verdict: '한 줄 답: 완전 가능 상태예요. 지금 시작해도 괜찮아 보여요.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
    };
  }
  if (group === 'contact') {
    const adjustedRisk = (firstItem?.card?.id === 'major-10' && firstItem?.orientation === 'upright')
      ? Math.max(risk, 1)
      : risk;
    if (adjustedRisk >= 2) {
      return {
        verdict: '한 줄 답: 보류 상태에 가까워요. 지금은 바로 연락하지 않는 편이 더 안전해 보여요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'high' })
      };
    }
    if (adjustedRisk === 1) {
      return {
        verdict: '한 줄 답: 조건부 가능 상태예요. 짧은 1회 연락 전략이 맞아 보여요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'mid' })
      };
    }
    return {
      verdict: '한 줄 답: 완전 가능 상태예요. 지금 연락해도 괜찮아 보여요.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
    };
  }
  if (group === 'payment') {
    if (risk >= 2) {
      return {
        verdict: '한 줄 답: 보류 상태에 가까워요. 지금 결제는 미루는 편이 좋아 보여요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'high' })
      };
    }
    if (risk === 1) {
      return {
        verdict: '한 줄 답: 조건부 가능 상태예요. 소액/필수 결제만 먼저 권장돼요.',
        reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'mid' })
      };
    }
    return {
      verdict: '한 줄 답: 완전 가능 상태예요. 예산 범위 안이라면 결제해도 괜찮아 보여요.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
    };
  }

  if (risk >= 2) {
    return {
      verdict: '한 줄 답: 아니요, 지금은 보류하는 편이 좋습니다.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'high' })
    };
  }
  if (risk === 1) {
    return {
      verdict: '한 줄 답: 조건부로 가능해요. 무리하지 않는 선에서만 진행하세요.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'mid' })
    };
  }
  if (intent === 'relationship-repair' || intent === 'relationship') {
    return {
      verdict: '한 줄 답: 가능해요. 다만 속도보다 대화 순서를 먼저 정하면 더 안전합니다.',
      reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
    };
  }
  return {
    verdict: '한 줄 답: 가능해요. 다만 무리하지 않는 선에서 시작하세요.',
    reason: buildYesNoReasonLine({ firstItem, topKeywords, tone: 'low' })
  };
}

function detectYesNoQuestionGroup(text = '') {
  const normalized = String(text || '').toLowerCase();
  if (/(커피|카페인|에너지드링크|에너지 드링크|수면|잠)/.test(normalized)) return 'caffeine';
  if (/(운동|헬스|러닝|달리기|조깅|산책|근력|유산소|필라테스|요가)/.test(normalized)) return 'exercise';
  if (/(연락|문자|카톡|톡|dm|디엠|전화|답장|고백|메시지)/.test(normalized)) return 'contact';
  if (/(결제|구매|지출|주문|구독|환불|계약|할부|투자|송금|이체)/.test(normalized)) return 'payment';
  return 'general';
}

function scoreOneCardRisk({ firstItem = null, topKeywords = [], uprightCount = 0, reversedCount = 0 }) {
  let score = 0;
  const cardId = firstItem?.card?.id || '';
  const cardKeywords = firstItem?.card?.keywords || [];
  const keywords = [...topKeywords, ...cardKeywords].map((k) => String(k || '').trim().toLowerCase());
  const riskyCardIds = new Set([
    'major-15', // Devil
    'major-16', // Tower
    'major-18', // Moon
    'minor-swords-ten',
    'minor-swords-nine',
    'minor-cups-five',
    'minor-pentacles-five'
  ]);
  if (riskyCardIds.has(cardId)) score += 1;

  const riskWords = ['붕괴', '급변', '속박', '유혹', '집착', '불안', '혼란', '과부하', '갈등', '피로', '충돌', '상실', '권태', '무기력'];
  const warningWords = ['지연', '정체', '과신', '과소비', '소모', '압박'];
  if (keywords.some((k) => riskWords.some((w) => k.includes(w)))) score += 1;
  else if (keywords.some((k) => warningWords.some((w) => k.includes(w)))) score += 0.5;

  if (firstItem?.orientation === 'reversed') score += 1;
  if (reversedCount > uprightCount) score += 0.5;

  if (score >= 2.5) return 2;
  if (score >= 1) return 1;
  return 0;
}

function buildYesNoReasonLine({ firstItem = null, topKeywords = [], tone = 'mid' }) {
  const cardName = firstItem?.card?.nameKo || '이 카드';
  const orientation = firstItem?.orientation === 'reversed' ? '역방향' : '정방향';
  const keyList = (topKeywords.length ? topKeywords : firstItem?.card?.keywords || []).slice(0, 3);
  const keywordText = keyList.length ? keyList[0] : '현재 카드 흐름';
  const cardSubject = `${cardName} ${orientation} 카드는`;
  if (tone === 'high') {
    return `${cardSubject} "${keywordText}" 신호가 예민해 보여, 지금은 강하게 밀기보다 속도를 낮춰야 안정적입니다.`;
  }
  if (tone === 'low') {
    return `${cardSubject} "${keywordText}" 축이 살아 있어, 짧고 분명하게 시도하면 흐름을 살릴 수 있습니다.`;
  }
  return `${cardSubject} "${keywordText}" 흐름이 있어 가능은 하지만, 강도를 낮춰 조절하는 편이 안전합니다.`;
}

function buildOneCardActionLine({ context = '', firstItem = null }) {
  const normalized = String(context || '').toLowerCase();
  const risk = scoreOneCardRisk({
    firstItem,
    topKeywords: firstItem?.card?.keywords || [],
    uprightCount: firstItem?.orientation === 'upright' ? 1 : 0,
    reversedCount: firstItem?.orientation === 'reversed' ? 1 : 0
  });

  if (/(커피|카페인|에너지드링크|에너지 드링크|잠|수면)/.test(normalized)) {
    if (risk >= 2) return '오늘 카페인은 미루고, 필요하면 물이나 디카페인으로 대체해 보세요.';
    if (risk === 1) return '커피는 한 잔만, 늦은 시간 카페인은 피하는 조건으로 진행해 보세요.';
    return '평소 마시던 범위 안에서 한 번만 가볍게 드셔보세요.';
  }
  if (/(운동|헬스|러닝|달리기|조깅|산책|근력|유산소|필라테스|요가)/.test(normalized)) {
    if (risk >= 2) return '오늘 운동은 강도를 낮춰 가볍게 하거나 회복 중심으로 전환해 보세요.';
    if (risk === 1) return '운동은 하되 시간과 강도를 평소의 70% 정도로 조절해 진행해 보세요.';
    return '운동은 계획대로 진행하되, 시작 10분은 몸 상태를 확인하며 천천히 올려보세요.';
  }
  if (/(연락|문자|카톡|톡|dm|디엠|전화|답장|고백|메시지)/.test(normalized)) {
    if (risk >= 2) return '지금은 즉시 연락보다 문장을 먼저 정리하고 한 템포 늦춰 보내는 편이 좋습니다.';
    if (risk === 1) return '연락은 가능하지만, 핵심 한 문장만 짧게 보내고 반응을 본 뒤 이어가세요.';
    return '연락은 지금 짧고 분명하게 보내도 괜찮습니다. 요구보다 사실 중심으로 전해보세요.';
  }
  if (/(결제|구매|지출|주문|구독|환불|계약|할부|투자|송금|이체)/.test(normalized)) {
    if (risk >= 2) return '지금 결제는 보류하고 금액·필요성·대안 3가지를 먼저 점검해 보세요.';
    if (risk === 1) return '결제는 가능하지만 소액/필수 항목만 진행하고, 큰 금액은 하루 더 검토해 보세요.';
    return '결제는 진행 가능하되 예산 한도를 먼저 정하고 그 범위 안에서만 처리해 보세요.';
  }

  if (risk >= 2) return '지금은 진행보다 보류가 유리합니다. 먼저 소모를 줄이는 한 가지부터 정리해 보세요.';
  if (risk === 1) return '진행하더라도 강도를 낮춰 한 단계씩 확인하며 움직여 보세요.';
  return '지금 가능한 가장 작은 실행 1개부터 바로 진행해 보세요.';
}

function buildOneCardReviewLine({ context = '', firstItem = null }) {
  const normalized = String(context || '').toLowerCase();
  if (/(커피|카페인|에너지드링크|에너지 드링크|잠|수면)/.test(normalized)) {
    return '섭취 후 1~2시간 뒤 집중도와 심박/불편감 변화를 짧게 기록해 다음 선택 기준으로 삼으세요.';
  }
  if (/(운동|헬스|러닝|달리기|조깅|산책|근력|유산소|필라테스|요가)/.test(normalized)) {
    return '운동 후 피로도·통증·회복감을 10점 척도로 기록해 다음 강도 조절 기준으로 삼으세요.';
  }
  if (/(연락|문자|카톡|톡|dm|디엠|전화|답장|고백|메시지)/.test(normalized)) {
    return '연락 후 상대 반응과 내 감정 변화를 한 줄로 기록해 다음 메시지 톤을 조정해 보세요.';
  }
  if (/(결제|구매|지출|주문|구독|환불|계약|할부|투자|송금|이체)/.test(normalized)) {
    return '결제 후 만족도와 실제 필요도를 확인해, 같은 유형 지출의 기준 금액을 업데이트해 보세요.';
  }
  const cardName = firstItem?.card?.nameKo || '카드';
  return `${cardName} 카드를 기준으로 실행한 뒤 실제 체감 변화를 1문장으로 남겨두세요.`;
}

async function runImageHealthCheck() {
  const sampleCards = cards.slice(0, 6).map((card) => ({
    id: card.id,
    sources: card.imageSources || [card.imageUrl]
  }));

  const checks = await Promise.all(
    sampleCards.flatMap((card) =>
      (card.sources || []).slice(0, 2).map(async (url) => {
        const started = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeout);
          return {
            cardId: card.id,
            source: url,
            ok: res.ok,
            status: res.status,
            latencyMs: Date.now() - started
          };
        } catch {
          return {
            cardId: card.id,
            source: url,
            ok: false,
            status: 0,
            latencyMs: Date.now() - started
          };
        }
      })
    )
  );

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      ok: checks.filter((item) => item.ok).length,
      fail: checks.filter((item) => !item.ok).length
    },
    checks
  };
}
