import {
  sanitizeText,
  joinSentencesKorean,
  normalizeCompareText
} from './text-utils.js';
import { getSuitType } from './verdict-policy.js';

const hashString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const EVIDENCE_RATIONALE_TEMPLATES = {
  positive: [
    '%s 에너지가 전개되어, 이 포지션에서는 실행의 탄력이 붙기 쉽습니다.',
    '%s 신호가 살아 있어, 지금 단계에서 기회를 붙잡기 유리합니다.',
    '%s 흐름이 받쳐주므로, 작은 실행을 누적하면 성과로 연결되기 쉽습니다.',
    '%s 축이 안정되어, 우선순위 과제를 밀도 있게 추진하기 좋습니다.',
    '%s 기반이 단단해져, 리듬을 유지하면 결과가 자연스럽게 따라옵니다.'
  ],
  caution: [
    '%s 신호가 경계등처럼 켜져 있어, 이 영역은 속도보다 점검이 우선입니다.',
    '%s 흐름이 흔들리는 구간이므로, 성급한 확정보다 리스크 확인이 필요합니다.',
    '%s 기운이 제동을 걸고 있어, 조건을 정리한 뒤 움직이는 편이 안전합니다.',
    '%s 변동성이 커질 수 있어, 계획을 작게 나눠 검증하며 진행하세요.',
    '%s 신호가 예민하니, 결론보다 준비 상태를 먼저 정돈해 두는 편이 좋습니다.'
  ],
  reversed: [
    '%s 에너지가 안쪽으로 말려 있어, 당장 확장보다 재정비가 우선입니다.',
    '%s 흐름이 뒤집혀 보이므로, 속도를 낮추고 핵심 조건부터 다시 맞추세요.',
    '%s 신호가 지연을 알리니, 지금은 수정·보완 단계로 접근하는 편이 안정적입니다.',
    '%s 결이 엇갈려 보여, 실행 강도를 한 단계 낮추고 점검 루틴을 확보하세요.',
    '%s 흐름이 예민하니, 완충 시간을 두고 우선순위를 재배치하는 접근이 유리합니다.'
  ],
  neutral: [
    '%s 기운이 혼재되어 있어, 우선순위를 좁혀 단계적으로 판단하세요.',
    '%s 흐름은 중립에 가깝기 때문에, 추가 근거를 확인한 뒤 결정이 유리합니다.',
    '%s 신호가 교차하므로, 비교 기준을 먼저 세우면 판단 정확도가 올라갑니다.',
    '%s 변수가 동시에 움직여, 성급한 단정 대신 관찰-조정 순서가 적합합니다.'
  ]
};

const EVIDENCE_CLAIM_TEMPLATES = {
  positive: {
    major: [
      '%s — %s. 흐름의 중심축이 강해져 주도권을 잡기 좋은 구간입니다.',
      '%s — %s. 신호가 또렷하므로 핵심 과제를 밀도 있게 추진하기 좋습니다.'
    ],
    cups: [
      '%s — %s. 감정선이 안정되어 관계와 협업을 부드럽게 이끌 수 있습니다.',
      '%s — %s. 정서적 여유가 확보되어 중요한 대화를 풀기 좋은 타이밍입니다.'
    ],
    pentacles: [
      '%s — %s. 현실 실행력이 올라가 성과를 누적하기에 유리합니다.',
      '%s — %s. 기초 체력이 받쳐주므로 계획을 차근히 확장하기 좋습니다.'
    ],
    wands: [
      '%s — %s. 추진 에너지가 살아 있어 시작과 전개 속도가 붙기 쉽습니다.',
      '%s — %s. 행동 동력이 충분하니 우선순위 과제부터 빠르게 전개해 보세요.'
    ],
    swords: [
      '%s — %s. 판단력이 선명해져 복잡한 이슈를 정리하기 좋습니다.',
      '%s — %s. 분석력이 올라가 불확실한 변수를 선제적으로 정리할 수 있습니다.'
    ]
  },
  caution: {
    major: [
      '%s — %s. 구조적 변동 신호가 커서 무리한 확장보다 리스크 점검이 우선입니다.',
      '%s — %s. 흐름의 진폭이 큰 구간이라 속도보다 안전장치 확보가 필요합니다.'
    ],
    cups: [
      '%s — %s. 감정 소모가 커질 수 있어 반응보다 조율이 먼저입니다.',
      '%s — %s. 관계 이슈는 즉답보다 온도 조절 후 대응하는 편이 안정적입니다.'
    ],
    pentacles: [
      '%s — %s. 자원 배분 오류를 막기 위해 조건 확인을 먼저 마치세요.',
      '%s — %s. 성과보다 손실 방어를 우선하는 운영이 필요한 구간입니다.'
    ],
    wands: [
      '%s — %s. 과속 시 피로 누적이 크니 단계별 검증이 필요합니다.',
      '%s — %s. 추진 의지는 좋지만 점검 없이 밀어붙이면 변동성이 커집니다.'
    ],
    swords: [
      '%s — %s. 갈등 신호가 살아 있어 결론 전에 쟁점을 분리해 확인해야 합니다.',
      '%s — %s. 판단 과열을 막기 위해 근거와 가정을 분리해 점검하세요.'
    ]
  },
  neutral: {
    major: [
      '%s — %s. 상반된 기운이 공존하므로 우선순위를 좁혀 판단해 보세요.',
      '%s — %s. 방향성은 열려 있으나 결정 전 추가 근거 확인이 필요합니다.'
    ],
    cups: [
      '%s — %s. 감정 흐름은 유동적이니 대화의 맥락을 먼저 정리하는 편이 좋습니다.',
      '%s — %s. 관계 변수는 단정하기보다 상황 신호를 더 관찰해 보세요.'
    ],
    pentacles: [
      '%s — %s. 운영 리듬을 유지하면서 지표를 점검하면 안정적으로 전개됩니다.',
      '%s — %s. 단기 결론보다 누적 데이터를 보며 조정하는 접근이 유리합니다.'
    ],
    wands: [
      '%s — %s. 동력은 있으나 방향이 엇갈릴 수 있어 선택지를 압축해 보세요.',
      '%s — %s. 실행 전 기준을 한 번 더 맞추면 낭비를 줄일 수 있습니다.'
    ],
    swords: [
      '%s — %s. 이성적 판단은 가능하지만 단정 대신 비교 검토가 필요합니다.',
      '%s — %s. 결론을 서두르기보다 핵심 변수부터 분리해 확인하세요.'
    ]
  },
  reversed: {
    major: [
      '%s — %s. 현재 국면은 점검·완충이 필요한 전환 구간입니다.',
      '%s — %s. 흐름이 뒤집혀 보여 재정비 후 재진입이 안전합니다.'
    ],
    cups: [
      '%s — %s. 감정 과부하를 줄이고 관계의 간격을 조절하는 편이 좋습니다.',
      '%s — %s. 내면 피로가 누적되기 쉬우니 속도를 낮춰 회복 리듬을 먼저 세우세요.'
    ],
    pentacles: [
      '%s — %s. 자원 운용은 확장보다 손실 방어와 복구에 집중해야 합니다.',
      '%s — %s. 실행 템포를 낮추고 기본 조건을 재정렬하면 안정성이 올라갑니다.'
    ],
    wands: [
      '%s — %s. 추진력은 흔들릴 수 있어 무리한 드라이브보다 재정비가 우선입니다.',
      '%s — %s. 속도보다 방향 교정이 필요한 구간입니다.'
    ],
    swords: [
      '%s — %s. 판단 과열을 식히고 전제를 다시 점검하는 편이 안전합니다.',
      '%s — %s. 긴장도가 높아질 수 있어 결론 전 검증 단계를 추가하세요.'
    ]
  }
};

const EVIDENCE_IMAGERY_SENTENCE_TEMPLATES = {
  positive: [
    '잔잔한 새벽빛처럼 흐름의 결이 맑게 이어집니다.',
    '열린 창으로 바람이 드는 장면처럼 전개가 부드럽습니다.'
  ],
  caution: [
    '짙은 안개가 낀 길목처럼 확인 절차가 먼저 필요합니다.',
    '거센 파도가 치는 해변처럼 페이스 조절이 핵심입니다.'
  ],
  reversed: [
    '한 박자 늦춘 호흡처럼 재정비의 여백이 필요합니다.',
    '멈춘 시계바늘 같은 구간이라 점검 리듬을 먼저 세워야 합니다.'
  ],
  neutral: [
    '갈림길 표지판이 겹쳐 보이는 장면처럼 비교가 필요합니다.',
    '잔물결이 교차하는 수면처럼 관찰 후 조정이 적합합니다.'
  ]
};

const CARD_STYLE_HINTS = {
  m14: 'balance',
  m16: 'shock',
  m13: 'transition'
};

const CARD_INTENSITY_LEVELS = {
  high: new Set(['m16', 'm15', 'm13', 's10', 's03']),
  medium: new Set(['s07', 'm12', 'w10'])
};

const resolveEvidenceToneBucket = (toneScore, orientation = 'upright') => {
  if (orientation === 'reversed') return 'reversed';
  if (toneScore >= 0.35) return 'positive';
  if (toneScore <= -0.35) return 'caution';
  return 'neutral';
};

const pickTemplateBySeed = (templates, seedSource) => {
  if (!Array.isArray(templates) || templates.length === 0) return '';
  const index = hashString(seedSource) % templates.length;
  return templates[index];
};

const selectTemplateWithDiversity = ({
  templates,
  seedSource,
  usedIndices = new Set(),
  usedNormalized = null
}) => {
  if (!Array.isArray(templates) || templates.length === 0) return '';
  const start = hashString(seedSource) % templates.length;
  for (let offset = 0; offset < templates.length; offset += 1) {
    const idx = (start + offset) % templates.length;
    const candidate = templates[idx];
    const normalized = normalizeCompareText(candidate);
    if (usedNormalized && normalized && usedNormalized.has(normalized)) continue;
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      if (usedNormalized && normalized) usedNormalized.add(normalized);
      return candidate;
    }
  }
  const idx = start;
  usedIndices.add(idx);
  const selected = templates[idx];
  if (usedNormalized) {
    const normalized = normalizeCompareText(selected);
    if (normalized) usedNormalized.add(normalized);
  }
  return selected;
};

const getCardIntensity = (cardId = '') => {
  if (CARD_INTENSITY_LEVELS.high.has(cardId)) return 'high';
  if (CARD_INTENSITY_LEVELS.medium.has(cardId)) return 'medium';
  return 'normal';
};

const clampEvidenceClaim = (claim, toneBucket) => {
  const normalized = sanitizeText(claim);
  if (normalized.length <= 150) return normalized;
  const firstSentence = `${normalized.split('. ')[0].replace(/\.$/, '')}.`;
  const suffix = toneBucket === 'reversed'
    ? ' 속도를 낮추고 점검 리듬을 먼저 확보하세요.'
    : toneBucket === 'caution'
      ? ' 무리한 확장보다 리스크 점검이 우선입니다.'
      : toneBucket === 'positive'
        ? ' 핵심 과제부터 차분히 실행해 보세요.'
        : ' 추가 근거를 확인한 뒤 결정하세요.';
  return joinSentencesKorean(firstSentence, suffix);
};

const shouldUseImageryLine = (responseMode = 'balanced') =>
  responseMode === 'balanced' || responseMode === 'creative';

const pickImagerySentence = (toneBucket, seedSource) => pickTemplateBySeed(
  EVIDENCE_IMAGERY_SENTENCE_TEMPLATES[toneBucket] || EVIDENCE_IMAGERY_SENTENCE_TEMPLATES.neutral,
  seedSource
);

const buildEvidenceClaim = (fact, coreMeaning, toneBucket, selectedTemplate, responseMode = 'balanced') => {
  const suit = getSuitType(fact.cardId);
  const template = selectedTemplate || pickTemplateBySeed(
    EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.[suit] || EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.major || [],
    `${fact.cardId}:${fact.positionLabel}:${toneBucket}`
  );
  const label = `${fact.cardNameKo}(${fact.orientationLabel})`;
  if (!template) return clampEvidenceClaim(`${label} — ${coreMeaning}.`, toneBucket);
  const intensity = getCardIntensity(fact.cardId);
  const styleHint = CARD_STYLE_HINTS[fact.cardId];
  let filled = template.replace('%s', label).replace('%s', coreMeaning);
  if (styleHint === 'balance' && toneBucket !== 'reversed') {
    filled = joinSentencesKorean(
      filled,
      '완급을 조절하며 균형을 지키면 결과를 더 안정적으로 만들 수 있습니다'
    );
  }
  if (intensity === 'high' && (toneBucket === 'caution' || toneBucket === 'reversed')) {
    filled = joinSentencesKorean(filled, '결론을 서두르지 말고 변동 관리 중심으로 접근하세요');
  } else if (intensity === 'medium' && toneBucket === 'caution') {
    filled = joinSentencesKorean(filled, '실행 강도를 한 단계 낮추면 안정성이 올라갑니다');
  }
  if (shouldUseImageryLine(responseMode)) {
    const imagery = pickImagerySentence(toneBucket, `${fact.cardId}:${fact.positionLabel}:${responseMode}:imagery`);
    if (imagery) {
      filled = joinSentencesKorean(filled, imagery);
    }
  }
  return clampEvidenceClaim(filled, toneBucket);
};

export {
  EVIDENCE_RATIONALE_TEMPLATES,
  EVIDENCE_CLAIM_TEMPLATES,
  EVIDENCE_IMAGERY_SENTENCE_TEMPLATES,
  CARD_STYLE_HINTS,
  CARD_INTENSITY_LEVELS,
  resolveEvidenceToneBucket,
  pickTemplateBySeed,
  selectTemplateWithDiversity,
  getCardIntensity,
  clampEvidenceClaim,
  shouldUseImageryLine,
  pickImagerySentence,
  buildEvidenceClaim
};
