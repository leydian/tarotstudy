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

dotenv.config();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const cache = new TTLCache(Number(process.env.CACHE_TTL_SECONDS || 86400));
const externalGenerator = makeExternalGenerator(process.env);
const imageFallbackStats = {
  totalEvents: 0,
  byStage: {},
  byCard: {},
  recent: []
};
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
app.get('/api/telemetry/image-fallback', async () => imageFallbackStats);

app.post('/api/telemetry/image-fallback', async (request, reply) => {
  const { stage = 'unknown', cardId = 'unknown', source = '' } = request.body || {};
  if (typeof stage !== 'string') {
    reply.code(400);
    return { message: 'stage is required' };
  }

  imageFallbackStats.totalEvents += 1;
  imageFallbackStats.byStage[stage] = (imageFallbackStats.byStage[stage] || 0) + 1;
  imageFallbackStats.byCard[cardId] = (imageFallbackStats.byCard[cardId] || 0) + 1;
  imageFallbackStats.recent.unshift({
    at: new Date().toISOString(),
    stage,
    cardId,
    source: typeof source === 'string' ? source.slice(0, 180) : ''
  });
  imageFallbackStats.recent = imageFallbackStats.recent.slice(0, 50);

  return { ok: true };
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

app.post('/api/spreads/:spreadId/draw', async (request, reply) => {
  const { spreadId } = request.params;
  const { variantId = '', level = 'beginner', context = '', experimentVariant } = request.body || {};
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) {
    reply.code(404);
    return { message: 'Spread not found' };
  }

  const variant = spread.variants?.find((item) => item.id === variantId) ?? null;
  const positions = variant?.positions ?? spread.positions;
  if (!positions?.length) {
    reply.code(400);
    return { message: 'Spread positions are not configured' };
  }
  if (positions.length > cards.length) {
    reply.code(400);
    return { message: 'Requested draw exceeds deck size' };
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
    summary: summarizeSpread({
      spreadId: spread.id,
      spreadName: spread.name,
      items,
      context,
      level
    })
  };
});

app.get('/api/courses', async () => {
  return courses.map((course) => ({
    ...course,
    lessonCount: lessonsByCourse[course.id]?.length ?? 0
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
  const { arcana, suit, difficulty, q, context = '', variantSeed = '' } = request.query;
  const rotationSeed = String(variantSeed || new Date().toISOString().slice(0, 10));

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
      context: String(context || ''),
      variantSeed: rotationSeed
    })
  }));
});

app.get('/api/cards/:cardId', async (request, reply) => {
  const { cardId } = request.params;
  const { context = '', variantSeed = '' } = request.query || {};
  const card = getCardById(cardId);
  if (!card) {
    reply.code(404);
    return { message: 'Card not found' };
  }
  const rotationSeed = String(variantSeed || new Date().toISOString().slice(0, 10));

  return {
    ...card,
    descriptions: buildCardDescriptions(card, {
      context: String(context || ''),
      variantSeed: rotationSeed
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
  const { lessonId, level = 'beginner', count = 5 } = request.body || {};
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    reply.code(404);
    return { message: 'Lesson not found' };
  }

  const lessonCards = lesson.cardIds.map((cardId) => getCardById(cardId)).filter(Boolean);
  const questions = generateQuiz({ lessonCards, level, count: Number(count) || 5 });

  return {
    lessonId,
    level,
    questions
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

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

function pickRandomCards(deck, count) {
  const pool = [...deck];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function summarizeSpread({ spreadId = '', spreadName, items, context = '', level = 'beginner' }) {
  if (spreadId === 'yearly-fortune') {
    return summarizeYearlyFortune({ items, context, level });
  }
  const contextTone = inferSummaryContextTone(context);
  const topKeywords = pickTopKeywords(items, 3);
  const keywordText = topKeywords.join(', ');
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;
  const leadLine = buildSummaryLead({
    spreadName,
    context,
    firstItem: items[0],
    topKeywords,
    uprightCount,
    reversedCount
  });
  const focusLine = buildSummaryFocus({
    spreadName,
    firstItem: items[0],
    lastItem: items[items.length - 1],
    context,
    contextTone
  });
  const actionLine = buildSummaryAction({
    spreadName,
    level,
    context,
    firstItem: items[0],
    contextTone
  });
  return polishSummary([leadLine, focusLine, actionLine].filter(Boolean).join(' '));
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
  const isJobTimingQuestion = yearlyIntent === 'career';
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
    ? `취직 시기 관점으로 정리하면, 우선 ${strongest.label}을 1차 실행 구간으로 보고 ${weakest.label}은 준비/보완 구간으로 두시는 편이 좋겠습니다. ${levelHint}`
    : `마지막으로 ${strongest.label}은 확장 구간, ${weakest.label}은 정비 구간으로 나눠 운영하시면 올해 리딩을 실제 행동으로 옮기기가 훨씬 수월해집니다. ${levelHint}`;

  return [
    `총평: ${overall}`,
    `분기별 운세: ${quarterLines}`,
    `월별 운세: ${monthlyLines}`,
    timingClose
  ].join('\n\n');
}

function inferYearlyIntent(context = '') {
  const text = String(context || '').toLowerCase();
  if (/(취직|취업|이직|입사|지원|면접|커리어|직장|회사)/.test(text)) return 'career';
  if (/(연애|관계|재회|결혼|상대|썸)/.test(text)) return 'relationship';
  if (/(재정|돈|지출|수입|저축|투자|소비|자산)/.test(text)) return 'finance';
  return 'general';
}

function buildNonCareerMonthlyAction({ intent, orientation }) {
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

  if (mode === 'open') return '계획한 실행을 작게라도 이어가며 리듬을 유지해보시면 좋겠습니다.';
  if (mode === 'adjust') return '속도를 조금 낮추고 정리할 부분부터 하나씩 점검해보시면 좋겠습니다.';
  return '확장보다 균형 운영을 우선해 흐름을 안정적으로 가져가시면 좋겠습니다.';
}

function buildYearlyMonthlyNarratives({ monthly, intent, isJobTimingQuestion }) {
  const lines = [];
  let prevMode = '';
  let streak = 0;

  for (const item of monthly) {
    const keyword = item.keywords?.[0] ?? '흐름';
    let mode = selectMonthlyMode({ intent, orientation: item.orientation, isJobTimingQuestion });
    if (mode === prevMode) {
      streak += 1;
    } else {
      streak = 1;
    }
    if (streak >= 3) {
      mode = mode === 'advance' ? 'balanced' : 'advance';
      streak = 1;
    }

    const toneLine = buildMonthlyToneLine({ intent, mode, keyword });
    const actionLine = buildMonthlyActionLine({ intent, mode, month: item.month });
    lines.push(`${item.month}월(${item.cardName})은 ${toneLine} ${actionLine}`);
    prevMode = mode;
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
  return orientation === 'upright' ? 'advance' : 'prepare';
}

function pickByNumber(options = [], n = 0) {
  if (!options.length) return '';
  return options[n % options.length];
}

function buildMonthlyToneLine({ intent, mode, keyword }) {
  if (intent === 'career') {
    if (mode === 'advance') {
      return `카드의 ${keyword} 신호가 살아 있어서 외부 접점을 넓히기에 비교적 편안한 결입니다.`;
    }
    if (mode === 'balanced') {
      return `카드가 말하는 ${keyword} 흐름이 크지는 않아서, 준비와 실행의 비중을 반반으로 두는 편이 좋겠습니다.`;
    }
    return `카드의 ${keyword} 흐름이 조정 구간에 있어 결과를 서두르기보다 준비 밀도를 올리는 쪽이 맞겠습니다.`;
  }
  if (intent === 'relationship') {
    if (mode === 'open') return `카드의 ${keyword} 기운이 열려 있어 대화를 먼저 꺼내기 좋은 분위기입니다.`;
    return `카드의 ${keyword} 기운이 예민할 수 있어 감정 속도를 낮추는 편이 관계에 도움이 됩니다.`;
  }
  if (intent === 'finance') {
    if (mode === 'stabilize') return `카드의 ${keyword} 흐름이 안정 쪽에 있어 계획형 운영이 잘 맞는 달입니다.`;
    return `카드의 ${keyword} 흐름이 흔들릴 수 있어 지출 통제와 점검을 먼저 두는 편이 좋겠습니다.`;
  }
  return mode === 'advance'
    ? `카드의 ${keyword} 흐름이 비교적 열려 있어 계획한 일을 진행하기 좋은 달입니다.`
    : `카드의 ${keyword} 흐름이 고르지 않아 속도를 조금 늦추는 편이 좋겠습니다.`;
}

function buildMonthlyActionLine({ intent, mode, month }) {
  if (intent === 'career') {
    if (mode === 'advance') {
      return pickByNumber([
        '지원서 제출 수를 조금 늘리고 면접 일정을 부드럽게 확장해보세요.',
        '관심 공고 탐색을 넓히고, 연락 가능한 채널을 한두 개 더 열어두시면 좋겠습니다.',
        '작은 지원부터 꾸준히 넣으면서 면접 감각을 유지하는 방식이 잘 맞겠습니다.'
      ], month);
    }
    if (mode === 'balanced') {
      return pickByNumber([
        '지원과 보완을 1:1로 두고, 제출 전 점검 체크리스트를 짧게 돌려보세요.',
        '지원은 유지하되 포트폴리오 문장 다듬기를 함께 가져가시면 안정적입니다.',
        '바깥 움직임은 작게 유지하면서 면접 답변 완성도를 같이 올려보세요.'
      ], month);
    }
    return pickByNumber([
      '이력서 핵심 문장과 포트폴리오 흐름을 먼저 정리해두시면 다음 달이 훨씬 수월합니다.',
      '지원 수를 늘리기보다 면접 답변과 경력 서사를 보완하는 데 시간을 쓰는 편이 좋겠습니다.',
      '직무 정합성 점검과 서류 완성도 보강을 우선해두시면 부담이 줄어듭니다.'
    ], month);
  }

  if (intent === 'relationship') {
    if (mode === 'open') {
      return pickByNumber([
        '짧고 솔직한 대화를 먼저 열어보시면 관계 흐름이 자연스럽게 이어질 수 있습니다.',
        '요청과 감정을 간단히 나눠 말해보는 시도가 도움이 되겠습니다.',
        '상대 반응을 확인하는 가벼운 대화 제안을 해보기에 좋습니다.'
      ], month);
    }
    return pickByNumber([
      '결론을 급히 내리기보다 오해를 줄이는 확인 대화를 먼저 가져가시면 좋겠습니다.',
      '감정 표현 강도를 한 단계 낮추고 경계와 요청을 분리해서 전해보세요.',
      '거리 조절과 대화 템포 조정을 우선하면 관계 피로가 줄어듭니다.'
    ], month);
  }

  if (intent === 'finance') {
    if (mode === 'stabilize') {
      return pickByNumber([
        '예산 범위 안에서 계획한 지출을 유지하면 안정적인 결과를 만들기 좋습니다.',
        '고정비와 변동비를 나눠 관리해보면 체감 통제력이 올라갑니다.',
        '작은 절약 습관을 유지하면서 필요한 지출만 선별해보세요.'
      ], month);
    }
    return pickByNumber([
      '새로운 지출 확장보다 지출 항목 점검을 먼저 두는 편이 좋겠습니다.',
      '손실 가능성이 있는 선택은 한 템포 늦추고, 현금흐름부터 확인해보세요.',
      '고정비 정리와 소비 우선순위 재배치를 먼저 하시면 안정적입니다.'
    ], month);
  }

  return mode === 'advance'
    ? '지금은 계획한 일을 한두 가지라도 꾸준히 진행해보시면 좋겠습니다.'
    : '지금은 속도를 늦추고 정비를 먼저 해두시면 다음 흐름이 훨씬 편안합니다.';
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
  const text = String(context || '').toLowerCase();
  if (['오늘', '운세', '하루', '금일', '오늘의'].some((k) => text.includes(k))) {
    return {
      mainHint: '오늘은 크게 벌리기보다 바로 체감되는 선택 하나에 집중해 보세요.',
      beginnerHint: '지금 할 일 하나와 줄일 일 하나만 나눠 정하면 마음이 훨씬 가벼워집니다.',
      intermediateHint: '오전/오후 페이스만 구분해도 오늘 흐름을 안정적으로 가져갈 수 있습니다.'
    };
  }
  if (['이직', '직장', '회사', '업무', '커리어', '면접', '승진'].some((k) => text.includes(k))) {
    return {
      mainHint: '이직/업무 이슈는 기대보다 내 체력과 일정이 버티는지부터 확인하는 게 안전합니다.',
      beginnerHint: '지금 당장 붙잡을 일 하나와 내려놓을 일 하나를 먼저 정해 보세요.',
      intermediateHint: '단기 성과와 장기 방향이 충돌하면, 지금 더 급한 쪽부터 순서를 정하세요.'
    };
  }
  if (['연애', '관계', '재회', '결혼', '갈등', '상대', '감정'].some((k) => text.includes(k))) {
    return {
      mainHint: '관계 이슈는 상대 마음을 추측하기보다 내 감정과 요청을 분명히 말할 때 흐름이 풀립니다.',
      beginnerHint: '상대에게 전할 한 문장을 먼저 정해두면 대화가 훨씬 덜 흔들립니다.',
      intermediateHint: '원하는 것과 불편한 것을 분리해서 말하면 갈등이 줄어듭니다.'
    };
  }
  if (['돈', '재정', '투자', '지출', '저축', '수입', '대출'].some((k) => text.includes(k))) {
    return {
      mainHint: '돈 문제는 수익 기대보다 지출 통제부터 잡을 때 마음이 안정됩니다.',
      beginnerHint: '오늘 줄일 지출 하나만 정해도 흐름이 바로 달라집니다.',
      intermediateHint: '유지 가능한 소비 리듬을 먼저 만들고 확장은 그다음에 보세요.'
    };
  }
  if (['공부', '시험', '학습', '자격증', '과제', '집중'].some((k) => text.includes(k))) {
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
  if (spreadName === '원카드') {
    const yesNo = buildYesNoVerdict({
      contextLabel,
      firstItem,
      topKeywords,
      uprightCount,
      reversedCount
    });
    const keywordLine = topKeywords.length
      ? `핵심 키워드는 ${topKeywords.join(', ')}입니다.`
      : '핵심 키워드는 카드의 기본 의미 그대로 읽는 편이 안정적입니다.';
    if (yesNo) {
      return `${yesNo.verdict} 이유: ${yesNo.reason}`;
    }
    const verdictLine = uprightCount >= reversedCount
      ? '결론은 진행해도 되는 쪽에 가깝습니다.'
      : '결론은 속도를 늦추고 조절하는 쪽에 가깝습니다.';
    return `${verdictLine} ${keywordLine}`;
  }

  const keywordLine = topKeywords.length
    ? `이번 흐름의 중심 키워드는 ${topKeywords.join(', ')}로 모입니다.`
    : '이번 흐름은 한 가지 키워드로 단정하기보다 전체 결을 함께 보는 편이 좋습니다.';
  const flowLine = uprightCount >= reversedCount
    ? '전반적으로는 밀어도 되는 흐름이 조금 더 강합니다.'
    : '전반적으로는 속도를 조절하고 정리하는 쪽이 더 유리합니다.';
  if (contextLabel) return `질문 "${contextLabel}"에 대한 카드 흐름은 ${keywordLine} ${flowLine}`;
  return `${spreadName} 스프레드의 전체 흐름을 보면 ${keywordLine} ${flowLine}`;
}

function buildSummaryFocus({ spreadName, firstItem, lastItem, context = '', contextTone }) {
  if (!firstItem || !lastItem) return contextTone.mainHint;
  if (spreadName === '원카드' || firstItem.position.name === '핵심 메시지') {
    return `실행: ${buildOneCardActionLine({ context, firstItem })}`;
  }
  if (spreadName === '양자택일 (A/B)') {
    return `양자택일에서는 현재 상황 카드로 판단 기준을 먼저 고정하고, A/B 결과 카드에서 내가 오래 유지할 수 있는 쪽을 우선 보세요. ${contextTone.mainHint}`;
  }
  if (spreadName === '일별 운세') {
    return `일별 운세는 오늘의 흐름 카드로 페이스를 잡고, 행동 조언 카드 한 줄만 실제 일정에 반영하면 충분합니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '주별 운세') {
    return `주별 운세는 주간 테마에서 시작해 주간 조언으로 마무리되는 큰 흐름을 보시면 판단이 안정됩니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '월별 운세') {
    return `월별 운세는 월간 테마로 방향을 세우고 1~4주차 카드로 강약만 조절하면 됩니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '연간 운세 (12개월)') {
    return `연간 운세는 월별 사건에 매달리기보다 분기별 공통 흐름을 잡을 때 훨씬 선명해집니다. ${contextTone.mainHint}`;
  }
  if (spreadName === '켈틱 크로스') {
    return `켈틱 크로스는 현재/교차 카드로 중심 갈등을 확인하고 결과 카드로 연결하면 흐름이 깔끔해집니다. ${contextTone.mainHint}`;
  }
  return `먼저 ${firstItem.position.name}의 ${firstItem.card.nameKo} 카드를 중심에 두고, 마지막 ${lastItem.position.name}의 ${lastItem.card.nameKo} 카드를 결론으로 잡아보세요. ${contextTone.mainHint}`;
}

function buildSummaryAction({ spreadName, level, context = '', firstItem = null, contextTone }) {
  const levelLine = level === 'intermediate' ? contextTone.intermediateHint : contextTone.beginnerHint;
  if (spreadName === '원카드') {
    const reviewLine = buildOneCardReviewLine({ context, firstItem });
    return `복기: ${reviewLine} ${levelLine}`;
  }
  if (spreadName === '일별 운세') {
    return `오늘은 맞추려 하기보다 리듬을 지키는 쪽이 더 좋습니다. ${levelLine}`;
  }
  if (spreadName === '주별 운세') {
    return `한 주를 한 번에 바꾸려 하지 말고, 중반부터 천천히 페이스를 맞춰 보세요. ${levelLine}`;
  }
  if (spreadName === '월별 운세') {
    return `월간 리딩은 초반 스퍼트보다 후반 유지력이 더 중요합니다. ${levelLine}`;
  }
  if (spreadName === '연간 운세 (12개월)') {
    return `연간 리딩은 월별 성과보다 분기별 균형을 먼저 챙기면 덜 흔들립니다. ${levelLine}`;
  }
  if (spreadName === '양자택일 (A/B)') {
    return `결정 전에는 시간, 비용, 마음 소모 이 세 가지만 두 선택지에 대입해 보세요. ${levelLine}`;
  }
  if (spreadName === '3카드 스프레드') {
    return `세 장의 공통 키워드 하나를 잡아 오늘 행동 한 줄로 바꾸면 충분합니다. ${levelLine}`;
  }
  if (spreadName === '켈틱 크로스') {
    return `복합 이슈일수록 중심 흐름과 외부 환경을 분리해서 천천히 정리해 보세요. ${levelLine}`;
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
  if (sentences.length > 4) sentences.splice(4);
  let out = sentences.join(' ');
  if (out.length > 460) out = `${out.slice(0, 459).trim()}…`;
  return out;
}

function splitSentences(text = '') {
  const chunks = String(text).match(/[^.!?]+[.!?]?/g) ?? [];
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

function normalizeContextText(context = '') {
  return String(context || '').trim().replace(/[.!?]+$/g, '');
}

function isYesNoQuestion(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  if (/[?？]$/.test(normalized)) return true;
  if (/(할까|될까|말까|해도 될까|괜찮을까|맞을까|좋을까|나을까|인가|일까)$/.test(normalized)) {
    return true;
  }
  return false;
}

function buildYesNoVerdict({ contextLabel = '', firstItem = null, topKeywords = [], uprightCount = 0, reversedCount = 0 }) {
  const q = String(contextLabel || '').trim();
  if (!q || !isYesNoQuestion(q)) return null;

  const group = detectYesNoQuestionGroup(q);
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
  return {
    verdict: '한 줄 답: 네, 지금은 해도 괜찮습니다.',
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

  const riskWords = ['붕괴', '급변', '속박', '유혹', '집착', '불안', '혼란', '과부하', '갈등', '피로', '충돌', '상실'];
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
  const keyList = (topKeywords.length ? topKeywords : firstItem?.card?.keywords || []).slice(0, 3);
  const keywordText = keyList.length ? keyList.join(', ') : '현재 카드 흐름';
  const cardSubject = `${cardName} 카드는`;
  if (tone === 'high') {
    return `${cardSubject} ${keywordText} 신호가 강해 과하게 밀면 리듬이 쉽게 흔들릴 수 있습니다.`;
  }
  if (tone === 'low') {
    return `${cardSubject} ${keywordText} 흐름이 비교적 안정적이라 무리만 피하면 진행이 가능합니다.`;
  }
  return `${cardSubject} ${keywordText} 흐름이 있어 가능은 하지만 강도를 낮춰 조절하는 편이 안전합니다.`;
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
