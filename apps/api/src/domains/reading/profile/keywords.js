export const RELATIONSHIP_KEYWORDS = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
export const CAREER_KEYWORDS = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
export const EMOTIONAL_KEYWORDS = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
export const LIGHT_KEYWORDS = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];
export const BINARY_CONNECTOR_KEYWORDS = ['아니면', 'vs', '또는', '혹은'];
export const BINARY_DECISION_KEYWORDS = ['말까', '할지 말지'];
export const HEALTH_SYMPTOM_KEYWORDS = [
  '배탈', '복통', '설사', '구토', '메스꺼', '소화', '아프', '통증', '열', '기침', '두통', '어지러', '몸살', '컨디션', '병원'
];
export const HEALTH_EMERGENCY_KEYWORDS = [
  '호흡곤란', '숨이', '숨쉬기', '흉통', '의식', '기절', '실신', '출혈', '피가', '고열', '응급'
];
export const FORTUNE_KEYWORDS = ['종합 운세', '운세', 'today fortune', 'weekly fortune', 'monthly fortune', 'yearly fortune'];
export const TODAY_FORTUNE_KEYWORDS = ['오늘', '오늘의'];
export const WEEK_FORTUNE_KEYWORDS = ['이번주', '이번 주', '주간'];
export const MONTH_FORTUNE_KEYWORDS = ['이번달', '이번 달', '이달', '월간'];
export const YEAR_FORTUNE_KEYWORDS = ['올해', '연간', '금년'];

export const SPREAD_CARD_COUNT = {
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

export const INTENT_KEYWORDS = {
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

export const QUESTION_TYPES = new Set(['binary', 'relationship', 'career', 'emotional', 'light', 'deep']);
export const EXPANDED_DOMAIN_TAGS = new Set([
  'health', 'relationship', 'career', 'emotional', 'lifestyle', 'general', 'finance', 'family', 'education', 'spirituality', 'legal'
]);

export const includesKeyword = (text, keywords) => keywords.some((k) => text.includes(k));
