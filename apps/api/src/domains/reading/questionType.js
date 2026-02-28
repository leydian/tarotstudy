const RELATIONSHIP_KEYWORDS = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
const CAREER_KEYWORDS = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
const EMOTIONAL_KEYWORDS = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
const LIGHT_KEYWORDS = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];
const BINARY_CONNECTOR_KEYWORDS = ['아니면', 'vs', '또는', '혹은'];
const BINARY_DECISION_KEYWORDS = ['말까', '할지 말지'];
const HEALTH_SYMPTOM_KEYWORDS = [
  '배탈', '복통', '설사', '구토', '메스꺼', '소화', '아프', '통증', '열', '기침', '두통', '어지러', '몸살', '컨디션', '병원', '약'
];
const HEALTH_EMERGENCY_KEYWORDS = [
  '호흡곤란', '숨이', '숨쉬기', '흉통', '의식', '기절', '실신', '출혈', '피가', '고열', '응급'
];
const FORTUNE_KEYWORDS = ['종합 운세', '운세', 'today fortune', 'weekly fortune', 'monthly fortune', 'yearly fortune'];
const TODAY_FORTUNE_KEYWORDS = ['오늘', '오늘의'];
const WEEK_FORTUNE_KEYWORDS = ['이번주', '이번 주', '주간'];
const MONTH_FORTUNE_KEYWORDS = ['이번달', '이번 달', '이달', '월간'];
const YEAR_FORTUNE_KEYWORDS = ['올해', '연간', '금년'];

const SPREAD_CARD_COUNT = {
  daily: 1,
  choice: 2,
  weekly: 3,
  monthly: 5,
  'career-path': 5,
  relationship: 7,
  horseshoe: 7,
  celtic: 10,
  yearly: 12
};

const includesKeyword = (text, keywords) => keywords.some((k) => text.includes(k));
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
