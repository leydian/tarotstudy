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
const spreadTelemetryStats = {
  totalEvents: 0,
  byType: {},
  bySpread: {},
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
app.get('/api/telemetry/spread-events', async () => spreadTelemetryStats);

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

  spreadTelemetryStats.totalEvents += 1;
  spreadTelemetryStats.byType[type] = (spreadTelemetryStats.byType[type] || 0) + 1;
  spreadTelemetryStats.bySpread[spreadId] = (spreadTelemetryStats.bySpread[spreadId] || 0) + 1;
  spreadTelemetryStats.recent.unshift({
    at: new Date().toISOString(),
    type: String(type),
    spreadId: String(spreadId),
    level: String(level),
    context: String(context).slice(0, 180)
  });
  spreadTelemetryStats.recent = spreadTelemetryStats.recent.slice(0, 80);

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
  if (spreadId === 'weekly-fortune') {
    return summarizeWeeklyFortune({ items, context, level });
  }
  if (spreadId === 'relationship-recovery') {
    return summarizeRelationshipRecovery({ items, context, level });
  }
  if (spreadId === 'celtic-cross') {
    return summarizeCelticCross({ items, context, level });
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

function summarizeRelationshipRecovery({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const current = pick('현재 관계 상태');
  const friction = pick('거리/갈등의 핵심');
  const signal = pick('상대 관점 신호');
  const action = pick('회복 행동');
  const week = pick('다음 7일 흐름');
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;

  const orientationLabel = (item) => {
    if (!item) return '신호 확인 필요';
    return item.orientation === 'upright' ? '열림 신호' : '조정 신호';
  };
  const keyword = (item) => item?.card?.keywords?.[0] || '관계 흐름';
  const variationSeed = hashText([
    context,
    current?.card?.id || '',
    friction?.card?.id || '',
    signal?.card?.id || '',
    action?.card?.id || '',
    week?.card?.id || ''
  ].join(':'));

  const signalLine = pickByNumber([
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이므로 추측보다 반응 단서를 확인하는 접근이 유리합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}로 읽혀, 해석보다 실제 반응 기록을 먼저 쌓는 편이 안전합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이어서, 결론을 서두르기보다 확인 대화를 먼저 두는 편이 좋겠습니다.`
  ], variationSeed);

  const diagnosis = [
    `핵심 진단: 현재 관계 상태(${current?.card?.nameKo || '-'})는 ${orientationLabel(current)}로 읽힙니다.`,
    `거리/갈등의 핵심(${friction?.card?.nameKo || '-'})에서는 "${keyword(friction)}" 테마가 반복 포인트로 보입니다.`,
    signalLine
  ].join(' ');

  const riskActionLine = week?.orientation === 'upright'
    ? pickByNumber([
      '지금은 대화를 열 수 있는 창이 있으니 표현 강도만 낮추면 오해를 줄일 수 있습니다.',
      '반응 창이 열려 있는 흐름이라, 먼저 짧은 확인 문장으로 접점을 만드는 방식이 유효합니다.',
      '지금은 관계 신호가 비교적 열려 있어, 감정 설명보다 사실 확인 대화를 우선하면 안정적입니다.'
    ], variationSeed + 1)
    : pickByNumber([
      '지금은 결론을 서두르면 오해가 커질 수 있어 확인 대화와 속도 조절을 먼저 두는 편이 좋습니다.',
      '지금은 감정 해석이 과열되기 쉬워서, 단정 대신 확인 질문 1개로 속도를 낮추는 편이 좋겠습니다.',
      '지금은 빠른 정리보다 오해 요인을 하나씩 줄이는 대화 설계가 먼저 필요해 보입니다.'
    ], variationSeed + 1);

  const risk = [
    `관계 리스크: 다음 7일 흐름(${week?.card?.nameKo || '-'}) 기준으로 "${keyword(week)}" 구간에서 감정 과속이 생기기 쉽습니다.`,
    riskActionLine
  ].join(' ');

  const planOpening = pickByNumber([
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})을 기준으로 오늘 실행할 문장 1개를 먼저 정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})을 기준으로 이번 주 첫 대화의 목표 문장 1개를 먼저 고정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})을 바탕으로 오늘 시도할 행동 1개와 멈출 행동 1개를 같이 정하세요.`
  ], variationSeed + 2);
  const planRoutine = pickByNumber([
    '대화 전에는 사실 1개/요청 1개만 준비하고, 대화 후에는 상대 반응을 한 줄 복기로 남기세요.',
    '대화 전에는 확인 질문 1개만 정하고, 대화 후에는 상대 반응과 내 감정 변화를 각각 한 줄씩 남기세요.',
    '연락 전에는 전달할 핵심 문장 1개만 적고, 이후에는 결과를 사실/해석으로 분리해 짧게 기록하세요.'
  ], variationSeed + 3);

  const plan = [
    planOpening,
    planRoutine,
    levelHint
  ].join(' ');

  return [diagnosis, risk, plan].join('\n\n');
}

function summarizeWeeklyFortune({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const theme = pick('주간 테마');
  const monTue = pick('월-화');
  const wedThu = pick('수-목');
  const friday = pick('금요일');
  const saturday = pick('토요일');
  const sunday = pick('일요일');
  const advice = pick('주간 조언');
  const intent = inferYearlyIntent(context);
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;
  const seed = hashText([
    context,
    theme?.card?.id || '',
    monTue?.card?.id || '',
    wedThu?.card?.id || '',
    friday?.card?.id || '',
    saturday?.card?.id || '',
    sunday?.card?.id || '',
    advice?.card?.id || ''
  ].join(':'));

  const themeKeyword = theme?.card?.keywords?.[0] || '주간 흐름';
  const themeLabel = theme?.card?.nameKo ? `${theme.card.nameKo} ${theme?.orientation === 'reversed' ? '역방향' : '정방향'}` : '신호 확인 필요';
  const overallFlow = uprightCount >= reversedCount ? '전개가 열려 있는 주간' : '속도 조절이 필요한 주간';
  const overallIntentLine = buildWeeklyIntentLine({ intent, orientation: theme?.orientation || 'upright', keyword: themeKeyword });

  const overall = [
    `이번 주의 중심 카드는 ${themeLabel}이며, 핵심 키워드는 "${themeKeyword}"입니다.`,
    `전체적으로는 ${overallFlow}으로 보입니다.`,
    overallIntentLine
  ].join(' ');

  const mondayLine = buildWeeklyDayLine({
    item: monTue,
    dayLabel: '월요일',
    roleHint: '주간 시동',
    intent,
    openHint: '주 초반에는 일정과 우선순위를 빠르게 고정하면 흐름을 선점하기 좋습니다.',
    adjustHint: '주 초반에는 무리한 확장보다 속도 조절과 기준 정리가 먼저입니다.',
    seed: seed + 1
  });
  const tuesdayLine = buildWeeklyDayLine({
    item: monTue,
    dayLabel: '화요일',
    roleHint: '초반 안정화',
    intent,
    openHint: '화요일에는 전날 정한 기준을 반복 실행하면 체감 안정성이 올라갑니다.',
    adjustHint: '화요일에는 일정 과적재를 줄이고 실행 항목을 하나로 줄이는 편이 좋겠습니다.',
    seed: seed + 2
  });
  const wednesdayLine = buildWeeklyDayLine({
    item: wedThu,
    dayLabel: '수요일',
    roleHint: '중반 전환',
    intent,
    openHint: '수요일에는 외부 변수 대응 여지가 있어 핵심 한 가지를 밀어붙이기 좋은 구간입니다.',
    adjustHint: '수요일에는 해석 충돌이나 피로 누적을 먼저 줄여야 후반 흐름이 살아납니다.',
    seed: seed + 3
  });
  const thursdayLine = buildWeeklyDayLine({
    item: wedThu,
    dayLabel: '목요일',
    roleHint: '중반 마무리',
    intent,
    openHint: '목요일에는 진행 중인 일을 정리해 금요일 마감 품질을 높이는 데 유리합니다.',
    adjustHint: '목요일에는 진행 중인 이슈를 정리하고 충돌 요인을 줄이는 편이 좋겠습니다.',
    seed: seed + 4
  });
  const fridayLine = buildWeeklyDayLine({
    item: friday,
    dayLabel: '금요일',
    roleHint: '성과 점검',
    intent,
    openHint: '금요일에는 결과 확인과 마감 정리를 함께 잡으면 주간 완성도가 올라갑니다.',
    adjustHint: '금요일에는 성과 집착보다 누락 정리와 손실 방어를 먼저 두는 편이 안전합니다.',
    seed: seed + 5
  });

  const saturdayLine = buildWeeklyDayLine({
    item: saturday,
    dayLabel: '토요일',
    roleHint: '회복/정비',
    intent,
    openHint: '토요일은 회복과 관계 정비를 균형 있게 가져가면 다음 주 체력이 남습니다.',
    adjustHint: '토요일은 일정 과적재를 줄이고 회복 루틴을 먼저 고정하는 편이 좋겠습니다.',
    seed: seed + 6
  });
  const sundayLine = buildWeeklyDayLine({
    item: sunday,
    dayLabel: '일요일',
    roleHint: '복기/준비',
    intent,
    openHint: '일요일은 복기와 다음 주 준비를 짧게 끝내면 월요일 진입이 훨씬 부드러워집니다.',
    adjustHint: '일요일은 감정 소모를 줄이고 다음 주 우선순위 1개만 남기는 편이 안정적입니다.',
    seed: seed + 7
  });

  const adviceKeyword = advice?.card?.keywords?.[0] || '실행';
  const adviceLabel = advice?.card?.nameKo ? `${advice.card.nameKo} ${advice?.orientation === 'reversed' ? '역방향' : '정방향'}` : '신호 확인 필요';
  const actionGuide = advice?.orientation === 'reversed'
    ? pickByNumber([
      `주간 조언(${adviceLabel})은 "${adviceKeyword}" 구간의 과속을 멈추고, 실행 항목을 1개로 축소하라는 신호입니다.`,
      `주간 조언(${adviceLabel})은 "${adviceKeyword}"에서 병목이 생기기 쉬우니, 선택지를 줄여 집중도를 높이라는 메시지입니다.`
    ], seed + 6)
    : pickByNumber([
      `주간 조언(${adviceLabel})은 "${adviceKeyword}" 축을 중심으로 작은 실행을 매일 이어가면 체감이 커진다는 신호입니다.`,
      `주간 조언(${adviceLabel})은 "${adviceKeyword}" 흐름을 살리기 위해 하루 1개 실행과 짧은 복기를 묶으라는 메시지입니다.`
    ], seed + 8);

  return [
    `총평: ${overall}`,
    `일별 흐름: ${mondayLine} ${tuesdayLine} ${wednesdayLine} ${thursdayLine} ${fridayLine} ${saturdayLine} ${sundayLine}`,
    `실행 가이드: ${actionGuide} ${levelHint}`
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
          `"${keyword}" 신호가 열려 있어 짧은 확인 대화를 시도해보기 좋습니다.`,
          `"${keyword}" 축에서는 요청과 감정을 분리해 말하면 오해를 줄일 수 있습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 구간에서는 해석 충돌이 생기기 쉬워 단정 문장을 줄이는 편이 좋습니다.`,
          `"${keyword}" 축에서는 반응 확인 후 다음 대화를 여는 편이 안정적입니다.`
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
  seed = 0
}) {
  const label = item?.card?.nameKo ? `${dayLabel}(${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'})` : dayLabel;
  const rolePrefix = roleHint ? `${roleHint} 관점에서` : '흐름 관점에서';
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const open = item?.orientation !== 'reversed';

  const intentHint = (() => {
    if (intent === 'finance') {
      return open
        ? pickByNumber([
          `"${keyword}" 신호가 살아 있어 금액 기준을 지키면 안정적으로 운영하기 좋습니다.`,
          `"${keyword}" 축이 열려 있어 지출/저축 균형을 맞추면 체감 안정성이 올라갑니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 변동이 커질 수 있어 결제 전 점검을 먼저 두는 편이 좋겠습니다.`,
          `"${keyword}" 구간에서는 손실 방어와 지출 축소를 우선하는 편이 안전합니다.`
        ], seed);
    }
    if (intent === 'relationship') {
      return open
        ? pickByNumber([
          `"${keyword}" 흐름이 열려 있어 짧은 확인 대화를 시도해보기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 요청과 감정을 분리해 전달하면 반응을 읽기 쉽습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 해석이 엇갈릴 수 있어 단정 문장을 줄이는 편이 좋겠습니다.`,
          `"${keyword}" 구간에서는 반응 확인 후 다음 대화를 여는 편이 안정적입니다.`
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

  const dayHint = open ? openHint : adjustHint;
  return `${label}은 ${rolePrefix} ${intentHint} ${dayHint}`;
}

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
  const text = String(context || '').toLowerCase();
  if (/(화해|친구|싸웠|싸움|다툼|갈등|서운|오해|관계 회복)/.test(text)) return 'relationship-repair';
  if (/(연애|재회|상대|썸|결혼|이별)/.test(text)) return 'relationship';
  if (/(이직|취업|커리어|업무|면접|회사|직장)/.test(text)) return 'career';
  if (/(재정|돈|지출|수입|저축|투자|소비|자산)/.test(text)) return 'finance';
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
    levelHint
  ];

  const generalClose = [
    `정리하면, 중심축(${currentLabel})과 장애축(${obstacleLabel})을 먼저 해소할 때 가까운 미래(${futureLabel})에서 결과(${outcomeLabel})로 넘어가는 흐름이 안정됩니다.`,
    resultIsOpen
      ? '결론은 실행 가능성이 비교적 열려 있습니다. 우선순위 하나를 정해 작은 실행으로 흐름을 붙여보세요.'
      : '결론은 조정이 필요한 흐름입니다. 무리한 확장보다 핵심 병목 하나를 먼저 줄이는 쪽이 유리합니다.',
    '지금 실행할 한 문장: "이번 이슈에서 가장 먼저 정리할 핵심 한 가지를 지금 바로 결정하겠습니다."',
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
    ? `취직 시기 관점으로 정리하면, 언제 무엇을 할지 기준은 분명합니다. ${strongest.label}에는 지원서 제출과 면접 일정을 본격적으로 열고, ${weakest.label}에는 이력서·포트폴리오 보완과 직무 정합성 점검에 집중해 주세요. ${levelHint}`
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
  if (/(취직|취업|이직|입사|지원|면접|커리어|직장|회사|오퍼|협상|이력서|포트폴리오|직무)/.test(text)) return 'career';
  if (/(연애|관계|재회|결혼|상대|썸)/.test(text)) return 'relationship';
  if (/(재정|재물|돈|지출|수입|저축|투자|소비|자산|현금흐름|가계부)/.test(text)) return 'finance';
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

  return mode === 'advance'
    ? `${role}에서는 계획한 일을 한두 가지라도 꾸준히 진행해보시면 좋겠습니다.`
    : `${role}에서는 속도를 늦추고 정비를 먼저 해두시면 다음 흐름이 훨씬 편안합니다.`;
}

function buildMonthlyFallbackAction({ intent, mode, month, cardName }) {
  const seed = hashText(`fallback:${intent}:${mode}:${month}:${cardName}`);
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
