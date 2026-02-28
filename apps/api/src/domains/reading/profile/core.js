import {
  RELATIONSHIP_KEYWORDS,
  CAREER_KEYWORDS,
  EMOTIONAL_KEYWORDS,
  LIGHT_KEYWORDS,
  BINARY_CONNECTOR_KEYWORDS,
  BINARY_DECISION_KEYWORDS,
  HEALTH_SYMPTOM_KEYWORDS,
  HEALTH_EMERGENCY_KEYWORDS,
  FORTUNE_KEYWORDS,
  TODAY_FORTUNE_KEYWORDS,
  WEEK_FORTUNE_KEYWORDS,
  MONTH_FORTUNE_KEYWORDS,
  YEAR_FORTUNE_KEYWORDS,
  SPREAD_CARD_COUNT,
  includesKeyword
} from './keywords.js';

const inferFortuneSpreadByTimeframe = (question = '') => {
  const safeQuestion = String(question || '');
  if (!includesKeyword(safeQuestion, FORTUNE_KEYWORDS)) return null;
  if (includesKeyword(safeQuestion, YEAR_FORTUNE_KEYWORDS)) return 'yearly';
  if (includesKeyword(safeQuestion, MONTH_FORTUNE_KEYWORDS)) return 'monthly';
  if (includesKeyword(safeQuestion, WEEK_FORTUNE_KEYWORDS)) return 'weekly';
  if (includesKeyword(safeQuestion, TODAY_FORTUNE_KEYWORDS)) return 'daily';
  return 'weekly';
};

const inferFortunePeriod = (question = '') => {
  const safeQuestion = String(question || '');
  if (!includesKeyword(safeQuestion, FORTUNE_KEYWORDS)) return null;
  if (includesKeyword(safeQuestion, YEAR_FORTUNE_KEYWORDS)) return 'year';
  if (includesKeyword(safeQuestion, MONTH_FORTUNE_KEYWORDS)) return 'month';
  if (includesKeyword(safeQuestion, WEEK_FORTUNE_KEYWORDS)) return 'week';
  if (includesKeyword(safeQuestion, TODAY_FORTUNE_KEYWORDS)) return 'today';
  return 'week';
};

const isBinaryIntent = (question = '') => {
  const safeQuestion = String(question || '');
  const hasConnector = includesKeyword(safeQuestion, BINARY_CONNECTOR_KEYWORDS);
  const hasDecisionMarker = includesKeyword(safeQuestion, BINARY_DECISION_KEYWORDS);
  const syllableCount = (safeQuestion.match(/까/g) || []).length;
  const hasDualCandidatePattern = syllableCount >= 2;
  return hasConnector || hasDecisionMarker || hasDualCandidatePattern;
};

export const inferRiskLevel = (question = '') => {
  const safeQuestion = String(question || '');
  if (includesKeyword(safeQuestion, HEALTH_EMERGENCY_KEYWORDS)) return 'high';
  if (includesKeyword(safeQuestion, HEALTH_SYMPTOM_KEYWORDS)) return 'medium';
  return 'low';
};

export const detectQuestionType = ({
  question = '',
  category = 'general',
  cardCount = 0,
  binaryEntities = null
}) => {
  const safeQuestion = String(question || '');
  const isBinaryByText = isBinaryIntent(safeQuestion);

  if ((binaryEntities && (cardCount === 2 || cardCount === 5)) || (
    isBinaryByText && (cardCount === 0 || cardCount === 2 || cardCount === 5)
  )) return 'binary';

  if (category === 'love' || includesKeyword(safeQuestion, RELATIONSHIP_KEYWORDS)) return 'relationship';
  if (category === 'career' || includesKeyword(safeQuestion, CAREER_KEYWORDS)) return 'career';
  if (includesKeyword(safeQuestion, EMOTIONAL_KEYWORDS)) return 'emotional';
  if (safeQuestion.length < 15 && includesKeyword(safeQuestion, LIGHT_KEYWORDS)) return 'light';
  return 'deep';
};

const inferRecommendedSpreadId = ({ question = '', category = 'general', questionType, domainTag }) => {
  const safeQuestion = String(question || '');
  const fortuneSpread = inferFortuneSpreadByTimeframe(safeQuestion);
  if (fortuneSpread) return fortuneSpread;
  if (domainTag === 'health') {
    if (questionType === 'binary') return 'choice';
    return 'weekly';
  }
  if (questionType === 'binary') return 'choice';
  if (category === 'love' || questionType === 'relationship') return 'relationship';
  if (category === 'career' || questionType === 'career') return 'career-path';
  if (questionType === 'emotional') return 'weekly';
  if (questionType === 'light') return 'daily';
  if (safeQuestion.length >= 45) return 'celtic';
  if (safeQuestion.length >= 30) return 'monthly';
  return 'weekly';
};

const inferDomainTag = ({ question = '', category = 'general', questionType }) => {
  const safeQuestion = String(question || '');
  if (inferRiskLevel(safeQuestion) !== 'low') return 'health';
  if (category === 'love' || questionType === 'relationship') return 'relationship';
  if (category === 'career' || questionType === 'career') return 'career';
  if (questionType === 'emotional') return 'emotional';
  if (questionType === 'binary' || questionType === 'light') return 'lifestyle';
  return 'general';
};

export const inferQuestionProfile = ({ question = '', category = 'general', binaryEntities = null } = {}) => {
  const safeQuestion = String(question || '');
  const wantsOverallFortune = includesKeyword(safeQuestion, FORTUNE_KEYWORDS);
  const inferredFortunePeriod = inferFortunePeriod(safeQuestion);
  const roughQuestionType = detectQuestionType({
    question: safeQuestion,
    category,
    cardCount: 0,
    binaryEntities
  });
  const domainTag = inferDomainTag({ question: safeQuestion, category, questionType: roughQuestionType });
  const riskLevel = inferRiskLevel(safeQuestion);
  const readingKind = domainTag === 'health'
    ? 'general_reading'
    : (wantsOverallFortune ? 'overall_fortune' : 'general_reading');
  const fortunePeriod = readingKind === 'overall_fortune'
    ? (inferredFortunePeriod || 'week')
    : null;
  const recommendedSpreadId = inferRecommendedSpreadId({
    question: safeQuestion,
    category,
    questionType: roughQuestionType,
    domainTag
  });
  const targetCardCount = SPREAD_CARD_COUNT[recommendedSpreadId] || 3;

  const questionType = detectQuestionType({
    question: safeQuestion,
    category,
    cardCount: targetCardCount,
    binaryEntities
  });

  return {
    questionType,
    domainTag,
    riskLevel,
    readingKind,
    fortunePeriod,
    recommendedSpreadId,
    targetCardCount
  };
};

export const inferTargetCardCount = (question = '', category = 'general') => {
  const profile = inferQuestionProfile({ question, category });
  return profile.targetCardCount;
};
