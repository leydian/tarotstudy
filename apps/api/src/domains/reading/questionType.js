const RELATIONSHIP_KEYWORDS = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
const CAREER_KEYWORDS = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
const EMOTIONAL_KEYWORDS = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
const LIGHT_KEYWORDS = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];
const BINARY_CONNECTOR_KEYWORDS = ['아니면', 'vs', '또는', '혹은'];
const BINARY_DECISION_KEYWORDS = ['말까', '할지 말지'];
const HEALTH_SYMPTOM_KEYWORDS = [
  '배탈', '복통', '설사', '구토', '메스꺼', '소화', '아프', '통증', '열', '기침', '두통', '어지러', '몸살', '컨디션', '병원'
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

const INTENT_KEYWORDS = {
  binary: [...BINARY_CONNECTOR_KEYWORDS, ...BINARY_DECISION_KEYWORDS, '할까', '먹을까', '마실까'],
  relationship: RELATIONSHIP_KEYWORDS,
  career: CAREER_KEYWORDS,
  emotional: EMOTIONAL_KEYWORDS,
  light: LIGHT_KEYWORDS,
  deep: ['방향', '의미', '왜', '어떻게', '인생', '앞으로', '미래'],
  finance: ['돈', '재정', '투자', '주식', '코인', '저축', '지출', '부채', '자산'],
  family: ['가족', '부모', '엄마', '아빠', '형제', '자녀', '집안'],
  friendship: ['친구', '우정', '지인', '동료 관계', '인간관계'],
  self_growth: ['성장', '습관', '자기계발', '목표', '집중', '루틴'],
  spirituality: ['영성', '명상', '직관', '영혼', '우주', '깨달음'],
  education: ['시험', '공부', '합격', '학교', '학업', '수업', '자격증'],
  relocation: ['이사', '이동', '전근', '해외', '유학', '거주지'],
  legal: ['소송', '법', '계약 분쟁', '합의', '고소', '민사', '형사', '위자료']
};

const QUESTION_TYPES = new Set(['binary', 'relationship', 'career', 'emotional', 'light', 'deep']);
const EXPANDED_DOMAIN_TAGS = new Set([
  'health', 'relationship', 'career', 'emotional', 'lifestyle', 'general', 'finance', 'family', 'education', 'spirituality', 'legal'
]);

const includesKeyword = (text, keywords) => keywords.some((k) => text.includes(k));
const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const maskPII = (text = '') => {
  const value = String(text || '');
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?:\+?82[-\s]?)?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, '[PHONE]')
    .replace(/\b\d{6}[- ]?\d{7}\b/g, '[ID]')
    .replace(/\b\d{2,4}[- ]?\d{2,4}[- ]?\d{2,4}\b/g, '[NUM]');
};

const normalizeRecentTurns = (context) => {
  if (!context || !Array.isArray(context.recentTurns)) return [];
  return context.recentTurns
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      text: sanitizeText(maskPII(turn?.text || '')),
      summary: sanitizeText(maskPII(turn?.summary || ''))
    }))
    .filter((turn) => !!turn.text || !!turn.summary)
    .slice(-5);
};

const buildContextSignalText = (context) => {
  const turns = normalizeRecentTurns(context);
  if (turns.length === 0) return '';
  return turns
    .map((turn) => {
      const base = turn.summary || turn.text;
      const weightMark = turn.role === 'assistant' ? '[AUX]' : '[USR]';
      return `${weightMark} ${base}`;
    })
    .join(' ');
};

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

const inferIntentScores = ({ question = '', contextSignal = '' } = {}) => {
  const q = String(question || '');
  const c = String(contextSignal || '');
  const scores = Object.entries(INTENT_KEYWORDS).map(([intent, keywords]) => {
    let score = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword)) score += 1.0;
      if (c.includes(keyword)) score += 0.35;
    }
    return { intent, score };
  });

  // Gentle priors
  if (q.length >= 35) {
    const deep = scores.find((item) => item.intent === 'deep');
    if (deep) deep.score += 0.25;
  }
  if (isBinaryIntent(q)) {
    const binary = scores.find((item) => item.intent === 'binary');
    if (binary) binary.score += 0.5;
  }

  return scores.sort((a, b) => b.score - a.score);
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
  const inferredFortunePeriod = inferFortunePeriod(safeQuestion);
  const riskLevel = inferRiskLevel(safeQuestion);
  const domainByIntent = intentToDomainTag(top.intent);
  const domainTag = riskLevel !== 'low'
    ? 'health'
    : (EXPANDED_DOMAIN_TAGS.has(domainByIntent) ? domainByIntent : baseProfile.domainTag);
  const questionType = intentToQuestionType(top.intent);
  const lowConfidence = normalizedTop < 0.48 || margin < 0.08;

  const readingKind = (domainTag === 'health' || domainTag === 'legal' || lowConfidence)
    ? 'general_reading'
    : (wantsOverallFortune ? 'overall_fortune' : 'general_reading');
  const fortunePeriod = readingKind === 'overall_fortune'
    ? (inferredFortunePeriod || baseProfile.fortunePeriod || 'week')
    : null;
  const recommendedSpreadId = inferRecommendedSpreadId({
    question: safeQuestion,
    category,
    questionType,
    domainTag
  });
  const targetCardCount = SPREAD_CARD_COUNT[recommendedSpreadId] || 3;

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

export const inferTargetCardCount = (question = '', category = 'general') => {
  const profile = inferQuestionProfile({ question, category });
  return profile.targetCardCount;
};
