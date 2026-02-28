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

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 12000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 7000);
const ANTHROPIC_REPAIR_TIMEOUT_MS = Number(process.env.ANTHROPIC_REPAIR_TIMEOUT_MS || 5000);
const CONTAMINATION_PATTERNS = [
  /사서의\s*통찰\s*:/i,
  /신중의\s*기운\s*:/i,
  /긍정의\s*기운\s*:/i,
  /운명의\s*마스터\s*리포트/i,
  /\[운명의\s*판정\]/i,
  /\[운명의\s*지침\s*\d+\]/i,
  /\[영혼의\s*조율\]/i,
  /\[운명의\s*실천\]/i
];
const LIST_PREFIX_PATTERNS = [
  /^\[운명의\s*지침\s*\d+\]\s*/i,
  /^\[영혼의\s*조율\]\s*/i,
  /^\[운명의\s*실천\]\s*/i
];
const HEALTH_GUARDRAIL_ACTIONS = {
  medium: [
    '자극적인 음식과 카페인은 잠시 줄이고, 미지근한 물을 조금씩 자주 드셔 보세요.',
    '통증이나 설사/구토가 계속되거나 악화되면 오늘 안에 의료진 상담을 받는 편이 안전합니다.'
  ],
  high: [
    '강한 통증, 호흡 곤란, 출혈, 고열처럼 급한 증상이 있으면 즉시 응급 진료를 우선하세요.',
    '타로 해석보다 현재 증상 관찰과 의료진 판단을 기준으로 결정을 내리세요.'
  ]
};

const hashString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
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

const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const ensureTerminalPunctuation = (text) => {
  const safe = sanitizeText(text);
  if (!safe) return '';
  return /[.!?]$/.test(safe) ? safe : `${safe}.`;
};
const joinSentencesKorean = (...parts) => parts
  .map((part) => ensureTerminalPunctuation(part))
  .filter(Boolean)
  .join(' ');
const normalizeCompareText = (value) => sanitizeText(value)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const isHighOverlap = (a, b) => {
  const left = normalizeCompareText(a);
  const right = normalizeCompareText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 10 && right.length >= 10 && (left.includes(right) || right.includes(left))) return true;
  return false;
};

const stripListPrefix = (text) => {
  let next = sanitizeText(text);
  for (const pattern of LIST_PREFIX_PATTERNS) {
    next = next.replace(pattern, '').trim();
  }
  return next;
};

const containsContamination = (text) => CONTAMINATION_PATTERNS.some((pattern) => pattern.test(String(text || '')));

const dedupeStrings = (items) => {
  const deduped = [];
  for (const item of items) {
    const key = normalizeCompareText(item);
    if (!key) continue;
    if (deduped.some((picked) => isHighOverlap(picked, item))) continue;
    deduped.push(item);
  }
  return deduped;
};

const sanitizeListItems = (items, kind) => {
  const maxLen = kind === 'counterpoints' ? 180 : 160;
  const filtered = (Array.isArray(items) ? items : [])
    .map((item) => stripListPrefix(item))
    .filter(Boolean)
    .filter((item) => !containsContamination(item))
    .map((item) => (item.length > maxLen ? `${item.slice(0, maxLen - 1).trimEnd()}…` : item));

  const deduped = dedupeStrings(filtered).slice(0, 4);
  if (deduped.length > 0) return deduped;

  if (kind === 'counterpoints') {
    return [
      '질문의 범위가 넓으면 카드 신호가 분산될 수 있으니 핵심 조건을 먼저 좁혀 보세요.',
      '컨디션과 외부 변수에 따라 흐름은 바뀔 수 있으니 일정 주기로 상황을 다시 점검하세요.'
    ];
  }
  return [
    '지금 가능한 가장 작은 실행 단위를 정해 오늘 안에 한 번 시도해 보세요.',
    '불확실한 부분은 체크리스트로 분리해 우선순위 높은 항목부터 정리해 보세요.'
  ];
};

const FORTUNE_SECTION_KEYS = ['energy', 'workFinance', 'love', 'healthMind'];

const normalizeFortunePeriod = (value) => {
  if (value === 'today' || value === 'week' || value === 'month' || value === 'year') return value;
  return 'week';
};

const normalizeTrendLabel = (value, verdictLabel = 'MAYBE') => {
  if (value === 'UP' || value === 'BALANCED' || value === 'CAUTION') return value;
  return toTrendLabel(verdictLabel);
};

const buildFortuneDefaults = (period) => ({
  energy: `${periodLabelKo(period)}의 전체 에너지는 핵심 우선순위를 정리할수록 안정됩니다.`,
  workFinance: `${periodLabelKo(period)} 일·재물운은 급한 결정보다 점검과 누적 실행이 유리합니다.`,
  love: `${periodLabelKo(period)} 애정운은 솔직한 대화와 기대치 조율이 흐름을 부드럽게 만듭니다.`,
  healthMind: `${periodLabelKo(period)} 건강·마음은 수면과 휴식 리듬을 지킬수록 회복 탄력이 커집니다.`,
  message: '지금의 흐름을 믿되, 속도보다 리듬을 지켜 보세요.'
});

const normalizeFortune = (fortune, fallbackFortune, verdictLabel = 'MAYBE') => {
  if (!fortune && !fallbackFortune) return null;
  const source = fortune || {};
  const fallback = fallbackFortune || {};
  const period = normalizeFortunePeriod(source.period || fallback.period);
  const defaults = buildFortuneDefaults(period);
  return {
    period,
    trendLabel: normalizeTrendLabel(source.trendLabel || fallback.trendLabel, verdictLabel),
    energy: sanitizeText(source.energy || fallback.energy || defaults.energy),
    workFinance: sanitizeText(source.workFinance || fallback.workFinance || defaults.workFinance),
    love: sanitizeText(source.love || fallback.love || defaults.love),
    healthMind: sanitizeText(source.healthMind || fallback.healthMind || defaults.healthMind),
    message: sanitizeText(source.message || fallback.message || defaults.message)
  };
};

const hasFortuneContamination = (fortune) => {
  if (!fortune) return false;
  return FORTUNE_SECTION_KEYS.some((key) => containsContamination(fortune[key])) || containsContamination(fortune.message);
};

const isFortuneStructurallyInvalid = (fortune) => {
  if (!fortune || typeof fortune !== 'object') return true;
  if (!['today', 'week', 'month', 'year'].includes(fortune.period)) return true;
  if (!['UP', 'BALANCED', 'CAUTION'].includes(fortune.trendLabel)) return true;
  if (!sanitizeText(fortune.message)) return true;
  return FORTUNE_SECTION_KEYS.some((key) => !sanitizeText(fortune[key]));
};

const stripFortunePrefix = (text, key) => {
  const value = sanitizeText(text);
  if (!value) return value;
  if (key === 'energy') return value.replace(/^전체\s*에너지\s*흐름을\s*보면,\s*/i, '');
  if (key === 'workFinance') return value.replace(/^일·재물운은\s*/i, '');
  if (key === 'love') return value.replace(/^애정운은\s*/i, '');
  if (key === 'healthMind') return value.replace(/^건강·마음\s*영역은\s*/i, '');
  return value;
};

const enforceFortuneSectionDiversity = (report) => {
  if (!report?.fortune) return report;
  const fortune = { ...report.fortune };
  const period = normalizeFortunePeriod(fortune.period);
  const defaults = buildFortuneDefaults(period);

  const stripped = {};
  for (const key of FORTUNE_SECTION_KEYS) {
    stripped[key] = stripFortunePrefix(fortune[key] || '', key);
  }
  const uniqueCount = new Set(
    FORTUNE_SECTION_KEYS
      .map((key) => normalizeCompareText(stripped[key]))
      .filter(Boolean)
  ).size;

  // Style-level fix only: if all sections collapse, fill duplicates with defaults.
  if (uniqueCount <= 1) {
    const seen = new Set();
    for (const key of FORTUNE_SECTION_KEYS) {
      const normalized = normalizeCompareText(stripped[key]);
      if (!normalized || seen.has(normalized)) {
        stripped[key] = defaults[key];
      }
      seen.add(normalizeCompareText(stripped[key]));
    }
  }

  for (const key of FORTUNE_SECTION_KEYS) {
    fortune[key] = sanitizeText(stripped[key] || defaults[key]);
  }
  fortune.period = period;
  fortune.message = sanitizeText(fortune.message || defaults.message);
  return { ...report, fortune };
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

const CARD_INTENSITY_LEVELS = {
  high: new Set(['m16', 'm15', 'm13', 's10', 's03']),
  medium: new Set(['s07', 'm12', 'w10'])
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

const ensureFortuneDensity = (text, key, period = 'week') => {
  const safe = sanitizeText(text);
  const sentenceCount = safe.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
  if (safe.length >= 34 && sentenceCount >= 2) return safe;
  const suffixByKey = {
    energy: period === 'year'
      ? '분기마다 방향을 재정렬하면 상승 리듬을 안정적으로 유지할 수 있습니다.'
      : '리듬을 유지하며 주기적으로 상태를 점검하면 안정성이 높아집니다.',
    workFinance: '실행 단위를 작게 나눠 점검하면 변동 대응력이 좋아집니다.',
    love: '대화의 빈도와 타이밍을 조율하면 관계 흐름이 더 부드러워집니다.',
    healthMind: '수면·휴식 루틴을 고정하면 회복 탄력이 꾸준히 유지됩니다.',
    message: '우선순위를 재정렬하고 호흡을 유지하면 흐름의 안정성이 높아집니다.'
  };
  return joinSentencesKorean(safe, suffixByKey[key] || suffixByKey.message);
};

const buildDistinctRationale = (report) => {
  const firstClaim = sanitizeText(report?.evidence?.[0]?.claim || '').replace(/\.$/, '');
  if (firstClaim) return `핵심 카드 흐름으로 보면, ${firstClaim} 쪽에 무게가 실립니다.`;
  if (report?.verdict?.label === 'YES') return '전반 흐름은 긍정 쪽이 우세하므로 준비된 선택부터 실행해 보세요.';
  if (report?.verdict?.label === 'NO') return '지금은 속도를 낮추고 조건을 정교하게 점검하는 편이 더 안전합니다.';
  return '판단을 서두르기보다 추가 신호를 확인한 뒤 결정을 내리는 편이 좋습니다.';
};

const classifyQualityFlag = (flag) => {
  if (!flag) return null;
  const safetyFlags = new Set([
    'summary_contamination_detected',
    'verdict_contamination_detected',
    'counterpoint_contamination_detected',
    'health_guardrail_applied',
    'evidence_quality_rewritten'
  ]);
  const styleFlags = new Set([
    'summary_verdict_overlap_high',
    'auto_rewritten',
    'fortune_section_rewritten'
  ]);
  if (safetyFlags.has(flag)) return `safety_${flag}`;
  if (styleFlags.has(flag)) return `style_${flag}`;
  return `contract_${flag}`;
};

const withCategorizedFlags = (flags = []) => {
  const next = [...flags];
  for (const flag of flags) {
    const categorized = classifyQualityFlag(flag);
    if (categorized) next.push(categorized);
  }
  return [...new Set(next)];
};

const postProcessReport = (report) => {
  const qualityFlags = [];
  const next = {
    ...report,
    verdict: { ...report.verdict }
  };

  if (containsContamination(next.summary)) {
    qualityFlags.push('summary_contamination_detected');
    next.summary = '카드 흐름을 요약하면, 지금은 핵심 조건을 좁히고 단계적으로 판단하는 편이 안정적입니다.';
  }
  if (containsContamination(next.verdict?.rationale)) {
    qualityFlags.push('verdict_contamination_detected');
    next.verdict.rationale = buildDistinctRationale(next);
  }

  if (isHighOverlap(next.summary, next.verdict.rationale)) {
    const sameText = normalizeCompareText(next.summary) === normalizeCompareText(next.verdict.rationale);
    const rationaleMissing = !sanitizeText(next.verdict.rationale);
    if (sameText || rationaleMissing) {
      next.verdict.rationale = buildDistinctRationale(next);
      qualityFlags.push('auto_rewritten');
    }
  }

  next.counterpoints = sanitizeListItems(next.counterpoints, 'counterpoints');
  next.actions = sanitizeListItems(next.actions, 'actions');
  next.actions = next.actions.filter((item) => !next.counterpoints.some((cp) => isHighOverlap(cp, item)));

  if (next.fortune) {
    const before = JSON.stringify(next.fortune);
    const needsStructuralFix = isFortuneStructurallyInvalid(next.fortune) || hasFortuneContamination(next.fortune);
    if (needsStructuralFix) {
      next.fortune = normalizeFortune(next.fortune, null, next.verdict?.label);
      next.fortune = enforceFortuneSectionDiversity(next).fortune;
      if (JSON.stringify(next.fortune) !== before) {
        qualityFlags.push('fortune_section_rewritten');
      }
    }
  }

  if (next.counterpoints.some((item) => containsContamination(item))) {
    qualityFlags.push('counterpoint_contamination_detected');
  }

  return { report: next, qualityFlags: [...new Set(qualityFlags)] };
};

const applyHealthGuardrail = (report, riskLevel = 'medium') => {
  const guidanceLevel = riskLevel === 'high' ? 'high' : 'medium';
  const actions = HEALTH_GUARDRAIL_ACTIONS[guidanceLevel];

  const next = {
    ...report,
    verdict: {
      ...report.verdict,
      label: 'MAYBE',
      recommendedOption: 'NONE',
      rationale: '건강 증상 관련 선택은 타로로 단정하기보다 현재 증상과 의료 기준을 우선해 판단하는 편이 안전합니다.'
    },
    summary: '현재 질문에는 신체 증상이 포함되어 있어, 카드 해석보다 몸 상태 확인과 안전한 관리가 우선입니다. 이 리딩은 의료 조언을 대체하지 않습니다.',
    counterpoints: sanitizeListItems([
      ...(report.counterpoints || []),
      '증상이 지속되거나 악화되면 진료를 미루지 마세요.',
      '탈수나 고열, 심한 통증 같은 위험 신호가 있으면 즉시 의료기관을 이용하세요.'
    ], 'counterpoints'),
    actions: sanitizeListItems(actions, 'actions')
  };
  return next;
};

const normalizeVerdictLabel = (label) => {
  if (label === 'YES' || label === 'NO' || label === 'MAYBE') return label;
  return 'MAYBE';
};
const isValidVerdictLabel = (label) => label === 'YES' || label === 'NO' || label === 'MAYBE';

const detectResponseMode = (questionType, questionLength, domainTag = 'general', readingKind = 'general_reading', fortunePeriod = null) => {
  if (readingKind === 'overall_fortune') {
    if (fortunePeriod === 'today') return 'concise';
    if (fortunePeriod === 'year') return 'creative';
    return 'balanced';
  }
  if (domainTag === 'health') return 'concise';
  if (questionType === 'light' || (questionType === 'binary' && questionLength <= 20)) return 'concise';
  if ((questionType === 'emotional' || questionType === 'relationship') && questionLength >= 25) return 'creative';
  return 'balanced';
};

const getAnthropicConfig = (responseMode, isRetry = false) => {
  const tokenBase = responseMode === 'concise' ? 500 : (responseMode === 'creative' ? 1300 : 1100);
  const maxTokens = isRetry ? Math.max(300, Math.floor(tokenBase * 0.8)) : tokenBase;
  const temperature = responseMode === 'concise' ? 0.25 : (responseMode === 'creative' ? 0.7 : 0.45);
  return {
    maxTokens,
    timeoutMs: isRetry ? ANTHROPIC_RETRY_TIMEOUT_MS : ANTHROPIC_TIMEOUT_MS,
    temperature
  };
};

const getOrientationLabel = (orientation = 'upright') => (orientation === 'reversed' ? '역방향' : '정방향');

const pickMeaningByCategory = (card, category) => {
  const isReversed = card.orientation === 'reversed';
  const uprightValue = category === 'love'
    ? (card.meanings?.love || card.summary)
    : category === 'career'
      ? (card.meanings?.career || card.summary)
      : category === 'finance'
        ? (card.meanings?.finance || card.summary)
        : card.summary;
  const reversedValue = category === 'love'
    ? (card.reversed?.love || card.reversed?.summary || uprightValue)
    : category === 'career'
      ? (card.reversed?.career || card.reversed?.summary || uprightValue)
      : category === 'finance'
        ? (card.reversed?.finance || card.reversed?.summary || uprightValue)
        : (card.reversed?.summary || uprightValue);
  return isReversed ? reversedValue : uprightValue;
};

const buildCardFacts = (cards, category) => cards.map((card, idx) => ({
  index: idx,
  cardId: card.id,
  cardName: card.name,
  cardNameKo: card.nameKo,
  orientation: card.orientation === 'reversed' ? 'reversed' : 'upright',
  orientationLabel: getOrientationLabel(card.orientation),
  positionLabel: card.positionLabel || `단계 ${idx + 1}`,
  summary: card.summary,
  coreMeaning: pickMeaningByCategory(card, category),
  keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [],
  advice: card.meanings?.advice || '',
  description: card.description || ''
}));

const verdictTone = (label, rationale) => {
  if (label === 'YES') return `운명의 흐름이 매우 맑고 긍정적입니다. ${rationale} 망설임 없이 나아가셔도 좋을 것 같아요.`;
  if (label === 'NO') return `지금은 잠시 멈추어 서서 주변을 살필 때입니다. ${rationale} 무리한 전진보다는 안정을 선택하는 지혜가 필요합니다.`;
  return `안개 속에 가려진 것처럼 상황이 조금 더 무르익기를 기다려야 할 것 같네요. ${rationale} 조금 더 시간을 두고 지켜보는 것은 어떨까요?`;
};

const getSuitType = (cardId = '') => {
  return detectSuitByCardId(cardId);
};

const pickDominantFact = (facts, predicate, fallbackIndex = 0) => {
  const filtered = facts.filter(predicate);
  if (filtered.length === 0) return facts[fallbackIndex] || facts[0] || null;
  return filtered
    .map((fact) => ({ fact, magnitude: Math.abs(getYesNoScore(fact.cardId, fact.orientation)) }))
    .sort((a, b) => b.magnitude - a.magnitude)[0]?.fact || facts[fallbackIndex] || facts[0] || null;
};

const periodLabelKo = (period = 'week') => {
  if (period === 'today') return '오늘';
  if (period === 'month') return '이번 달';
  if (period === 'year') return '올해';
  return '이번 주';
};

const withTopicParticle = (label = '') => {
  const safe = sanitizeText(label);
  if (!safe) return safe;
  const lastChar = safe[safe.length - 1];
  const code = lastChar.charCodeAt(0);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && ((code - 0xac00) % 28) !== 0;
  return `${safe}${hasBatchim ? '은' : '는'}`;
};

const shouldUseImageryLine = (responseMode = 'balanced') =>
  responseMode === 'balanced' || responseMode === 'creative';

const pickImagerySentence = (toneBucket, seedSource) => pickTemplateBySeed(
  EVIDENCE_IMAGERY_SENTENCE_TEMPLATES[toneBucket] || EVIDENCE_IMAGERY_SENTENCE_TEMPLATES.neutral,
  seedSource
);

const buildConclusionStatement = ({ question, verdict, binaryEntities = null }) => {
  if (Array.isArray(binaryEntities) && binaryEntities.length >= 2) {
    const entityA = sanitizeText(binaryEntities[0]) || '선택 A';
    const entityB = sanitizeText(binaryEntities[1]) || '선택 B';
    if (verdict.recommendedOption === 'A') return `결론: "${question}"에서는 ${entityA} 쪽이 현재 흐름과 더 잘 맞습니다.`;
    if (verdict.recommendedOption === 'B') return `결론: "${question}"에서는 ${entityB} 쪽이 현재 흐름과 더 잘 맞습니다.`;
  }
  if (verdict.label === 'YES') return `결론: "${question}"은(는) 지금 추진해 볼 가치가 있는 흐름입니다.`;
  if (verdict.label === 'NO') return `결론: "${question}"은(는) 지금 속도를 낮추고 보완하는 편이 안전합니다.`;
  return `결론: "${question}"은(는) 아직 확정하기보다 조건 정리가 먼저입니다.`;
};

const buildConclusionBuffer = ({ verdictLabel, questionType, domainTag = 'general' }) => {
  if (domainTag === 'career') {
    if (verdictLabel === 'YES') return '참고: 실행 전에 일정·조건 체크리스트를 먼저 고정하면 성과 안정성이 높아집니다.';
    if (verdictLabel === 'NO') return '참고: 채용/협상 변수는 변동폭이 크므로 단계별 리스크를 먼저 닫고 움직이세요.';
    return '참고: 확정 전 우선순위와 의사결정 기준을 문서로 정리하면 흔들림을 줄일 수 있습니다.';
  }
  if (domainTag === 'relationship' || questionType === 'relationship') {
    if (verdictLabel === 'NO') return '참고: 감정이 과열된 대화는 시점을 늦추고, 핵심 메시지 한 가지에 집중하세요.';
    return '참고: 짧더라도 솔직한 대화를 정기적으로 확보하면 관계 흐름이 더 안정됩니다.';
  }
  if (verdictLabel === 'YES') return '참고: 작은 실행 단위를 먼저 완료해 흐름을 실제 성과로 연결해 보세요.';
  if (verdictLabel === 'NO') return '참고: 보류 기간에는 손실 요인을 먼저 줄이고 재진입 조건을 명확히 잡아 두세요.';
  return '참고: 단정 대신 관찰-조정 루프를 한 번 더 거치면 판단 정확도가 올라갑니다.';
};

const buildDomainActions = ({ questionType, domainTag = 'general', verdictLabel, question = '' }) => {
  const isLightLikeQuestion = questionType === 'light' || (questionType === 'binary' && String(question).length <= 20);
  if (isLightLikeQuestion || domainTag === 'lifestyle') {
    return [
      '지금 선택을 10~20분 단위의 작은 실험으로 먼저 실행해 체감 결과를 확인해 보세요.',
      '결정 뒤 만족도(기분·효율)를 짧게 기록해 다음 선택 기준으로 재사용하세요.'
    ];
  }

  if (domainTag === 'career' || questionType === 'career') {
    const base = [
      '핵심 목표를 단계(준비-실행-점검)로 쪼개고 이번 주 완료 기준을 수치로 적어두세요.',
      '수/목 중간 점검 슬롯을 고정해 진행률과 변수 변화를 한 번에 확인하세요.'
    ];
    if (verdictLabel !== 'YES' || String(question).length >= 24) {
      return [...base, '이력서·포트폴리오·협상 조건 중 리스크가 큰 항목 하나를 골라 선제 보완하세요.'];
    }
    return base;
  }

  if (domainTag === 'relationship' || questionType === 'relationship') {
    const base = [
      '이번 주에 15분 이상 대화 시간을 한 번 확보하고, 핵심 주제를 한 가지로 제한하세요.',
      '감정 반응이 올라올 때 바로 결론내지 말고 상대 의도 확인 질문을 먼저 던져 보세요.'
    ];
    if (verdictLabel !== 'YES' || questionType === 'emotional') {
      return [...base, '대화 전 내가 원하는 결과와 허용 가능한 타협선을 메모로 정리해 두세요.'];
    }
    return base;
  }

  if (domainTag === 'finance') {
    const base = [
      '지출/투자 결정을 실행하기 전 상한선과 손절 기준을 숫자로 먼저 설정하세요.',
      '이번 주 현금흐름을 고정비·변동비로 나눠 점검하고 불필요 항목 하나를 즉시 줄이세요.'
    ];
    if (verdictLabel !== 'YES') {
      return [...base, '큰 금액 결제나 투자 실행은 하루 숙성 후 재검토해 충동 리스크를 낮추세요.'];
    }
    return base;
  }

  const base = [
    '이번 주 핵심 우선순위 1~2개를 고정하고, 나머지는 보류해 실행 밀도를 높이세요.',
    '중간 점검 시점(예: 수/목)을 미리 정해 진행률과 변수 변화를 한 번에 확인하세요.'
  ];
  if (questionType === 'deep' || questionType === 'emotional' || verdictLabel !== 'YES') {
    return [...base, '판단 근거를 사실/해석으로 분리해 메모하면 다음 결정의 정확도를 높일 수 있습니다.'];
  }
  return base;
};

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

const buildFortuneSummary = (fortunePeriod, trendLabel) => {
  const periodLabel = periodLabelKo(fortunePeriod || 'week');
  const periodWithTopic = withTopicParticle(periodLabel);
  if (trendLabel === 'UP') return `${periodLabel}의 흐름은 상승 기조입니다. 다만 리듬을 유지하며 컨디션 관리를 병행하세요.`;
  if (trendLabel === 'CAUTION') return `${periodLabel}에는 속도 조절이 필요합니다. 무리한 확장보다 점검과 정리가 유리합니다.`;
  return `${periodWithTopic} 균형 구간입니다. 조급한 결정보다 우선순위를 정리하는 접근이 안정적입니다.`;
};

const buildCounterpointsByContext = ({ questionType, readingKind = 'general_reading', domainTag = 'general' }) => {
  if (readingKind === 'overall_fortune') {
    return [
      '주간/월간 운세는 중간 점검 시점의 선택에 따라 체감 흐름이 달라질 수 있습니다.',
      '초반 신호가 후반까지 그대로 이어지지 않을 수 있으니 일정 완충 구간을 남겨두세요.'
    ];
  }
  if (domainTag === 'health') {
    return [
      '건강 관련 판단은 타로 해석보다 현재 증상 관찰과 의료 기준을 우선하세요.',
      '증상이 지속·악화되면 대기하지 말고 의료진 상담으로 확인하는 편이 안전합니다.'
    ];
  }
  if (questionType === 'binary' || questionType === 'light') {
    return [
      '가벼운 선택이라도 컨디션·일정 변수에 따라 결과 체감이 달라질 수 있습니다.',
      '오늘 결정을 내렸다면 짧은 사후 점검으로 선택의 만족도를 확인해 보세요.'
    ];
  }
  if (questionType === 'career') {
    return [
      '커리어 질문은 시장 일정과 채용 타이밍 변수의 영향이 크므로 중간 점검이 필요합니다.',
      '서류·면접·협상 단계별로 조건이 달라질 수 있으니 단계별 전략을 분리해 준비하세요.'
    ];
  }
  return [
    '질문의 범위가 넓을수록 카드가 가리키는 방향이 분산될 수 있어 조건을 좁히는 과정이 중요합니다.',
    '운명은 고정값이 아니므로 컨디션과 환경 변화에 맞춰 실행 계획을 유연하게 조정하세요.'
  ];
};

const buildDeterministicReport = ({
  question,
  facts,
  category,
  binaryEntities,
  questionType,
  responseMode = 'balanced',
  domainTag = 'general',
  riskLevel = 'low',
  readingKind = 'general_reading',
  fortunePeriod = null
}) => {
  const verdict = computeVerdict(facts, binaryEntities);
  const isCompactBinaryQuestion = questionType === 'binary' && String(question || '').length <= 20;
  const isHealthQuestion = domainTag === 'health';
  const isOverallFortune = readingKind === 'overall_fortune';
  const resolvedFortunePeriod = fortunePeriod || 'week';
  const usedRationaleIndices = {
    positive: new Set(),
    caution: new Set(),
    neutral: new Set(),
    reversed: new Set()
  };
  const usedRationaleNormalized = {
    positive: new Set(),
    caution: new Set(),
    neutral: new Set(),
    reversed: new Set()
  };
  const usedClaimIndicesByGroup = new Map();
  const usedClaimNormalizedByGroup = new Map();
  let prevSuit = null;

  const evidence = facts.map((fact, factIdx) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary)
      .replace(/\.$/, '')
      .replace(/[을를이가]?\s*상징합니다\.?$/, '');
    const keywordsStr = fact.keywords.slice(0, 2).join('·') || '균형';
    const suit = getSuitType(fact.cardId);
    const sameSuitAsPrev = prevSuit === suit;
    const toneScore = getEvidenceToneScore(fact.cardId, fact.orientation);
    const toneBucket = resolveEvidenceToneBucket(toneScore, fact.orientation);
    const baseTemplateGroup = EVIDENCE_RATIONALE_TEMPLATES[toneBucket] || EVIDENCE_RATIONALE_TEMPLATES.neutral;
    const styleHint = CARD_STYLE_HINTS[fact.cardId];
    let rationaleTemplates = sameSuitAsPrev && baseTemplateGroup.length > 1
      ? [...baseTemplateGroup.slice(1), baseTemplateGroup[0]]
      : baseTemplateGroup;
    if (styleHint === 'balance' && toneBucket === 'positive') {
      rationaleTemplates = [
        '%s 흐름은 속도보다 균형 조절에 강점이 있어, 템포를 일정하게 유지하면 안정적입니다.',
        '%s 기운은 조율 능력이 높아, 극단을 피하고 완급을 맞출 때 성과가 커집니다.',
        ...rationaleTemplates
      ];
    }
    const pickedTemplate = selectTemplateWithDiversity({
      templates: rationaleTemplates,
      seedSource: `${fact.cardId}:${fact.positionLabel}:${toneBucket}:rationale:${factIdx}`,
      usedIndices: usedRationaleIndices[toneBucket] || new Set(),
      usedNormalized: usedRationaleNormalized[toneBucket] || new Set()
    }) || rationaleTemplates[0];
    const orientationRationale = pickedTemplate.replace('%s', `'${keywordsStr}'`);
    const claimTemplates = EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.[suit]
      || EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.major
      || [];
    const claimKey = `${toneBucket}:${suit}`;
    if (!usedClaimIndicesByGroup.has(claimKey)) usedClaimIndicesByGroup.set(claimKey, new Set());
    if (!usedClaimNormalizedByGroup.has(claimKey)) usedClaimNormalizedByGroup.set(claimKey, new Set());
    const selectedClaimTemplate = selectTemplateWithDiversity({
      templates: claimTemplates,
      seedSource: `${fact.cardId}:${fact.positionLabel}:${toneBucket}:claim:${factIdx}`,
      usedIndices: usedClaimIndicesByGroup.get(claimKey),
      usedNormalized: usedClaimNormalizedByGroup.get(claimKey)
    });
    prevSuit = suit;
    return {
      cardId: fact.cardId,
      positionLabel: fact.positionLabel,
      claim: buildEvidenceClaim(fact, coreMeaning, toneBucket, selectedClaimTemplate, responseMode),
      rationale: orientationRationale,
      caution: sanitizeText(fact.advice) || '급한 결정보다는 마음의 우선순위를 먼저 정리해 보세요.'
    };
  });

  const counterpoints = buildCounterpointsByContext({
    questionType,
    readingKind,
    domainTag
  });

  const actions = buildDomainActions({
    questionType,
    domainTag,
    verdictLabel: verdict.label,
    question
  });

  const summary = isCompactBinaryQuestion
    ? `질문 "${question}"에 대해 보면, ${verdict.rationale} 오늘은 너무 무겁게 고민하지 않고 결정해도 괜찮습니다.`
    : (responseMode === 'balanced' || responseMode === 'creative')
      ? joinSentencesKorean(
        buildConclusionStatement({ question, verdict, binaryEntities }),
        buildConclusionBuffer({ verdictLabel: verdict.label, questionType, domainTag })
      )
    : category === 'general'
      ? `질문 "${question}"에 대한 운명의 지도를 펼쳐보니, ${verdictTone(verdict.label, verdict.rationale)}`
      : `"${question}"의 ${category}적인 맥락에서 카드를 읽어보니, ${verdictTone(verdict.label, verdict.rationale)}`;

  const baseReport = { summary, verdict, evidence, counterpoints, actions, fullNarrative: null };
  if (isOverallFortune) {
    const trendLabel = toTrendLabel(verdict.label);
    const energyFact = pickDominantFact(facts, () => true, 0);
    const workFact = pickDominantFact(
      facts,
      (fact) => ['pentacles', 'wands'].includes(getSuitType(fact.cardId)),
      1
    );
    const loveFact = pickDominantFact(
      facts,
      (fact) => getSuitType(fact.cardId) === 'cups' || ['m06', 'm02', 'm03', 'm17'].includes(fact.cardId),
      2
    );
    const mindFact = pickDominantFact(
      facts,
      (fact) => getSuitType(fact.cardId) === 'swords' || ['m09', 'm12', 'm14'].includes(fact.cardId),
      facts.length - 1
    );
    const periodText = periodLabelKo(resolvedFortunePeriod);
    const periodExecutionHint = resolvedFortunePeriod === 'year'
      ? '분기 단위 점검으로 전략을 지속적으로 보정하세요.'
      : resolvedFortunePeriod === 'month'
        ? '주차별 점검으로 편차를 빠르게 흡수하는 운영이 유리합니다.'
        : resolvedFortunePeriod === 'week'
          ? '주중 중간 점검을 고정하면 변동 대응력이 크게 올라갑니다.'
          : '오늘은 한 번에 하나씩 완료하는 리듬이 안정적입니다.';
    const workFrame = resolvedFortunePeriod === 'year'
      ? '분기 단위로 목표와 자원 배분을 재정렬해 보세요.'
      : resolvedFortunePeriod === 'month'
        ? '주차별 우선순위를 쪼개서 실행하면 효율이 올라갑니다.'
        : resolvedFortunePeriod === 'week'
          ? '주중 중반에 체크포인트를 두면 변동 대응이 쉬워집니다.'
          : '오늘은 한 번에 한 가지 핵심 과제에 집중하는 편이 유리합니다.';
    const loveFrame = resolvedFortunePeriod === 'year'
      ? '관계의 패턴을 장기적으로 점검하고 기대치를 조율하세요.'
      : resolvedFortunePeriod === 'month'
        ? '감정 소모가 큰 대화는 시점을 조절해 부드럽게 풀어가세요.'
        : resolvedFortunePeriod === 'week'
          ? '이번 주는 짧더라도 솔직한 대화 빈도를 높이는 편이 좋습니다.'
          : '오늘은 감정 반응보다 진심을 천천히 전달해 보세요.';
    const mindFrame = resolvedFortunePeriod === 'year'
      ? '페이스를 연중 리듬으로 관리하고 휴식 캘린더를 미리 확보하세요.'
      : resolvedFortunePeriod === 'month'
        ? '과로 신호가 보이면 즉시 일정을 덜어내는 방식이 필요합니다.'
      : resolvedFortunePeriod === 'week'
        ? '수면과 회복 루틴을 고정하면 변동성을 줄일 수 있습니다.'
          : '짧은 휴식 루틴을 자주 넣는 것이 집중력 유지에 도움이 됩니다.';
    const energyFrame = resolvedFortunePeriod === 'year'
      ? '연간 흐름은 장거리 페이스가 중요하니, 분기마다 기준점을 재설정해 리듬을 유지하세요.'
      : resolvedFortunePeriod === 'month'
        ? '월간 흐름은 중간 조정의 유연성이 핵심이므로, 주차별 신호를 반영해 운영 강도를 조절하세요.'
        : resolvedFortunePeriod === 'week'
          ? '주간 흐름은 일정 충돌에 민감하므로, 완충 시간을 남겨두면 안정적으로 전개됩니다.'
          : '일일 흐름은 컨디션 영향을 크게 받으니, 무리한 확장보다 리듬 유지가 우선입니다.';
    const periodActions = resolvedFortunePeriod === 'year'
      ? [
          '올해 목표를 분기 단위로 쪼개고, 각 분기 종료 시점에 반드시 회고 시간을 확보하세요.',
          '성장/관계/건강 지표를 각각 하나씩 정해 연중 추이를 기록해 보세요.'
        ]
      : resolvedFortunePeriod === 'month'
        ? [
            '이번 달 목표를 주차별로 나누고, 매주 말 우선순위를 재조정하세요.',
            '한 달 동안 유지할 회복 루틴(수면/운동/휴식)을 하나 정해 꾸준히 실행해 보세요.'
          ]
      : resolvedFortunePeriod === 'week'
        ? [
            '이번 주 핵심 3가지를 정하고, 중간 점검(수/목) 시간을 미리 잡아 두세요.',
            '중요한 결정은 하루 숙성 후 확정해 감정 과속을 줄이세요.'
          ]
      : [
            '오늘 해야 할 한 가지 핵심 과제를 정하고 완료 기준을 먼저 적어두세요.',
            '오후 한 차례 10분 정리 시간을 확보해 리듬을 회복하세요.'
        ];
    const periodCounterpoints = resolvedFortunePeriod === 'year'
      ? [
          '연간 흐름은 외부 변수의 영향이 크므로 분기마다 방향을 재점검하세요.',
          '상반기와 하반기의 에너지 결이 다를 수 있으니 고정 전략보다 적응 전략이 유리합니다.'
        ]
      : resolvedFortunePeriod === 'month'
        ? [
            '월간 흐름은 주차별 편차가 크므로 중간 조정 여지를 남겨두세요.',
            '한 번의 변동으로 전체 추세를 단정하지 말고 누적 신호를 보세요.'
        ]
      : resolvedFortunePeriod === 'week'
        ? [
            '주간 흐름은 일정 충돌에 민감하므로 하루 단위 완충 시간을 남겨두세요.',
            '초반의 강한 신호가 주말까지 그대로 가지 않을 수 있으니 중간 점검이 필요합니다.'
        ]
      : [
            '일일 흐름은 컨디션 영향을 크게 받으니 무리한 계획 확대를 피하세요.',
            '오늘의 신호는 단기 참고값이므로 장기 결정은 추가 근거와 함께 판단하세요.'
        ];
    const claimCardLabel = (fact, refFact) =>
      refFact && fact.cardId === refFact.cardId
        ? '이 카드'
        : `${fact.cardNameKo}(${fact.orientationLabel})`;
    const energyClaim = energyFact
      ? joinSentencesKorean(
        `${energyFact.cardNameKo}(${energyFact.orientationLabel})의 흐름이 ${periodText} 전체 리듬의 기준점으로 작동합니다`,
        energyFrame
      )
      : joinSentencesKorean(`${periodText}의 에너지는 안정적으로 흐르고 있습니다`, energyFrame);
    const workClaim = workFact
      ? joinSentencesKorean(`${claimCardLabel(workFact, energyFact)} 관점에서, ${workFrame}`, periodExecutionHint)
      : joinSentencesKorean(workFrame, periodExecutionHint);
    const loveClaim = loveFact
      ? joinSentencesKorean(`${claimCardLabel(loveFact, energyFact)} 흐름상 ${loveFrame}`, '감정 반응보다 대화의 타이밍을 조율하면 관계 피로를 줄일 수 있습니다.')
      : joinSentencesKorean(loveFrame, '감정 반응보다 대화의 타이밍을 조율하면 관계 피로를 줄일 수 있습니다.');
    const mindClaim = mindFact
      ? joinSentencesKorean(`${claimCardLabel(mindFact, energyFact)} 경향에서, ${mindFrame}`, '회복 루틴을 일정에 먼저 고정하면 변동 구간에서도 집중력을 지키기 쉽습니다.')
      : joinSentencesKorean(mindFrame, '회복 루틴을 일정에 먼저 고정하면 변동 구간에서도 집중력을 지키기 쉽습니다.');
    const fortune = {
      period: resolvedFortunePeriod,
      trendLabel,
      energy: ensureFortuneDensity(energyClaim, 'energy', resolvedFortunePeriod),
      workFinance: ensureFortuneDensity(workClaim, 'workFinance', resolvedFortunePeriod),
      love: ensureFortuneDensity(loveClaim, 'love', resolvedFortunePeriod),
      healthMind: ensureFortuneDensity(mindClaim, 'healthMind', resolvedFortunePeriod),
      message: trendLabel === 'UP'
        ? '상승 흐름을 활용하되 과속 대신 리듬 기반 실행으로 안정성을 함께 확보하세요.'
        : trendLabel === 'CAUTION'
          ? '서두르지 말고 정리와 점검에 집중하면 변동 구간에서도 흐름을 다시 열 수 있습니다.'
          : '균형의 시간을 활용해 우선순위를 재정렬하고, 변화 신호에 맞춰 유연하게 조정하세요.'
    };
    fortune.message = ensureFortuneDensity(fortune.message, 'message', resolvedFortunePeriod);
    return {
      ...baseReport,
      summary: buildFortuneSummary(fortune.period, trendLabel),
      verdict: {
        label: 'MAYBE',
        rationale: `${periodText} 종합운세는 YES/NO보다 기조(상승·균형·주의)로 읽는 편이 더 정확합니다.`,
        recommendedOption: 'NONE'
      },
      actions: periodActions,
      counterpoints: periodCounterpoints,
      fortune
    };
  }
  if (isHealthQuestion) {
    return baseReport;
  }
  return baseReport;
};


export {
  sanitizeText,
  normalizeVerdictLabel,
  isValidVerdictLabel,
  stripListPrefix,
  containsContamination,
  normalizeFortune,
  isHighOverlap,
  withCategorizedFlags,
  applyHealthGuardrail,
  postProcessReport,
  buildCardFacts,
  buildDeterministicReport
};
