import {
  sanitizeText,
  dedupeStrings
} from './text-utils.js';

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

const stripListPrefix = (text) => {
  let next = sanitizeText(text);
  for (const pattern of LIST_PREFIX_PATTERNS) {
    next = next.replace(pattern, '').trim();
  }
  return next;
};

const containsContamination = (text) => CONTAMINATION_PATTERNS.some((pattern) => pattern.test(String(text || '')));

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

export {
  CONTAMINATION_PATTERNS,
  LIST_PREFIX_PATTERNS,
  stripListPrefix,
  containsContamination,
  sanitizeListItems
};
