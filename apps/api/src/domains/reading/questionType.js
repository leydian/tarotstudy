const RELATIONSHIP_KEYWORDS = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
const CAREER_KEYWORDS = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
const EMOTIONAL_KEYWORDS = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
const LIGHT_KEYWORDS = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];
const BINARY_KEYWORDS = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '아니면', 'vs', '또는', '혹은'];

export const detectQuestionType = ({
  question = '',
  category = 'general',
  cardCount = 0,
  binaryEntities = null
}) => {
  const safeQuestion = String(question || '');

  if ((binaryEntities && (cardCount === 2 || cardCount === 5)) || (
    (cardCount === 2 || cardCount === 5) && BINARY_KEYWORDS.some((k) => safeQuestion.includes(k))
  )) return 'binary';

  if (category === 'love' || RELATIONSHIP_KEYWORDS.some((k) => safeQuestion.includes(k))) return 'relationship';
  if (category === 'career' || CAREER_KEYWORDS.some((k) => safeQuestion.includes(k))) return 'career';
  if (EMOTIONAL_KEYWORDS.some((k) => safeQuestion.includes(k))) return 'emotional';
  if (safeQuestion.length < 15 && LIGHT_KEYWORDS.some((k) => safeQuestion.includes(k))) return 'light';
  return 'deep';
};

export const inferTargetCardCount = (question = '') => {
  const safeQuestion = String(question || '');

  if (BINARY_KEYWORDS.some((k) => safeQuestion.includes(k)) || safeQuestion.includes(' 아니면 ')) {
    return safeQuestion.length <= 20 ? 2 : 5;
  }
  if (RELATIONSHIP_KEYWORDS.some((k) => safeQuestion.includes(k))) return 7;
  if (CAREER_KEYWORDS.some((k) => safeQuestion.includes(k))) return 5;
  if (safeQuestion.length > 30) return 10;
  return 3;
};

