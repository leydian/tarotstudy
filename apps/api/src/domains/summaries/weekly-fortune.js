import {
  inferSummaryContextTone,
  inferYearlyIntent,
  pickTopKeywords,
  scoreCardRisk,
  pickByNumber,
  hashText
} from '../common/utils.js';

export function summarizeWeeklyFortune({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const monday = pick('월요일');
  const tuesday = pick('화요일');
  const wednesday = pick('수요일');
  const thursday = pick('목요일');
  const friday = pick('금요일');
  const saturday = pick('토요일');
  const sunday = pick('일요일');
  const intent = inferYearlyIntent(context);
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const reversedCount = items.length - uprightCount;
  const dayCards = [
    { dayLabel: '월요일', item: monday },
    { dayLabel: '화요일', item: tuesday },
    { dayLabel: '수요일', item: wednesday },
    { dayLabel: '목요일', item: thursday },
    { dayLabel: '금요일', item: friday },
    { dayLabel: '토요일', item: saturday },
    { dayLabel: '일요일', item: sunday }
  ];
  const dayScores = dayCards.map(({ dayLabel, item }) => ({
    dayLabel,
    item,
    score: scoreWeeklyDayStrength(item, intent)
  }));
  const riskTotal = dayScores.reduce((acc, row) => acc + scoreCardRisk(row.item), 0);
  const strongestDay = [...dayScores].sort((a, b) => b.score - a.score)[0];
  const weakestDay = [...dayScores].sort((a, b) => a.score - b.score)[0];
  const seed = hashText([
    context,
    monday?.card?.id || '',
    tuesday?.card?.id || '',
    wednesday?.card?.id || '',
    thursday?.card?.id || '',
    friday?.card?.id || '',
    saturday?.card?.id || '',
    sunday?.card?.id || ''
  ].join(':'));

  const mondayKeyword = monday?.card?.keywords?.[0] || '주간 흐름';
  const mondayLabel = monday?.card?.nameKo ? `${monday.card.nameKo} ${monday?.orientation === 'reversed' ? '역방향' : '정방향'}` : '신호 확인 필요';
  const unstableWeek = riskTotal >= 8 || reversedCount >= 3;
  const overallFlow = intent === 'relationship'
    ? (unstableWeek
        ? '호감은 남아 있지만 오해 관리가 더 중요한 주간'
        : uprightCount >= reversedCount
          ? '대화의 문이 조금씩 열리는 주간'
          : '감정 거리 조절이 필요한 주간')
    : unstableWeek
      ? '기회는 있으나 방어를 우선해야 하는 주간'
      : uprightCount >= reversedCount
        ? '전개가 열려 있는 주간'
        : '속도 조절이 필요한 주간';
  const overallIntentLine = buildWeeklyIntentLine({ intent, orientation: monday?.orientation || 'upright', keyword: mondayKeyword });
  const strongestHint = strongestDay?.item?.card?.nameKo
    ? `이번 주 힘이 실리는 날은 ${strongestDay.dayLabel}(${strongestDay.item.card.nameKo})이고, 조심할 날은 ${weakestDay.dayLabel}(${weakestDay?.item?.card?.nameKo || '-'})입니다.`
    : '';

  const overall = [
    `이번 주 시작 카드(월요일)는 ${mondayLabel}이며, 핵심 키워드는 "${mondayKeyword}"입니다.`,
    `전체적으로는 ${overallFlow}으로 보입니다.`,
    overallIntentLine,
    strongestHint
  ].join(' ');

  const phraseMemory = new Set();
  const mondayLine = buildWeeklyDayLine({
    item: monday,
    dayLabel: '월요일',
    roleHint: intent === 'relationship' ? '관계 시동' : '주간 시동',
    intent,
    openHint: intent === 'relationship'
      ? '월요일에는 답을 내리기보다 서로의 현재 상태를 확인하는 짧은 대화가 좋습니다.'
      : '월요일에는 일정과 우선순위를 빠르게 고정하면 흐름을 선점하기 좋습니다.',
    adjustHint: intent === 'relationship'
      ? '월요일에는 결론을 서두르지 말고 감정 온도를 먼저 맞추는 편이 안정적입니다.'
      : '월요일에는 무리한 확장보다 속도 조절과 기준 정리가 먼저입니다.',
    seed: seed + 1,
    memory: phraseMemory
  });
  const tuesdayLine = buildWeeklyDayLine({
    item: tuesday,
    dayLabel: '화요일',
    roleHint: intent === 'relationship' ? '대화 톤 조율' : '초반 안정화',
    intent,
    openHint: intent === 'relationship'
      ? '화요일에는 어제 나온 반응을 바탕으로 메시지 톤을 부드럽게 다듬어보세요.'
      : '화요일에는 전날 정한 기준을 반복 실행하면 체감 안정성이 올라갑니다.',
    adjustHint: intent === 'relationship'
      ? '화요일에는 단정 표현을 줄이고 질문형 문장으로 오해를 줄이는 편이 좋습니다.'
      : '화요일에는 일정 과적재를 줄이고 실행 항목을 하나로 줄이는 편이 좋겠습니다.',
    seed: seed + 2,
    memory: phraseMemory
  });
  const wednesdayLine = buildWeeklyDayLine({
    item: wednesday,
    dayLabel: '수요일',
    roleHint: intent === 'relationship' ? '중반 감정 점검' : '중반 전환',
    intent,
    openHint: intent === 'relationship'
      ? '수요일에는 감정이 쌓이기 전에 짧게 정리 대화를 해두면 후반이 편해집니다.'
      : '수요일에는 외부 변수 대응 여지가 있어 핵심 한 가지를 밀어붙이기 좋은 구간입니다.',
    adjustHint: intent === 'relationship'
      ? '수요일에는 피로와 예민함을 먼저 낮춘 뒤 대화 강도를 조절하는 편이 좋습니다.'
      : '수요일에는 해석 충돌이나 피로 누적을 먼저 줄여야 후반 흐름이 살아납니다.',
    seed: seed + 3,
    memory: phraseMemory
  });
  const thursdayLine = buildWeeklyDayLine({
    item: thursday,
    dayLabel: '목요일',
    roleHint: intent === 'relationship' ? '관계 안정화' : '중반 마무리',
    intent,
    openHint: intent === 'relationship'
      ? '목요일에는 신뢰를 쌓는 현실적 배려 한 가지를 보여주기 좋은 날입니다.'
      : '목요일에는 진행 중인 일을 정리해 금요일 마감 품질을 높이는 데 유리합니다.',
    adjustHint: intent === 'relationship'
      ? '목요일에는 해결보다 경청을 먼저 두면 불필요한 충돌을 줄일 수 있습니다.'
      : '목요일에는 진행 중인 이슈를 정리하고 충돌 요인을 줄이는 편이 좋겠습니다.',
    seed: seed + 4,
    memory: phraseMemory
  });
  const fridayLine = buildWeeklyDayLine({
    item: friday,
    dayLabel: '금요일',
    roleHint: intent === 'relationship' ? '주 후반 조율' : '성과 점검',
    intent,
    openHint: intent === 'relationship'
      ? '금요일에는 한 주 대화를 가볍게 복기하고 고마움을 짧게 전해보세요.'
      : '금요일에는 결과 확인과 마감 정리를 함께 잡으면 주간 완성도가 올라갑니다.',
    adjustHint: intent === 'relationship'
      ? '금요일에는 서운함을 한 번에 쏟기보다 핵심 한 가지씩 나눠 말하는 편이 안전합니다.'
      : '금요일에는 성과 집착보다 누락 정리와 손실 방어를 먼저 두는 편이 안전합니다.',
    seed: seed + 5,
    memory: phraseMemory
  });

  const saturdayLine = buildWeeklyDayLine({
    item: saturday,
    dayLabel: '토요일',
    roleHint: '회복/정비',
    intent,
    openHint: intent === 'relationship'
      ? '토요일은 함께 쉬는 리듬을 맞추면 관계 긴장이 자연스럽게 내려갑니다.'
      : '토요일은 회복과 관계 정비를 균형 있게 가져가면 다음 주 체력이 남습니다.',
    adjustHint: intent === 'relationship'
      ? '토요일은 각자 회복 시간을 보장해 주며 대화 밀도를 낮추는 편이 좋겠습니다.'
      : '토요일은 일정 과적재를 줄이고 회복 루틴을 먼저 고정하는 편이 좋겠습니다.',
    seed: seed + 6,
    memory: phraseMemory
  });
  const sundayLine = buildWeeklyDayLine({
    item: sunday,
    dayLabel: '일요일',
    roleHint: '복기/준비',
    intent,
    openHint: intent === 'relationship'
      ? '일요일은 다음 주에 맞출 약속 한 가지만 정해두면 마음이 편해집니다.'
      : '일요일은 복기와 다음 주 준비를 짧게 끝내면 월요일 진입이 훨씬 부드러워집니다.',
    adjustHint: intent === 'relationship'
      ? '일요일은 감정 소모를 줄이고 기대치를 한 단계 낮춰 정리하는 편이 안정적입니다.'
      : '일요일은 감정 소모를 줄이고 다음 주 우선순위 1개만 남기는 편이 안정적입니다.',
    seed: seed + 7,
    memory: phraseMemory
  });

  const actionGuide = buildWeeklyActionGuide({
    intent,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    strongestDayLabel: strongestDay?.dayLabel || '월요일',
    weakestDayLabel: weakestDay?.dayLabel || '금요일',
    riskTotal,
    seed: seed + 8
  });
  const themeKeyword = pickTopKeywords(items, 1)[0] || '주간 리듬';
  const themeLine = `한 줄 테마: 이번 주는 '${themeKeyword}' 흐름을 보고, 잘되는 날은 밀고 힘든 날은 정리하면 안정적입니다.`;

  return [
    `총평: ${overall}`,
    `일별 흐름: ${mondayLine} ${tuesdayLine} ${wednesdayLine} ${thursdayLine} ${fridayLine} ${saturdayLine} ${sundayLine}`,
    `실행 가이드: ${actionGuide} ${levelHint}`,
    themeLine
  ].join('\n\n');
}

function buildWeeklyIntentLine({ intent = 'general', orientation = 'upright', keyword = '흐름' }) {
  if (intent === 'career') {
    return orientation === 'upright'
      ? `커리어 관점에서는 "${keyword}" 키워드가 살아 있어 외부 실행(지원/제안/협업)을 조금 넓혀보기 좋습니다.`
      : `커리어 관점에서는 "${keyword}" 키워드가 조정 구간이라, 실행 수보다 완성도 점검을 우선하는 편이 좋겠습니다.`;
  }
  if (intent === 'relationship') {
    return orientation === 'upright'
      ? `관계 관점에서는 "${keyword}" 키워드가 열려 있어 짧고 명확한 대화 시도가 효과적일 수 있습니다.`
      : `관계 관점에서는 "${keyword}" 키워드가 예민해 단정보다 확인 대화를 먼저 두는 편이 좋겠습니다.`;
  }
  if (intent === 'finance') {
    return orientation === 'upright'
      ? `재정 관점에서는 "${keyword}" 키워드가 열려 있어 계획형 지출/저축 리듬을 유지하기 좋습니다.`
      : `재정 관점에서는 "${keyword}" 키워드가 흔들릴 수 있어 신규 지출보다 손실 방어를 먼저 두는 편이 안전합니다.`;
  }
  return orientation === 'upright'
    ? `"${keyword}" 흐름이 살아 있어 우선순위를 정해 실행하면 주간 체감이 커질 수 있습니다.`
    : `"${keyword}" 흐름이 조정 구간이라, 속도를 늦추고 핵심 하나에 집중하는 편이 좋겠습니다.`;
}

function buildWeeklyDayLine({
  item,
  dayLabel,
  roleHint = '',
  intent = 'general',
  openHint = '',
  adjustHint = '',
  seed = 0,
  memory = null
}) {
  const label = item?.card?.nameKo ? `${dayLabel}(${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'})` : dayLabel;
  const rolePrefix = roleHint ? `${roleHint} 관점에서` : '흐름 관점에서';
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const riskScore = scoreCardRisk(item);
  const open = item?.orientation !== 'reversed' && riskScore < 2;

  const intentHint = (() => {
    if (intent === 'finance') {
      return buildFinanceDayHint({ item, dayLabel, open, riskScore, seed, memory });
    }
    if (intent === 'relationship') {
      return open
        ? pickByNumber([
          `"${keyword}" 기운이 열려 있어 짧고 솔직한 확인 대화를 시도해보기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 내 감정과 요청을 나눠 전달하면 반응을 읽기 쉽습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 해석이 엇갈릴 수 있어 단정 문장을 줄이고 확인 질문을 먼저 두는 편이 좋겠습니다.`,
          `"${keyword}" 흐름이 예민해 반응을 확인한 뒤 다음 대화를 여는 편이 안정적입니다.`
        ], seed);
    }
    if (intent === 'career') {
      return open
        ? pickByNumber([
          `"${keyword}" 축이 열려 있어 외부 실행을 작은 단위로 이어가기 좋습니다.`,
          `"${keyword}" 신호가 살아 있어 제출/정리/소통 중 핵심 1개를 밀어붙이기 좋습니다.`
        ], seed)
        : pickByNumber([
          `"${keyword}" 마찰이 생길 수 있어 실행 수보다 품질 보완을 먼저 두는 편이 좋겠습니다.`,
          `"${keyword}" 구간에서는 일정 과부하를 줄이고 핵심 산출물 완성도를 우선하세요.`
        ], seed);
    }
    return open
      ? `"${keyword}" 흐름이 열려 있어 핵심 한 가지를 밀어붙이기 좋습니다.`
      : `"${keyword}" 흐름이 흔들릴 수 있어 속도 조절이 먼저입니다.`;
  })();

  const uniqueIntentHint = pickDistinctWeeklyPhrase(intentHint, `${dayLabel}:intent:${seed}`, memory);
  const dayHint = pickDistinctWeeklyPhrase(open ? openHint : adjustHint, `${dayLabel}:hint:${seed}`, memory);
  return `${label}은 ${rolePrefix} ${uniqueIntentHint} ${dayHint}`.trim();
}

function buildWeeklyActionGuide({
  intent = 'general',
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
  strongestDayLabel = '월요일',
  weakestDayLabel = '금요일',
  riskTotal = 0,
  seed = 0
}) {
  const cards = [monday, tuesday, wednesday, thursday, friday, saturday, sunday].filter(Boolean);
  const reversedCount = cards.filter((item) => item?.orientation === 'reversed').length;
  const key = cards.map((item) => item?.card?.keywords?.[0]).filter(Boolean)[0] || '실행';
  const unstable = reversedCount >= 3 || riskTotal >= 8;

  if (intent === 'finance') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 구간의 변동성이 있어 ${weakestDayLabel}에는 신규 결제를 보류하고, ${strongestDayLabel}에 예산 재배치를 진행하세요.`,
        `이번 주는 "${key}" 신호가 흔들릴 수 있으니 ${weakestDayLabel}은 손실 방어, ${strongestDayLabel}은 계획형 집행에 배정하는 편이 좋습니다.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 ${strongestDayLabel}에 핵심 집행을 두고, ${weakestDayLabel}은 점검일로 운영하면 안정성이 올라갑니다.`,
        `이번 주는 "${key}" 축을 기준으로 ${strongestDayLabel} 실행 1개와 ${weakestDayLabel} 통제 1개를 짝으로 고정하면 흐름이 안정됩니다.`
      ], seed);
  }
  if (intent === 'relationship') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 흐름이 예민하니, 확인 질문 1개를 중심으로 대화 속도를 천천히 맞추세요.`,
        `이번 주는 "${key}" 신호가 흔들릴 수 있어 단정 대신 사실 확인 문장으로 관계 피로를 줄이세요.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 짧고 분명한 대화를 하루 한 번 정도 꾸준히 이어가면 좋겠습니다.`,
        `이번 주는 "${key}" 기준으로 요청 1개와 감정 1개를 분리해 전달하면 반응을 읽기 쉽습니다.`
      ], seed);
  }
  if (intent === 'career') {
    return unstable
      ? pickByNumber([
        `이번 주는 "${key}" 구간의 마찰이 있어 실행 수를 줄이고 핵심 산출물 완성도 1개에 집중하는 편이 좋겠습니다.`,
        `이번 주는 "${key}" 축이 조정 구간이니 외부 실행보다 자료 보완/일정 정리를 먼저 고정하세요.`
      ], seed)
      : pickByNumber([
        `이번 주는 "${key}" 흐름이 살아 있어 외부 실행 1개와 내부 정리 1개를 짝으로 유지하면 체감이 좋습니다.`,
        `이번 주는 "${key}" 축을 기준으로 우선순위 1개를 밀어붙이고, 매일 짧은 복기로 리듬을 유지하세요.`
      ], seed);
  }

  return unstable
    ? pickByNumber([
      `이번 주는 "${key}" 구간의 변동성이 있어 ${strongestDayLabel} 실행 1개에 집중하고 ${weakestDayLabel}에는 정비를 배치하는 편이 좋겠습니다.`,
      `이번 주는 "${key}" 축에서 병목이 생길 수 있으니 ${weakestDayLabel}은 속도 조절, ${strongestDayLabel}은 핵심 실행으로 분리하세요.`
    ], seed)
    : pickByNumber([
      `이번 주는 "${key}" 흐름이 살아 있어 ${strongestDayLabel} 실행을 중심축으로 두면 주간 체감이 커질 수 있습니다.`,
      `이번 주는 "${key}" 축을 중심으로 ${strongestDayLabel} 추진, ${weakestDayLabel} 복기 리듬을 나누면 안정됩니다.`
    ], seed);
}

function scoreWeeklyDayStrength(item, intent = 'general') {
  if (!item?.card) return -1;
  const orientationScore = item.orientation === 'reversed' ? -1 : 1;
  const riskPenalty = scoreCardRisk(item) * 0.45;
  let suitBonus = 0;
  if (intent === 'finance') {
    if (item.card.suit === 'Pentacles') suitBonus += 0.8;
    if (item.card.suit === 'Swords') suitBonus += 0.2;
    if (item.card.suit === 'Cups') suitBonus -= 0.2;
    if (item.card.suit === 'Wands') suitBonus -= 0.1;
  }
  return orientationScore + suitBonus - riskPenalty;
}

function buildFinanceDayHint({ item, dayLabel, open, riskScore, seed = 0, memory = null }) {
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const cardName = item?.card?.nameKo || '이 카드';
  const cardId = item?.card?.id || '';
  const bank = FINANCE_WEEKLY_CARD_ACTIONS[cardId];
  const role = dayLabel;

  const openFallback = [
    `${cardName}의 "${keyword}" 신호가 살아 있어 ${role}에는 예산 한도를 지키며 집행하기 좋습니다.`,
    `${cardName} 기준으로 "${keyword}" 축이 열려 있어 ${role}에는 지출/저축 균형을 맞추기 수월합니다.`
  ];
  const cautiousFallback = [
    `${cardName}의 "${keyword}" 변동성이 있어 ${role}에는 결제 전 점검을 먼저 두는 편이 좋겠습니다.`,
    `${cardName} 기준으로 "${keyword}" 구간의 리스크가 있어 ${role}에는 손실 방어를 우선하는 편이 안전합니다.`
  ];

  const options = open && riskScore < 3
    ? (bank?.open?.length ? bank.open : openFallback)
    : (bank?.cautious?.length ? bank.cautious : cautiousFallback);

  const raw = pickByNumber(options, seed);
  return pickDistinctWeeklyPhrase(raw, `${dayLabel}:finance:${seed}`, memory);
}

function pickDistinctWeeklyPhrase(text = '', keySeed = '', memory = null) {
  const value = String(text || '').trim();
  if (!value || !memory) return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!memory.has(normalized)) {
    memory.add(normalized);
    return value;
  }
  const variants = [
    normalized
      .replace('좋습니다.', '좋겠습니다.')
      .replace('필요합니다.', '필요해 보입니다.')
      .replace('안전합니다.', '안정적입니다.'),
    normalized
      .replace('먼저', '우선')
      .replace('좋겠습니다.', '권장됩니다.')
  ].filter((v) => v && !memory.has(v));
  if (variants.length) {
    const picked = pickByNumber(variants, hashText(keySeed));
    memory.add(picked);
    return picked;
  }
  return value;
}

const FINANCE_WEEKLY_CARD_ACTIONS = {
  'major-0': {
    open: [
      '탐색 성향이 강한 날이라 소액 실험 예산만 허용하고 큰 결제는 분리해 두세요.',
      '새 시도를 해보기 좋은 흐름이지만, 금액 상한을 먼저 정한 뒤 집행하는 편이 안정적입니다.'
    ],
    cautious: [
      '새로운 소비 시도가 과해질 수 있어 오늘은 필수 지출만 집행하는 편이 좋겠습니다.',
      '호기심 지출이 늘 수 있으니 테스트성 결제는 한 건으로 제한해 두세요.'
    ]
  },
  'major-4': {
    open: [
      '통제력이 살아 있는 카드라 고정비/변동비 기준을 다시 세우고 집행하면 좋습니다.',
      '규칙 기반 운영이 잘 맞는 흐름이라 예산 룰을 엄격히 적용해도 무리가 적습니다.'
    ],
    cautious: [
      '통제가 과해져 필요한 집행까지 늦출 수 있으니 우선순위 1개만 먼저 집행하세요.',
      '지출 억제가 과도해지지 않도록 필수 항목은 일정대로 처리하는 편이 좋습니다.'
    ]
  },
  'major-15': {
    open: [
      '유혹 신호가 강한 카드라 계획 외 결제는 24시간 유예 규칙을 두는 편이 좋겠습니다.',
      '충동 지출 가능성이 있어 쇼핑/구독 결제는 오늘 즉시 처리하지 않는 편이 안전합니다.'
    ],
    cautious: [
      '손실 위험이 큰 카드라 오늘은 비필수 결제를 보류하고 자동결제 항목부터 점검하세요.',
      '의존 소비 패턴이 올라올 수 있어 현금흐름 점검과 지출 차단이 먼저입니다.'
    ]
  },
  'major-16': {
    open: [
      '변동 카드이므로 예비비를 먼저 확보하고 지출 집행 순서를 조정해 두세요.',
      '예상 밖 지출에 대비해 오늘은 고정비 안정화부터 끝내는 편이 좋습니다.'
    ],
    cautious: [
      '급변 리스크가 큰 카드라 신규 결제는 미루고 손실 한도부터 고정하세요.',
      '예상치 못한 비용이 생기기 쉬워 오늘은 방어형 운영으로 전환하는 편이 안전합니다.'
    ]
  },
  'minor-pentacles-ace': {
    open: [
      '현금흐름 시작점 카드라 저축 자동이체나 예산 템플릿 고정을 시작하기 좋습니다.',
      '소액이더라도 자산 형성 루틴을 오늘부터 고정하면 효과를 보기 쉽습니다.'
    ],
    cautious: [
      '기초 세팅 카드가 흔들리면 지출 누수가 생기니 예산표 정리를 먼저 하세요.',
      '새로운 집행보다 계좌/지출 분류 기준을 먼저 정돈하는 편이 좋겠습니다.'
    ]
  },
  'minor-pentacles-seven': {
    open: [
      '점검 카드가 열린 날이라 투자/저축 성과를 검토하고 유지 항목을 확정하기 좋습니다.',
      '중간 점검 흐름이 좋아 수익보다 유지비 관점으로 재배치하면 안정성이 올라갑니다.'
    ],
    cautious: [
      '결과를 서두르면 실수가 생길 수 있어 오늘은 재평가와 기록 정리에 집중하세요.',
      '수익 기대보다 비용 구조 점검을 우선하면 변동성을 줄일 수 있습니다.'
    ]
  },
  'minor-swords-nine': {
    open: [
      '불안 신호가 있어 지출 결정을 밤에 미루지 말고 낮에 기준표로 확정하는 편이 좋습니다.',
      '심리 변동이 큰 카드라 체감 불안에 따른 충동 결제를 경계해야 합니다.'
    ],
    cautious: [
      '불안 기반 판단 오류가 생기기 쉬워 오늘은 큰 금액 결제를 보류하는 편이 안전합니다.',
      '심리적 압박 소비를 막기 위해 결제 전 2단계 확인 루틴을 두세요.'
    ]
  }
};
