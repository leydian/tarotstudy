import { sanitizeText } from './text-utils.js';

const POSITIVE_IDS = new Set([
  'm01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21',
  'w01', 'w02', 'w03', 'w04', 'w06',
  'c01', 'c02', 'c03', 'c09', 'c10',
  'p01', 'p03', 'p08', 'p09', 'p10'
]);

const NEGATIVE_IDS = new Set([
  'm09', 'm12', 'm13', 'm15', 'm16', 'm18',
  's03', 's05', 's08', 's09', 's10',
  'w09', 'w10', 'c05', 'c08', 'p05'
]);

const SUIT_TONE_DEFAULTS = {
  cups: 0.45,
  pentacles: 0.5,
  wands: 0.4,
  swords: -0.35,
  major: 0
};

const EVIDENCE_TONE_OVERRIDES = {
  s01: 0.55,
  s06: 0.25,
  s07: -0.55,
  c11: 0.5,
  c12: 0.5,
  c13: 0.5,
  c14: 0.5,
  p11: 0.55,
  p12: 0.55,
  p13: 0.55,
  p14: 0.55,
  w11: 0.45,
  w12: 0.45,
  w13: 0.45,
  w14: 0.45,
  s11: -0.45,
  s12: -0.45,
  s13: -0.45,
  s14: -0.45,
  m06: 0.55,
  m13: -0.45,
  m14: 0.32,
  m15: -0.8,
  m16: -0.85,
  m17: 0.7
};

const detectSuitByCardId = (cardId = '') => {
  const prefix = String(cardId || '').slice(0, 1);
  if (prefix === 'c') return 'cups';
  if (prefix === 'p') return 'pentacles';
  if (prefix === 'w') return 'wands';
  if (prefix === 's') return 'swords';
  return 'major';
};

const getYesNoScore = (cardId, orientation = 'upright') => {
  const direction = orientation === 'reversed' ? -1 : 1;
  if (POSITIVE_IDS.has(cardId)) return 1 * direction;
  if (NEGATIVE_IDS.has(cardId)) return -1 * direction;
  return 0;
};

const getEvidenceToneScore = (cardId, orientation = 'upright') => {
  const suit = detectSuitByCardId(cardId);
  const base = Object.prototype.hasOwnProperty.call(EVIDENCE_TONE_OVERRIDES, cardId)
    ? EVIDENCE_TONE_OVERRIDES[cardId]
    : (SUIT_TONE_DEFAULTS[suit] ?? 0);
  return orientation === 'reversed' ? -base : base;
};

const normalizeVerdictLabel = (label) => {
  if (label === 'YES' || label === 'NO' || label === 'MAYBE') return label;
  return 'MAYBE';
};

const isValidVerdictLabel = (label) => label === 'YES' || label === 'NO' || label === 'MAYBE';

const verdictTone = (label, rationale) => {
  if (label === 'YES') return `운명의 흐름이 매우 맑고 긍정적입니다. ${rationale} 망설임 없이 나아가셔도 좋을 것 같아요.`;
  if (label === 'NO') return `지금은 잠시 멈추어 서서 주변을 살필 때입니다. ${rationale} 무리한 전진보다는 안정을 선택하는 지혜가 필요합니다.`;
  return `안개 속에 가려진 것처럼 상황이 조금 더 무르익기를 기다려야 할 것 같네요. ${rationale} 조금 더 시간을 두고 지켜보는 것은 어떨까요?`;
};

const computeVerdict = (facts, binaryEntities) => {
  if (binaryEntities && facts.length === 2) {
    const scoreA = getYesNoScore(facts[0].cardId, facts[0].orientation);
    const scoreB = getYesNoScore(facts[1].cardId, facts[1].orientation);
    const entityA = sanitizeText(binaryEntities[0]) || '선택 A';
    const entityB = sanitizeText(binaryEntities[1]) || '선택 B';

    if (scoreA - scoreB > 0.2) {
      return {
        label: 'YES',
        recommendedOption: 'A',
        rationale: `${entityA} 선택이 상대적으로 더 안정적이고 조화로운 흐름을 보여줍니다.`
      };
    }

    if (scoreB - scoreA > 0.2) {
      return {
        label: 'YES',
        recommendedOption: 'B',
        rationale: `${entityB} 선택이 지금의 흐름에 더 편안하고 긍정적인 방향으로 보입니다.`
      };
    }

    return {
      label: 'MAYBE',
      recommendedOption: 'EITHER',
      rationale: '두 선택의 기운이 비슷합니다. 오늘 컨디션과 우선순위를 기준으로 가볍게 정해도 괜찮습니다.'
    };
  }

  const score = facts.reduce((acc, fact) => acc + getYesNoScore(fact.cardId, fact.orientation), 0);
  const reversedRatio = facts.length > 0
    ? facts.filter((fact) => fact.orientation === 'reversed').length / facts.length
    : 0;
  const threshold = Math.max(1.0, facts.length * 0.25) + (reversedRatio >= 0.5 ? 0.35 : 0);
  if (score > threshold) return { label: 'YES', rationale: '카드의 전반적인 흐름이 상승 구간에 가까워 기회 포착에 유리합니다.' };
  if (score < -threshold) return { label: 'NO', rationale: '역방향·경고 신호가 섞여 있어 속도 조절과 리스크 관리가 우선입니다.' };
  return { label: 'MAYBE', rationale: '상반된 기운이 섞여 있어, 단정 짓기보다 상황의 변화를 조금 더 지켜볼 필요가 있습니다.' };
};

const toTrendLabel = (label) => {
  if (label === 'YES') return 'UP';
  if (label === 'NO') return 'CAUTION';
  return 'BALANCED';
};

const getSuitType = (cardId = '') => detectSuitByCardId(cardId);

export {
  POSITIVE_IDS,
  NEGATIVE_IDS,
  SUIT_TONE_DEFAULTS,
  EVIDENCE_TONE_OVERRIDES,
  detectSuitByCardId,
  getYesNoScore,
  getEvidenceToneScore,
  normalizeVerdictLabel,
  isValidVerdictLabel,
  verdictTone,
  computeVerdict,
  toTrendLabel,
  getSuitType
};
