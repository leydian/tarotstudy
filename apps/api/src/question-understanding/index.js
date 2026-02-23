import { inferQuestionIntent } from '../data/question-intents.js';
import { classifyQuestionLocal } from './local-classifier.js';
import { classifyQuestionExternal } from './external-classifier.js';
import { parseChoiceOptions } from './choice-parser.js';
import { inferShortUtterance } from './short-utterance-rules.js';

// [Optimization] LRU-style Memory Cache for Question Analysis
const ANALYSIS_CACHE = new Map();
const MAX_CACHE_SIZE = 500;

function getCachedResult(key) {
  if (!ANALYSIS_CACHE.has(key)) return null;
  const val = ANALYSIS_CACHE.get(key);
  ANALYSIS_CACHE.delete(key); // Move to end (MRU)
  ANALYSIS_CACHE.set(key, val);
  return val;
}

function setCachedResult(key, val) {
  if (ANALYSIS_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = ANALYSIS_CACHE.keys().next().value;
    ANALYSIS_CACHE.delete(firstKey);
  }
  ANALYSIS_CACHE.set(key, val);
}

function normalizeContext(text = '') {
  return String(text || '')
    .trim()
    .replace(/\s+([?？!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ');
}

function buildEntities(text = '') {
  const normalized = String(text || '');
  return {
    timeHints: [...normalized.matchAll(/(오늘|이번\s*주|다음\s*주|이번\s*달|다음\s*달|올해|내년|상반기|하반기|금주|금월|this\s*week|this\s*month|this\s*year|today|weekly|monthly|yearly|\d+월)/gi)].map((m) => m[1]),
    domainHints: [...normalized.matchAll(/(이직|면접|지원|재회|연애|지출|저축|공부|시험|운동|수면|관계|sleep|job|career|finance|study|health|relationship)/gi)].map((m) => m[1]),
    locationCandidates: [...normalized.matchAll(/([\w가-힣]{2,24})\s*(?:에서|으로|로)/g)].map((m) => m[1]),
    productCandidates: [...normalized.matchAll(/([\w가-힣]{2,24})\s*(?:을|를)?\s*살까/g)].map((m) => m[1])
  };
}

function fallbackRulesIntent(context = '') {
  return inferQuestionIntent(context, {
    includeDaily: true,
    includeStudy: true,
    includeHealth: true
  });
}

function buildQuestionType(context = '', choice = null, legacyIntent = 'general') {
  const text = String(context || '').toLowerCase();
  if (choice?.hasChoice) return 'choice_ab';
  if (/(할까|될까|말까|괜찮을까|가능할까|맞을까|좋을까|나을까|될지|있을까|수\s*있을까|가능성(?:이|은)?\s*있을까|can\s*i|should\s*i|is\s*it\s*okay)/i.test(text)) return 'yes_no';
  if (/(운세|흐름|리딩|해석|전망|luck|fortune|horoscope|today\s*luck|weekly\s*luck|monthly\s*luck|yearly\s*luck)/i.test(text) || legacyIntent === 'daily') return 'forecast';
  return 'open';
}

function inferSubIntent(intent = 'general', context = '') {
  const text = String(context || '').toLowerCase();
  if (intent === 'daily') {
    if (/(수면|잠|sleep)/i.test(text)) return 'sleep';
    if (/(일정|스케줄|에너지|컨디션|피로|energy)/i.test(text)) return 'energy';
    if (/(사람|관계|대화|social)/i.test(text)) return 'social-day';
    return 'schedule';
  }
  if (intent === 'relationship' || intent === 'relationship-repair') {
    if (/(재회|화해|회복|reconnect)/i.test(text)) return 'reconnect';
    if (/(갈등|다툼|오해|conflict)/i.test(text)) return 'conflict';
    return 'pace';
  }
  if (intent === 'career') {
    if (/(면접|interview|지원)/i.test(text)) return 'interview';
    if (/(이직|job\s*change|오퍼|offer)/i.test(text)) return 'job-change';
    return 'project';
  }
  if (intent === 'finance') {
    if (/(구매|결제|사도|buy|살까)/i.test(text)) return 'purchase';
    if (/(저축|유동성|현금|liquidity)/i.test(text)) return 'liquidity';
    return 'risk-control';
  }
  return 'default';
}

function inferTimeHorizon(context = '', entities = null) {
  const text = String(context || '').toLowerCase();
  const hints = entities?.timeHints || [];
  if (/(지금|오늘|당장|바로|now|today)/i.test(text) || hints.some((v) => /오늘|today/i.test(v))) return 'immediate';
  if (/(이번\s*주|다음\s*주|금주|this\s*week|weekly)/i.test(text) || hints.some((v) => /주|week/i.test(v))) return 'week';
  if (/(이번\s*달|다음\s*달|금월|this\s*month|monthly|\d+월)/i.test(text) || hints.some((v) => /달|month|월/i.test(v))) return 'month';
  if (/(올해|내년|this\s*year|yearly)/i.test(text) || hints.some((v) => /년|year/i.test(v))) return 'year';
  return 'unspecified';
}

function inferRiskClass(intent = 'general', questionType = 'open', context = '') {
  const text = String(context || '').toLowerCase();
  if (/(병원|약|진단|치료|의료|의사|medical)/i.test(text)) return 'high';
  if (intent === 'finance' && /(큰\s*금액|대출|투자|빚|loan|all\s*in)/i.test(text)) return 'high';
  if (intent === 'daily' && /(잠|수면|sleep)/i.test(text)) return 'medium';
  if (questionType === 'choice_ab') return 'medium';
  return 'low';
}

function classifyConfidenceBand(confidence = 0.5) {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  return 'low';
}

function buildFallbackResult(context = '') {
  const choice = parseChoiceOptions(context);
  const short = inferShortUtterance(context);
  const intent = short?.intent || fallbackRulesIntent(context);
  const questionType = short?.questionType || buildQuestionType(context, choice, intent);
  const entities = buildEntities(context);
  const subIntent = short?.subIntent || inferSubIntent(intent, context);
  const riskClass = short?.riskClass || inferRiskClass(intent, questionType, context);
  return {
    intent,
    questionType,
    subIntent,
    domain: intent,
    timeHorizon: inferTimeHorizon(context, entities),
    riskClass,
    choice: {
      hasChoice: choice.hasChoice,
      mode: choice.mode,
      optionA: choice.optionA,
      optionB: choice.optionB,
      confidence: choice.hasChoice ? 0.74 : 0.52,
      isPurchaseChoice: choice.isPurchaseChoice,
      isLocationChoice: choice.isLocationChoice,
      isWorkChoice: choice.isWorkChoice
    },
    confidence: short?.confidence || (choice.hasChoice ? 0.74 : 0.58),
    confidenceBand: classifyConfidenceBand(short?.confidence || (choice.hasChoice ? 0.74 : 0.58)),
    entities,
    source: short?.source || 'rules_fallback'
  };
}

function resolveMode(options = {}) {
  const mode = String(options.mode || process.env.QUESTION_UNDERSTANDING_MODE || 'hybrid').toLowerCase();
  const flag = String(options.flag ?? process.env.QUESTION_UNDERSTANDING_FLAG ?? 'true').toLowerCase() === 'true';
  return { mode, enabled: flag };
}

function mergeChoice(base, next) {
  if (!next) return base;
  return {
    ...base,
    ...next,
    optionA: next.optionA || base.optionA,
    optionB: next.optionB || base.optionB,
    hasChoice: Boolean(next.hasChoice ?? base.hasChoice),
    mode: next.mode || base.mode
  };
}

function toV2Shape(raw = {}, context = '') {
  const entities = raw.entities || buildEntities(context);
  const intent = raw.intent || 'general';
  const questionType = raw.questionType || 'open';
  const confidence = Number(raw.confidence || 0.5);
  return {
    text: String(context || ''),
    normalizedText: normalizeContext(context),
    intent,
    subIntent: raw.subIntent || inferSubIntent(intent, context),
    domain: raw.domain || intent,
    questionType,
    timeHorizon: raw.timeHorizon || inferTimeHorizon(context, entities),
    riskClass: raw.riskClass || inferRiskClass(intent, questionType, context),
    confidence,
    confidenceBand: raw.confidenceBand || classifyConfidenceBand(confidence),
    choice: raw.choice || { mode: 'single', hasChoice: false, optionA: 'A안', optionB: 'B안' },
    entities,
    source: raw.source || 'rules_fallback',
    templateVersion: 'question-understanding-v2.5'
  };
}

export function analyzeQuestionContextSync(context = '', options = {}) {
  const normalized = normalizeContext(context);
  const cacheKey = `sync:${normalized}:${options.mode || 'hybrid'}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const { mode, enabled } = resolveMode(options);
  const fallback = buildFallbackResult(normalized);
  if (!enabled || mode === 'legacy') return fallback;

  const local = classifyQuestionLocal(normalized);
  // 방안 3: 신뢰도 임계치 0.58 → 0.65 상향으로 외부 AI 보조 판단 활용 빈도 증가
  const confidenceThreshold = Number(options.confidenceThreshold || process.env.QUESTION_UNDERSTANDING_CONFIDENCE_THRESHOLD || 0.65);

  let result;
  if (mode === 'shadow') {
    result = {
      ...fallback,
      shadow: {
        localIntent: local.intent,
        localConfidence: local.confidence,
        localQuestionType: local.questionType
      }
    };
  } else if (mode === 'hybrid' && local.confidence >= confidenceThreshold) {
    const entities = buildEntities(normalized);
    const intent = local.intent;
    const questionType = local.questionType;
    result = {
      intent,
      questionType,
      subIntent: inferSubIntent(intent, normalized),
      domain: intent,
      timeHorizon: inferTimeHorizon(normalized, entities),
      riskClass: inferRiskClass(intent, questionType, normalized),
      choice: mergeChoice(fallback.choice, {
        ...local.choice,
        confidence: local.choice?.hasChoice ? local.confidence : fallback.choice.confidence
      }),
      confidence: local.confidence,
      confidenceBand: classifyConfidenceBand(local.confidence),
      entities,
      source: local.source,
      inferenceSignals: local.inferenceSignals || [],
      hasAnxietySignal: local.hasAnxietySignal || false
    };
  } else {
    result = {
      ...fallback,
      inferenceSignals: local.inferenceSignals || [],
      hasAnxietySignal: local.hasAnxietySignal || false
    };
  }

  setCachedResult(cacheKey, result);
  return result;
}

export async function analyzeQuestionContext(context = '', options = {}) {
  const normalized = normalizeContext(context);
  const cacheKey = `async:${normalized}:${options.mode || 'hybrid'}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const syncResult = analyzeQuestionContextSync(normalized, options);
  const { mode, enabled } = resolveMode(options);
  if (!enabled || mode !== 'hybrid') return syncResult;

  const threshold = Number(options.confidenceThreshold || process.env.QUESTION_UNDERSTANDING_EXTERNAL_THRESHOLD || 0.72);
  const needsExternalForRisk = syncResult.riskClass === 'high';
  if (syncResult.confidence >= threshold && !needsExternalForRisk && syncResult.source !== 'rules_fallback') return syncResult;

  const external = await classifyQuestionExternal(normalized, options.external || {});
  if (!external) return syncResult;

  const entities = buildEntities(normalized);
  const intent = external.intent;
  const questionType = external.questionType;
  const confidence = Number(external.confidence || syncResult.confidence || 0.6);

  const result = {
    intent,
    questionType,
    subIntent: external.subIntent || inferSubIntent(intent, normalized),
    domain: external.domain || intent,
    timeHorizon: external.timeHorizon || inferTimeHorizon(normalized, entities),
    riskClass: external.riskClass || inferRiskClass(intent, questionType, normalized),
    choice: mergeChoice(syncResult.choice, {
      ...(external.choice || {}),
      confidence: Number(external.confidence || syncResult.choice.confidence || 0.6)
    }),
    confidence,
    confidenceBand: classifyConfidenceBand(confidence),
    entities,
    source: external.source
  };

  setCachedResult(cacheKey, result);
  return result;
}

export function analyzeQuestionContextV2Sync(context = '', options = {}) {
  return toV2Shape(analyzeQuestionContextSync(context, options), context);
}

export async function analyzeQuestionContextV2(context = '', options = {}) {
  return toV2Shape(await analyzeQuestionContext(context, options), context);
}

export function inferQuestionIntentEnhanced(context = '', options = {}) {
  return analyzeQuestionContextSync(context, options).intent;
}

export { parseChoiceOptions };
