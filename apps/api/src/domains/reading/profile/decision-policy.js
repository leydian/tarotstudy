import { QUESTION_TYPES, EXPANDED_DOMAIN_TAGS, FORTUNE_KEYWORDS, includesKeyword } from './keywords.js';
import { sanitizeText, maskPII, buildContextSignalText, inferIntentScores } from './intent-scoring.js';
import { inferQuestionProfile, inferRiskLevel } from './core.js';

const intentToQuestionType = (intent) => {
  if (QUESTION_TYPES.has(intent)) return intent;
  return 'deep';
};

const intentToDomainTag = (intent) => {
  if (intent === 'relationship' || intent === 'friendship') return 'relationship';
  if (intent === 'career' || intent === 'relocation') return 'career';
  if (intent === 'emotional' || intent === 'self_growth') return 'emotional';
  if (intent === 'binary' || intent === 'light') return 'lifestyle';
  if (intent === 'finance') return 'finance';
  if (intent === 'family') return 'family';
  if (intent === 'education') return 'education';
  if (intent === 'spirituality') return 'spirituality';
  if (intent === 'legal') return 'legal';
  return 'general';
};

export const inferQuestionProfileV2 = ({ question = '', category = 'general', binaryEntities = null, context = null } = {}) => {
  const safeQuestion = sanitizeText(maskPII(question || ''));
  const contextSignal = buildContextSignalText(context);
  const baseProfile = inferQuestionProfile({ question: safeQuestion, category, binaryEntities });
  const intentScores = inferIntentScores({ question: safeQuestion, contextSignal });
  const top = intentScores[0] || { intent: 'deep', score: 0 };
  const second = intentScores[1] || { intent: 'deep', score: 0 };
  const scoreSum = intentScores.reduce((acc, item) => acc + item.score, 0) || 1;
  const normalizedTop = top.score / scoreSum;
  const margin = (top.score - second.score) / scoreSum;

  const wantsOverallFortune = includesKeyword(safeQuestion, FORTUNE_KEYWORDS);
  const riskLevel = inferRiskLevel(safeQuestion);
  const domainByIntent = intentToDomainTag(top.intent);
  const domainTag = riskLevel !== 'low'
    ? 'health'
    : (EXPANDED_DOMAIN_TAGS.has(domainByIntent) ? domainByIntent : baseProfile.domainTag);
  const questionType = intentToQuestionType(top.intent);

  // 공격적 보수 정책: confidence 기준 상향
  const lowConfidence = normalizedTop < 0.55 || margin < 0.12;
  const readingKind = (domainTag === 'health' || domainTag === 'legal' || lowConfidence)
    ? 'general_reading'
    : (wantsOverallFortune ? 'overall_fortune' : 'general_reading');
  const fortunePeriod = readingKind === 'overall_fortune'
    ? (baseProfile.fortunePeriod || 'week')
    : null;

  const recommendedSpreadId = baseProfile.recommendedSpreadId;
  const targetCardCount = baseProfile.targetCardCount;

  const intentBreakdown = intentScores
    .slice(0, 3)
    .map((item) => ({
      intent: item.intent,
      score: Number((item.score / scoreSum).toFixed(4)),
      source: contextSignal ? 'merged' : 'question'
    }));

  const safetyReasons = [];
  if (domainTag === 'health') safetyReasons.push('health_domain');
  if (domainTag === 'legal') safetyReasons.push('legal_domain');
  if (lowConfidence) safetyReasons.push('low_confidence');

  return {
    questionType,
    domainTag,
    riskLevel,
    readingKind,
    fortunePeriod,
    recommendedSpreadId,
    targetCardCount,
    confidence: Number(normalizedTop.toFixed(4)),
    lowConfidence,
    contextUsed: !!contextSignal,
    analysis: {
      intentBreakdown,
      domainDecision: {
        domainTag,
        riskLevel,
        confidence: Number(normalizedTop.toFixed(4))
      },
      readingDecision: {
        readingKind,
        recommendedSpreadId,
        responseMode: null
      },
      safety: {
        downgraded: lowConfidence || domainTag === 'health' || domainTag === 'legal',
        reasons: safetyReasons
      }
    }
  };
};
