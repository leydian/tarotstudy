import { getCardById } from './data/cards.js';

const TTL_FALLBACK_SOURCE = 'fallback';

export function buildFallbackExplanation(card, level = 'beginner', context = '') {
  const contextLine = context?.trim()
    ? `질문 맥락: ${context.trim()} 관점으로 읽을 때,`
    : '일반 학습 맥락에서,';

  const arcanaLine =
    card.arcana === 'major'
      ? '메이저 아르카나는 삶의 큰 흐름과 심리적 전환점을 다룹니다.'
      : `${card.suitKo} 수트는 ${suitTheme(card.suit)}을 상징합니다.`;

  const depthLine =
    level === 'intermediate'
      ? '중급 관점에서는 카드 간 상호작용과 위치 의미(스프레드 맥락)를 함께 고려합니다.'
      : '입문 관점에서는 카드의 핵심 키워드와 상황별 기본 의미를 먼저 고정합니다.';

  const rankLine =
    card.rank
      ? `${card.rankKo}의 단계는 ${rankStage(card.rank)}를 시사합니다.`
      : '이 카드는 독립된 원형(Archetype)으로 읽습니다.';

  return {
    cardId: card.id,
    source: TTL_FALLBACK_SOURCE,
    sections: {
      coreMeaning: `${card.nameKo} (${card.name})의 핵심은 ${card.keywords.join(', ')}입니다. ${contextLine} 현재의 선택이 다음 전개를 크게 바꿀 수 있음을 시사합니다.`,
      symbolism: `${arcanaLine} ${rankLine} 상징은 문자 그대로 예언이 아니라 심리적 방향성과 행동 패턴을 비추는 거울로 해석합니다.`,
      upright: `정방향은 ${card.keywords[0]}이(가) 비교적 건강하게 발현되는 상태입니다. 필요한 행동을 작게라도 실행하면 카드의 장점이 강화됩니다.`,
      reversed: `역방향은 ${card.keywords[0]} 에너지가 지연되거나 과잉/결핍으로 나타날 수 있음을 뜻합니다. 원인을 분해해 작은 교정 루틴을 만드는 것이 핵심입니다.`,
      love: `연애/관계에서는 상대를 통제하기보다 현재 감정의 사실을 명확히 표현해야 합니다. ${card.keywords[1] ?? card.keywords[0]}의 균형이 관계의 질을 좌우합니다.`,
      career: `일/학업에서는 우선순위를 1~2개로 압축하고, 실행 증거(기록/산출물)를 남기는 방식이 유리합니다. ${card.keywords[2] ?? card.keywords[0]} 테마가 성과의 기준이 됩니다.`,
      advice: `${depthLine} 오늘의 실천 과제: 이 카드 키워드 중 가장 약한 항목 1개를 정해 20분 안에 수행 가능한 행동으로 바꿔보세요.`
    }
  };
}

function suitTheme(suit) {
  const map = {
    Wands: '행동력·의지·창의적 추진',
    Cups: '감정·관계·정서적 교류',
    Swords: '사고·판단·의사소통',
    Pentacles: '현실·재정·건강·성과'
  };
  return map[suit] ?? '생활 실천';
}

function rankStage(rank) {
  const map = {
    Ace: '가능성의 씨앗',
    Two: '선택과 균형 탐색',
    Three: '협업과 확장',
    Four: '구조 안정화',
    Five: '충돌과 재정비',
    Six: '회복과 흐름 회귀',
    Seven: '점검과 전략 수정',
    Eight: '숙련과 반복 훈련',
    Nine: '완성 직전의 조율',
    Ten: '주기의 완결',
    Page: '탐색과 학습',
    Knight: '추진과 실험',
    Queen: '내면 통합과 성숙',
    King: '책임 있는 운영'
  };
  return map[rank] ?? '성장 단계';
}

export function normalizeExternalSections(raw, cardId) {
  if (!raw || typeof raw !== 'object') return null;
  const required = ['coreMeaning', 'symbolism', 'upright', 'reversed', 'love', 'career', 'advice'];
  const sections = {};
  for (const key of required) {
    if (typeof raw[key] !== 'string' || raw[key].trim().length < 10) {
      return null;
    }
    sections[key] = raw[key].trim();
  }
  return {
    cardId,
    source: 'generated',
    sections
  };
}

export async function buildCardExplanation({ cardId, level, context, cache, externalGenerator }) {
  const card = getCardById(cardId);
  if (!card) return null;

  const cacheKey = `explain:${cardId}:${level}:${context || ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, source: 'cache' };

  let generated = null;
  if (externalGenerator) {
    generated = await externalGenerator(card, level, context);
  }

  const normalized = normalizeExternalSections(generated, cardId);
  const finalValue = normalized ?? buildFallbackExplanation(card, level, context);
  cache.set(cacheKey, finalValue);
  return finalValue;
}

export function chooseReadingExperimentVariant(seed = '') {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return sum % 2 === 0 ? 'A' : 'B';
}

export function buildSpreadReading({
  card,
  spreadId = 'default',
  position,
  orientation,
  level = 'beginner',
  context = '',
  experimentVariant = 'A'
}) {
  const tone = SPREAD_READING_TEMPLATES[spreadId] ?? SPREAD_READING_TEMPLATES.default;
  const style = READING_STYLE_AB[level]?.[experimentVariant] ?? READING_STYLE_AB[level]?.A;
  const focus = tone.positionFocus[position.name] ?? tone.defaultFocus;
  const contextProfile = inferContextProfile(context);
  const seed = `${spreadId}:${position.name}:${card.id}:${orientation}:${context}:${experimentVariant}:${level}`;
  const positionPrompt = tone.positionPrompts[position.name] ?? tone.defaultPrompt;
  const coreMessage = buildNaturalCoreMessage({
    spreadId,
    card,
    position,
    orientation,
    focus,
    context,
    contextProfile,
    seed,
    tone
  });
  const interpretation = buildTarotConsultingInterpretation({
    spreadId,
    card,
    position,
    orientation,
    focus,
    context,
    tone,
    positionPrompt,
    contextProfile,
    seed
  });

  const learningPoint = joinUniqueParts([
    `[학습 리더] ${buildLearningCoachOpening({ positionName: position.name, seed })}`,
    `[학습 리더] ${buildLearningCoachFrame({ style, seed })}`,
    `[학습 리더] ${buildLearningCoachReview({ positionName: position.name, contextProfile, style, seed })}`
  ]);

  return { interpretation, coreMessage, learningPoint };
}

export function buildSpreadInterpretation(args) {
  return buildSpreadReading(args).interpretation;
}

function joinUniqueParts(parts) {
  const used = new Set();
  const out = [];
  for (const part of parts) {
    if (typeof part !== 'string') continue;
    const trimmed = part.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase().replace(/[\s"'.,!?()[\]-]/g, '');
    if (!normalized || used.has(normalized)) continue;
    used.add(normalized);
    out.push(trimmed);
  }
  return out.join(' ');
}

function inferContextProfile(context = '') {
  const text = String(context || '').toLowerCase();
  const profiles = [
    {
      id: 'daily',
      keywords: ['오늘', '운세', '하루', '금일', '오늘의'],
      anchor: '오늘 가장 소모가 큰 구간 1개와 집중할 행동 1개를 먼저 정해야 합니다.',
      interpretationHint: '넓은 인생 해석보다 오늘 실제 일정에 바로 적용되는 조언을 우선해야 효과가 큽니다.',
      actionHint: '오늘 할 일 1개와 피할 소모 1개를 짝으로 정해 실천하세요.',
      trackMetric: '하루 집중 유지율과 감정 소모도'
    },
    {
      id: 'career',
      keywords: ['이직', '직장', '회사', '업무', '승진', '프로젝트', '커리어', '창업', '면접'],
      anchor: '현실 제약(시간/성과/역할)을 먼저 고정해야 합니다.',
      interpretationHint: '성과와 리스크를 같은 기준으로 비교해야 의사결정 오류를 줄일 수 있습니다.',
      actionHint: '일정과 책임 범위를 명확히 써서 실행하세요.',
      trackMetric: '성과 지표와 일정 준수율'
    },
    {
      id: 'relationship',
      keywords: ['연애', '관계', '재회', '결혼', '갈등', '썸', '감정', '소통', '상대'],
      anchor: '감정 사실과 기대를 분리해 표현 순서를 정해야 합니다.',
      interpretationHint: '상대 반응을 추정하기보다 관찰 가능한 대화 패턴을 기준으로 읽어야 정확합니다.',
      actionHint: '요청 1개와 경계 1개를 분명히 말하는 방식이 좋습니다.',
      trackMetric: '대화의 명확성 및 감정 소모도'
    },
    {
      id: 'finance',
      keywords: ['돈', '재정', '투자', '지출', '소비', '수입', '저축', '부채', '대출'],
      anchor: '현금흐름과 고정비를 먼저 확인해야 판단이 흔들리지 않습니다.',
      interpretationHint: '기대수익보다 손실 가능성과 유동성 리스크를 함께 읽어야 안전합니다.',
      actionHint: '지출 우선순위를 3단계로 나눠 즉시 조정하세요.',
      trackMetric: '지출 통제율과 손실 한도'
    },
    {
      id: 'study',
      keywords: ['공부', '시험', '학습', '자격증', '준비', '과제', '집중', '습관'],
      anchor: '학습량보다 반복 주기와 복기 품질을 먼저 고정해야 합니다.',
      interpretationHint: '지식 습득과 실전 적용을 분리해 읽으면 실행력이 올라갑니다.',
      actionHint: '25분 학습 1회와 5분 복기 1회를 묶어 수행하세요.',
      trackMetric: '반복 주기 유지율과 회상 정확도'
    },
    {
      id: 'health',
      keywords: ['건강', '컨디션', '수면', '운동', '다이어트', '피로', '회복'],
      anchor: '강도보다 회복 리듬을 우선 관리해야 반등 폭이 커집니다.',
      interpretationHint: '단기 의욕보다 지속 가능한 루틴 관점으로 해석해야 변동성이 줄어듭니다.',
      actionHint: '수면/활동/식사 중 하나만 먼저 안정화하세요.',
      trackMetric: '회복 체감도와 루틴 지속일'
    }
  ];

  for (const profile of profiles) {
    if (profile.keywords.some((keyword) => text.includes(keyword))) {
      return profile;
    }
  }

  return {
    id: 'general',
    anchor: '지금 가장 중요한 한 가지부터 정하면 흐름이 훨씬 선명해집니다.',
    interpretationHint: '카드 해석을 넓히기보다 현재 결정에 영향을 주는 현실 단서부터 잡아야 정확도가 올라갑니다.',
    actionHint: '지금 가능한 단일 행동으로 축소해 바로 실행하세요.',
    trackMetric: '실행 완료 여부와 체감 변화'
  };
}

function buildNaturalCoreMessage({
  spreadId,
  card,
  position,
  orientation,
  focus,
  context,
  contextProfile,
  seed,
  tone
}) {
  if (spreadId === 'yearly-fortune' && isYearlyMonthPosition(position.name)) {
    return buildYearlyMonthCoreMessage({ card, position, orientation, context, seed });
  }
  if (spreadId === 'one-card') {
    return buildOneCardCoreMessage({ card, orientation, context });
  }
  const cardDirection = orientation === 'upright' ? '정방향' : '역방향';
  const mainKeyword = card.keywords?.[0] ?? '흐름';
  const mainKeywordSubject = withKoreanParticle(mainKeyword, '이', '가');
  const contextLead = buildClientEmpathyLine({ context, seed });
  const cardLine = `뽑으신 카드는 '${card.nameKo} ${cardDirection}'입니다.`;
  const meaningLine = orientation === 'upright'
    ? `${card.nameKo}의 핵심 키워드인 ${mainKeywordSubject} 열려 있어서 ${focus}에 힘을 실어주기 좋은 타이밍입니다.`
    : `${card.nameKo}의 핵심 키워드인 ${mainKeywordSubject} 잠시 막혀 있어서 ${focus}에서는 속도를 조금 늦추고 차분히 조정해보시는 편이 좋겠습니다.`;
  const adviceLine = buildTarotAdviceLine({ contextProfile, tone, orientation, seed });
  const raw = joinUniqueParts([contextLead, cardLine, meaningLine, adviceLine]);
  return polishCoreMessage(raw);
}

function buildTarotConsultingInterpretation({
  spreadId,
  card,
  position,
  orientation,
  focus,
  context,
  tone,
  positionPrompt,
  contextProfile,
  seed
}) {
  if (spreadId === 'yearly-fortune' && isYearlyMonthPosition(position.name)) {
    return buildYearlyMonthInterpretation({ card, position, orientation, context, seed });
  }
  if (spreadId === 'one-card') {
    return buildOneCardInterpretation({ card, orientation, focus, context });
  }
  const spreadGuide = buildSpreadConsultingGuide({ spreadId, positionName: position.name, positionPrompt, seed });
  const orientationGuide = buildOrientationCounselLine({ cardName: card.nameKo, orientation, tone, seed });
  const keywordGuide = buildKeywordCounselLine({ card, focus, seed });
  const contextLine = buildCoreContextLine({ context, contextProfile, seed });
  const actionLine = buildTarotActionLine({ contextProfile, orientation, seed });
  return polishTarotInterpretation([spreadGuide, orientationGuide, keywordGuide, contextLine, actionLine].join(' '));
}

function buildOneCardInterpretation({ card, orientation, focus, context = '' }) {
  const group = detectOneCardQuestionGroup(context);
  const risk = scoreOneCardRiskLight({ card, orientation });
  const main = card.keywords?.[0] ?? '흐름';
  const sub = card.keywords?.[1] ?? main;
  const third = card.keywords?.[2] ?? sub;
  const subObject = withKoreanParticle(sub, '을', '를');
  const subSubject = withKoreanParticle(sub, '이', '가');
  const evidence = buildOneCardEvidenceLine({
    group,
    orientation,
    main,
    subSubject,
    subObject,
    focus
  });
  const evidenceWithSymbol = `${evidence} 카드 상징은 '${main}', '${sub}', '${third}'입니다.`;
  const comfort = buildOneCardComfortLine({ group, risk });
  const timing = buildOneCardTimingLine({ group, risk, orientation });
  const bridge = buildOneCardBridgeLine({ group, card, orientation, main, sub });
  const action = `실행 기준: ${buildOneCardExecutionHint({ context, group, card, orientation })}`;
  const outcome = buildOneCardOutcomeLine({ group, risk, orientation });
  return polishTarotInterpretation([comfort, evidenceWithSymbol, timing, action, outcome, bridge].join(' '));
}

function buildOneCardEvidenceLine({ group = 'general', orientation = 'upright', main = '흐름', subSubject = '흐름이', subObject = '흐름을', focus = '핵심 포인트' }) {
  const mainSubject = withKoreanParticle(main, '이', '가');
  if (group === 'contact') {
    const contactMain = CONTACT_KEYWORD_TONE[main] ?? main;
    return orientation === 'upright'
      ? `근거 키워드는 '${main}'이고, ${contactMain} 흐름이 열려 있어 전달 의도를 차분히 정리하기 좋은 구간입니다.`
      : `근거 키워드는 '${main}'이고, ${contactMain} 흐름이 흔들리면 말이 길어지거나 오해가 생기기 쉬워서 ${subObject} 먼저 정리한 뒤 전달하는 편이 좋겠습니다.`;
  }
  if (group === 'exercise') {
    return orientation === 'upright'
      ? `근거 키워드는 '${main}'이고, ${mainSubject} 열려 있어 몸을 움직일 동력을 만들기 좋으며 ${subSubject} 운동 리듬을 안정적으로 이어가게 도와줍니다.`
      : `근거 키워드는 '${main}'이고, ${mainSubject} 흔들리면 시작을 미루기 쉬워서 ${subObject} 기준으로 강도를 낮춰 먼저 몸을 깨우는 편이 좋겠습니다.`;
  }
  return orientation === 'upright'
    ? `근거 키워드는 '${main}'이고, ${mainSubject} 열려 있어 ${focus}에 힘을 실어주기 좋으며 ${subSubject} 다음 행동 방향을 잡아줍니다.`
    : `근거 키워드는 '${main}'이고, ${mainSubject} 막혀 있어 ${focus}에서는 속도 조절이 필요해 ${subObject} 기준으로 먼저 정비하는 편이 좋겠습니다.`;
}

function buildOneCardCoreMessage({ card, orientation, context = '' }) {
  const cardDirection = orientation === 'upright' ? '정방향' : '역방향';
  const normalizedContext = normalizeClientQuestion(context);
  const group = detectOneCardQuestionGroup(context);
  const verdict = buildOneCardDecisionLine({ group, card, orientation });
  const empathy = normalizedContext
    ? `"${normalizedContext}"를 두고 망설이고 계시군요.`
    : '지금 선택을 두고 망설이는 지점을 점검하고 계시군요.';
  const lead = normalizedContext
    ? `카드는 '${card.nameKo} ${cardDirection}'입니다.`
    : `뽑으신 카드는 '${card.nameKo} ${cardDirection}'입니다.`;
  return `${empathy} ${lead} ${verdict}`.trim();
}

function buildOneCardExecutionHint({ context = '', group = 'general', card, orientation = 'upright' }) {
  const risk = scoreOneCardRiskLight({ card, orientation });
  if (group === 'caffeine') {
    if (risk >= 2) return '오늘은 커피를 미루거나 디카페인으로 바꿔보세요. 물 먼저 마시고 컨디션을 체크한 뒤, 내일 다시 판단해도 늦지 않아요.';
    if (risk === 1) return '한 잔만 가볍게 드시고, 늦은 시간 추가 카페인은 피하는 쪽이 좋아요.';
    return '지금은 마셔도 괜찮아 보이는 흐름이에요. 그래도 평소 범위 안에서만 드셔보세요.';
  }
  if (group === 'exercise') {
    if (card?.id === 'minor-cups-two' && orientation === 'reversed') {
      return '망설임을 끊는 게 핵심입니다. 5~10분 스트레칭이나 가벼운 걷기부터 바로 시작해 보세요.';
    }
    if (risk >= 2) return '오늘은 강한 운동보다 회복 루틴(20~30분)으로 가볍게 가는 쪽이 안전해요.';
    if (risk === 1) return '운동은 가능해요. 다만 강도는 평소의 70% 정도로 낮춰서 진행해 보세요.';
    return '시작 10분만 천천히 몸 상태를 확인한 뒤 평소 루틴으로 이어가 보세요.';
  }
  if (group === 'contact') {
    const adjustedRisk = adjustContactRisk({ card, orientation, baseRisk: risk });
    if (adjustedRisk >= 2) return '지금은 바로 보내기보다 문장을 정리해 한 템포 늦춰 보내고, 24시간 뒤 다시 판단하는 기준을 잡아보세요.';
    if (adjustedRisk === 1) return '연락은 가능하지만 먼저 한 번만 보내고, 추가 메시지는 상대 반응을 본 뒤 이어가 보세요.';
    return '먼저 연락한 뒤에는 연속 메시지보다 상대 반응 템포를 지켜보는 쪽이 좋아요.';
  }
  if (group === 'payment') {
    if (risk >= 2) return '결제는 오늘 미루고 금액·필요성·대안을 먼저 점검해 보세요. 하루 뒤 다시 봐도 충분해요.';
    if (risk === 1) return '소액·필수 항목만 먼저 진행하고, 큰 금액은 하루 더 검토해 보세요.';
    return '예산 한도를 먼저 정한 뒤 진행해 보세요.';
  }
  return risk >= 2
    ? '결정을 한 템포 늦추고 소모를 줄이는 선택부터 해보세요.'
    : risk === 1
      ? '강도를 낮춰 작은 행동부터 시작해 보세요.'
      : '가능한 가장 작은 행동 1개를 바로 실행해 보세요.';
}

function detectOneCardQuestionGroup(context = '') {
  const normalized = String(context || '').toLowerCase();
  if (/(커피|카페인|에너지드링크|에너지 드링크|수면|잠)/.test(normalized)) return 'caffeine';
  if (/(운동|헬스|러닝|달리기|조깅|산책|근력|유산소|필라테스|요가)/.test(normalized)) return 'exercise';
  if (/(연락|문자|카톡|톡|dm|디엠|전화|답장|고백|메시지)/.test(normalized)) return 'contact';
  if (/(결제|구매|지출|주문|구독|환불|계약|할부|투자|송금|이체)/.test(normalized)) return 'payment';
  return 'general';
}

function buildOneCardDecisionLine({ group = 'general', card, orientation = 'upright' }) {
  const risk = scoreOneCardRiskLight({ card, orientation });
  if (group === 'caffeine') {
    if (risk >= 2) return '한 줄 결론은 금지 상태에 가까워요. 지금은 마시지 않는 쪽이 더 안전해 보여요.';
    if (risk === 1) return '한 줄 결론은 한 잔만 가능 상태예요. 추가 섭취는 피하는 쪽이 좋아요.';
    return '한 줄 결론은 완전 가능 상태예요. 지금 마셔도 괜찮아 보여요.';
  }
  if (group === 'exercise') {
    if (risk >= 2) return '한 줄 결론은 보류 상태에 가까워요. 오늘은 강한 운동을 피하는 편이 좋아요.';
    if (risk === 1) return '한 줄 결론은 조건부 가능 상태예요. 강도를 낮추면 진행 가능해 보여요.';
    return '한 줄 결론은 완전 가능 상태예요. 지금 시작해도 괜찮아 보여요.';
  }
  if (group === 'contact') {
    const adjustedRisk = adjustContactRisk({ card, orientation, baseRisk: risk });
    if (adjustedRisk >= 2) return '한 줄 결론은 보류 상태에 가까워요. 지금은 바로 연락하지 않는 편이 더 안전해 보여요.';
    if (adjustedRisk === 1) return '한 줄 결론은 조건부 가능 상태예요. 흐름이 바뀌는 구간이라 1회 연락 후 반응을 보는 편이 좋아 보여요.';
    return '한 줄 결론은 완전 가능 상태예요. 지금 연락해도 괜찮아 보여요.';
  }
  if (group === 'payment') {
    if (risk >= 2) return '한 줄 결론은 보류 상태에 가까워요. 지금 결제는 미루는 편이 좋아 보여요.';
    if (risk === 1) return '한 줄 결론은 조건부 가능 상태예요. 소액/필수 결제만 먼저 권장돼요.';
    return '한 줄 결론은 완전 가능 상태예요. 예산 범위 안이라면 진행해도 괜찮아 보여요.';
  }
  if (risk >= 2) return '한 줄 결론은 보류 상태에 가까워요.';
  if (risk === 1) return '한 줄 결론은 조건부 가능 상태예요.';
  return orientation === 'upright' ? '한 줄 결론은 완전 가능 상태예요.' : '한 줄 결론은 보류 상태에 가까워요.';
}

function scoreOneCardRiskLight({ card, orientation = 'upright' }) {
  let score = orientation === 'reversed' ? 1 : 0;
  const riskyIds = new Set(['major-15', 'major-16', 'major-18', 'minor-swords-ten', 'minor-swords-nine', 'minor-cups-five']);
  if (riskyIds.has(card?.id)) score += 1;
  const keywords = (card?.keywords || []).map((k) => String(k || '').toLowerCase());
  if (keywords.some((k) => /(붕괴|급변|속박|유혹|집착|혼란|불안|갈등|상실|소모)/.test(k))) score += 1;
  if (score >= 2) return 2;
  if (score >= 1) return 1;
  return 0;
}

function buildOneCardBridgeLine({ group = 'general', card, orientation = 'upright', main = '흐름', sub = '흐름' }) {
  const subTo = withKoreanParticle(sub, '으로', '로');
  const mainSubject = withKoreanParticle(main, '이', '가');
  const cardBaseBridge = buildCardUniversalBridgeLine({ card, orientation, main, sub });
  if (group === 'contact') {
    if (card?.id === 'major-19') {
      return orientation === 'reversed'
        ? '태양 역방향은 의도는 좋지만 전달이 과하거나 어긋날 수 있다는 신호라, 짧고 명확한 1회 메시지 전략이 맞습니다.'
        : '태양 정방향은 진심 전달력이 살아나는 카드라, 핵심을 짧게 전하면 대화 흐름이 비교적 부드럽게 이어질 수 있습니다.';
    }
    if (card?.id === 'major-10') {
      return orientation === 'reversed'
        ? '운명의 수레바퀴 역방향은 타이밍이 어긋나기 쉬운 신호라, 지금은 속도를 낮추고 반응을 기다리는 편이 안전합니다.'
        : '운명의 수레바퀴 정방향은 흐름이 전환되는 타이밍이라, 한 번의 명확한 신호를 보낸 뒤 반응을 보는 전략이 잘 맞습니다.';
    }
    return orientation === 'upright'
      ? `${cardBaseBridge} 연락 질문에서는 '${main}'에서 ${subTo} 자연스럽게 이어지는 흐름이라, 짧고 분명한 메시지가 효과적입니다.`
      : `${cardBaseBridge} 연락 질문에서는 '${main}' 신호가 예민해 오해가 생기기 쉬우니, 무리한 장문보다 핵심 한 문장으로 확인하는 편이 안전합니다.`;
  }
  if (group === 'exercise') {
    if (card?.id === 'minor-cups-two') {
      return orientation === 'reversed'
        ? '컵 2 역방향은 멈춰 있던 리듬을 다시 잇는 신호로 볼 수 있어, 완벽한 컨디션을 기다리기보다 작게라도 바로 시작하는 선택이 맞습니다.'
        : '컵 2 정방향은 몸과 마음의 조화를 되찾기 좋은 흐름이라, 무리 없는 강도로 시작하면 운동 루틴을 이어가기 좋습니다.';
    }
    return orientation === 'upright'
      ? `${cardBaseBridge} 운동 질문에서는 '${main}'에서 ${subTo} 자연스럽게 이어지는 구간이라, 작은 시작이 실제 리듬으로 연결되기 쉽습니다.`
      : `${cardBaseBridge} 운동 질문에서는 '${main}' 신호가 흔들리기 쉬우니, 완벽한 계획보다 짧고 가벼운 시작으로 리듬부터 다시 붙이는 편이 안전합니다.`;
  }
  if (group !== 'caffeine') {
    return orientation === 'upright'
      ? `${cardBaseBridge} 지금은 '${main}'에서 ${subTo} 자연스럽게 넘어가는 구간이라 과하게만 하지 않으면 흐름을 살릴 수 있습니다.`
      : `${cardBaseBridge} 지금은 '${main}' 신호가 예민한 구간이라 무리한 추진보다 '${sub}' 기준으로 리듬을 정리하는 편이 안전합니다.`;
  }

  if (card?.id === 'minor-cups-four') {
    return orientation === 'reversed'
      ? '컵 4 역방향은 반복된 루틴의 권태에서 벗어나려는 신호라, 자극을 늘리기보다 방식만 가볍게 바꾸는 선택이 맞습니다.'
      : '컵 4 정방향은 무의식적 습관 소비를 경고하므로, 단순 각성 목적의 추가 섭취는 줄이는 편이 좋습니다.';
  }
  if (card?.id === 'major-14') {
    return '절제 카드는 균형과 용량 조절을 강조하므로, 핵심은 많이 마시는 것보다 양을 통제하는 데 있습니다.';
  }
  if (card?.id === 'major-15') {
    return '악마 카드는 습관 의존 신호를 함께 주므로, 즉각적인 각성보다 끊어내는 선택이 장기적으로 더 유리합니다.';
  }
  if (card?.id === 'major-16') {
    return '탑 카드는 급변/과부하 리스크를 시사하므로, 카페인 추가는 컨디션 흔들림으로 이어질 가능성을 먼저 봐야 합니다.';
  }
  return orientation === 'upright'
    ? `커피 질문에서는 ${mainSubject} 열린 상태라 소량은 괜찮지만, '${sub}' 기준으로 양을 통제하는 편이 가장 안정적입니다.`
    : `커피 질문에서는 ${mainSubject} 막힌 상태라 추가 섭취보다 회복을 먼저 두고, '${sub}' 기준으로 리듬을 정리하는 편이 좋습니다.`;
}

function buildCardUniversalBridgeLine({ card, orientation = 'upright', main = '흐름', sub = '흐름' }) {
  const cardName = card?.nameKo || '이 카드';
  if (card?.arcana === 'major') {
    const theme = MAJOR_CARD_BRIDGE_THEME[card?.id] ?? '큰 방향 전환';
    return orientation === 'upright'
      ? `${cardName} 정방향은 ${theme} 쪽 에너지가 살아 있다는 신호입니다.`
      : `${cardName} 역방향은 ${theme} 구간에서 속도 조절이 필요하다는 신호입니다.`;
  }

  const suit = card?.suit || '';
  const rank = card?.rank || '';
  const suitTheme = MINOR_SUIT_BRIDGE_THEME[suit] ?? '일상 운영';
  const rankTheme = MINOR_RANK_BRIDGE_THEME[rank] ?? '실행 단계';
  return orientation === 'upright'
    ? `${cardName} 정방향은 ${suitTheme} 영역에서 ${rankTheme} 흐름이 비교적 매끄럽게 이어지는 신호입니다.`
    : `${cardName} 역방향은 ${suitTheme} 영역에서 ${rankTheme} 흐름이 흔들릴 수 있어 조절이 필요하다는 신호입니다.`;
}

const CONTACT_KEYWORD_TONE = {
  통제: '감정 균형',
  집중: '핵심 전달',
  판단: '의도 정리',
  의사소통: '대화 연결',
  열정: '전달 에너지',
  추진력: '연락 실행력'
};

function buildOneCardComfortLine({ group = 'general', risk = 1 }) {
  if (risk < 2) return '';
  if (group === 'contact') {
    return '지금 "아니오/보류" 쪽으로 보인다고 해서 너무 실망하지 않으셔도 괜찮아요.';
  }
  if (group === 'caffeine') {
    return '지금 "보류"가 나와도 몸 상태를 지키기 위한 신호로 받아들이면 좋아요.';
  }
  return '지금은 멈춤 신호가 나와도, 타이밍 조절을 위한 안내라고 받아들이시면 돼요.';
}

function buildOneCardTimingLine({ group = 'general', risk = 1, orientation = 'upright' }) {
  if (group === 'contact') {
    if (risk >= 2) return '지금은 감정 해석보다 상황 정리를 먼저 하고 타이밍을 늦추는 편이 더 안정적일 가능성이 높아요.';
    if (risk === 1) return '지금은 반응을 확인하며 템포를 가져가는 전략이 관계 손상을 줄일 가능성이 높아요.';
    return '타이밍은 나쁘지 않아 보여요. 먼저 신호를 주면 대화 흐름이 열릴 가능성이 높아요.';
  }
  if (risk >= 2) {
    return '지금은 강하게 밀기보다 타이밍을 하루 정도 늦추는 쪽이 더 안정적일 가능성이 높아요.';
  }
  if (risk === 1) {
    return '지금은 "짧게/작게/한 번만" 원칙을 지키면 흐름을 안전하게 이어갈 가능성이 높아요.';
  }
  if (group === 'exercise') return '타이밍은 좋아 보여요. 작게 시작하면 몸 리듬이 생각보다 빨리 붙을 수 있어요.';
  if (group === 'payment') return '타이밍은 무난해 보여요. 예산 기준만 지키면 안정적으로 진행될 가능성이 높아요.';
  if (group === 'caffeine') return '타이밍은 무난해 보여요. 적정량만 지키면 집중 흐름을 유지하기 쉬울 수 있어요.';
  return orientation === 'upright'
    ? '지금 타이밍은 비교적 열려 있어, 작은 실행이 결과로 이어질 가능성이 높아요.'
    : '지금 타이밍은 변동이 있어, 속도를 조절하면 결과 안정성이 높아질 가능성이 있어요.';
}

function buildOneCardOutcomeLine({ group = 'general', risk = 1, orientation = 'upright' }) {
  if (group === 'contact') {
    if (risk >= 2) return '지금은 템포를 늦추는 선택이 대화 손상을 줄일 가능성이 높습니다.';
    if (risk === 1) return '한 번 신호를 보내고 반응을 보는 방식이 오해를 줄이면서 대화 흐름을 살릴 가능성이 높습니다.';
    return '지금 흐름에서는 관계 대화가 부드럽게 이어질 가능성이 비교적 높습니다.';
  }
  if (group === 'exercise') {
    if (risk >= 2) return '강도를 조절해 시작하면 무리 없이 운동 리듬을 회복할 가능성이 높습니다.';
    if (risk === 1) return '가벼운 시작만 지키면 운동 흐름이 끊기지 않고 이어질 가능성이 높습니다.';
    return '지금은 시작 동력이 붙기 쉬운 구간이라 루틴을 안정적으로 이어갈 가능성이 높습니다.';
  }
  if (group === 'payment') {
    if (risk >= 2) return '지금은 보류 후 점검할수록 후회 비용을 줄일 가능성이 높습니다.';
    if (risk === 1) return '소액·필수 기준을 지키면 불필요 지출을 줄일 가능성이 높습니다.';
    return '예산 기준을 지키면 만족도와 통제감을 함께 가져갈 가능성이 높습니다.';
  }
  if (group === 'caffeine') {
    if (risk >= 2) return '추가 섭취를 줄이면 컨디션 흔들림을 막을 가능성이 높습니다.';
    if (risk === 1) return '한 잔 기준만 지키면 집중 유지와 과자극 회피를 함께 가져갈 수 있습니다.';
    return '적정량을 지키면 집중 흐름을 안정적으로 가져갈 가능성이 높습니다.';
  }
  if (risk >= 2 || orientation === 'reversed') {
    return '속도 조절을 우선하면 결과 변동성을 줄일 가능성이 높습니다.';
  }
  return '지금은 작게 시작해도 긍정적인 흐름으로 이어질 가능성이 높습니다.';
}

function adjustContactRisk({ card, orientation = 'upright', baseRisk = 0 }) {
  if (card?.id === 'major-10' && orientation === 'upright') {
    return Math.max(baseRisk, 1);
  }
  return baseRisk;
}

const MAJOR_CARD_BRIDGE_THEME = {
  'major-0': '새로운 시작과 실험',
  'major-1': '의지와 실행 주도권',
  'major-2': '직관과 내면 정리',
  'major-3': '돌봄과 안정적 확장',
  'major-4': '구조와 통제',
  'major-5': '기준·규칙 정립',
  'major-6': '선택과 관계 균형',
  'major-7': '추진력과 방향성',
  'major-8': '자기 통제와 인내',
  'major-9': '거리 두기와 점검',
  'major-10': '변화 주기와 전환',
  'major-11': '균형 판단과 책임',
  'major-12': '관점 전환과 멈춤',
  'major-13': '종료와 재시작',
  'major-14': '조율과 균형',
  'major-15': '의존·유혹 관리',
  'major-16': '급변과 재정비',
  'major-17': '희망과 회복',
  'major-18': '불확실성 점검',
  'major-19': '명료함과 활력',
  'major-20': '평가와 재정렬',
  'major-21': '완결과 통합'
};

const MINOR_SUIT_BRIDGE_THEME = {
  Wands: '행동/에너지',
  Cups: '감정/관계',
  Swords: '판단/소통',
  Pentacles: '현실/지속성'
};

const MINOR_RANK_BRIDGE_THEME = {
  Ace: '시작',
  Two: '균형',
  Three: '협업/전개',
  Four: '유지/정비',
  Five: '마찰/조정',
  Six: '회복',
  Seven: '점검',
  Eight: '반복/숙련',
  Nine: '마무리 조율',
  Ten: '과부하/완결',
  Page: '탐색',
  Knight: '추진',
  Queen: '안정 운영',
  King: '통합 관리'
};

function isYearlyMonthPosition(positionName = '') {
  return /^([1-9]|1[0-2])월$/.test(String(positionName || ''));
}

function buildYearlyMonthCoreMessage({ card, position, orientation, context = '', seed = '' }) {
  const month = position.name;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const keyword = card.keywords?.[0] ?? '흐름';
  const yearlyIntent = inferYearlyIntent(context);
  const jobTimingQuestion = yearlyIntent === 'career';
  const intro = jobTimingQuestion
    ? `${normalizeClientQuestion(context)}를 고민하고 계셔서 ${month} 흐름부터 차분히 살펴보겠습니다.`
    : buildClientEmpathyLine({ context, seed });
  const cardLine = `${month} 카드로는 '${card.nameKo} ${direction}'이 나왔습니다.`;
  const insight = buildYearlyMonthInsight({ month, orientation, keyword, yearlyIntent });
  const timingLine = jobTimingQuestion
    ? (orientation === 'upright'
        ? `취직 시기를 묻는 질문이라면 ${month}은 비교적 편안하게 움직여볼 수 있는 달에 가깝습니다.`
        : `취직 시기를 묻는 질문이라면 ${month}은 서두르기보다 정비와 보완에 무게를 두기 좋은 달에 가깝습니다.`)
    : '';
  return polishCoreMessage(joinUniqueParts([intro, cardLine, insight, timingLine]));
}

function buildYearlyMonthInterpretation({ card, position, orientation, context = '', seed = '' }) {
  const month = position.name;
  const yearlyIntent = inferYearlyIntent(context);
  const jobTimingQuestion = yearlyIntent === 'career';
  const monthRole = MONTH_ROLE_GUIDE[month] ?? '연간 흐름 안에서 해당 달의 체감 강약을 보여주는 포지션';
  const keywordA = card.keywords?.[0] ?? '흐름';
  const keywordB = card.keywords?.[1] ?? keywordA;
  const keywordBWithParticle = withKoreanParticle(keywordB, '으로', '로');
  const orientationLine = buildYearlyMonthOrientationLine({
    month,
    cardName: card.nameKo,
    orientation,
    yearlyIntent
  });
  const timingLine = jobTimingQuestion
    ? (orientation === 'upright'
        ? `취직 시기 관점에서는 ${month}을 지원이나 면접을 조금 더 늘려보는 달로 활용하시고, 부족한 부분은 직전 달에 미리 보완해 두시면 좋겠습니다.`
        : `취직 시기 관점에서는 ${month}을 결과를 서두르는 달로 보기보다 이력서, 포트폴리오, 면접 답변을 차분히 다듬는 준비 달로 두시는 편이 좋겠습니다.`)
    : `이 달은 ${keywordA}에서 ${keywordBWithParticle} 넘어가는 연결 구간이므로, 한 번에 크게 벌리기보다 우선순위를 좁혀 실행하시면 흔들림이 줄어듭니다.`;
  const close = `요약하면 ${month}은 ${monthRole}로 보이고, 지금은 ${orientation === 'upright' ? '작게 시작해 흐름을 살리는 방식' : '정비를 먼저 하고 천천히 전진하는 방식'}이 가장 무리가 적은 선택입니다.`;
  return polishTarotInterpretation([orientationLine, timingLine, close].join(' '));
}

function inferYearlyIntent(context = '') {
  const text = String(context || '').toLowerCase();
  if (/(취직|취업|이직|입사|지원|면접|커리어|직장|회사)/.test(text)) return 'career';
  if (/(연애|관계|재회|결혼|상대|썸)/.test(text)) return 'relationship';
  if (/(재정|돈|지출|수입|저축|투자|소비|자산)/.test(text)) return 'finance';
  return 'general';
}

function buildYearlyMonthInsight({ month, orientation, keyword, yearlyIntent }) {
  const map = {
    career: orientation === 'upright'
      ? `${month}은 ${keyword} 흐름이 비교적 열리는 달이라, 준비된 건은 실제 지원이나 면접 단계로 옮겨보셔도 좋겠습니다.`
      : `${month}은 ${keyword} 흐름이 잠시 걸릴 수 있는 달이라, 서두르기보다 준비도를 높여두는 쪽이 결과적으로 더 좋겠습니다.`,
    relationship: orientation === 'upright'
      ? `${month}은 ${keyword} 흐름이 비교적 열리는 달이라, 마음을 전하는 대화가 생각보다 부드럽게 풀릴 가능성이 큽니다.`
      : `${month}은 ${keyword} 흐름이 주춤할 수 있어, 감정 표현의 속도를 조금 낮추고 오해를 줄이는 대화가 더 중요하겠습니다.`,
    finance: orientation === 'upright'
      ? `${month}은 ${keyword} 흐름이 비교적 열리는 달이라, 계획한 지출과 수입 관리를 차분히 실행하기 좋은 시기입니다.`
      : `${month}은 ${keyword} 흐름이 흔들릴 수 있어, 지출 통제와 우선순위 재정비를 먼저 하시는 편이 좋겠습니다.`,
    general: orientation === 'upright'
      ? `${month}은 ${keyword} 흐름이 비교적 열리는 달이라, 계획해둔 일을 조금 더 진행해보셔도 괜찮습니다.`
      : `${month}은 ${keyword} 흐름이 잠시 걸리는 달이라, 속도를 낮추고 정비 후 움직이시는 편이 안정적입니다.`
  };
  return map[yearlyIntent] ?? map.general;
}

function buildYearlyMonthOrientationLine({ month, cardName, orientation, yearlyIntent }) {
  if (yearlyIntent === 'career') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 흐름이 비교적 열리는 구간이라는 뜻이라, 준비된 일은 실제 행동으로 옮겼을 때 반응이 따라올 가능성이 큽니다.`
      : `${month}의 ${cardName} 역방향은 진행 중인 선택의 마찰을 점검하라는 신호라, 먼저 정리하고 보완해둘수록 다음 달 전개가 더 편안해집니다.`;
  }
  if (yearlyIntent === 'relationship') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 관계 흐름이 열리는 신호라, 솔직한 대화가 관계를 앞으로 밀어줄 가능성이 큽니다.`
      : `${month}의 ${cardName} 역방향은 감정 해석이 엇갈리기 쉬운 구간이라, 단정하기보다 확인 대화를 먼저 거치는 편이 좋습니다.`;
  }
  if (yearlyIntent === 'finance') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 재정 운영이 비교적 안정되는 구간이라, 계획 기반 실행이 효과를 내기 좋습니다.`
      : `${month}의 ${cardName} 역방향은 지출/판단 흔들림을 경고하는 신호라, 확장보다 손실 방어를 먼저 두는 편이 좋겠습니다.`;
  }
  return orientation === 'upright'
    ? `${month}의 ${cardName} 정방향은 흐름이 상대적으로 열리는 구간이라, 실행 반경을 조금 넓혀도 괜찮습니다.`
    : `${month}의 ${cardName} 역방향은 속도 조절과 정비가 먼저라는 신호라, 마찰 요인을 줄이고 움직이는 편이 좋습니다.`;
}

const MONTH_ROLE_GUIDE = {
  '1월': '출발 전에 기준과 방향을 세우는 자리',
  '2월': '초기 적응 리듬을 맞추는 자리',
  '3월': '초기 실행의 반응을 확인하는 자리',
  '4월': '실행 범위를 조절해 확장 여부를 판단하는 자리',
  '5월': '변수와 마찰을 조정하는 자리',
  '6월': '상반기 성과와 보완점을 정리하는 자리',
  '7월': '하반기 시작 전에 리듬을 재정비하는 자리',
  '8월': '중반 추진력을 회복해 실행을 늘리는 자리',
  '9월': '성과와 피로를 함께 조율하는 자리',
  '10월': '리스크를 점검해 마무리 계획을 세우는 자리',
  '11월': '수확 구간의 완성도를 높이는 자리',
  '12월': '연말 정리와 다음 해 전환을 준비하는 자리'
};

function buildClientEmpathyLine({ context = '', seed = '' }) {
  const normalized = normalizeClientQuestion(context);
  if (!normalized) return '지금 마음이 흔들리는 지점을 확인하고 싶으셔서 카드를 펼치셨군요.';
  const lines = [
    `"${normalized}"를 고민하고 계시는군요.`,
    `"${normalized}"가 궁금하셔서 지금 흐름을 차분히 확인해보고 싶으신 거군요.`,
    `"${normalized}"를 기준으로 어떤 방향이 무리가 적은지 살펴보시려는 상황으로 읽힙니다.`
  ];
  return pickVariant(`${seed}:client-empathy`, lines);
}

function normalizeClientQuestion(context = '') {
  return String(context || '').trim().replace(/[.!?]+$/g, '');
}

function buildTarotAdviceLine({ contextProfile, tone, orientation, seed }) {
  const direction = orientation === 'upright'
    ? '지금은 작은 시도를 해보셔도 괜찮습니다.'
    : '지금은 무리하게 밀기보다 컨디션과 리듬을 먼저 회복하시는 편이 좋겠습니다.';
  const clientActionHint = buildClientActionHint(contextProfile);
  const clientAnchorHint = buildClientAnchorHint(contextProfile);
  const lines = [
    `${direction} ${clientActionHint}`,
    `${direction} ${tone.defaultPrompt}`,
    `${direction} 오늘은 ${clientAnchorHint}`
  ];
  return pickVariant(`${seed}:tarot-advice`, lines);
}

function buildSpreadConsultingGuide({ spreadId, positionName, positionPrompt, seed }) {
  const map = {
    'one-card': [
      '원카드는 길게 늘어놓기보다 지금 필요한 결론을 또렷하게 받아들이는 리딩입니다.',
      '이 한 장은 오늘의 선택을 가볍게 밀어줄지, 잠깐 멈출지를 정해주는 신호로 보시면 됩니다.'
    ],
    'daily-fortune': [
      '오늘 운세 리딩은 예언보다 하루 페이스를 어떻게 운영할지 정하는 데 의미가 있습니다.',
      '하루 리딩에서는 무엇을 할지와 무엇을 줄일지를 같이 잡을 때 체감이 분명해집니다.'
    ],
    'choice-a-b': [
      '양자택일 리딩은 감정보다 유지 비용을 같이 봐야 후회가 줄어듭니다.',
      'A/B 리딩에서는 즉시 만족보다 오래 유지 가능한 쪽이 보통 더 안정적입니다.'
    ],
    'celtic-cross': [
      '켈틱 크로스는 한 장 한 장보다 전체 서사 흐름으로 읽을 때 정확해집니다.',
      '복합 이슈일수록 현재의 긴장과 결과 흐름을 한 줄로 연결해 보는 게 핵심입니다.'
    ]
  };
  const options = map[spreadId] ?? [
    `${positionName} 자리에서는 ${positionPrompt}`,
    `${positionName} 포지션은 ${positionPrompt}`
  ];
  return pickVariant(`${seed}:spread-guide`, options);
}

function buildOrientationCounselLine({ cardName, orientation, tone, seed }) {
  const lines = orientation === 'upright'
    ? [
      `${cardName}가 정방향으로 나왔다는 건 흐름이 열린 상태라는 뜻입니다. ${tone.uprightLine}`,
      `${cardName} 정방향은 지금 선택을 차분히 진행해도 된다는 신호입니다. ${tone.uprightLine}`
    ]
    : [
      `${cardName}가 역방향으로 나왔다는 건 에너지 누수를 먼저 막으라는 신호입니다. ${tone.reversedLine}`,
      `${cardName} 역방향은 '멈춤 후 정리'가 먼저라는 메시지에 가깝습니다. ${tone.reversedLine}`
    ];
  return pickVariant(`${seed}:orientation-counsel`, lines);
}

function buildKeywordCounselLine({ card, focus, seed }) {
  const main = card.keywords?.[0] ?? '핵심';
  const sub = card.keywords?.[1] ?? main;
  const focusWithParticle = withKoreanParticle(focus, '을', '를');
  const lines = [
    `${card.nameKo}는 '${main}'에서 '${sub}'으로 넘어가는 과정을 보여주니, 지금은 ${focusWithParticle} 선명하게 잡는 게 중요합니다.`,
    `카드 키워드를 풀어보면 '${main}'이 출발점이고 '${sub}'이 다음 단계입니다. ${focusWithParticle} 가볍게 정리하면 흐름이 살아납니다.`
  ];
  return pickVariant(`${seed}:keyword-counsel`, lines);
}

function buildTarotActionLine({ contextProfile, orientation, seed }) {
  const direction = orientation === 'upright'
    ? '오늘은 가볍게 한 걸음만 보태보세요.'
    : '오늘은 속도를 줄이고 몸과 마음을 먼저 챙겨보세요.';
  const clientActionHint = buildClientActionHint(contextProfile);
  const lines = [
    `${direction} ${clientActionHint}`,
    `${direction} 선택이 끝난 뒤에는 몸의 반응과 마음의 반응을 짧게 체크해 보세요.`,
    `${direction} 너무 완벽하게 하려 하지 말고, 오늘 가능한 선에서만 실천해도 충분합니다.`
  ];
  return pickVariant(`${seed}:tarot-action`, lines);
}

function buildClientActionHint(contextProfile) {
  const byProfile = {
    daily: '오늘 할 일 하나와 줄일 소모 하나만 정해보세요.',
    career: '지금 당장 잡을 우선순위 하나만 정하고 나머지는 잠시 내려두세요.',
    relationship: '내 감정과 요청을 한 문장으로 또렷하게 말해보세요.',
    finance: '오늘 한 번의 소비 선택만 더 신중하게 해보세요.',
    study: '지금 시작 가능한 가장 작은 분량부터 바로 해보세요.',
    health: '오늘은 회복에 도움이 되는 루틴 하나만 지켜보세요.'
  };
  return byProfile[contextProfile.id] ?? '지금 가능한 가장 작은 행동 하나부터 시작해보세요.';
}

function buildClientAnchorHint(contextProfile) {
  const byProfile = {
    daily: '무엇을 할지 하나, 무엇을 줄일지 하나만 정해두는 것이 좋겠습니다.',
    career: '현실적으로 가능한 범위를 먼저 정리해두는 것이 안전합니다.',
    relationship: '감정과 요청을 분리해서 말할 준비를 먼저 해두는 것이 좋겠습니다.',
    finance: '지출과 여유 자금의 균형부터 확인해두는 것이 좋겠습니다.',
    study: '욕심내기보다 오늘 끝낼 분량부터 정하는 것이 좋겠습니다.',
    health: '회복 리듬을 우선 챙기는 것이 가장 중요합니다.'
  };
  return byProfile[contextProfile.id] ?? '지금 가장 중요한 한 가지부터 정해두는 것이 좋겠습니다.';
}

function polishTarotInterpretation(raw = '') {
  let text = String(raw || '').replace(/\s+/g, ' ').trim();
  text = text
    .replace(/수렴/g, '정리')
    .replace(/기준점/g, '기준')
    .replace(/중심축/g, '중심 흐름')
    .replace(/결과축/g, '결과 흐름')
    .replace(/(^|[\s"'(])변수(?=([\s"'.,!?)]|$))/g, '$1요인')
    .replace(/(^|[\s"'(])축(?=([\s"'.,!?)]|$))/g, '$1기준');

  const sentences = splitSentences(text);
  if (sentences.length > 5) sentences.splice(5);
  let out = sentences.join(' ');
  if (out.length > 760) out = `${out.slice(0, 759).trim()}…`;
  return out;
}

function buildCoreContextLine({ context, contextProfile, seed }) {
  const lines = context?.trim()
    ? [
      `질문 "${context.trim()}"에 대입하면 ${contextProfile.anchor}`,
      `질문 맥락(${context.trim()})에서는 ${contextProfile.anchor}`,
      `이번 질문을 기준으로 보면 ${contextProfile.anchor}`
    ]
    : [
      `질문 맥락이 넓더라도 ${contextProfile.anchor}`,
      `맥락이 구체적이지 않아도 ${contextProfile.anchor}`
    ];
  return pickVariant(`${seed}:core-context`, lines);
}

function polishCoreMessage(raw = '') {
  let text = String(raw || '').replace(/\s+/g, ' ').trim();
  text = text
    .replace(/수렴/g, '정리')
    .replace(/기준점/g, '기준')
    .replace(/중심축/g, '중심 흐름')
    .replace(/결과축/g, '결과 흐름')
    // Replace standalone "변수" while avoiding suffix corruption in compounds.
    .replace(/(^|[\s"'(])변수(?=([\s"'.,!?)]|$))/g, '$1요인')
    // Replace standalone "축" while keeping compound nouns intact.
    .replace(/(^|[\s"'(])축(?=([\s"'.,!?)]|$))/g, '$1기준');

  const sentences = splitSentences(text);
  const minSentenceCount = 3;
  const maxSentenceCount = 4;
  const maxChars = 420;
  const fallback = '오늘은 하나만 정해서 가볍게 실행해보시면 흐름이 더 분명해집니다.';

  while (sentences.length < minSentenceCount) {
    sentences.push(fallback);
  }
  if (sentences.length > maxSentenceCount) {
    sentences.splice(maxSentenceCount);
  }

  let out = sentences.join(' ');
  while (out.length > maxChars && sentences.length > minSentenceCount) {
    sentences.pop();
    out = sentences.join(' ');
  }
  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars - 1).trim()}…`;
  }
  return out;
}

function splitSentences(text = '') {
  const chunks = String(text).match(/[^.!?]+[.!?]?/g) ?? [];
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

function buildLearningCoachOpening({ positionName, seed }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const lines = [
    `${positionName} 학습은 카드 해석보다 근거 기록이 먼저입니다.`,
    `${topic} 감으로 읽지 말고 증거 기반으로 훈련하세요.`,
    `${positionName} 복기에서는 맞고 틀림보다 판단 근거의 질을 보겠습니다.`,
    `${positionName} 학습 목표는 화려한 문장보다 재현 가능한 해석입니다.`
  ];
  return pickVariant(`${seed}:coach-open`, lines);
}

function buildLearningCoachFrame({ style, seed }) {
  const lines = [
    style.learningFrame,
    `훈련 프레임: ${style.learningFrame}`,
    `학습 루틴 권고: ${style.learningFrame}`,
    `이번 카드 학습 기준은 다음과 같습니다. ${style.learningFrame}`
  ];
  return pickVariant(`${seed}:coach-frame`, lines);
}

function buildLearningCoachReview({ positionName, contextProfile, style, seed }) {
  const lines = [
    `복기 질문: "${positionName} 판단을 ${contextProfile.trackMetric}로 점검했는가?"`,
    `체크 질문: "${positionName} 해석이 ${contextProfile.trackMetric} 변화로 확인됐는가?"`,
    `검증 질문: "${positionName} 리딩이 실제 ${contextProfile.trackMetric}에 어떤 차이를 만들었는가?"`
  ];
  return `${pickVariant(`${seed}:coach-review-q`, lines)} ${pickVariant(`${seed}:coach-review-step`, [style.reviewStep, `실행 후 검증: ${style.reviewStep}`])}`;
}

function withKoreanParticle(word = '', consonantParticle = '이', vowelParticle = '가') {
  const text = String(word || '').trim();
  if (!text) return word;
  const ch = text.charCodeAt(text.length - 1);
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  if (ch < HANGUL_START || ch > HANGUL_END) return `${text}${vowelParticle}`;
  const hasFinalConsonant = (ch - HANGUL_START) % 28 !== 0;
  return `${text}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}

function pickVariant(seed = '', variants = []) {
  if (!variants.length) return '';
  let score = 0;
  for (let i = 0; i < seed.length; i += 1) score += seed.charCodeAt(i);
  return variants[score % variants.length];
}

const READING_STYLE_AB = {
  beginner: {
    A: {
      uprightTail: '핵심은 행동을 단순화해 바로 시작하는 것입니다.',
      reversedTail: '핵심은 무리한 확장보다 손실을 줄이는 것입니다.',
      actionHint: '오늘 바로 실행 가능한 1단계 행동으로 줄이세요.',
      learningFrame: '사실(카드/포지션)과 해석(의미 추론)을 한 문장씩 분리해 기록하세요.',
      reviewStep: '24시간 뒤 결과를 맞음/부분맞음/다름으로 표시하고 한 줄 근거를 남기세요.'
    },
    B: {
      uprightTail: '핵심은 리듬을 유지하며 작은 성공을 누적하는 것입니다.',
      reversedTail: '핵심은 일정/감정 소모를 먼저 줄여 회복 구간을 확보하는 것입니다.',
      actionHint: '실행 후 체감 변화를 10점 척도로 기록하세요.',
      learningFrame: '키워드 3개 중 실제로 관찰된 증거 1개를 반드시 적어 과잉해석을 막으세요.',
      reviewStep: '다음 리딩 전, 지난 행동이 흐름을 바꿨는지 1문장으로 평가하세요.'
    }
  },
  intermediate: {
    A: {
      uprightTail: '핵심 변수와 보조 변수를 분리해 의사결정 밀도를 높이세요.',
      reversedTail: '원인-증상 분리 후 병목 변수 하나를 먼저 제거해야 합니다.',
      actionHint: '7일 단기 플랜과 30일 중기 플랜을 분리해 기록하세요.',
      learningFrame: '포지션별 가설을 세우고, 충돌하는 카드가 있으면 우선순위 규칙을 명시하세요.',
      reviewStep: '가설 적중률을 주간 단위로 측정해 다음 스프레드 해석 규칙을 보정하세요.'
    },
    B: {
      uprightTail: '카드 간 상호작용을 우선순위 테이블로 정리하면 정확도가 올라갑니다.',
      reversedTail: '역방향 신호는 구조적 리스크로 보고 완충 자원을 먼저 확보하세요.',
      actionHint: '가설-검증 루프를 다음 리딩 전까지 최소 1회 수행하세요.',
      learningFrame: '현재/근미래/결과를 시간축으로 분리하고 각 구간의 실패 비용을 추정하세요.',
      reviewStep: '복기 시 리딩 오류를 정보 부족/감정 편향/실행 누락 중 하나로 분류하세요.'
    }
  }
};

const SPREAD_READING_TEMPLATES = {
  'one-card': {
    uprightLine: '정방향이면 오늘 흐름을 가볍게 시작하되 우선순위는 분명히 잡는 편이 좋습니다.',
    reversedLine: '역방향이면 오늘은 속도를 줄이고 소모를 먼저 줄이는 편이 유리합니다.',
    defaultPrompt: '원카드는 오늘의 핵심 메시지를 한 문장으로 압축하는 데 가장 적합합니다.',
    defaultFocus: '오늘의 우선순위 한 가지',
    positionPrompts: {
      '핵심 메시지': '이 한 장은 오늘 가장 먼저 집중할 지점을 알려주는 신호입니다.'
    },
    positionFocus: {
      '핵심 메시지': '오늘의 우선순위 한 가지'
    }
  },
  'daily-fortune': {
    uprightLine: '정방향이면 오늘 일정은 비교적 매끄럽게 이어질 가능성이 큽니다.',
    reversedLine: '역방향이면 오늘은 중간 소모 구간을 미리 비워두는 편이 안정적입니다.',
    defaultPrompt: '일별 운세는 예측보다 하루 운영 전략을 정하는 데 쓰는 것이 좋습니다.',
    defaultFocus: '하루 운영 전략',
    positionPrompts: {
      '오늘의 흐름': '오늘의 흐름 카드는 하루 전반의 페이스를 정하는 기준입니다.',
      '주의할 점': '주의 카드는 피해야 할 소모 구간을 미리 알려주는 역할을 합니다.',
      '행동 조언': '행동 조언 카드는 오늘 반드시 실행할 단일 행동을 정하는 기준입니다.'
    },
    positionFocus: {
      '오늘의 흐름': '하루 페이스',
      '주의할 점': '소모 관리',
      '행동 조언': '즉시 실행'
    }
  },
  default: {
    uprightLine: '정방향이므로 강점을 빠르게 실행으로 연결하는 편이 유리합니다.',
    reversedLine: '역방향이므로 과잉/지연 요인을 먼저 줄여 흐름을 회복해야 합니다.',
    defaultPrompt: '이 포지션은 현재 전개에서 우선순위를 정하는 기준점입니다.',
    defaultFocus: '우선순위와 실행 순서',
    positionPrompts: {},
    positionFocus: {}
  },
  'three-card': {
    uprightLine: '정방향일 때는 다음 단계로 자연스럽게 연결됩니다.',
    reversedLine: '역방향일 때는 이전 단계의 미해결 과제가 병목이 됩니다.',
    defaultPrompt: '3단 흐름의 연결성을 확인해야 합니다.',
    defaultFocus: '시간 흐름상 병목과 전환 지점',
    positionPrompts: {
      과거: '과거 카드의 미해결 패턴이 현재 판단을 얼마나 끌어당기는지 확인하세요.',
      현재: '현재 카드가 문제의 중심 축이므로 나머지 카드는 보조 변수로 읽어야 합니다.',
      미래: '미래 카드는 확정이 아니라 현 선택을 유지했을 때의 유력 시나리오입니다.',
      문제: '문제 카드는 표면 증상보다 구조적 원인을 특정하는 데 집중합니다.',
      해결방법: '해결방법 카드는 실행 가능한 단일 행동으로 번역해야 효과가 큽니다.',
      조언: '조언 카드는 실행 순서를 정하는 기준으로 쓰는 것이 핵심입니다.'
    },
    positionFocus: {
      과거: '반복 패턴과 잔존 영향',
      현재: '핵심 변수와 즉시 대응',
      미래: '현 선택 유지 시 파급효과',
      문제: '원인 분해와 병목 확인',
      해결방법: '실행 단위와 시작 조건',
      조언: '우선순위 규칙'
    }
  },
  'choice-a-b': {
    uprightLine: '정방향은 선택지의 추진력이 살아 있다는 신호입니다.',
    reversedLine: '역방향은 그 선택지의 숨은 비용이나 지연 리스크를 시사합니다.',
    defaultPrompt: 'A/B는 같은 기준(시간, 비용, 감정 소모)으로 비교해야 정확합니다.',
    defaultFocus: '비교 기준의 일관성',
    positionPrompts: {
      '현재 상황': '현재 상황 카드는 판단 기준을 고정하는 앵커 역할을 합니다.',
      'A 선택 시 가까운 미래': 'A를 택했을 때 1~2주 내 체감될 변화를 우선 점검하세요.',
      'A 선택 시 결과': 'A의 결과 카드는 중기 성과와 후속 부담을 함께 읽어야 합니다.',
      'B 선택 시 가까운 미래': 'B를 택했을 때 초기 적응 비용과 반응 속도를 확인하세요.',
      'B 선택 시 결과': 'B의 결과 카드는 안정성/확장성 중 무엇이 강한지 비교 포인트입니다.'
    },
    positionFocus: {
      '현재 상황': '판단 기준과 현실 제약',
      'A 선택 시 가까운 미래': '초기 반응 속도와 마찰 비용',
      'A 선택 시 결과': '중기 성과와 유지 비용',
      'B 선택 시 가까운 미래': '초기 안정성과 적응 난이도',
      'B 선택 시 결과': '지속가능성과 확장 여지'
    }
  },
  'weekly-fortune': {
    uprightLine: '정방향은 해당 요일 구간의 흐름이 부드럽게 진행됨을 뜻합니다.',
    reversedLine: '역방향은 해당 구간에서 일정 완충과 우선순위 조정이 필요함을 뜻합니다.',
    defaultPrompt: '주간 리딩은 시간순 흐름으로 연결해서 읽어야 정확합니다.',
    defaultFocus: '시간대별 에너지 관리',
    positionPrompts: {
      '주간 테마': '주간 테마 카드는 이번 주 의사결정의 상위 기준입니다.',
      '월-화': '주 초반 카드에서 주간 페이스를 너무 빠르게 잡지 않는 것이 중요합니다.',
      '수-목': '중반 카드는 변수 대응력과 커뮤니케이션 품질을 점검하는 구간입니다.',
      금요일: '금요일 카드는 성과 확인과 마감 품질을 좌우합니다.',
      토요일: '토요일 카드는 회복/정비를 통해 다음 주 효율을 만드는 구간입니다.',
      일요일: '일요일 카드는 복기와 다음 주 준비 루틴의 완성도를 뜻합니다.',
      '주간 조언': '주간 조언 카드는 이번 주 단 하나의 실행 원칙으로 요약해야 효과적입니다.'
    },
    positionFocus: {
      '주간 테마': '의사결정의 상위 원칙',
      '월-화': '초반 페이스 조절',
      '수-목': '중반 변수 대응',
      금요일: '마감 품질과 정리',
      토요일: '회복과 재정비',
      일요일: '복기와 다음 주 준비',
      '주간 조언': '단일 실행 원칙'
    }
  },
  'monthly-fortune': {
    uprightLine: '정방향이면 월간 흐름이 안정적으로 이어질 가능성이 높습니다.',
    reversedLine: '역방향이면 월중 병목을 먼저 줄여야 후반부 균형이 회복됩니다.',
    defaultPrompt: '월별 리딩은 주차별 변화를 한 달 리듬으로 묶어 해석해야 정확합니다.',
    defaultFocus: '월간 리듬 관리',
    positionPrompts: {
      '월간 테마': '월간 테마는 이번 달 의사결정의 기준 문장입니다.',
      '1주차': '1주차 카드는 출발 강도와 초기 마찰을 점검하는 구간입니다.',
      '2주차': '2주차 카드는 조정 포인트를 찾는 구간입니다.',
      '3주차': '3주차 카드는 피로와 성과의 균형을 점검하는 시점입니다.',
      '4주차·정리': '4주차 카드는 정리와 다음 달 전환 준비를 뜻합니다.'
    },
    positionFocus: {
      '월간 테마': '월간 기준',
      '1주차': '초기 세팅',
      '2주차': '중간 조정',
      '3주차': '피로/성과 균형',
      '4주차·정리': '정리와 전환'
    }
  },
  'yearly-fortune': {
    uprightLine: '정방향이면 해당 월의 전개가 비교적 자연스럽게 이어질 수 있습니다.',
    reversedLine: '역방향이면 해당 월에는 리스크 완충과 속도 조절이 필요합니다.',
    defaultPrompt: '연간 리딩은 월 단위보다 분기 흐름으로 묶어 해석할 때 정확도가 올라갑니다.',
    defaultFocus: '연간 리듬과 분기 전략',
    positionPrompts: {},
    positionFocus: {}
  },
  'celtic-cross': {
    uprightLine: '정방향이면 현재 축에서 실행 동력이 살아 있는 상태입니다.',
    reversedLine: '역방향이면 중심축의 병목을 먼저 풀어야 후속 카드가 살아납니다.',
    defaultPrompt: '켈틱 크로스는 중심축과 환경축의 긴장을 함께 읽어야 해석이 흔들리지 않습니다.',
    defaultFocus: '중심축과 결과축의 연결',
    positionPrompts: {
      현재: '현재 카드는 전체 리딩의 중심축입니다.',
      '교차/장애': '교차/장애 카드는 핵심 병목을 특정하는 구간입니다.',
      기반: '기반 카드는 표면 아래 동기를 보여줍니다.',
      '가까운 과거': '가까운 과거 카드는 반복 패턴의 시작점을 뜻합니다.',
      가능성: '가능성 카드는 질문자가 지향하는 방향을 보여줍니다.',
      '가까운 미래': '가까운 미래 카드는 단기 전개를 점검하는 구간입니다.',
      '자기 인식': '자기 인식 카드는 내부 서사와 해석 프레임을 드러냅니다.',
      '외부 환경': '외부 환경 카드는 외부 압력과 지원 요인을 함께 보여줍니다.',
      '희망·두려움': '희망·두려움 카드는 내적 갈등의 초점을 드러냅니다.',
      결과: '결과 카드는 현재 흐름 유지 시 도달 가능한 종착점입니다.'
    },
    positionFocus: {
      현재: '중심 주제',
      '교차/장애': '핵심 병목',
      기반: '근본 동기',
      '가까운 과거': '반복 패턴',
      가능성: '지향 방향',
      '가까운 미래': '단기 전개',
      '자기 인식': '내부 프레임',
      '외부 환경': '외부 변수',
      '희망·두려움': '내적 긴장',
      결과: '종합 결과'
    }
  }
};
