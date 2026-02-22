import { inferQuestionIntent } from '../data/question-intents.js';
import { classifyQuestionLocal } from './local-classifier.js';
import { classifyQuestionExternal } from './external-classifier.js';
import { parseChoiceOptions } from './choice-parser.js';

function normalizeContext(text = '') {
  return String(text || '')
    .trim()
    .replace(/\s+([?？!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ');
}

function buildEntities(text = '') {
  const normalized = String(text || '');
  return {
    timeHints: [...normalized.matchAll(/(오늘|이번\s*주|다음\s*주|이번\s*달|다음\s*달|올해|내년|상반기|하반기|\d+월)/g)].map((m) => m[1]),
    domainHints: [...normalized.matchAll(/(이직|면접|지원|재회|연애|지출|저축|공부|시험|운동|수면|관계)/g)].map((m) => m[1]),
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

function buildFallbackResult(context = '') {
  const choice = parseChoiceOptions(context);
  const intent = fallbackRulesIntent(context);
  const questionType = buildQuestionType(context, choice, intent);
  return {
    intent,
    questionType,
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
    confidence: choice.hasChoice ? 0.74 : 0.58,
    entities: buildEntities(context),
    source: 'rules_fallback'
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

export function analyzeQuestionContextSync(context = '', options = {}) {
  const normalized = normalizeContext(context);
  const { mode, enabled } = resolveMode(options);
  const fallback = buildFallbackResult(normalized);
  if (!enabled || mode === 'legacy') return fallback;

  const local = classifyQuestionLocal(normalized);
  const confidenceThreshold = Number(options.confidenceThreshold || process.env.QUESTION_UNDERSTANDING_CONFIDENCE_THRESHOLD || 0.58);

  if (mode === 'shadow') {
    return {
      ...fallback,
      shadow: {
        localIntent: local.intent,
        localConfidence: local.confidence,
        localQuestionType: local.questionType
      }
    };
  }

  if (mode === 'hybrid' && local.confidence >= confidenceThreshold) {
    return {
      intent: local.intent,
      questionType: local.questionType,
      choice: mergeChoice(fallback.choice, {
        ...local.choice,
        confidence: local.choice?.hasChoice ? local.confidence : fallback.choice.confidence
      }),
      confidence: local.confidence,
      entities: buildEntities(normalized),
      source: local.source
    };
  }

  return fallback;
}

export async function analyzeQuestionContext(context = '', options = {}) {
  const normalized = normalizeContext(context);
  const syncResult = analyzeQuestionContextSync(normalized, options);
  const { mode, enabled } = resolveMode(options);
  if (!enabled || mode !== 'hybrid') return syncResult;

  const threshold = Number(options.confidenceThreshold || process.env.QUESTION_UNDERSTANDING_CONFIDENCE_THRESHOLD || 0.58);
  if (syncResult.confidence >= threshold && syncResult.source !== 'rules_fallback') return syncResult;

  const external = await classifyQuestionExternal(normalized, options.external || {});
  if (!external) return syncResult;

  return {
    intent: external.intent,
    questionType: external.questionType,
    choice: mergeChoice(syncResult.choice, {
      ...(external.choice || {}),
      confidence: Number(external.confidence || syncResult.choice.confidence || 0.6)
    }),
    confidence: Number(external.confidence || syncResult.confidence || 0.6),
    entities: buildEntities(normalized),
    source: external.source
  };
}

export function inferQuestionIntentEnhanced(context = '', options = {}) {
  return analyzeQuestionContextSync(context, options).intent;
}

export { parseChoiceOptions };
