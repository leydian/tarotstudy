import { generateReadingV3 } from './v3.js';
import { inferQuestionProfile } from './questionType.js';

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

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 25000);
const ANTHROPIC_REPAIR_TIMEOUT_MS = Number(process.env.ANTHROPIC_REPAIR_TIMEOUT_MS || 12000);
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

const getYesNoScore = (cardId, orientation = 'upright') => {
  const direction = orientation === 'reversed' ? -1 : 1;
  if (POSITIVE_IDS.has(cardId)) return 1 * direction;
  if (NEGATIVE_IDS.has(cardId)) return -1 * direction;
  return 0;
};

const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
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
  if (left.length >= 14 && right.length >= 14 && (left.includes(right) || right.includes(left))) return true;
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

const buildDistinctRationale = (report) => {
  const firstClaim = sanitizeText(report?.evidence?.[0]?.claim || '').replace(/\.$/, '');
  if (firstClaim) return `핵심 카드 흐름으로 보면, ${firstClaim} 쪽에 무게가 실립니다.`;
  if (report?.verdict?.label === 'YES') return '전반 흐름은 긍정 쪽이 우세하므로 준비된 선택부터 실행해 보세요.';
  if (report?.verdict?.label === 'NO') return '지금은 속도를 낮추고 조건을 정교하게 점검하는 편이 더 안전합니다.';
  return '판단을 서두르기보다 추가 신호를 확인한 뒤 결정을 내리는 편이 좋습니다.';
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
    qualityFlags.push('summary_verdict_overlap_high');
    next.verdict.rationale = buildDistinctRationale(next);
    qualityFlags.push('auto_rewritten');
  }

  next.counterpoints = sanitizeListItems(next.counterpoints, 'counterpoints');
  next.actions = sanitizeListItems(next.actions, 'actions');

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
  const prefix = String(cardId || '').slice(0, 1);
  if (prefix === 'c') return 'cups';
  if (prefix === 'p') return 'pentacles';
  if (prefix === 'w') return 'wands';
  if (prefix === 's') return 'swords';
  return 'major';
};

const pickDominantFact = (facts, predicate, fallbackIndex = 0) => {
  const filtered = facts.filter(predicate);
  const pool = filtered.length > 0 ? filtered : facts;
  if (!pool.length) return null;
  return pool
    .map((fact) => ({ fact, magnitude: Math.abs(getYesNoScore(fact.cardId, fact.orientation)) }))
    .sort((a, b) => b.magnitude - a.magnitude)[0]?.fact || facts[fallbackIndex] || facts[0];
};

const periodLabelKo = (period = 'week') => {
  if (period === 'today') return '오늘';
  if (period === 'month') return '이번 달';
  if (period === 'year') return '올해';
  return '이번 주';
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
  const threshold = Math.max(0.8, facts.length * 0.2);
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
  if (trendLabel === 'UP') return `${periodLabel}의 흐름은 상승 기조입니다. 다만 리듬을 유지하며 컨디션 관리를 병행하세요.`;
  if (trendLabel === 'CAUTION') return `${periodLabel}에는 속도 조절이 필요합니다. 무리한 확장보다 점검과 정리가 유리합니다.`;
  return `${periodLabel}은 균형 구간입니다. 조급한 결정보다 우선순위를 정리하는 접근이 안정적입니다.`;
};

const buildDeterministicReport = ({
  question,
  facts,
  category,
  binaryEntities,
  questionType,
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

  const evidence = facts.map((fact) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary).replace(/\.$/, '');
    const keywordsStr = fact.keywords.slice(0, 2).join('·') || '균형';
    const orientationRationale = fact.orientation === 'reversed'
      ? `${keywordsStr} 에너지가 안쪽으로 향하고 있어, 속도를 낮추고 조건을 재점검할 때입니다.`
      : `${keywordsStr} 에너지가 활성화되어, 이 흐름에 맞춰 나아가기 좋은 시점입니다.`;
    return {
      cardId: fact.cardId,
      positionLabel: fact.positionLabel,
      claim: `${fact.cardNameKo}(${fact.orientationLabel}) — ${coreMeaning}`,
      rationale: orientationRationale,
      caution: sanitizeText(fact.advice) || '급한 결정보다는 마음의 우선순위를 먼저 정리해 보세요.'
    };
  });

  const counterpoints = [
    '질문의 범위가 넓을 경우 카드가 가리키는 방향이 분산될 수 있으니 유의하세요.',
    '운명은 고정된 것이 아니므로 당신의 컨디션과 주변 환경에 따라 흐름은 언제든 바뀔 수 있습니다.'
  ];

  const actions = isCompactBinaryQuestion
    ? [
        '한 잔을 마신다면 양을 평소보다 조금 줄여서 가볍게 시작해 보세요.',
        '지금 컨디션이 애매하면 물 한 컵 먼저 마신 뒤 15분 후에 다시 결정해 보세요.'
      ]
    : [
        '지금 당신의 직관이 들려주는 목소리에 조금 더 귀를 기울여 보세요.',
        '결정하기 전, 10분 정도 차분히 명상을 하며 마음의 소리를 들어보시는 건 어떨까요?'
      ];

  const summary = isCompactBinaryQuestion
    ? `질문 "${question}"에 대해 보면, ${verdict.rationale} 오늘은 너무 무겁게 고민하지 않고 결정해도 괜찮습니다.`
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
      ? `${energyFact.cardNameKo}(${energyFact.orientationLabel})의 흐름이 ${periodText} 전체 리듬의 기준점으로 작동합니다.`
      : `${periodText}의 에너지는 안정적으로 흐르고 있습니다.`;
    const workClaim = workFact
      ? `${claimCardLabel(workFact, energyFact)} 신호를 보면 ${workFrame}`
      : workFrame;
    const loveClaim = loveFact
      ? `${claimCardLabel(loveFact, energyFact)} 흐름상 ${loveFrame}`
      : loveFrame;
    const mindClaim = mindFact
      ? `${claimCardLabel(mindFact, energyFact)} 경향을 고려하면 ${mindFrame}`
      : mindFrame;
    const fortune = {
      period: resolvedFortunePeriod,
      trendLabel,
      energy: `전체 에너지 흐름을 보면, ${energyClaim}`,
      workFinance: `일·재물운은 ${workClaim}`,
      love: `애정운은 ${loveClaim}`,
      healthMind: `건강·마음 영역은 ${mindClaim}`,
      message: trendLabel === 'UP'
        ? '지금의 상승 흐름을 믿되, 속도보다 리듬을 지키세요.'
        : trendLabel === 'CAUTION'
          ? '서두르지 말고 정리와 점검에 집중하면 흐름이 다시 열립니다.'
          : '균형의 시간을 활용해 우선순위를 재정렬하세요.'
    };
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
    return applyHealthGuardrail(baseReport, riskLevel);
  }
  return baseReport;
};

const buildPrompt = ({
  question,
  facts,
  category,
  timeframe,
  binaryEntities,
  sessionContext,
  responseMode,
  questionType,
  domainTag = 'general',
  riskLevel = 'low',
  readingKind = 'general_reading',
  fortunePeriod = null
}) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    domainTag,
    riskLevel,
    readingKind,
    fortunePeriod,
    sessionContext: sessionContext || null,
    facts
  };

  const isCompactBinaryQuestion = questionType === 'binary' && String(question || '').length <= 20;
  const styleGuide = readingKind === 'overall_fortune'
    ? [
        '응답 모드: overall_fortune',
        '- fortune 객체를 반드시 채우세요.',
        '- fortune.period는 today|week|month|year 중 하나입니다.',
        '- fortune.trendLabel은 UP|BALANCED|CAUTION 중 하나를 사용하세요.',
        '- overall_fortune에서는 verdict를 단정형 YES/NO로 몰아가지 말고 균형 있게 작성하세요.',
        '- energy/workFinance/love/healthMind/message는 각각 1~2문장으로 작성하세요.'
      ].join('\n')
    : domainTag === 'health'
    ? [
        '응답 모드: health-safety',
        '- 의료 진단/처방처럼 들리는 단정적 문장을 금지합니다.',
        '- verdict.label은 반드시 MAYBE를 사용하세요.',
        '- verdict.rationale에는 안전 우선 원칙과 의료 상담 필요 조건을 포함하세요.',
        '- actions는 즉시 실행 가능한 안전 수칙 2개로 작성하세요.',
        '- summary에는 "의료 조언을 대체하지 않는다"는 취지를 반드시 반영하세요.'
      ].join('\n')
    : isCompactBinaryQuestion
    ? [
        '응답 모드: concise-binary-light',
        '- 결론은 2~3문장으로 짧고 명확하게 작성하세요.',
        '- 과장된 수사(운명/신비/장대한 은유) 사용 금지.',
        '- verdict.rationale은 자연스러운 일상어로 작성하세요.',
        '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
        '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.',
        '- actions는 즉시 실행 가능한 문장 2개만 작성하세요.',
        '- evidence는 카드별 핵심 주장(claim) 중심으로 간결하게 작성하세요.'
      ].join('\n')
    : responseMode === 'concise'
      ? [
          '응답 모드: concise',
          '길이 제한:',
          '- fullNarrative는 2문단 이내, 문단당 2문장 이내.',
          '- evidence는 핵심 주장만 간결하게 작성.',
          '- actions는 짧고 실행 가능한 문장으로 작성.',
          '- 과장된 비유/장황한 세계관 설명 금지.',
          '- 질문에 대한 직접 결론 1문장을 반드시 포함.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.'
        ].join('\n')
      : responseMode === 'creative'
      ? [
          '응답 모드: creative',
          '- 이미지감 있는 표현과 어휘 변주를 사용하세요.',
          '- 같은 어구 반복을 피하고 카드별 표현을 다르게 구성하세요.',
          '- 결론은 질문에 대한 실천 방향이 분명해야 합니다.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.'
        ].join('\n')
      : [
          '응답 모드: balanced',
          '- 명확하고 안정적인 어조로 카드 근거를 구조적으로 설명하세요.',
          '- 감성적 표현과 실천 지침의 균형을 유지하세요.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.'
        ].join('\n');

  return [
    '당신은 아르카나 도서관의 지혜로운 사서이자 타로 전문가입니다.',
    '반드시 JSON만 출력하고, 카드의 상징에 기반한 따뜻하고 통찰력 있는 분석을 제공하세요.',
    `이 질문은 ${responseMode === 'concise' ? '일상적이고 가벼운' : '진중하고 깊이 있는'} 고민입니다. 그에 맞춰 어휘의 무게를 조절하세요.`,
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"fortune":{"period":"today|week|month|year","trendLabel":"UP|BALANCED|CAUTION","energy":string,"workFinance":string,"love":string,"healthMind":string,"message":string},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '- fullNarrative: 사서의 말투로 작성된 3~4문단의 전체 리딩 서사. 카드 개별 해석과 종합 결론을 자연스럽게 연결하세요. 문법과 조사를 완벽하게 처리하세요.',
    '- evidence[].claim: "~의 상징인 ~" 패턴 금지. 카드 이름(방향)을 주어로, 카드가 현재 상황에 어떻게 작용하는지를 서술형 문장으로 작성.',
    '한국어로 작성하고 사서의 우아한 말투를 유지하세요.',
    styleGuide,
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const buildRepairPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext }) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    sessionContext: sessionContext || null,
    facts
  };

  return [
    '당신은 JSON 정규화 도우미입니다.',
    '반드시 JSON 객체 하나만 출력하세요. 설명, 마크다운, 코드펜스는 금지합니다.',
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"fortune":{"period":"today|week|month|year","trendLabel":"UP|BALANCED|CAUTION","energy":string,"workFinance":string,"love":string,"healthMind":string,"message":string},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '요구사항:',
    '- evidence 길이는 facts 길이와 반드시 같아야 합니다.',
    '- evidence.cardId는 반드시 facts 안의 cardId만 사용하세요.',
    '- summary와 verdict.rationale은 빈 문자열이면 안 됩니다.',
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const extractJsonObject = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const mapAnthropicReason = (status) => {
  if (status === 404) return 'model_not_found';
  if (status === 401 || status === 403) return 'anthropic_auth_error';
  if (status === 429) return 'anthropic_rate_limited';
  if (status >= 500) return 'anthropic_http_error';
  return 'anthropic_http_error';
};

const shouldRetryAnthropic = (reason, status) => {
  if (reason === 'anthropic_timeout') return true;
  if (reason === 'anthropic_fetch_error') return true;
  if (reason === 'anthropic_parse_error') return true;
  if (reason === 'anthropic_http_error' && status >= 500) return true;
  return false;
};

const callAnthropic = async (prompt, options = {}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { report: null, reason: 'model_unavailable', status: null };

  const {
    maxTokens = 1100,
    timeoutMs = ANTHROPIC_TIMEOUT_MS,
    temperature = 0.45
  } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: DEFAULT_ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
          system: '아르카나 도서관의 사서로서 따뜻하고 신비로운 분위기를 유지하며 JSON만 반환하세요.'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Anthropic API] Error status=${response.status} model=${DEFAULT_ANTHROPIC_MODEL} body=${errorText}`
        );
        return { report: null, reason: mapAnthropicReason(response.status), status: response.status };
      }

      const data = await response.json();
      const report = extractJsonObject(data?.content?.[0]?.text);
      return { report, reason: report ? null : 'anthropic_parse_error', status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    console.error(
      `[Anthropic API] Fetch Error model=${DEFAULT_ANTHROPIC_MODEL} timeout_ms=${timeoutMs} timed_out=${isTimeout} message=${error?.message || 'unknown'} cause=${error?.cause?.code || error?.cause?.message || 'none'}`
    );
    const reason = isTimeout ? 'anthropic_timeout' : 'anthropic_fetch_error';
    return { report: null, reason, status: null };
  }
};

const verifyReport = (report, facts, binaryEntities) => {
  const issues = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, issues: ['report_missing'], unsupportedClaimCount: 1, consistencyScore: 0 };
  }

  if (!sanitizeText(report.summary)) {
    issues.push('summary_missing');
  }

  if (!report.verdict || !isValidVerdictLabel(report.verdict.label)) {
    issues.push('verdict_missing');
  }
  if (isHighOverlap(report.summary, report?.verdict?.rationale)) {
    issues.push('summary_verdict_overlap_high');
  }

  if (!Array.isArray(report.evidence) || report.evidence.length !== facts.length) {
    issues.push('evidence_length_mismatch');
  }

  let unsupportedClaimCount = 0;
  let hasLowQualityEvidence = false;
  if (Array.isArray(report.evidence)) {
    for (const item of report.evidence) {
      if (!sanitizeText(item?.claim) || !sanitizeText(item?.rationale)) {
        unsupportedClaimCount += 1;
        hasLowQualityEvidence = true;
      }
    }
  }
  if (hasLowQualityEvidence) issues.push('evidence_quality_low');

  const issuePenalty = Math.min(issues.length * 8, 60);
  const unsupportedPenalty = Math.min(unsupportedClaimCount * 20, 40);
  const consistencyScore = Math.max(0, 100 - issuePenalty - unsupportedPenalty);
  const criticalIssueSet = new Set(['summary_missing', 'verdict_missing', 'evidence_length_mismatch']);
  const hasCriticalIssue = issues.some((issue) => criticalIssueSet.has(issue));

  return {
    valid: !hasCriticalIssue,
    issues,
    unsupportedClaimCount,
    consistencyScore
  };
};

const normalizeReport = (report, facts, fallback) => {
  const sourceEvidence = Array.isArray(report?.evidence) ? report.evidence : [];
  const normalizedEvidence = facts.map((fact, idx) => {
    const byCardId = sourceEvidence.find((item) => item?.cardId === fact.cardId);
    const byIndex = sourceEvidence[idx];
    const fallbackItem = fallback.evidence[idx] || {};
    const item = byCardId || byIndex || fallbackItem;
    const claim = sanitizeText(item?.claim || fallbackItem?.claim || '');
    const rationale = sanitizeText(item?.rationale || fallbackItem?.rationale || '');

    return {
      cardId: fact.cardId,
      positionLabel: sanitizeText(item?.positionLabel || fact.positionLabel || `단계 ${idx + 1}`),
      claim,
      rationale,
      caution: sanitizeText(item?.caution || fact.advice || fallbackItem?.caution || '과도한 단정은 피하세요.')
    };
  });

  return {
    fullNarrative: report?.fullNarrative || null,
    summary: sanitizeText(report?.summary || fallback.summary),
    verdict: {
      label: normalizeVerdictLabel(report?.verdict?.label || fallback.verdict.label),
      rationale: sanitizeText(report?.verdict?.rationale || fallback.verdict.rationale),
      recommendedOption: report?.verdict?.recommendedOption || 'NONE'
    },
    fortune: report?.fortune || fallback.fortune || null,
    evidence: normalizedEvidence,
    counterpoints: (Array.isArray(report?.counterpoints) ? report.counterpoints : fallback.counterpoints)
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 4),
    actions: (Array.isArray(report?.actions) ? report.actions : fallback.actions)
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 4)
  };
};

const toLegacyResponse = ({ report, question, facts }) => {
  const evidenceStrings = report.evidence.map((item) => (
    `[${item.positionLabel}: ${facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId}]\n\n` +
    `사서로서 이 카드의 의미를 읽어보니, "${item.claim}" 임을 알 수 있습니다.\n\n` +
    `깊은 통찰: ${item.rationale}\n\n` +
    `사서의 조언: ${item.caution}`
  ));

  const action = report.actions.map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);

  const conclusion = report.fullNarrative || [
    `사서인 제가 읽어낸 이번 리딩의 결론입니다.`,
    `질문하신 "${question}"에 대하여, ${report.summary}`,
    '',
    `[운명의 판정] ${report.verdict.label} - ${report.verdict.rationale}`,
  ].join('\n');

  return {
    conclusion,
    evidence: evidenceStrings,
    action,
    yesNoVerdict: normalizeVerdictLabel(report.verdict.label)
  };
};

const extractBinaryEntities = (question, cardCount) => {
  if (cardCount !== 2 && cardCount !== 5) return null;

  const splitRegex = /(.+?)\s*(?:아니면|vs|또는|혹은)\s*(.+?)(?:\?|$)/;
  const splitMatch = question.match(splitRegex);
  if (splitMatch) return [splitMatch[1].trim(), splitMatch[2].trim()];

  const verbs = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '될까', '말까'];
  const verbPattern = verbs.join('|');
  const binaryRegex = new RegExp(`(.+?)\\s*(?:${verbPattern})\\s*(.+?)(?:${verbPattern})(?:\\?|$)`);
  const match = question.match(binaryRegex);
  if (match) {
    const a = match[1].split(' ').pop().trim();
    const b = match[2].trim();
    return [a, b];
  }

  return null;
};

const mapFailureStage = ({ fallbackReason, qualityValid, modelReport }) => {
  if (!qualityValid && modelReport) return 'validation';
  if (!fallbackReason) return null;
  if (fallbackReason === 'anthropic_timeout' || fallbackReason === 'anthropic_fetch_error') return 'network';
  if (fallbackReason === 'anthropic_parse_error') return 'parse';
  if (
    fallbackReason === 'model_not_found' ||
    fallbackReason === 'anthropic_http_error' ||
    fallbackReason === 'anthropic_auth_error' ||
    fallbackReason === 'anthropic_rate_limited'
  ) return 'http';
  if (fallbackReason === 'model_unavailable') return 'model_unavailable';
  if (fallbackReason === 'engine_fatal_error') return 'engine';
  if (fallbackReason === 'validation_failed') return 'validation';
  return 'unknown';
};

export const generateReadingHybrid = async ({
  cards,
  question,
  timeframe = 'daily',
  category = 'general',
  sessionContext = null,
  structure = 'evidence_report',
  debug = false,
  requestId = null,
  serverRevision = 'local',
  questionProfile = null
}) => {
  const safeQuestion = sanitizeText(question || '나의 현재 상황은?');
  const binaryEntities = extractBinaryEntities(safeQuestion, cards.length);
  const resolvedProfile = questionProfile || inferQuestionProfile({
    question: safeQuestion,
    category,
    binaryEntities
  });
  const questionType = resolvedProfile.questionType;
  const responseMode = detectResponseMode(
    questionType,
    safeQuestion.length,
    resolvedProfile.domainTag,
    resolvedProfile.readingKind,
    resolvedProfile.fortunePeriod
  );
  const facts = buildCardFacts(cards, category);

  const deterministic = buildDeterministicReport({
    question: safeQuestion,
    facts,
    category,
    binaryEntities,
    questionType,
    domainTag: resolvedProfile.domainTag,
    riskLevel: resolvedProfile.riskLevel,
    readingKind: resolvedProfile.readingKind,
    fortunePeriod: resolvedProfile.fortunePeriod
  });

  const prompt = buildPrompt({
    question: safeQuestion,
    facts,
    category,
    timeframe,
    binaryEntities,
    sessionContext,
    responseMode,
    questionType,
    domainTag: resolvedProfile.domainTag,
    riskLevel: resolvedProfile.riskLevel,
    readingKind: resolvedProfile.readingKind,
    fortunePeriod: resolvedProfile.fortunePeriod
  });

  let apiUsed = 'none';
  let modelReport = null;
  let fallbackReason = null;
  let path = 'fallback';
  let failureStage = null;
  const startedAt = Date.now();
  let anthropicPrimaryMs = null;
  let anthropicRetryMs = null;
  let anthropicRepairMs = null;
  const attempts = {
    primary: { attempted: false, success: false, reason: null, status: null, durationMs: null },
    retry: { attempted: false, success: false, reason: null, status: null, durationMs: null },
    repair: { attempted: false, success: false, reason: null, status: null, durationMs: null }
  };
  let parseFailureSeen = false;

  try {
    const primaryConfig = getAnthropicConfig(responseMode, false);
    attempts.primary.attempted = true;
    const primaryStartedAt = Date.now();
    const antResult = await callAnthropic(prompt, primaryConfig);
    anthropicPrimaryMs = Date.now() - primaryStartedAt;
    attempts.primary.durationMs = anthropicPrimaryMs;
    attempts.primary.success = !!antResult.report;
    attempts.primary.reason = antResult.reason || null;
    attempts.primary.status = antResult.status ?? null;
    modelReport = antResult.report;
    if (modelReport) {
      apiUsed = 'anthropic';
      path = 'anthropic_primary';
    } else {
      fallbackReason = antResult.reason;
      parseFailureSeen = parseFailureSeen || fallbackReason === 'anthropic_parse_error';
      if (shouldRetryAnthropic(antResult.reason, antResult.status)) {
        const retryConfig = getAnthropicConfig(responseMode, true);
        attempts.retry.attempted = true;
        const retryStartedAt = Date.now();
        const antRetryResult = await callAnthropic(prompt, retryConfig);
        anthropicRetryMs = Date.now() - retryStartedAt;
        attempts.retry.durationMs = anthropicRetryMs;
        attempts.retry.success = !!antRetryResult.report;
        attempts.retry.reason = antRetryResult.reason || null;
        attempts.retry.status = antRetryResult.status ?? null;
        modelReport = antRetryResult.report;
        if (modelReport) {
          apiUsed = 'anthropic';
          fallbackReason = null;
          path = 'anthropic_retry';
        } else {
          fallbackReason = antRetryResult.reason || fallbackReason;
          parseFailureSeen = parseFailureSeen || fallbackReason === 'anthropic_parse_error';
        }
      }

      if (!modelReport && parseFailureSeen) {
        const repairPrompt = buildRepairPrompt({
          question: safeQuestion,
          facts,
          category,
          timeframe,
          binaryEntities,
          sessionContext
        });
        attempts.repair.attempted = true;
        const repairStartedAt = Date.now();
        const repairResult = await callAnthropic(repairPrompt, {
          maxTokens: 520,
          timeoutMs: ANTHROPIC_REPAIR_TIMEOUT_MS,
          temperature: 0.2
        });
        anthropicRepairMs = Date.now() - repairStartedAt;
        attempts.repair.durationMs = anthropicRepairMs;
        attempts.repair.success = !!repairResult.report;
        attempts.repair.reason = repairResult.reason || null;
        attempts.repair.status = repairResult.status ?? null;
        modelReport = repairResult.report;
        if (modelReport) {
          apiUsed = 'anthropic';
          fallbackReason = null;
          path = 'anthropic_retry';
        } else {
          fallbackReason = repairResult.reason || fallbackReason;
        }
      }
    }
  } catch (err) {
    console.error('[Hybrid Engine] Engine fatal error:', err.message);
    fallbackReason = 'engine_fatal_error';
  }

  let normalized = normalizeReport(modelReport, facts, deterministic);
  let qualityFlags = [];
  {
    const processed = postProcessReport(normalized);
    normalized = processed.report;
    qualityFlags = processed.qualityFlags;
  }
  if (resolvedProfile.domainTag === 'health') {
    normalized = applyHealthGuardrail(normalized, resolvedProfile.riskLevel);
    qualityFlags = [...new Set([...qualityFlags, 'health_guardrail_applied'])];
  }
  let quality = verifyReport(normalized, facts, binaryEntities);
  qualityFlags = [...new Set([...qualityFlags, ...quality.issues])];

  // 최종 폴백: API가 아예 실패했거나 검증에 실패한 경우
  const fallbackUsed = !modelReport || !quality.valid;
  if (fallbackUsed) {
    const processedFallback = postProcessReport(deterministic);
    normalized = processedFallback.report;
    if (resolvedProfile.domainTag === 'health') {
      normalized = applyHealthGuardrail(normalized, resolvedProfile.riskLevel);
      qualityFlags = [...new Set([...qualityFlags, 'health_guardrail_applied'])];
    }
    apiUsed = 'fallback';
    path = 'fallback';
    if (!fallbackReason && !quality.valid) fallbackReason = 'validation_failed';
    if (!fallbackReason) fallbackReason = 'model_unavailable';
    failureStage = mapFailureStage({
      fallbackReason,
      qualityValid: quality.valid,
      modelReport: !!modelReport
    });
  }

  const legacyFromV3 = generateReadingV3(cards, safeQuestion, timeframe, category);
  const legacy = toLegacyResponse({ report: normalized, question: safeQuestion, facts });

  const isOverallFortune = resolvedProfile.readingKind === 'overall_fortune';
  const isCompactQuestion = isOverallFortune || questionType === 'light' || (questionType === 'binary' && safeQuestion.length <= 20);
  const finalConclusion = isCompactQuestion
    ? normalized.summary
    : (normalized.fullNarrative || legacyFromV3?.conclusion || legacy.conclusion);

  const compactEvidence = normalized.evidence.map((item) => {
    const cardName = facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId;
    return `[${item.positionLabel}: ${cardName}]\n${item.claim}`;
  });

  const compactActions = (normalized.actions.length > 0 ? normalized.actions : deterministic.actions)
    .slice(0, 2)
    .map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);
  const totalMs = Date.now() - startedAt;

  return {
    conclusion: finalConclusion,
    evidence: isCompactQuestion ? compactEvidence : (legacyFromV3?.evidence || legacy.evidence),
    action: isCompactQuestion ? compactActions : (legacyFromV3?.action || legacy.action),
    yesNoVerdict: normalizeVerdictLabel(normalized.verdict.label),
    report: normalized,
    quality: {
      consistencyScore: quality.consistencyScore,
      unsupportedClaimCount: quality.unsupportedClaimCount,
      regenerationCount: 0
    },
    fallbackUsed,
    fallbackReason,
    apiUsed,
    mode: 'hybrid',
    structure,
    meta: {
      requestId,
      serverRevision,
      serverTimestamp: new Date().toISOString(),
      questionType,
      domainTag: resolvedProfile.domainTag,
      riskLevel: resolvedProfile.riskLevel,
      readingKind: resolvedProfile.readingKind,
      fortunePeriod: resolvedProfile.fortunePeriod || null,
      trendLabel: normalized?.fortune?.trendLabel || null,
      recommendedSpreadId: resolvedProfile.recommendedSpreadId,
      responseMode,
      path,
      timings: {
        totalMs,
        anthropicPrimaryMs,
        anthropicRetryMs,
        anthropicRepairMs
      },
      attempts,
      failureStage,
      fallbackReason: fallbackReason || null,
      qualityFlags
    }
  };
};
