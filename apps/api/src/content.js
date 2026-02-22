import { getCardById } from './data/cards.js';

const TTL_FALLBACK_SOURCE = 'fallback';

export function buildFallbackExplanation(card, level = 'beginner', context = '') {
  const explanationContext = inferExplanationContext(context);
  const contextLine = context?.trim()
    ? `질문 맥락(${context.trim()})에 맞춰 보면,`
    : '맥락 없이 기본 의미로 보면,';

  const arcanaLine =
    card.arcana === 'major'
      ? '메이저 아르카나는 삶의 큰 흐름과 심리적 전환점을 다룹니다.'
      : `${card.suitKo} 수트의 상징 영역은 ${suitTheme(card.suit)}입니다.`;

  const rankLine =
    card.rank
      ? `${card.rankKo} 단계는 ${rankStage(card.rank)} 맥락을 보여줍니다.`
      : '메이저 카드는 독립된 원형으로 읽되, 지금 필요한 전환의 방향을 함께 봅니다.';

  const primaryKeyword = card.keywords?.[0] || '핵심 에너지';
  const profile = getFallbackCardProfile(card);
  const contextFocus = buildContextFocusLines({ explanationContext, level });

  return {
    cardId: card.id,
    source: TTL_FALLBACK_SOURCE,
    sections: {
      coreMeaning: enforceMinLines([
        `${card.nameKo} (${card.name})의 핵심은 ${card.keywords.join(', ')}입니다.`,
        `${contextLine} ${profile.coreFocus} ${contextFocus.core}`,
        level === 'intermediate'
          ? '중급에서는 카드 위치와 인접 카드에 따라 의미 강도와 시점이 어떻게 달라지는지 먼저 확정하세요.'
          : '입문에서는 핵심 키워드 1개를 오늘 상황 1개에 연결해 해석의 초점을 좁히세요.',
        contextFocus.coreAction
      ].join('\n')),
      symbolism: enforceMinLines([
        arcanaLine,
        `${rankLine} ${profile.symbolFocus}`,
        level === 'intermediate'
          ? '상징은 결론이 아니라 가설입니다. 관찰 가능한 사실과 충돌하는 해석은 버리고 남은 가설만 검증하세요.'
          : '상징은 정답이 아니라 방향 힌트입니다. 어렵게 확장하기보다 지금 문제와 연결해 읽으세요.',
        contextFocus.symbolism
      ].join('\n')),
      upright: enforceMinLines([
        `정방향은 "${primaryKeyword}" 에너지가 비교적 안정적으로 작동하는 흐름입니다.`,
        level === 'intermediate'
          ? `${profile.uprightIntermediate} 긍정 신호의 지속 조건(시간, 자원, 관계)을 같이 점검해야 과해석을 줄일 수 있습니다.`
          : `${profile.uprightBeginner} ${buildBeginnerUprightActionLine(card)}`,
        level === 'intermediate'
          ? `실행 뒤에는 가설이 맞았는지 근거 1개를 남겨 다음 해석의 기준으로 삼으세요. ${contextFocus.upright}`
          : `${buildBeginnerUprightReviewLine(card)} ${contextFocus.upright}`
      ].join('\n')),
      reversed: enforceMinLines([
        `역방향은 "${primaryKeyword}" 에너지가 지연되거나 과잉/결핍으로 나타날 가능성을 뜻합니다.`,
        level === 'intermediate'
          ? `${profile.reversedIntermediate} 원인을 내부 요인과 외부 제약으로 분리해 어디를 먼저 조정할지 우선순위를 정하세요.`
          : `${profile.reversedBeginner} ${buildBeginnerReversedActionLine(card)}`,
        level === 'intermediate'
          ? `교정 후에는 같은 질문으로 재평가해 흐름 변화와 남은 리스크를 함께 확인하세요. ${contextFocus.reversed}`
          : `${buildBeginnerReversedReviewLine(card)} ${contextFocus.reversed}`
      ].join('\n')),
      love: enforceMinLines([
        ...buildLoveSectionLines({ card, level, profile, context, explanationContext })
      ].join('\n')),
      career: enforceMinLines([
        ...buildCareerSectionLines({ card, level, profile, context, explanationContext })
      ].join('\n')),
      advice: enforceMinLines([
        level === 'intermediate'
          ? '중급 관점에서는 카드 간 상호작용과 위치 의미를 함께 고려해 해석 강도를 조절합니다.'
          : '입문 관점에서는 카드의 핵심 키워드와 상황별 기본 의미를 먼저 고정합니다.',
        level === 'intermediate'
          ? '실천 과제: 사실(관찰) → 해석(가설) → 행동(검증) 3단계로 문장을 작성해 복기 정확도를 올리세요.'
          : buildBeginnerAdviceTaskLine(card),
        `${buildAdviceReviewLine(card, level)} ${contextFocus.advice}`
      ].join('\n'))
    }
  };
}

function buildLoveSectionLines({ card, level, profile, context = '', explanationContext }) {
  const contextTag = detectRelationshipContext(context);
  const openersBeginner = [
    '연애/관계에서는 상대를 통제하기보다 내 감정의 사실과 요청을 분리해 전달하는 것이 중요합니다.',
    '연애/관계 해석에서는 상대 의도를 추측하기보다 내 표현 방식과 경계를 먼저 점검하는 편이 정확합니다.',
    '관계 리딩은 감정 강도보다 전달 순서가 결과를 크게 바꿉니다.'
  ];
  const openersIntermediate = [
    '중급 관계 해석에서는 대화 패턴(회피·과잉반응·침묵)의 반복 지점을 먼저 추적해야 합니다.',
    '중급 관점의 연애/관계 리딩은 감정 사실, 관계 구조, 타이밍 변수를 분리해 읽는 것이 핵심입니다.',
    '관계 카드 해석에서는 긍정 신호와 경고 신호를 같은 기준표로 기록해야 오판을 줄일 수 있습니다.'
  ];

  const suitNuance = card.arcana === 'minor'
    ? ({
      Wands: '완드 계열은 감정 온도는 빠르게 오르지만 속도 차이로 마찰이 생기기 쉬우니 진도 합의가 중요합니다.',
      Cups: '컵 계열은 공감이 강점이지만 경계가 흐려지기 쉬워 요청 문장을 반드시 분리해 두는 편이 좋습니다.',
      Swords: '소드 계열은 말의 정확도가 높아지는 대신 차갑게 들릴 수 있어 톤 조절과 확인 질문이 중요합니다.',
      Pentacles: '펜타클 계열은 안정감은 높지만 표현이 부족해질 수 있어 행동 기반 애정 표현을 의도적으로 넣어야 합니다.'
    }[card.suit] ?? '관계 해석에서는 카드 특성을 대화 패턴으로 번역해 보는 것이 효과적입니다.')
    : '메이저 계열은 관계의 큰 전환 신호를 담는 경우가 많아 단기 감정보다 장기 방향을 함께 확인해야 합니다.';

  const contextAction = ({
    reconnect: level === 'intermediate'
      ? '재회/회복 맥락이라면 과거 이슈를 전부 다루기보다 이번 대화의 목표 1개만 먼저 합의하세요.'
      : '재회/회복 맥락이라면 먼저 사과/요청 중 무엇을 전달할지 한 문장으로 정해보세요.',
    conflict: level === 'intermediate'
      ? '갈등 맥락이라면 감정 표현과 해결 요청을 분리한 뒤, 합의 가능한 최소 행동을 먼저 도출하세요.'
      : '갈등 맥락이라면 비난 문장 1개를 요청 문장 1개로 바꿔서 말해보세요.',
    default: level === 'intermediate'
      ? '중급 관점에서는 대화 전 가설 1개와 확인 질문 1개를 준비해 관계 리듬을 검증하세요.'
      : '입문 관점에서는 오늘 전할 한 문장과 피할 한 문장을 먼저 정해 대화 흔들림을 줄이세요.'
  }[contextTag] ?? (level === 'intermediate'
    ? '중급 관점에서는 대화 전 가설 1개와 확인 질문 1개를 준비해 관계 리듬을 검증하세요.'
    : '입문 관점에서는 오늘 전할 한 문장과 피할 한 문장을 먼저 정해 대화 흔들림을 줄이세요.'));

  const crossDomainLine = buildCrossDomainLine({
    section: 'love',
    explanationContext,
    level
  });

  return [
    pickCardVariant(card.id, `love-opener-${level}`, level === 'intermediate' ? openersIntermediate : openersBeginner),
    `${profile.loveFocus} ${suitNuance} ${crossDomainLine}`,
    contextAction
  ];
}

function buildCareerSectionLines({ card, level, profile, context = '', explanationContext }) {
  const contextTag = detectCareerContext(context);
  const openersBeginner = [
    '일/학업에서는 우선순위를 1~2개로 압축하고 실행 증거(기록/산출물)를 남기는 방식이 유리합니다.',
    '일/학업 해석은 의욕보다 운영 기준(시간·완료·품질)을 먼저 고정할 때 정확도가 올라갑니다.',
    '커리어/학습 카드 해석에서는 "무엇을 할지"보다 "어떻게 검증할지"를 먼저 정하는 것이 중요합니다.'
  ];
  const openersIntermediate = [
    '중급 일/학업 해석에서는 기대 성과와 리스크를 같은 기준표로 비교해야 의사결정 오류를 줄일 수 있습니다.',
    '중급 관점에서는 실행 전략과 운영 전략을 분리해 기록해야 재현 가능한 성과를 만들기 쉽습니다.',
    '업무/학습 카드의 중급 해석은 단기 성과와 장기 지속 조건을 동시에 점검할 때 품질이 올라갑니다.'
  ];

  const suitNuance = card.arcana === 'minor'
    ? ({
      Wands: '완드 계열은 착수 속도는 빠르지만 과열/분산 리스크가 커서 범위 통제가 필수입니다.',
      Cups: '컵 계열은 협업 분위기와 커뮤니케이션 품질이 성과 변동의 핵심 변수입니다.',
      Swords: '소드 계열은 문제 정의와 기준 정밀도가 결과 품질을 좌우하므로 근거 관리가 중요합니다.',
      Pentacles: '펜타클 계열은 운영 안정성이 강점이라 누적 지표(완료율·오류율·비용)를 함께 추적해야 효과가 큽니다.'
    }[card.suit] ?? '카드 특성을 운영 지표와 연결하면 실전 정확도가 높아집니다.')
    : '메이저 계열은 커리어 방향 전환 신호를 다루는 경우가 많아 단기 결과보다 전략 축을 먼저 점검해야 합니다.';

  const contextAction = ({
    jobChange: level === 'intermediate'
      ? '이직/취업 시점 맥락이라면 30일 이내 실행(지원·네트워킹)과 60일 준비(포트폴리오·답변 보강)를 분리해 주차별로 운영하세요.'
      : '이직/취업 시점 맥락이라면 이번 주 실행할 지원 1건과 보완할 문서 1개를 짝으로 정해 진행해 보세요.',
    interview: level === 'intermediate'
      ? '면접/지원 맥락이라면 핵심 경험 2개를 STAR 구조로 정리하고, 질문 대비 반례 답변까지 준비하세요.'
      : '면접/지원 맥락이라면 강점 1개와 근거 사례 1개를 먼저 정리해 말해보세요.',
    project: level === 'intermediate'
      ? '프로젝트 맥락이라면 일정·범위·리스크를 분리해 주간 검증 루틴으로 운영하세요.'
      : '프로젝트 맥락이라면 오늘 완료할 작업 1개를 명확히 정하고 체크하세요.',
    study: level === 'intermediate'
      ? '학습 맥락이라면 회상 정확도와 적용 정확도를 따로 기록해 학습 전략을 조정하세요.'
      : '학습 맥락이라면 25분 학습 + 5분 복기 1세트를 먼저 실행해 보세요.',
    default: level === 'intermediate'
      ? '중급 관점에서는 실행 후 결과 편차 원인을 일정·자원·협업 변수로 나눠 기록하세요.'
      : '입문 관점에서는 오늘 20분 안에 끝낼 수 있는 단위로 쪼개서 시작하는 것이 핵심입니다.'
  }[contextTag] ?? (level === 'intermediate'
    ? '중급 관점에서는 실행 후 결과 편차 원인을 일정·자원·협업 변수로 나눠 기록하세요.'
    : '입문 관점에서는 오늘 20분 안에 끝낼 수 있는 단위로 쪼개서 시작하는 것이 핵심입니다.'));

  const crossDomainLine = buildCrossDomainLine({
    section: 'career',
    explanationContext,
    level
  });

  return [
    pickCardVariant(card.id, `career-opener-${level}`, level === 'intermediate' ? openersIntermediate : openersBeginner),
    `${profile.careerFocus} ${suitNuance} ${crossDomainLine}`,
    contextAction
  ];
}

function detectRelationshipContext(context = '') {
  const text = String(context || '').toLowerCase();
  if (['재회', '회복', '다시', '연락'].some((k) => text.includes(k))) return 'reconnect';
  if (['갈등', '싸움', '다툼', '서운'].some((k) => text.includes(k))) return 'conflict';
  return 'default';
}

function detectCareerContext(context = '') {
  const text = String(context || '').toLowerCase();
  if (['이직', '취업', '입사', '퇴사', '전직'].some((k) => text.includes(k))) return 'jobChange';
  if (['면접', '지원', '이력서', '자소서'].some((k) => text.includes(k))) return 'interview';
  if (['프로젝트', '업무', '직장', '회사'].some((k) => text.includes(k))) return 'project';
  if (['공부', '시험', '학습', '자격증'].some((k) => text.includes(k))) return 'study';
  return 'default';
}

function inferExplanationContext(context = '') {
  const text = String(context || '').toLowerCase();
  const relationshipTag = detectRelationshipContext(text);
  const careerTag = detectCareerContext(text);

  if (relationshipTag !== 'default') return { domain: 'relationship', tag: relationshipTag };
  if (careerTag !== 'default') return { domain: 'career', tag: careerTag };
  if (['연애', '관계', '재회', '결혼', '상대', '썸', '감정', '소통'].some((k) => text.includes(k))) {
    return { domain: 'relationship', tag: 'default' };
  }
  if (['재정', '돈', '지출', '수입', '저축', '투자', '소비', '자산'].some((k) => text.includes(k))) {
    return { domain: 'finance', tag: 'default' };
  }
  if (['공부', '시험', '학습', '자격증', '과제'].some((k) => text.includes(k))) {
    return { domain: 'study', tag: 'study' };
  }
  if (['건강', '수면', '운동', '회복', '컨디션'].some((k) => text.includes(k))) {
    return { domain: 'health', tag: 'default' };
  }
  if (['오늘', '하루', '금일', '오늘의', '이번 주'].some((k) => text.includes(k))) {
    return { domain: 'daily', tag: 'default' };
  }
  if (['업무', '직장', '회사', '커리어', '프로젝트'].some((k) => text.includes(k))) {
    return { domain: 'career', tag: 'project' };
  }
  return { domain: 'general', tag: 'default' };
}

function buildContextFocusLines({ explanationContext, level }) {
  const isIntermediate = level === 'intermediate';
  const linesByDomain = {
    relationship: {
      core: '관계 맥락에서는 상대 의도 추측보다 대화 패턴과 경계 신호를 우선 읽어야 합니다.',
      coreAction: isIntermediate
        ? '관계 해석 체크: 감정 사실/요청 문장/합의 행동을 1개씩 분리해 기록하세요.'
        : '관계 해석 체크: 오늘 전할 문장 1개와 피할 문장 1개를 먼저 정해보세요.',
      symbolism: '상징을 감정 온도와 대화 타이밍 변수로 번역하면 해석이 훨씬 실전에 가까워집니다.',
      upright: '관계 맥락의 정방향에서는 접점을 여는 짧은 대화 제안이 흐름을 살립니다.',
      reversed: '관계 맥락의 역방향에서는 결론을 늦추고 오해를 줄이는 확인 질문이 우선입니다.',
      advice: '관계 실행은 감정 해석보다 전달 순서(사실→감정→요청)를 지켜 복기하세요.'
    },
    career: {
      core: '커리어 맥락에서는 분위기 해석보다 실행 지표(제출/면접/완료율)로 읽는 것이 정확합니다.',
      coreAction: isIntermediate
        ? '커리어 해석 체크: 이번 주 실행 지표 1개와 보완 지표 1개를 짝으로 운영하세요.'
        : '커리어 해석 체크: 오늘 실행할 행동 1개와 보완할 문서 1개를 연결하세요.',
      symbolism: '상징을 일정·역할·성과 기준으로 번역하면 과해석이 줄고 행동으로 이어집니다.',
      upright: '커리어 맥락의 정방향에서는 작은 제출/접점을 끊기지 않게 유지하는 것이 핵심입니다.',
      reversed: '커리어 맥락의 역방향에서는 확장보다 문서 품질과 답변 구조 보완이 먼저입니다.',
      advice: '커리어 복기는 결과보다 과정 지표(준비량/반응률/교정 포인트)를 남겨야 효과가 큽니다.'
    },
    finance: {
      core: '재정 맥락에서는 기대 수익보다 손실 통제와 현금흐름 안정성을 먼저 읽어야 합니다.',
      coreAction: isIntermediate
        ? '재정 해석 체크: 고정비/변동비/리스크 노출을 분리해 점검표를 만드세요.'
        : '재정 해석 체크: 오늘 줄일 지출 1개와 유지할 지출 1개를 구분하세요.',
      symbolism: '상징을 지출 구조와 리스크 한도로 번역하면 현실 판단 정확도가 올라갑니다.',
      upright: '재정 맥락의 정방향에서는 계획형 운영을 유지할 때 누적 안정성이 커집니다.',
      reversed: '재정 맥락의 역방향에서는 확장성보다 손실 방어와 지출 통제가 우선입니다.',
      advice: '재정 복기는 감정 소비가 아니라 숫자 기록(지출/저축/누수 원인)으로 남기세요.'
    },
    study: {
      core: '학습 맥락에서는 의욕보다 반복 주기와 복기 품질이 성과를 결정합니다.',
      coreAction: isIntermediate
        ? '학습 해석 체크: 회상 정확도와 적용 정확도를 분리해 주간 단위로 보정하세요.'
        : '학습 해석 체크: 25분 학습 + 5분 복기 1세트를 먼저 고정하세요.',
      symbolism: '상징을 학습 루틴(시간/반복/테스트)으로 번역하면 실행력이 높아집니다.',
      upright: '학습 맥락의 정방향에서는 반복 루틴을 유지할수록 체감 성과가 빨라집니다.',
      reversed: '학습 맥락의 역방향에서는 범위를 줄이고 회상 테스트부터 재시작하세요.',
      advice: '학습 복기는 공부 시간보다 오답 원인과 재시도 계획을 중심으로 남기세요.'
    },
    health: {
      core: '건강 맥락에서는 의욕보다 회복 리듬(수면/식사/활동) 안정화를 먼저 읽어야 합니다.',
      coreAction: isIntermediate
        ? '건강 해석 체크: 수면·활동·피로 지표를 하루 단위로 기록해 변동 원인을 찾으세요.'
        : '건강 해석 체크: 오늘 하나의 회복 루틴(수면/걷기/수분)을 먼저 실행해 보세요.',
      symbolism: '상징을 회복 지표로 번역하면 컨디션 해석의 체감 정확도가 올라갑니다.',
      upright: '건강 맥락의 정방향에서는 작은 루틴 유지가 회복 속도를 높입니다.',
      reversed: '건강 맥락의 역방향에서는 강도 확장보다 휴식과 리듬 복구가 우선입니다.',
      advice: '건강 복기는 느낌만 쓰지 말고 수면/활동/피로도를 함께 기록하세요.'
    },
    daily: {
      core: '일상 맥락에서는 거대한 결론보다 오늘 실행 1개를 고정하는 것이 핵심입니다.',
      coreAction: isIntermediate
        ? '일상 해석 체크: 오늘 우선순위 1개와 회피할 소모 1개를 분리하세요.'
        : '일상 해석 체크: 지금 20분 안에 가능한 행동으로 바로 전환해 보세요.',
      symbolism: '상징을 오늘 일정과 감정 소모 구간으로 번역하면 해석이 가벼워집니다.',
      upright: '일상 맥락의 정방향에서는 단순 실행을 이어가면 흐름이 자연스럽게 붙습니다.',
      reversed: '일상 맥락의 역방향에서는 과욕을 줄이고 정리부터 시작해야 흔들림이 줄어듭니다.',
      advice: '일상 복기는 오늘 성공 1개와 소모 1개만 남겨도 충분히 효과적입니다.'
    },
    general: {
      core: '일반 맥락에서는 카드 메시지를 한 가지 행동 기준으로 축소해야 해석이 선명해집니다.',
      coreAction: isIntermediate
        ? '해석 체크: 가설 1개와 검증 행동 1개를 짝으로 설정하세요.'
        : '해석 체크: 지금 바로 할 행동 1개로 문장을 마무리하세요.',
      symbolism: '상징을 지금 결정해야 하는 현실 문제로 번역하면 해석 공회전을 막을 수 있습니다.',
      upright: '정방향에서는 실행의 문턱을 낮추고 작은 결과물을 먼저 만드는 편이 좋습니다.',
      reversed: '역방향에서는 원인 하나를 고르고 교정 행동 하나만 먼저 적용하세요.',
      advice: '복기에서는 해석보다 행동-결과 연결을 짧게 남기는 습관이 핵심입니다.'
    }
  };

  return linesByDomain[explanationContext.domain] ?? linesByDomain.general;
}

function buildCrossDomainLine({ section, explanationContext, level }) {
  const isIntermediate = level === 'intermediate';
  if (!explanationContext || explanationContext.domain === 'general') return '';
  if (section === 'love' && explanationContext.domain === 'career') {
    return isIntermediate
      ? '커리어 질문 맥락에서도 관계 섹션은 협업 대화 톤과 경계 설정 방식 점검에 직접 연결됩니다.'
      : '커리어 질문이라도 관계 섹션에서 대화 톤을 정리하면 면접/업무 소통 품질에 도움이 됩니다.';
  }
  if (section === 'career' && explanationContext.domain === 'relationship') {
    return isIntermediate
      ? '관계 질문 맥락에서도 커리어 섹션은 대화 운영 전략(타이밍·명료성) 훈련으로 연결해 읽으세요.'
      : '관계 질문이어도 커리어 섹션의 실행 루틴은 대화 준비와 표현 정리에 바로 적용됩니다.';
  }
  if (section === 'love' && explanationContext.domain === 'finance') {
    return '재정 질문 맥락에서는 관계 섹션을 지출·기대·경계 대화의 합의 방식으로 연결해 해석하세요.';
  }
  if (section === 'career' && explanationContext.domain === 'finance') {
    return '재정 질문 맥락에서는 커리어 섹션을 수입 안정화 행동과 리스크 통제 실행으로 읽는 편이 정확합니다.';
  }
  if (section === 'love' && explanationContext.domain === 'study') {
    return '학습 질문 맥락에서는 관계 섹션을 피드백 수용 방식과 소통 리듬 조정으로 해석하세요.';
  }
  if (section === 'career' && explanationContext.domain === 'study') {
    return '학습 질문 맥락에서는 커리어 섹션의 실행 기준을 학습 루틴 운영 규칙으로 변환해 적용하세요.';
  }
  return '';
}

function buildBeginnerUprightActionLine(card) {
  const majorLines = [
    '오늘 15분만 투자해 카드가 제안한 방향으로 첫 행동을 시작해 보세요.',
    '가볍게 시작하되 끝낼 기준 1개를 정해 행동으로 옮기세요.',
    '오늘 안에 완료 가능한 단위 1개를 선택해 바로 실행해 보세요.',
    '핵심 키워드를 눈에 보이는 행동 한 줄로 바꿔 실천해 보세요.'
  ];
  const minorBySuit = {
    Wands: [
      '열정이 분산되지 않게 우선순위 1개에만 에너지를 집중해 보세요.',
      '아이디어를 메모로 끝내지 말고 10분 실행으로 전환해 보세요.'
    ],
    Cups: [
      '감정 표현 1개를 구체적인 말 또는 행동으로 전달해 보세요.',
      '공감과 요청을 한 문장씩 나눠 말하는 연습을 해보세요.'
    ],
    Swords: [
      '판단 기준 1개를 먼저 적고 그 기준으로만 결정해 보세요.',
      '추측 대신 확인 질문 1개를 바로 실행해 보세요.'
    ],
    Pentacles: [
      '실행 증거가 남는 작은 결과물 1개를 오늘 완성해 보세요.',
      '시간·돈·에너지 중 하나를 수치로 기록해 현실 기준을 세우세요.'
    ]
  };
  const variants = card.arcana === 'major'
    ? majorLines
    : (minorBySuit[card.suit] ?? majorLines);
  return pickCardVariant(card.id, 'upright-action', variants);
}

function buildBeginnerUprightReviewLine(card) {
  const majorLines = [
    '실행 후에는 전후 체감 차이 1가지를 기록해 다음 리딩의 기준으로 남겨두세요.',
    '행동 전/후의 마음 변화와 결과를 한 줄씩 적어 해석 정확도를 높이세요.',
    '작은 실행 결과를 기록해 다음 카드 해석 때 비교 기준으로 활용하세요.'
  ];
  const minorBySuit = {
    Wands: [
      '실행 속도와 완주 여부를 함께 기록하면 다음 판단이 쉬워집니다.',
      '의욕 변화와 실제 결과를 같이 적어 추진 리듬을 점검하세요.'
    ],
    Cups: [
      '대화 전후 감정 온도 변화를 적어 관계 흐름을 확인하세요.',
      '감정 소모와 안정감을 각각 기록해 다음 선택의 기준으로 삼으세요.'
    ],
    Swords: [
      '판단 근거가 맞았는지 틀렸는지 근거 1개를 남겨두세요.',
      '확인 질문의 결과를 기록해 해석 오차를 줄이세요.'
    ],
    Pentacles: [
      '시간/결과를 함께 기록해 실행 효율을 점검하세요.',
      '완료 기준 충족 여부를 체크해 다음 계획 품질을 높이세요.'
    ]
  };
  const variants = card.arcana === 'major'
    ? majorLines
    : (minorBySuit[card.suit] ?? majorLines);
  return pickCardVariant(card.id, 'upright-review', variants);
}

function buildBeginnerReversedActionLine(card) {
  const majorLines = [
    '원인을 한 번에 다 풀기보다 가장 작은 교정 루틴 1개부터 시작하세요.',
    '무리한 전환보다 실패 비용이 낮은 수정 행동 1개를 먼저 실행하세요.',
    '지연 원인 하나만 고르고 오늘 가능한 보완 행동으로 바꿔보세요.'
  ];
  const minorBySuit = {
    Wands: [
      '과열된 목표를 줄이고 실행 범위를 절반으로 낮춰보세요.',
      '의욕 변동이 큰 날에는 시작 기준만 지키는 방식으로 조정하세요.'
    ],
    Cups: [
      '감정 반응이 커질 때는 표현 속도를 늦추고 사실부터 정리하세요.',
      '관계 피로를 줄이기 위해 요청과 기대를 분리해 말해보세요.'
    ],
    Swords: [
      '판단이 꼬일 때는 정보량을 줄이고 핵심 사실 3개만 남기세요.',
      '즉흥 결론을 멈추고 확인 질문 1개를 우선 실행하세요.'
    ],
    Pentacles: [
      '손실을 키우는 루틴 1개를 멈추고 대체 루틴을 넣어보세요.',
      '완료 기준을 낮춰 재시작 비용을 줄이는 쪽으로 조정하세요.'
    ]
  };
  const variants = card.arcana === 'major'
    ? majorLines
    : (minorBySuit[card.suit] ?? majorLines);
  return pickCardVariant(card.id, 'reversed-action', variants);
}

function buildBeginnerReversedReviewLine(card) {
  const majorLines = [
    '교정 후에는 같은 질문으로 다시 확인해 흐름 변화가 생겼는지 점검하세요.',
    '수정 전/후 차이를 기록해 같은 패턴 재발을 막으세요.',
    '교정 결과를 짧게 남겨 다음 리딩에서 비교 근거로 활용하세요.'
  ];
  const minorBySuit = {
    Wands: ['추진 강도 조절 결과를 기록해 과열 패턴을 관리하세요.'],
    Cups: ['감정 소모가 줄었는지 확인해 관계 리듬 변화를 기록하세요.'],
    Swords: ['판단 오류가 줄었는지 근거를 남겨 다음 해석 정밀도를 높이세요.'],
    Pentacles: ['실행 비용/결과 변화를 기록해 현실 운영 기준을 업데이트하세요.']
  };
  const variants = card.arcana === 'major'
    ? majorLines
    : (minorBySuit[card.suit] ?? majorLines);
  return pickCardVariant(card.id, 'reversed-review', variants);
}

function buildBeginnerAdviceTaskLine(card) {
  const majorLines = [
    '실천 과제: 오늘 가장 약한 키워드 1개를 골라 20분 실행 계획으로 바꿔보세요.',
    '실천 과제: 키워드 1개를 선택해 시작 조건·중단 조건을 함께 적어 실행하세요.',
    '실천 과제: 카드 메시지를 하루 행동 체크리스트 1개로 변환해 보세요.'
  ];
  const minorBySuit = {
    Wands: ['실천 과제: 추진 과제 1개를 오늘 완료 가능한 크기로 쪼개 실행하세요.'],
    Cups: ['실천 과제: 감정 표현 1개와 요청 1개를 분리해 전달해 보세요.'],
    Swords: ['실천 과제: 판단 기준 1개를 정하고 그 기준으로만 의사결정을 해보세요.'],
    Pentacles: ['실천 과제: 실행 증거가 남는 결과물 1개를 오늘 안에 완성해 보세요.']
  };
  const variants = card.arcana === 'major'
    ? majorLines
    : (minorBySuit[card.suit] ?? majorLines);
  return pickCardVariant(card.id, 'advice-task', variants);
}

function buildAdviceReviewLine(card, level) {
  if (level === 'intermediate') {
    return pickCardVariant(card.id, 'advice-review-intermediate', [
      '검증 결과를 기록하면 다음 리딩에서 가설 정확도를 훨씬 높일 수 있습니다.',
      '결과 로그를 남기면 해석 일관성과 의사결정 신뢰도가 함께 올라갑니다.',
      '행동-결과 연결 기록을 쌓아 다음 리딩의 검증 속도를 높이세요.'
    ]);
  }
  return pickCardVariant(card.id, 'advice-review-beginner', [
    '실행 결과를 짧게 남기면 다음 카드 해석에서 일관성과 신뢰도가 함께 올라갑니다.',
    '행동 후 체감 메모 1줄을 남기면 다음 리딩이 훨씬 쉬워집니다.',
    '작은 실행 기록이 쌓일수록 카드 해석이 생활 판단에 더 잘 연결됩니다.'
  ]);
}

function pickCardVariant(cardId, salt, variants) {
  if (!Array.isArray(variants) || variants.length === 0) return '';
  const seed = `${cardId}:${salt}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

function getFallbackCardProfile(card) {
  const defaultProfile = {
    coreFocus: `지금은 "${card.keywords?.[0] || '핵심'}" 신호와 리스크 신호를 함께 읽어야 하는 구간입니다.`,
    symbolFocus: '카드의 상징을 현재 결정의 기준으로 번역해 해석하면 문장이 훨씬 선명해집니다.',
    uprightBeginner: '흐름이 열린 만큼 시작을 너무 늦추지 않는 편이 좋습니다.',
    uprightIntermediate: '진행 속도보다 지속 조건을 먼저 고정해야 신호의 품질이 유지됩니다.',
    reversedBeginner: '성급함과 회피가 교차할 수 있어 작은 단위 점검이 우선입니다.',
    reversedIntermediate: '신호 약화의 원인이 타이밍인지 자원 부족인지 분리해 읽어야 정확합니다.',
    loveFocus: `이 카드에서는 "${card.keywords?.[1] || card.keywords?.[0] || '핵심'}"을 말의 속도와 행동의 일관성으로 보여주는 것이 핵심입니다.`,
    careerFocus: `이 카드의 첫 키워드 "${card.keywords?.[0] || '핵심'}"이 아이디어가 아니라 완료된 행동으로 남았는지가 성과 기준입니다.`
  };

  const majorProfiles = {
    'The Fool': {
      ...defaultProfile,
      coreFocus: '지금은 가볍게 시작하되, 충동으로 크게 벌리지 않는 균형이 핵심인 구간입니다.',
      symbolFocus: '가능성은 크지만 안전장치 없이 뛰어들면 시행착오 비용이 커질 수 있음을 함께 보여줍니다.',
      uprightBeginner: '첫걸음을 떼는 용기가 실제 기회를 열어주는 타이밍입니다.',
      uprightIntermediate: '초기 모멘텀을 살리되 철수 기준과 리스크 한도를 같이 정해야 안정적입니다.',
      reversedBeginner: '준비 없는 돌진 또는 시작 미루기가 동시에 나타날 수 있습니다.',
      reversedIntermediate: '자유를 확장하려는 의도와 현실 제약의 충돌 지점을 먼저 고정해야 합니다.',
      loveFocus: '이 카드에서는 설렘의 속도와 신뢰의 속도를 맞추는 조율이 관계 안정감을 만듭니다.',
      careerFocus: '새 프로젝트의 아이디어보다 첫 결과물을 언제, 어떤 기준으로 낼지 정한 계획이 성과 기준입니다.'
    },
    'The Magician': {
      ...defaultProfile,
      coreFocus: '지금은 의도한 것을 실제 결과로 전환할 수 있는 실행 창이 열려 있는 구간입니다.',
      symbolFocus: '자원은 이미 손에 있으므로, 부족함보다 배치 순서와 집중력의 문제로 읽는 편이 정확합니다.',
      uprightBeginner: '할 수 있는 일과 지금 해야 할 일을 분리하면 실행력이 빠르게 살아납니다.',
      uprightIntermediate: '자원 배분과 우선순위를 정량화할수록 결과 재현성이 높아집니다.',
      reversedBeginner: '말은 많은데 실행이 분산되거나, 반대로 성급한 실행으로 품질이 무너질 수 있습니다.',
      reversedIntermediate: '능력 부족보다 자원 배치 오류와 집중력 분산이 성과 저하의 핵심 원인일 수 있습니다.',
      loveFocus: '이 카드에서는 말로 설득하기보다 약속한 행동을 실제로 이행해 신뢰를 쌓는 것이 핵심입니다.',
      careerFocus: '실행력이 강점인 카드이므로 계획보다 완료 지표(완료율, 재작업률)로 성과를 관리하는 것이 효과적입니다.'
    },
    'The High Priestess': {
      ...defaultProfile,
      coreFocus: '지금은 바깥의 속도보다 안쪽의 신호를 정확히 듣는 판단 구간입니다.',
      symbolFocus: '정보가 부족해도 직감 단서가 이미 올라와 있으므로, 성급한 결론보다 관찰 기간을 확보하는 편이 유리합니다.',
      uprightBeginner: '조용히 보는 시간이 오히려 정확한 선택을 만듭니다.',
      uprightIntermediate: '데이터와 직관이 충돌할 때는 검증 순서를 먼저 설계해야 판단 오차가 줄어듭니다.',
      reversedBeginner: '불안 때문에 확인되지 않은 해석을 단정할 수 있습니다.',
      reversedIntermediate: '정보 비대칭이 커진 상태라 가설 검증 전까지 의사결정 규모를 줄이는 것이 안전합니다.',
      loveFocus: '관계에서는 감정을 말하기 전, 내가 원하는 경계와 기대를 먼저 정리하면 오해가 줄어듭니다.',
      careerFocus: '회의/의사결정 전에 확인 질문 목록을 만든 뒤 움직이면 시행착오 비용을 크게 줄일 수 있습니다.'
    },
    'The Empress': {
      ...defaultProfile,
      coreFocus: '지금은 성장을 키우는 환경을 만드는 것이 결과 자체만큼 중요한 시점입니다.',
      symbolFocus: '풍요의 상징은 수확 이전의 돌봄 루틴을 뜻하므로, 지속 가능한 페이스 설계가 핵심입니다.',
      uprightBeginner: '잘하는 것보다 꾸준히 돌보는 태도가 성과를 키웁니다.',
      uprightIntermediate: '자원 투입 대비 회수 주기를 설계하면 성장 곡선을 안정적으로 관리할 수 있습니다.',
      reversedBeginner: '과한 배려나 과소비로 에너지가 분산될 수 있습니다.',
      reversedIntermediate: '돌봄 비용이 통제되지 않으면 수익성/회복성이 동시에 낮아질 수 있습니다.',
      loveFocus: '관계에서는 따뜻함을 표현하되, 감정노동 한도를 함께 정해 균형을 지키는 것이 중요합니다.',
      careerFocus: '결과 압박만 높이기보다 업무 환경과 협업 구조를 다듬어 생산성을 회복하는 접근이 효과적입니다.'
    },
    'The Emperor': {
      ...defaultProfile,
      coreFocus: '지금은 구조와 기준을 명확히 세워 흐름을 안정화해야 하는 구간입니다.',
      symbolFocus: '권위의 상징은 통제가 목적이 아니라 책임 있는 운영 프레임 구축을 뜻합니다.',
      uprightBeginner: '규칙 2~3개만 정해도 혼선이 크게 줄어듭니다.',
      uprightIntermediate: '역할·권한·검토 주기를 문서화하면 리스크가 시스템 안에서 관리됩니다.',
      reversedBeginner: '고집이나 과통제로 반발과 피로가 커질 수 있습니다.',
      reversedIntermediate: '통제 지향이 과도하면 실행 속도와 창의성이 동시에 떨어질 수 있습니다.',
      loveFocus: '관계에서는 기준을 말하되 명령형이 아니라 합의형 문장으로 바꾸는 것이 중요합니다.',
      careerFocus: '조직/프로젝트에서는 책임 범위와 의사결정 권한을 선명히 나누는 것이 성과의 시작점입니다.'
    },
    'The Hierophant': {
      ...defaultProfile,
      coreFocus: '지금은 검증된 방식과 학습 체계를 활용해 안정적으로 전진하는 시점입니다.',
      symbolFocus: '전통의 상징은 낡음이 아니라 재현 가능한 프로세스를 의미합니다.',
      uprightBeginner: '기본기를 반복하면 불안이 줄고 정확도가 올라갑니다.',
      uprightIntermediate: '표준 절차를 적용하되, 현재 맥락에 맞는 예외 규칙을 함께 정의해야 효율이 납니다.',
      reversedBeginner: '형식만 따르고 의미를 놓치면 답답함이 커질 수 있습니다.',
      reversedIntermediate: '관성이 강해지면 최적화 기회를 놓치므로 관행 검토 주기를 의도적으로 만들어야 합니다.',
      loveFocus: '관계에서는 약속의 형식(빈도, 방식, 시간)을 맞추면 신뢰가 빠르게 회복됩니다.',
      careerFocus: '멘토링·가이드·체크리스트를 활용하면 품질 편차를 줄이고 성과를 안정화할 수 있습니다.'
    },
    'The Lovers': {
      ...defaultProfile,
      coreFocus: '지금은 선택의 문제가 아니라 가치 정렬의 문제를 먼저 푸는 구간입니다.',
      symbolFocus: '관계의 상징은 감정만이 아니라 선택 이후 책임 구조까지 포함합니다.',
      uprightBeginner: '좋아 보이는 것보다 오래 지킬 수 있는 선택을 고르는 것이 중요합니다.',
      uprightIntermediate: '대안별 기회비용을 비교해 가치 충돌을 수치화하면 결정 품질이 올라갑니다.',
      reversedBeginner: '마음은 가는데 행동이 어긋나 갈등이 길어질 수 있습니다.',
      reversedIntermediate: '내적 기준 불일치가 지속되면 반복 의사결정 오류가 발생하므로 기준 재정의가 필요합니다.',
      loveFocus: '관계에서는 감정 표현과 실제 선택이 같은 방향인지 점검해야 신뢰가 유지됩니다.',
      careerFocus: '진로/업무에서는 단기 효율보다 장기 가치와 정렬된 선택이 누적 성과를 만듭니다.'
    },
    'The Chariot': {
      ...defaultProfile,
      coreFocus: '지금은 방향성을 고정하고 추진력을 끌어올려야 하는 전진 구간입니다.',
      symbolFocus: '전차의 상징은 속도보다 통제된 가속을 의미하므로, 목표와 제동 장치를 함께 가져가야 합니다.',
      uprightBeginner: '우선순위 하나에 집중하면 추진력이 살아납니다.',
      uprightIntermediate: '복수 목표를 병행할 때는 단계별 체크포인트를 두어 통제력을 유지해야 합니다.',
      reversedBeginner: '급하게 밀어붙여 중심이 흔들릴 수 있습니다.',
      reversedIntermediate: '추진력은 있으나 방향 일치가 깨지면 리소스 소모만 커질 위험이 있습니다.',
      loveFocus: '관계에서는 감정의 속도보다 합의된 진도에 맞춰 움직일 때 안정감이 생깁니다.',
      careerFocus: '프로젝트는 속도 목표와 품질 기준을 함께 관리해야 실제 완주율이 올라갑니다.'
    },
    Strength: {
      ...defaultProfile,
      coreFocus: '지금은 강하게 누르기보다 부드럽게 조율하는 힘이 필요한 구간입니다.',
      symbolFocus: '힘의 상징은 통제가 아니라 감정과 본능을 길들이는 내적 리더십을 뜻합니다.',
      uprightBeginner: '버티는 힘보다 흔들려도 다시 돌아오는 힘을 믿어도 됩니다.',
      uprightIntermediate: '압박 상황에서 반응 지연 시간을 확보하면 판단 품질이 안정됩니다.',
      reversedBeginner: '자책이나 과민 반응으로 에너지가 빠질 수 있습니다.',
      reversedIntermediate: '감정 조절 실패가 성과 저하로 직결될 수 있어 회복 루틴 설계가 우선입니다.',
      loveFocus: '관계에서는 이기려는 대화보다 상대 감정을 받아주고 요청을 명확히 말하는 방식이 효과적입니다.',
      careerFocus: '업무에서는 강한 드라이브보다 지속 가능한 페이스 운영이 장기 성과를 만듭니다.'
    },
    'The Hermit': {
      ...defaultProfile,
      coreFocus: '지금은 외부 확장보다 내부 점검과 방향 재정렬이 필요한 시점입니다.',
      symbolFocus: '등불의 상징은 즉답보다 탐색 과정을 통해 정답에 접근하는 태도를 의미합니다.',
      uprightBeginner: '잠시 멈춰 보는 시간이 오히려 시행착오를 줄입니다.',
      uprightIntermediate: '정보 과잉 환경에서는 선택 기준을 축소해 판단 피로를 관리해야 합니다.',
      reversedBeginner: '고립이 길어지면 필요한 도움까지 차단할 수 있습니다.',
      reversedIntermediate: '과도한 자기 확신 또는 과도한 의심이 동시에 나타날 수 있어 교차 검증이 필요합니다.',
      loveFocus: '관계에서는 잠시 거리 두기가 필요할 수 있지만, 침묵만 길어지지 않게 의도를 설명하세요.',
      careerFocus: '중요 결정 전에는 혼자 정리한 초안을 만든 뒤 외부 피드백으로 보정하는 방식이 안전합니다.'
    },
    'Wheel of Fortune': {
      ...defaultProfile,
      coreFocus: '지금은 통제 밖 변수와 타이밍 변동을 전제로 전략을 세워야 하는 구간입니다.',
      symbolFocus: '수레바퀴의 상징은 운의 문제가 아니라 주기 변화를 읽고 대응 속도를 맞추는 능력을 뜻합니다.',
      uprightBeginner: '흐름이 올 때 작게라도 올라타는 행동이 중요합니다.',
      uprightIntermediate: '상승 구간에서는 확장 기준, 하락 구간에서는 방어 기준을 분리해 운용해야 합니다.',
      reversedBeginner: '뜻밖의 지연이나 변수로 계획이 흔들릴 수 있습니다.',
      reversedIntermediate: '외부 변동성이 커질 때는 고정비/리스크 노출을 선제적으로 줄여야 손실을 막을 수 있습니다.',
      loveFocus: '관계는 분위기 기복이 생길 수 있으니, 감정 파도에 맞춘 대화 타이밍 조절이 필요합니다.',
      careerFocus: '일/학업에서는 한 시나리오에 고정하지 말고 대안 플랜을 병행해야 회복 탄력성이 높아집니다.'
    },
    Justice: {
      ...defaultProfile,
      coreFocus: '지금은 감정보다 사실과 책임의 균형으로 판단해야 하는 구간입니다.',
      symbolFocus: '정의의 상징은 벌점이 아니라 원인과 결과를 정확히 맞물리게 하는 정렬 작업입니다.',
      uprightBeginner: '좋고 싫음을 잠시 내려두고 사실부터 정리하면 길이 보입니다.',
      uprightIntermediate: '판단 근거를 문서화하면 이후 분쟁/재해석 비용을 크게 줄일 수 있습니다.',
      reversedBeginner: '억울함이나 편향으로 판단이 흔들릴 수 있습니다.',
      reversedIntermediate: '정보 선택 편향이 누적되면 의사결정 신뢰도가 급격히 떨어질 수 있습니다.',
      loveFocus: '관계에서는 감정 표현과 책임 분담을 분리해 말할 때 갈등이 줄어듭니다.',
      careerFocus: '업무에서는 기준 없는 유연성보다 명확한 룰과 예외 조건을 함께 두는 편이 효율적입니다.'
    },
    'The Hanged Man': {
      ...defaultProfile,
      coreFocus: '지금은 억지 전진보다 관점 전환과 보류 전략이 필요한 구간입니다.',
      symbolFocus: '매달림의 상징은 정체가 아니라 다른 각도에서 문제를 재구성하는 시간을 의미합니다.',
      uprightBeginner: '답이 안 보일 때는 멈춤이 후퇴가 아니라 준비일 수 있습니다.',
      uprightIntermediate: '기회비용을 계산해 보류 기간의 목표와 종료 조건을 명확히 정해야 합니다.',
      reversedBeginner: '미루기가 길어져 타이밍을 놓칠 수 있습니다.',
      reversedIntermediate: '전환 시점 판단을 계속 지연하면 회복 비용이 커질 수 있으므로 결단 기준이 필요합니다.',
      loveFocus: '관계에서는 즉시 결론보다 서로의 시각 차이를 확인하는 대화가 먼저입니다.',
      careerFocus: '업무에서는 멈춤 기간에도 실험/학습 지표를 두어 정체를 학습 구간으로 바꾸세요.'
    },
    Death: {
      ...defaultProfile,
      coreFocus: '지금은 끝내야 할 것을 정리해야 다음 단계가 열리는 전환 구간입니다.',
      symbolFocus: '죽음의 상징은 파괴가 아니라 구조 교체와 재출발의 신호로 읽는 것이 정확합니다.',
      uprightBeginner: '놓아야 할 것 하나를 정하면 새 흐름이 빨리 들어옵니다.',
      uprightIntermediate: '종료 기준을 선명히 하고 전환 플랜을 병행하면 충격 비용을 줄일 수 있습니다.',
      reversedBeginner: '변화를 두려워해 낡은 패턴을 붙잡을 수 있습니다.',
      reversedIntermediate: '전환 지연이 누적되면 기회비용이 급격히 커지므로 단계적 철수 전략이 필요합니다.',
      loveFocus: '관계에서는 오래된 갈등 패턴을 끊는 합의가 있어야 회복이 시작됩니다.',
      careerFocus: '일/학업에서는 비효율 루틴을 과감히 정리하고 새 운영 방식으로 전환해야 성과가 살아납니다.'
    },
    Temperance: {
      ...defaultProfile,
      coreFocus: '지금은 극단을 피하고 조율로 안정적인 합을 만들어야 하는 구간입니다.',
      symbolFocus: '절제의 상징은 참음이 아니라 다른 요소를 섞어 최적 균형점을 찾는 운영 능력입니다.',
      uprightBeginner: '조금씩 맞춰 가는 방식이 결국 가장 빠릅니다.',
      uprightIntermediate: '리소스 배분 비율을 조정해 시스템 전체 효율을 높이는 접근이 효과적입니다.',
      reversedBeginner: '과하거나 모자란 패턴이 반복될 수 있습니다.',
      reversedIntermediate: '균형 실패가 누적되면 팀/개인 리듬 붕괴로 이어질 수 있어 조정 주기 설정이 필요합니다.',
      loveFocus: '관계에서는 정답 싸움보다 서로의 리듬을 맞추는 실무적 합의가 중요합니다.',
      careerFocus: '업무에서는 속도, 품질, 비용 중 하나만 키우기보다 균형 조합으로 운영해야 지속됩니다.'
    },
    'The Devil': {
      ...defaultProfile,
      coreFocus: '지금은 집착과 의존의 고리를 인식하고 끊어야 하는 점검 구간입니다.',
      symbolFocus: '악마의 상징은 외부 억압보다 스스로 강화한 패턴의 반복성을 드러냅니다.',
      uprightBeginner: '당장 끊기 어려워도 반복 패턴을 알아차리는 것부터 시작하면 됩니다.',
      uprightIntermediate: '보상 구조를 재설계하지 않으면 같은 문제로 회귀할 가능성이 높습니다.',
      reversedBeginner: '문제 인식은 생겼지만 실행이 흔들릴 수 있습니다.',
      reversedIntermediate: '해방 시도가 반동으로 되돌아가지 않도록 대체 루틴과 트리거 관리가 필요합니다.',
      loveFocus: '관계에서는 통제, 질투, 의존 패턴을 사실 기반으로 인정하고 경계를 재설정해야 합니다.',
      careerFocus: '일/학업에서는 비효율 중독(과로, 미루기, 완벽주의)을 수치로 기록하면 교정이 빨라집니다.'
    },
    'The Tower': {
      ...defaultProfile,
      coreFocus: '지금은 감춰진 문제가 드러나며 구조 재정비가 불가피한 구간입니다.',
      symbolFocus: '탑의 상징은 실패 예고가 아니라 허술한 기반을 빠르게 교체하라는 경고입니다.',
      uprightBeginner: '흔들림이 왔을 때 변명보다 정리가 먼저입니다.',
      uprightIntermediate: '충격 구간에서는 손실 제한, 우선 복구, 재발 방지 순서로 대응해야 피해를 줄일 수 있습니다.',
      reversedBeginner: '문제를 축소하거나 회피해 더 크게 만들 수 있습니다.',
      reversedIntermediate: '지연된 리셋은 복구 비용을 기하급수적으로 키우므로 조기 공개/조기 수정이 핵심입니다.',
      loveFocus: '관계에서는 불편한 진실을 늦게 말할수록 신뢰 손상이 커지므로 타이밍 있게 정직해야 합니다.',
      careerFocus: '업무에서는 문제 노출 후 책임 공방보다 원인 분해와 재발 방지 설계에 즉시 집중하세요.'
    },
    'The Star': {
      ...defaultProfile,
      coreFocus: '지금은 회복과 재신뢰를 통해 장기 흐름을 다시 세우는 구간입니다.',
      symbolFocus: '별의 상징은 낙관이 아니라 상처 이후에도 방향을 잃지 않는 복원력을 뜻합니다.',
      uprightBeginner: '조급함을 내려놓고 회복 루틴을 지키면 흐름이 되살아납니다.',
      uprightIntermediate: '회복 구간에서는 성과보다 안정 지표를 먼저 관리해야 반등이 지속됩니다.',
      reversedBeginner: '희망이 약해져 시도 자체를 줄일 수 있습니다.',
      reversedIntermediate: '회복 신호를 과소평가하면 자기효능감 저하가 장기화될 수 있어 작은 성공 축적이 필요합니다.',
      loveFocus: '관계에서는 상처 복구 속도를 맞추고 작은 신뢰 행동을 꾸준히 쌓는 것이 핵심입니다.',
      careerFocus: '일/학업에서는 큰 목표보다 회복 가능한 루틴을 먼저 복구하면 성과가 뒤따릅니다.'
    },
    'The Moon': {
      ...defaultProfile,
      coreFocus: '지금은 불확실성과 감정 파도를 관리하며 사실을 선별해야 하는 구간입니다.',
      symbolFocus: '달의 상징은 위험 자체보다 모호함이 판단을 왜곡하는 상황을 드러냅니다.',
      uprightBeginner: '불안할수록 확인된 사실 3개부터 적어보는 것이 도움이 됩니다.',
      uprightIntermediate: '노이즈와 신호를 분리하는 검증 루틴이 없으면 해석 신뢰도가 급격히 떨어집니다.',
      reversedBeginner: '숨겨진 것이 드러나며 혼란이 커질 수 있습니다.',
      reversedIntermediate: '착시가 걷히는 구간이므로 기존 가설을 적극 폐기하고 모델을 갱신해야 합니다.',
      loveFocus: '관계에서는 추측보다 확인 질문을 늘려 오해를 줄이는 것이 우선입니다.',
      careerFocus: '업무에서는 불명확한 요구사항을 문서로 고정해 재작업 비용을 줄이세요.'
    },
    'The Sun': {
      ...defaultProfile,
      coreFocus: '지금은 명확성, 활력, 가시적 성과가 함께 살아나는 확장 구간입니다.',
      symbolFocus: '태양의 상징은 운 좋은 결과보다 투명한 소통과 일관된 실행의 누적 효과를 뜻합니다.',
      uprightBeginner: '잘되는 흐름을 숨기지 말고 드러내면 더 큰 기회가 옵니다.',
      uprightIntermediate: '성과 가시화를 체계화하면 협업 신뢰와 의사결정 속도가 함께 올라갑니다.',
      reversedBeginner: '자신감 과잉으로 세부 점검을 놓칠 수 있습니다.',
      reversedIntermediate: '성과 신호가 있어도 리스크 관리가 약하면 반납 구간이 빨리 올 수 있습니다.',
      loveFocus: '관계에서는 솔직하고 따뜻한 표현이 관계의 온도를 빠르게 회복시킵니다.',
      careerFocus: '일/학업에서는 잘된 사례를 재현 가능한 프로세스로 정리하면 성과가 안정적으로 유지됩니다.'
    },
    Judgement: {
      ...defaultProfile,
      coreFocus: '지금은 과거 경험을 재평가해 결단으로 전환해야 하는 호출 구간입니다.',
      symbolFocus: '심판의 상징은 비난이 아니라 깨어난 인식으로 다음 단계를 선택하라는 신호입니다.',
      uprightBeginner: '미뤄둔 결정을 더 늦추기보다 기준을 정해 선택하는 편이 좋습니다.',
      uprightIntermediate: '회고 데이터를 바탕으로 전략을 재구성하면 같은 실수를 크게 줄일 수 있습니다.',
      reversedBeginner: '후회나 자기비판으로 결정을 미룰 수 있습니다.',
      reversedIntermediate: '재평가를 회피하면 전환 타이밍을 놓치므로 결단 데드라인 설정이 필요합니다.',
      loveFocus: '관계에서는 반복 갈등을 다시 꺼내는 이유를 명확히 하고 새 합의를 도출해야 합니다.',
      careerFocus: '진로/업무에서는 과거 성과와 실패를 근거로 다음 선택을 명확히 문장화하세요.'
    },
    'The World': {
      ...defaultProfile,
      coreFocus: '지금은 한 주기를 완성하고 다음 단계로 자연스럽게 연결하는 마무리 구간입니다.',
      symbolFocus: '세계의 상징은 끝이 아니라 통합입니다. 성과와 배움을 묶어 다음 사이클의 기반으로 전환해야 합니다.',
      uprightBeginner: '잘 끝내는 힘이 다음 시작을 더 쉽게 만듭니다.',
      uprightIntermediate: '종결 리포트와 전환 계획을 함께 만들면 완성의 가치가 다음 성과로 이어집니다.',
      reversedBeginner: '마무리가 느슨해져 성취감이 반감될 수 있습니다.',
      reversedIntermediate: '종결 기준이 불명확하면 다음 단계 진입이 지연되므로 완료 조건을 명시해야 합니다.',
      loveFocus: '관계에서는 현재 단계의 성과와 한계를 함께 정리할 때 다음 합의가 선명해집니다.',
      careerFocus: '업무에서는 완료 정의와 인수인계 기준을 명확히 해야 주기 완결의 효과가 극대화됩니다.'
    }
  };

  if (card.arcana === 'major' && majorProfiles[card.name]) {
    return majorProfiles[card.name];
  }
  if (card.arcana === 'minor') {
    return buildMinorProfile(card, defaultProfile);
  }
  return defaultProfile;
}

function buildMinorProfile(card, defaultProfile) {
  const suitProfiles = {
    Wands: {
      core: '행동력과 추진을 현실 행동으로 전환하는',
      symbol: '완드의 불 원소는 시작 에너지와 추진 속도를 높이지만 과열 리스크도 함께 키웁니다.',
      love: '관계에서는 감정의 온도를 올리되, 상대의 속도와 합을 맞추는 조율이 필요합니다.',
      career: '일/학업에서는 아이디어보다 실행 속도와 완주율 관리가 성과를 좌우합니다.'
    },
    Cups: {
      core: '감정 흐름과 관계 신호를 안정적으로 다루는',
      symbol: '컵의 물 원소는 공감과 연결을 강화하지만 경계가 흐려질 때 소모가 커질 수 있습니다.',
      love: '관계에서는 감정 공감과 요청 전달의 균형을 맞출수록 신뢰가 안정됩니다.',
      career: '일/학업에서는 팀 분위기와 소통 품질이 실제 성과 변동에 직접 영향을 줍니다.'
    },
    Swords: {
      core: '판단력과 의사소통 정확도를 높여야 하는',
      symbol: '소드의 공기 원소는 명확한 사고를 돕지만 과도한 경직이나 비판으로 번질 수 있습니다.',
      love: '관계에서는 해석보다 사실 확인을 우선해야 불필요한 갈등을 줄일 수 있습니다.',
      career: '일/학업에서는 문제 정의와 기준 문서화가 재작업 비용을 크게 낮춥니다.'
    },
    Pentacles: {
      core: '자원 운영과 현실 성과를 축적해야 하는',
      symbol: '펜타클의 흙 원소는 안정과 축적에 강하지만 변화 대응이 늦어질 때 기회비용이 생깁니다.',
      love: '관계에서는 말보다 일상적 이행과 책임 분담이 안정감을 만듭니다.',
      career: '일/학업에서는 속도보다 지속 가능한 운영과 누적 결과 관리가 핵심입니다.'
    }
  };

  const rankProfiles = {
    Ace: {
      core: '가능성의 씨앗을 작게라도 심어야 하는',
      uprightBeginner: '작은 시작 1개를 바로 실행하면 흐름이 붙기 쉽습니다.',
      uprightIntermediate: '초기 가설을 짧은 주기 실험으로 검증하면 확장 정확도가 올라갑니다.',
      reversedBeginner: '시작을 미루거나 기대만 커져 실행이 지연될 수 있습니다.',
      reversedIntermediate: '과도한 초기 기대가 자원 배치 오류로 이어질 수 있어 범위 통제가 필요합니다.'
    },
    Two: {
      core: '선택과 균형을 맞춰야 하는',
      uprightBeginner: '두 선택지 중 기준 1개만 먼저 정하면 결정이 쉬워집니다.',
      uprightIntermediate: '트레이드오프를 수치화해 균형점을 찾으면 재결정 비용이 줄어듭니다.',
      reversedBeginner: '우유부단으로 타이밍을 놓칠 수 있습니다.',
      reversedIntermediate: '균형 집착이 오히려 실행 지연을 만들 수 있어 우선순위 고정이 필요합니다.'
    },
    Three: {
      core: '협업과 확장을 준비해야 하는',
      uprightBeginner: '혼자 하던 방식을 공유 가능한 형태로 바꾸면 성장 폭이 커집니다.',
      uprightIntermediate: '협업 인터페이스를 명확히 설계하면 확장 비용을 크게 줄일 수 있습니다.',
      reversedBeginner: '역할 혼선으로 협업 피로가 커질 수 있습니다.',
      reversedIntermediate: '책임 경계 불명확이 병목을 만들 수 있어 계약/정의가 필요합니다.'
    },
    Four: {
      core: '구조를 안정화해 기반을 다져야 하는',
      uprightBeginner: '기본 루틴을 고정하면 흔들림이 빠르게 줄어듭니다.',
      uprightIntermediate: '안정 구간에서 표준화하면 이후 변동 대응력이 올라갑니다.',
      reversedBeginner: '고정된 방식에 갇혀 답답함이 생길 수 있습니다.',
      reversedIntermediate: '과도한 보수성으로 개선 타이밍을 놓칠 위험이 있습니다.'
    },
    Five: {
      core: '충돌과 손실을 관리하며 재정비해야 하는',
      uprightBeginner: '갈등을 피하기보다 핵심 쟁점 1개를 명확히 꺼내는 편이 낫습니다.',
      uprightIntermediate: '손실 원인을 구조적으로 분해하면 회복 계획 수립이 빨라집니다.',
      reversedBeginner: '감정 소모가 커져 판단이 흐려질 수 있습니다.',
      reversedIntermediate: '방어적 대응이 길어지면 회복 속도가 더 늦어질 수 있습니다.'
    },
    Six: {
      core: '회복과 흐름 회귀를 안정적으로 만들어야 하는',
      uprightBeginner: '작은 회복 신호를 놓치지 않으면 흐름이 다시 살아납니다.',
      uprightIntermediate: '회복 구간 지표를 분리 관리하면 반등 품질을 높일 수 있습니다.',
      reversedBeginner: '과거 패턴으로 되돌아가 진전이 더뎌질 수 있습니다.',
      reversedIntermediate: '회복 착시를 경계하고 지속 조건을 확인해야 합니다.'
    },
    Seven: {
      core: '점검과 전략 수정을 통해 정렬해야 하는',
      uprightBeginner: '지금 방식이 맞는지 체크리스트로 점검하면 오류가 줄어듭니다.',
      uprightIntermediate: '전략 가정의 유효기간을 설정하면 수정 타이밍을 놓치지 않습니다.',
      reversedBeginner: '의심이 커져 실행 자체를 멈출 수 있습니다.',
      reversedIntermediate: '전술 과다로 큰 방향을 잃을 수 있어 상위 목표 재고정이 필요합니다.'
    },
    Eight: {
      core: '반복 훈련과 숙련을 축적해야 하는',
      uprightBeginner: '반복이 지루해도 숙련 구간은 꾸준함이 답입니다.',
      uprightIntermediate: '피드백 루프를 짧게 돌릴수록 실력 상승 곡선이 가팔라집니다.',
      reversedBeginner: '같은 실수를 반복하며 자신감이 떨어질 수 있습니다.',
      reversedIntermediate: '반복은 많지만 개선률이 낮을 수 있어 훈련 설계 전환이 필요합니다.'
    },
    Nine: {
      core: '완성 직전 조율이 필요한',
      uprightBeginner: '거의 끝난 만큼 마무리 품질 점검이 중요합니다.',
      uprightIntermediate: '완성 직전 리스크를 줄이는 미세 조정이 전체 성과를 좌우합니다.',
      reversedBeginner: '막판 불안으로 과도하게 손보며 흐름을 해칠 수 있습니다.',
      reversedIntermediate: '과최적화로 일정/비용이 늘어날 수 있어 종료 기준 고정이 필요합니다.'
    },
    Ten: {
      core: '주기를 완결하고 다음 단계로 넘겨야 하는',
      uprightBeginner: '끝맺음을 분명히 하면 다음 시작이 쉬워집니다.',
      uprightIntermediate: '완료 정의와 인수인계를 구조화하면 성과 재현성이 높아집니다.',
      reversedBeginner: '마무리가 느슨해 피로가 누적될 수 있습니다.',
      reversedIntermediate: '완결 지연이 전체 사이클 효율을 떨어뜨릴 수 있습니다.'
    },
    Page: {
      core: '탐색과 학습을 실제 경험으로 연결해야 하는',
      uprightBeginner: '처음이라도 시도 횟수를 늘리면 감이 빠르게 잡힙니다.',
      uprightIntermediate: '학습 로그를 남기면 탐색 품질과 전이 학습 속도가 올라갑니다.',
      reversedBeginner: '호기심은 큰데 실행이 산만해질 수 있습니다.',
      reversedIntermediate: '기초 검증 없이 확장하면 학습 부채가 빠르게 커질 수 있습니다.'
    },
    Knight: {
      core: '추진력을 관리하며 실험을 전진시켜야 하는',
      uprightBeginner: '속도가 붙을 때 방향 체크를 병행하면 실수를 줄일 수 있습니다.',
      uprightIntermediate: '실험 단위를 통제하면 추진력과 품질을 함께 유지할 수 있습니다.',
      reversedBeginner: '급한 추진으로 마찰이나 누락이 생길 수 있습니다.',
      reversedIntermediate: '속도 편향이 리스크 노출을 키울 수 있어 제동 규칙이 필요합니다.'
    },
    Queen: {
      core: '내면화와 성숙으로 운영 안정성을 높여야 하는',
      uprightBeginner: '급히 흔들리기보다 중심을 지키는 태도가 유리합니다.',
      uprightIntermediate: '정서/상황 신호를 함께 읽어 의사결정 정밀도를 높일 수 있습니다.',
      reversedBeginner: '감정 기복으로 흐름이 들쭉날쭉해질 수 있습니다.',
      reversedIntermediate: '내부 기준 과신이 외부 피드백 차단으로 이어질 수 있습니다.'
    },
    King: {
      core: '책임 운영과 의사결정 일관성을 확보해야 하는',
      uprightBeginner: '결정한 기준을 끝까지 지키면 결과가 안정됩니다.',
      uprightIntermediate: '권한과 책임의 경계를 명확히 해야 운영 효율이 높아집니다.',
      reversedBeginner: '통제 과다나 책임 회피가 동시에 나타날 수 있습니다.',
      reversedIntermediate: '결정 피로가 누적되면 판단 품질이 떨어져 위임 설계가 필요합니다.'
    }
  };

  const suit = suitProfiles[card.suit] || suitProfiles.Wands;
  const rank = rankProfiles[card.rank] || rankProfiles.Page;
  const nuance = getMinorSuitRankNuance(card.suit, card.rank);
  const keyword0 = card.keywords?.[0] || '핵심';
  const keyword1 = card.keywords?.[1] || keyword0;

  return {
    ...defaultProfile,
    coreFocus: `${card.suitKo} ${card.rankKo} 카드는 ${suit.core} 시점입니다. ${rank.core} 구간입니다. ${nuance.core}`,
    symbolFocus: `${suit.symbol} ${nuance.symbol}`,
    uprightBeginner: `${rank.uprightBeginner} "${keyword0}" 키워드를 하루 행동 1개에 연결해 보세요. ${nuance.upright}`,
    uprightIntermediate: `${rank.uprightIntermediate} "${keyword0}" 키워드가 실제 성과 지표로 남는지 확인하세요. ${nuance.upright}`,
    reversedBeginner: `${rank.reversedBeginner} "${keyword1}" 주제를 무리 없이 다시 세우는 것이 우선입니다. ${nuance.reversed}`,
    reversedIntermediate: `${rank.reversedIntermediate} 내부/외부 원인을 분리해 교정 우선순위를 정하세요. ${nuance.reversed}`,
    loveFocus: `${suit.love} ${card.rankKo} 단계에서는 "${keyword1}" 키워드가 관계 온도 조절의 핵심 변수입니다. ${nuance.love}`,
    careerFocus: `${suit.career} ${card.rankKo} 단계에서는 "${keyword0}" 키워드를 완료 기준으로 문서화해야 효과가 큽니다. ${nuance.career}`
  };
}

function getMinorSuitRankNuance(suit, rank) {
  const defaultNuance = {
    core: '현재 흐름에 맞는 작고 구체적인 행동 정의가 품질을 좌우합니다.',
    symbol: '카드 상징을 추상어로 두지 말고 오늘의 행동 문장으로 번역해 보세요.',
    upright: '오늘 안에 확인 가능한 단위로 실행하면 카드 메시지가 훨씬 선명해집니다.',
    reversed: '문제를 크게 해석하기보다 재현 가능한 원인 1개를 먼저 잡는 편이 유리합니다.',
    love: '상대 해석보다 합의 가능한 행동 약속을 먼저 세우면 흔들림이 줄어듭니다.',
    career: '성과 정의를 수치나 증거 기반으로 고정하면 의사결정 편차를 줄일 수 있습니다.'
  };

  const bySuit = {
    Wands: {
      Ace: {
        core: '아이디어 점화를 실제 첫 실행으로 연결하는 순간이 핵심입니다.',
        symbol: '불씨를 키우되 번지지 않게 범위를 통제해야 합니다.',
        upright: '첫 시도는 완성보다 착수가 중요합니다.',
        reversed: '열정 분산을 막기 위해 목표를 1개로 제한하세요.',
        love: '설렘 표현은 빠르게, 약속 속도는 천천히 맞추는 편이 좋습니다.',
        career: '새 과제는 착수 시각과 완료 기준을 동시에 정해 두세요.'
      },
      Two: {
        core: '확장과 보류 사이 균형점을 잡는 판단이 중요합니다.',
        symbol: '불 원소의 팽창을 제어하면 선택 오류를 줄일 수 있습니다.',
        upright: 'A/B 비교 기준을 하나로 고정해 보세요.',
        reversed: '욕심이 커질수록 실행 우선순위를 잃기 쉽습니다.',
        love: '밀당보다 관계 속도 합의가 먼저입니다.',
        career: '동시 진행 과제를 줄이면 성과 밀도가 올라갑니다.'
      },
      Three: {
        core: '개인 추진력을 팀 확장 구조로 전환하는 구간입니다.',
        symbol: '성장 신호가 보일 때 협업 인터페이스를 정해야 합니다.',
        upright: '역할 분담을 한 문장으로 명확히 하세요.',
        reversed: '협업 기대치 불일치가 마찰을 키울 수 있습니다.',
        love: '관계에서도 함께 그리는 계획이 중요해집니다.',
        career: '성과 공유 방식(보고/리뷰)을 먼저 정하면 속도가 납니다.'
      },
      Four: {
        core: '축적한 추진력을 안정된 기반으로 고정해야 하는 시점입니다.',
        symbol: '불의 에너지를 구조 안에 담아야 지속성이 생깁니다.',
        upright: '고정 루틴 1개를 만들어 보세요.',
        reversed: '안정 욕구가 도전을 과도하게 막을 수 있습니다.',
        love: '관계의 안전감을 만드는 반복 행동이 필요합니다.',
        career: '반복 가능한 실행 패턴을 표준화해 두세요.'
      },
      Five: {
        core: '경쟁과 충돌을 학습 에너지로 전환해야 하는 구간입니다.',
        symbol: '마찰은 실패가 아니라 조정 포인트를 드러냅니다.',
        upright: '갈등 원인 1개를 사실로 정리하세요.',
        reversed: '승부욕 과잉이 협업 관계를 해칠 수 있습니다.',
        love: '감정 싸움보다 대화 규칙을 먼저 세우세요.',
        career: '논쟁은 결론·근거·담당으로 마무리해야 합니다.'
      },
      Six: {
        core: '추진력의 성과를 가시화해 다음 동력으로 연결하는 단계입니다.',
        symbol: '인정받는 흐름에서 오만을 경계해야 합니다.',
        upright: '작은 승리 기록이 자신감을 지탱합니다.',
        reversed: '성과 집착이 팀 균형을 무너뜨릴 수 있습니다.',
        love: '칭찬과 인정의 표현이 관계 온도를 높입니다.',
        career: '성과를 공개 기준으로 공유하면 동력이 유지됩니다.'
      },
      Seven: {
        core: '방어와 고집 사이에서 전략적 버팀을 선택해야 합니다.',
        symbol: '높은 위치는 우위이자 피로의 시작점일 수 있습니다.',
        upright: '지킬 기준 1개를 분명히 하세요.',
        reversed: '방어 과잉은 기회 상실로 이어질 수 있습니다.',
        love: '감정 방어벽을 낮추는 대화가 필요합니다.',
        career: '우선순위 재정렬 없이는 소모전이 길어집니다.'
      },
      Eight: {
        core: '기회 타이밍을 놓치지 않는 속도 조절이 중요합니다.',
        symbol: '빠른 전개일수록 명확한 의사결정 규칙이 필요합니다.',
        upright: '결정 지연을 줄이면 흐름이 붙습니다.',
        reversed: '성급한 이동이 누락을 만들 수 있습니다.',
        love: '빠른 감정 전개엔 경계 합의가 필요합니다.',
        career: '짧은 주기 점검으로 품질 저하를 막으세요.'
      },
      Nine: {
        core: '지친 상태에서도 포기하지 않는 마지막 버팀이 핵심입니다.',
        symbol: '방어 자세는 경험의 축적을 보여줍니다.',
        upright: '휴식과 실행의 간격을 설계하세요.',
        reversed: '피로 누적이 과민 반응으로 나타날 수 있습니다.',
        love: '상처 반응을 인정하면 갈등이 줄어듭니다.',
        career: '막판엔 품질보다 지속 가능성을 우선하세요.'
      },
      Ten: {
        core: '과부하 신호를 읽고 부담 구조를 재배치해야 합니다.',
        symbol: '불 원소가 과적되면 추진이 아니라 소진으로 바뀝니다.',
        upright: '짐을 분산하면 완주율이 올라갑니다.',
        reversed: '책임 과잉이 의욕 저하를 만들 수 있습니다.',
        love: '관계 짐을 혼자 지지 않도록 분담하세요.',
        career: '업무 과부하는 우선순위 재설계로 풀어야 합니다.'
      },
      Page: {
        core: '새로운 영감과 실험을 빠르게 테스트해야 하는 단계입니다.',
        symbol: '호기심은 자산이지만 방향 없는 시도는 소모가 됩니다.',
        upright: '짧은 실험 1회를 바로 실행하세요.',
        reversed: '흥미 위주 선택으로 완성이 늦어질 수 있습니다.',
        love: '설렘 전달은 좋지만 과장 표현은 줄이세요.',
        career: '아이디어는 검증 루프 안에서 관리하세요.'
      },
      Knight: {
        core: '강한 추진력을 제어 가능한 전진으로 바꿔야 합니다.',
        symbol: '속도는 장점이지만 제동장치 없는 질주는 위험합니다.',
        upright: '목표를 향해 밀되 점검 주기를 지키세요.',
        reversed: '성급함이 관계·성과 마찰을 키울 수 있습니다.',
        love: '강한 표현 전에 상대 수용도를 확인하세요.',
        career: '실행 속도와 품질 기준을 동시에 명시하세요.'
      },
      Queen: {
        core: '열정을 내면화해 안정적인 영향력으로 전환하는 단계입니다.',
        symbol: '불의 에너지를 성숙하게 다루면 지속성이 생깁니다.',
        upright: '감정 기복보다 꾸준함을 선택하세요.',
        reversed: '의욕 저하가 길어지면 동력이 꺼질 수 있습니다.',
        love: '따뜻함을 유지하되 경계를 분명히 하세요.',
        career: '팀 동기 관리가 성과 지속성을 만듭니다.'
      },
      King: {
        core: '비전과 실행을 통합해 책임 있게 리드해야 하는 단계입니다.',
        symbol: '통제된 불은 조직을 움직이는 동력이 됩니다.',
        upright: '결정 기준을 명확히 공표하세요.',
        reversed: '독단이 커지면 실행 반발이 늘어납니다.',
        love: '주도권보다 상호 존중의 리듬이 중요합니다.',
        career: '리더십은 방향 제시와 자원 배분의 정밀도에서 드러납니다.'
      }
    },
    Cups: {
      Ace: { core: '감정의 새 흐름이 열리는 시점입니다.', symbol: '감정 수용력은 관계 회복의 출발점입니다.', upright: '진심 표현 1개를 먼저 해보세요.', reversed: '감정 과잉/회피를 동시에 경계하세요.', love: '호감 표현은 구체적일수록 전달됩니다.', career: '팀 공감대 형성이 실행 저항을 줄입니다.' },
      Two: { core: '상호 교감과 1:1 정렬이 핵심입니다.', symbol: '대칭 관계의 균형이 품질을 좌우합니다.', upright: '합의 문장 1개를 명확히 하세요.', reversed: '기대치 불일치가 상처를 키울 수 있습니다.', love: '서로 원하는 속도를 맞춰보세요.', career: '협업 파트너와 기준을 선명히 맞추세요.' },
      Three: { core: '정서적 확장과 연대가 강화되는 구간입니다.', symbol: '즐거움은 연결을 만들지만 분산도 만들 수 있습니다.', upright: '기쁨을 공유하되 경계를 지키세요.', reversed: '관계 소음이 본질을 흐릴 수 있습니다.', love: '함께 즐기는 시간이 신뢰를 키웁니다.', career: '팀 시너지는 역할 명확화와 함께 갈 때 오래갑니다.' },
      Four: { core: '감정 포화 속에서 의미 재탐색이 필요한 시점입니다.', symbol: '무감동은 거절이 아니라 재정렬 신호일 수 있습니다.', upright: '무기력의 원인을 한 줄로 적어보세요.', reversed: '놓친 기회를 뒤늦게 볼 수 있습니다.', love: '권태 신호를 대화로 전환하세요.', career: '동기 저하 원인을 과제 설계에서 점검하세요.' },
      Five: { core: '상실 감정을 건강하게 소화해야 하는 구간입니다.', symbol: '남은 자원을 보는 시선 전환이 회복을 만듭니다.', upright: '잃은 것과 남은 것을 분리하세요.', reversed: '슬픔 회피가 회복 지연을 만듭니다.', love: '미련보다 회복 행동을 먼저 정하세요.', career: '실패 복기는 책임 추궁보다 학습 정리에 집중하세요.' },
      Six: { core: '과거 정서와 현재 행동을 연결해 회복하는 단계입니다.', symbol: '추억은 위안이지만 회귀 고정은 위험합니다.', upright: '좋았던 패턴을 현재에 맞게 재사용하세요.', reversed: '과거 미화가 현재 판단을 가릴 수 있습니다.', love: '과거 얘기는 현재 약속으로 연결하세요.', career: '이전 성공 패턴을 현재 조건에 맞게 수정하세요.' },
      Seven: { core: '감정적 선택지가 많아 분별력이 필요한 구간입니다.', symbol: '환상과 현실 구분이 핵심 과제입니다.', upright: '가능성 목록을 줄여 우선순위를 정하세요.', reversed: '달콤한 선택이 실행력을 갉아먹을 수 있습니다.', love: '기대와 현실을 문장으로 분리하세요.', career: '아이디어 풀을 평가 기준으로 선별하세요.' },
      Eight: { core: '정서적 거리두기와 다음 단계 이동이 필요한 시점입니다.', symbol: '떠남은 포기가 아니라 성장 전환일 수 있습니다.', upright: '정리할 관계/습관 1개를 선택하세요.', reversed: '미련 때문에 전환이 지연될 수 있습니다.', love: '관계 방향을 솔직히 재합의하세요.', career: '현 구조의 한계를 인정하고 재배치를 추진하세요.' },
      Nine: { core: '정서적 만족과 감사가 성숙하게 쌓이는 구간입니다.', symbol: '만족은 성취의 신호지만 안주 경계가 필요합니다.', upright: '성취를 인정하고 다음 목표를 가볍게 정하세요.', reversed: '과욕이 만족을 잠식할 수 있습니다.', love: '고마움 표현이 관계 만족도를 높입니다.', career: '성과 보상과 다음 과제를 균형 있게 설계하세요.' },
      Ten: { core: '관계 완결성과 정서적 안정의 정점에 가까운 단계입니다.', symbol: '지속 가능한 행복은 일상 운영에서 완성됩니다.', upright: '함께 유지할 루틴을 합의하세요.', reversed: '겉평화 아래 미해결 이슈가 남을 수 있습니다.', love: '가족/장기 관계의 역할 합의가 중요합니다.', career: '팀 안정감을 해치지 않는 성과 운영이 필요합니다.' },
      Page: { core: '감정 학습과 공감 탐색이 시작되는 단계입니다.', symbol: '작은 감정 신호를 읽는 능력이 자랍니다.', upright: '느낀 점을 짧게 기록해 보세요.', reversed: '감정 과해석으로 오해가 생길 수 있습니다.', love: '섬세한 표현이 호감을 키웁니다.', career: '피드백 수용 태도가 성장 속도를 높입니다.' },
      Knight: { core: '감정을 행동으로 전달하는 추진 단계입니다.', symbol: '로맨틱한 에너지와 현실 조율이 동시에 필요합니다.', upright: '진심 전달은 구체적 행동과 함께 하세요.', reversed: '감정 과몰입이 현실 판단을 흐릴 수 있습니다.', love: '고백/제안은 시점과 맥락을 맞추세요.', career: '관계 중심 설득은 실행 계획과 함께 제시하세요.' },
      Queen: { core: '깊은 공감과 내면 안정으로 관계를 지지하는 단계입니다.', symbol: '정서적 수용력은 치유와 연결의 기반입니다.', upright: '감정 경청이 해법을 열 수 있습니다.', reversed: '감정 흡수 과다로 소진될 수 있습니다.', love: '돌봄과 경계 설정을 같이 가져가세요.', career: '팀 정서 관리를 하되 역할 경계는 분명히 하세요.' },
      King: { core: '감정을 성숙하게 운영하며 신뢰를 만드는 단계입니다.', symbol: '안정된 정서는 리더십의 중요한 기반입니다.', upright: '차분한 판단이 관계 신뢰를 높입니다.', reversed: '감정 억압이 거리감을 만들 수 있습니다.', love: '공감과 결정의 균형을 맞추세요.', career: '감정 리더십과 업무 기준을 함께 운영하세요.' }
    },
    Swords: {
      Ace: { core: '판단의 선명함이 열리는 시작 구간입니다.', symbol: '사실 기반 사고가 혼선을 줄입니다.', upright: '문제 정의를 한 문장으로 고정하세요.', reversed: '성급한 단정이 오류를 키울 수 있습니다.', love: '추측보다 확인 질문을 우선하세요.', career: '핵심 이슈를 명확히 선언하고 시작하세요.' },
      Two: { core: '결정을 미루기 쉬운 균형 구간입니다.', symbol: '정적은 평화처럼 보여도 결단 지연일 수 있습니다.', upright: '결정 데드라인을 먼저 정하세요.', reversed: '회피가 길어질수록 비용이 커집니다.', love: '침묵 대신 입장 표명이 필요합니다.', career: '의사결정 기준을 문서로 남기세요.' },
      Three: { core: '상처 인식과 진실 수용이 필요한 구간입니다.', symbol: '아픈 사실을 회피하면 회복이 늦어집니다.', upright: '불편한 사실 1개를 인정하세요.', reversed: '상처 재생산 패턴을 끊어야 합니다.', love: '감정 상처를 사실로 정리해 대화하세요.', career: '실패 원인을 명확히 기록해 재발을 막으세요.' },
      Four: { core: '휴식과 재정비로 판단력을 회복해야 하는 시점입니다.', symbol: '멈춤은 비효율이 아니라 복구 전략입니다.', upright: '강제 휴식 시간을 확보하세요.', reversed: '과로가 지속되면 판단 품질이 급락합니다.', love: '갈등 후 재정비 시간을 합의하세요.', career: '리프레시 없는 질주는 품질 저하를 부릅니다.' },
      Five: { core: '승패 집착을 내려놓고 손실을 최소화해야 하는 구간입니다.', symbol: '이긴 논쟁이 진 전략이 될 수 있습니다.', upright: '핵심 손실을 먼저 계산하세요.', reversed: '자존심 싸움이 관계/성과를 동시에 해칩니다.', love: '이기려는 말보다 회복 문장이 필요합니다.', career: '갈등 해결의 목표를 성과 회복으로 고정하세요.' },
      Six: { core: '혼란을 벗어나 안정 구간으로 이동하는 단계입니다.', symbol: '이동은 도피가 아니라 재배치일 수 있습니다.', upright: '이전 대비 안정 지표를 확인하세요.', reversed: '미정리 이슈가 발목을 잡을 수 있습니다.', love: '거리 조절과 안전한 대화 환경이 필요합니다.', career: '전환 계획에 리스크 완충 장치를 넣으세요.' },
      Seven: { core: '전략적 대응과 정보 비대칭 관리가 필요한 구간입니다.', symbol: '영리함은 유효하지만 신뢰 손실을 동반할 수 있습니다.', upright: '숨길 것과 공유할 것을 분리하세요.', reversed: '단기 이득이 장기 신뢰를 깎을 수 있습니다.', love: '회피성 소통을 줄여야 오해가 줄어듭니다.', career: '전략은 윤리·신뢰 기준 안에서 운용하세요.' },
      Eight: { core: '인지적 제약을 풀고 선택 가능성을 회복해야 하는 단계입니다.', symbol: '묶임의 상당수는 해석 프레임에서 발생합니다.', upright: '가능한 선택지를 다시 적어보세요.', reversed: '자기 제한 문장이 행동을 막을 수 있습니다.', love: '고정관념을 내려놓고 사실을 확인하세요.', career: '막힌 문제는 가정 변경으로 풀릴 수 있습니다.' },
      Nine: { core: '불안과 과잉 사고를 관리해야 하는 구간입니다.', symbol: '야간 사고 루프는 현실보다 크게 느껴질 수 있습니다.', upright: '걱정 항목을 행동 항목으로 바꾸세요.', reversed: '불안 회피가 문제를 더 키울 수 있습니다.', love: '불안 투사를 줄이고 요청을 분명히 하세요.', career: '리스크 리스트와 대응안을 1:1로 매칭하세요.' },
      Ten: { core: '한계 지점을 인정하고 회복 경로를 설계해야 하는 단계입니다.', symbol: '끝은 손실이자 재시작의 기준점입니다.', upright: '완전히 끝낼 것을 정해 정리하세요.', reversed: '소진 부정을 멈추고 회복 계획을 세우세요.', love: '감정 바닥을 인정해야 회복 대화가 시작됩니다.', career: '실패 데이터를 회복 로드맵으로 전환하세요.' },
      Page: { core: '새 관점과 학습 사고가 열리는 탐색 구간입니다.', symbol: '질문 품질이 성장 속도를 결정합니다.', upright: '좋은 질문 1개를 만들고 검증하세요.', reversed: '정보 과잉으로 본질을 놓칠 수 있습니다.', love: '말의 뉘앙스를 확인해 오해를 줄이세요.', career: '학습 노트를 구조화하면 판단력이 빨리 늡니다.' },
      Knight: { core: '강한 주장과 속도 있는 판단이 등장하는 단계입니다.', symbol: '결단력은 강점이지만 충돌 리스크를 동반합니다.', upright: '핵심 메시지를 간결하게 전달하세요.', reversed: '직선적 태도가 관계 저항을 키울 수 있습니다.', love: '정확한 말과 배려의 톤을 같이 챙기세요.', career: '빠른 추진 전 이해관계자 정렬이 필요합니다.' },
      Queen: { core: '명확함과 통찰로 기준을 세우는 성숙 단계입니다.', symbol: '냉정함은 단절이 아니라 명료함의 기술입니다.', upright: '감정과 사실을 분리해 판단하세요.', reversed: '비판 과잉이 협업을 경직시킬 수 있습니다.', love: '솔직함은 유지하되 상처 표현은 줄이세요.', career: '기준 중심 피드백이 팀 품질을 높입니다.' },
      King: { core: '전략적 판단과 구조적 의사결정이 핵심인 단계입니다.', symbol: '논리 체계는 복잡한 문제를 단순화합니다.', upright: '결정 원칙을 먼저 선언하세요.', reversed: '논리 과신이 현실 맥락을 누락할 수 있습니다.', love: '원칙과 공감을 함께 가져가세요.', career: '전략 문서화로 의사결정 일관성을 확보하세요.' }
    },
    Pentacles: {
      Ace: { core: '현실 자원 기반의 시작점이 열리는 구간입니다.', symbol: '가능성은 자원 확보와 실행 설계에서 현실화됩니다.', upright: '작은 투자/행동을 즉시 실행하세요.', reversed: '기회가 와도 실행 준비가 부족할 수 있습니다.', love: '말보다 실제 배려 행동이 관계를 안정시킵니다.', career: '초기 자원 배분안을 명확히 하세요.' },
      Two: { core: '복수 자원을 균형 운영해야 하는 시점입니다.', symbol: '유연한 리듬이 흔들림 대응력을 만듭니다.', upright: '시간·돈·에너지 균형을 재점검하세요.', reversed: '멀티태스킹 과부하를 경계하세요.', love: '관계와 개인 일정의 균형이 필요합니다.', career: '업무 우선순위를 주기적으로 재배치하세요.' },
      Three: { core: '기술·협업·품질이 결합되는 생산 단계입니다.', symbol: '실력은 협업 구조 속에서 증폭됩니다.', upright: '피드백을 반영해 완성도를 올리세요.', reversed: '평가 기준 불일치가 품질 저하를 부를 수 있습니다.', love: '함께 만드는 경험이 신뢰를 높입니다.', career: '협업 규격과 품질 기준을 먼저 합의하세요.' },
      Four: { core: '자원 보호와 통제 욕구가 커지는 구간입니다.', symbol: '안정 추구는 필요하지만 경직은 기회 상실을 부릅니다.', upright: '지킬 것과 풀어줄 것을 구분하세요.', reversed: '불안 기반 통제가 관계를 좁힐 수 있습니다.', love: '소유감보다 신뢰 기반 경계가 중요합니다.', career: '리스크 관리와 투자 유연성을 함께 유지하세요.' },
      Five: { core: '결핍 체감 속에서 회복 자원을 찾아야 하는 단계입니다.', symbol: '부족함 인식은 도움 요청의 출발점이 될 수 있습니다.', upright: '도움 받을 채널 1개를 확보하세요.', reversed: '수치심이 회복 행동을 막을 수 있습니다.', love: '힘든 상태를 숨기지 말고 공유하세요.', career: '손실 구간에서는 생존 지표를 먼저 지키세요.' },
      Six: { core: '주고받음의 균형과 자원 순환이 중요한 구간입니다.', symbol: '지원은 힘이지만 의존 구조를 만들 수도 있습니다.', upright: '지원의 조건과 기간을 명확히 하세요.', reversed: '불균형 교환이 관계 피로를 키울 수 있습니다.', love: '배려의 균형을 점검하세요.', career: '지원/성과의 교환 구조를 투명하게 설계하세요.' },
      Seven: { core: '투입 대비 회수 시점을 점검해야 하는 단계입니다.', symbol: '기다림은 수동이 아니라 전략적 관찰입니다.', upright: '성과 측정 기준을 재확인하세요.', reversed: '조급함으로 성급한 결정을 내릴 수 있습니다.', love: '관계 투자와 기대 회수의 간격을 조율하세요.', career: '중간 평가 없이 지속 투자하지 마세요.' },
      Eight: { core: '숙련을 실무 성과로 축적하는 구간입니다.', symbol: '정교한 반복이 경쟁력을 만듭니다.', upright: '작업 품질 체크리스트를 운영하세요.', reversed: '반복 피로로 품질 하락이 생길 수 있습니다.', love: '작은 실천의 꾸준함이 신뢰를 만듭니다.', career: '숙련 지표(속도·오류율)를 함께 추적하세요.' },
      Nine: { core: '자립성과 결과 안정성이 높아지는 성숙 단계입니다.', symbol: '독립은 성취이지만 고립으로 흐르지 않게 관리해야 합니다.', upright: '성과를 즐기되 유지 전략을 세우세요.', reversed: '성취 과시가 관계 거리를 만들 수 있습니다.', love: '자립성과 친밀감의 균형이 중요합니다.', career: '성과 유지 비용을 미리 계산해 두세요.' },
      Ten: { core: '장기 안정과 유산 구조를 설계하는 완결 단계입니다.', symbol: '축적된 자원은 운영 구조가 있을 때 가치가 커집니다.', upright: '장기 운영 원칙을 문서화하세요.', reversed: '형식적 안정이 실제 취약성을 가릴 수 있습니다.', love: '가족/장기 계획의 역할 분담을 명확히 하세요.', career: '장기 포트폴리오와 위험 분산을 점검하세요.' },
      Page: { core: '현실 감각 기반의 학습 시작점이 열리는 단계입니다.', symbol: '작은 실습이 큰 신뢰를 만듭니다.', upright: '배운 것을 바로 적용해 보세요.', reversed: '준비만 하다 실행을 놓칠 수 있습니다.', love: '사소한 배려 행동이 관계를 바꿉니다.', career: '기초 역량을 빠르게 실무에 연결하세요.' },
      Knight: { core: '꾸준함과 성실함으로 결과를 쌓아야 하는 단계입니다.', symbol: '느려 보여도 누적이 강한 카드입니다.', upright: '정해진 루틴을 묵직하게 지키세요.', reversed: '관성화로 개선을 놓칠 수 있습니다.', love: '약속 이행의 일관성이 신뢰를 만듭니다.', career: '안정 실행과 개선 실행을 분리 운영하세요.' },
      Queen: { core: '현실 감각과 돌봄 운영이 동시에 필요한 성숙 단계입니다.', symbol: '실용적 돌봄은 주변 안정성을 높입니다.', upright: '실행 가능한 배려를 설계하세요.', reversed: '돌봄 과부하로 자기 소진이 생길 수 있습니다.', love: '생활 리듬을 맞추는 배려가 중요합니다.', career: '운영 안정성과 팀 케어를 함께 챙기세요.' },
      King: { core: '자원 통제와 책임 경영이 핵심인 리더 단계입니다.', symbol: '현실 리더십은 숫자와 사람을 함께 다룹니다.', upright: '장기 기준과 단기 실행을 연결하세요.', reversed: '안전 집착이 혁신 지연을 만들 수 있습니다.', love: '안정 제공과 감정 소통을 같이 가져가세요.', career: '재무/운영 지표 기반 의사결정을 고도화하세요.' }
    }
  };

  return bySuit[suit]?.[rank] ?? defaultNuance;
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
    sections[key] = enforceMinLines(raw[key].trim());
  }
  return {
    cardId,
    source: 'generated',
    sections
  };
}

function enforceMinLines(text, minLines = 3) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= minLines) {
    return lines.join('\n');
  }

  const sentenceLines = String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const merged = sentenceLines.length > lines.length ? sentenceLines : lines;

  while (merged.length < minLines) {
    merged.push('실전 적용은 작은 행동 단위로 검증해 보세요.');
  }
  return merged.join('\n');
}

export async function buildCardExplanation({ cardId, level, context, cache, externalGenerator }) {
  const card = getCardById(cardId);
  if (!card) return null;

  const cacheKey = `explain:v5:${cardId}:${level}:${context || ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, source: 'cache' };
  const fallback = buildFallbackExplanation(card, level, context);

  if (!externalGenerator) {
    cache.set(cacheKey, fallback);
    return fallback;
  }

  const generatedFast = await tryGenerateWithTimeout({
    externalGenerator,
    card,
    level,
    context,
    timeoutMs: 350
  });
  const normalizedFast = normalizeExternalSections(generatedFast, cardId);
  if (normalizedFast) {
    cache.set(cacheKey, normalizedFast);
    return normalizedFast;
  }

  cache.set(cacheKey, fallback);
  void Promise.resolve(externalGenerator(card, level, context))
    .then((raw) => {
      const normalized = normalizeExternalSections(raw, cardId);
      if (normalized) {
        cache.set(cacheKey, normalized);
      }
    })
    .catch(() => {});
  return fallback;
}

async function tryGenerateWithTimeout({ externalGenerator, card, level, context, timeoutMs }) {
  let timer = null;
  try {
    return await Promise.race([
      externalGenerator(card, level, context),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  const contextLead = spreadId === 'celtic-cross'
    ? buildCelticCoreLead({ positionName: position.name, seed })
    : buildSpreadCoreLead({ spreadId, positionName: position.name, seed });
  const cardLine = `뽑으신 카드는 '${card.nameKo} ${cardDirection}'입니다.`;
  const meaningLine = spreadId === 'celtic-cross'
    ? buildCelticCoreMeaningLine({ cardName: card.nameKo, positionName: position.name, orientation, focus, mainKeyword })
    : orientation === 'upright'
      ? `${card.nameKo}의 핵심 키워드인 ${mainKeywordSubject} 열려 있어서 ${focus}에 힘을 실어주기 좋은 타이밍입니다.`
      : `${card.nameKo}의 핵심 키워드인 ${mainKeywordSubject} 잠시 막혀 있어서 ${focus}에서는 속도를 조금 늦추고 차분히 조정해보시는 편이 좋겠습니다.`;
  const adviceLine = spreadId === 'celtic-cross'
    ? buildCelticCoreAdviceLine({ positionName: position.name, orientation, contextProfile, seed })
    : buildTarotAdviceLine({ spreadId, positionName: position.name, contextProfile, tone, orientation, seed });
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
  if (spreadId === 'celtic-cross') {
    return buildCelticCrossInterpretation({ card, position, orientation, focus, context, contextProfile, seed });
  }
  const spreadGuide = buildSpreadConsultingGuide({ spreadId, positionName: position.name, positionPrompt, seed });
  const orientationGuide = buildOrientationCounselLine({ spreadId, positionName: position.name, cardName: card.nameKo, orientation, tone, seed });
  const keywordGuide = buildKeywordCounselLine({ card, focus, seed });
  const contextLine = spreadId === 'weekly-fortune'
    ? buildWeeklyContextLine({ positionName: position.name, seed })
    : buildCoreContextLine({ spreadId, positionName: position.name, contextProfile, seed });
  const actionLine = buildTarotActionLine({ spreadId, positionName: position.name, contextProfile, orientation, seed });
  return polishTarotInterpretation([spreadGuide, orientationGuide, keywordGuide, contextLine, actionLine].join(' '));
}

function buildCelticCrossInterpretation({
  card,
  position,
  orientation,
  focus,
  context,
  contextProfile,
  seed
}) {
  const intent = inferCelticQuestionIntent(context);
  const spreadGuide = buildCelticSpreadGuideLine({ positionName: position.name, seed });
  const orientationGuide = buildCelticOrientationLine({ cardName: card.nameKo, positionName: position.name, orientation, intent, seed });
  const keywordGuide = buildCelticKeywordLine({ card, focus, positionName: position.name, seed });
  const actionLine = buildCelticActionLine({ positionName: position.name, orientation, intent, contextProfile, seed });
  return polishTarotInterpretation([spreadGuide, orientationGuide, keywordGuide, actionLine].join(' '));
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
  const yearlyIntent = inferYearlyIntent(context);
  const jobTimingQuestion = yearlyIntent === 'career';
  const intro = buildYearlyMonthIntro({ month, yearlyIntent, seed });
  const cardLine = `${month} 카드로는 '${card.nameKo} ${direction}'이 나왔습니다.`;
  const insight = buildYearlyMonthInsight({ month, card, orientation, yearlyIntent });
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
  const orientationLine = buildYearlyMonthOrientationLine({
    month,
    card,
    orientation,
    yearlyIntent
  });
  const timingLine = buildYearlyMonthTimingLine({
    month,
    monthRole,
    card,
    yearlyIntent,
    orientation,
    jobTimingQuestion
  });
  const close = buildYearlyMonthClose({ month, monthRole, orientation, yearlyIntent });
  return polishTarotInterpretation([orientationLine, timingLine, close].join(' '));
}

function inferYearlyIntent(context = '') {
  const text = String(context || '').toLowerCase();
  if (/(취직|취업|이직|입사|지원|면접|커리어|직장|회사)/.test(text)) return 'career';
  if (/(연애|관계|재회|결혼|상대|썸)/.test(text)) return 'relationship';
  if (/(재정|재물|돈|지출|수입|저축|투자|소비|자산|현금흐름|가계부)/.test(text)) return 'finance';
  return 'general';
}

function buildYearlyMonthInsight({ month, card, orientation, yearlyIntent }) {
  const keyword = card.keywords?.[0] ?? '흐름';
  const monthRole = MONTH_ROLE_GUIDE[month] ?? '해당 달 역할';
  const roleShort = normalizeYearlyMonthRole(monthRole);
  const roleObject = withKoreanParticle(roleShort, '을', '를');
  const cardAxis = describeCardAxis(card, yearlyIntent);
  const orientationLine = orientation === 'upright'
    ? `${month}은 ${keyword} 흐름이 비교적 열려 ${roleObject} 진행하기 좋은 달입니다.`
    : `${month}은 ${keyword} 흐름이 조정 구간이라 ${roleShort}에서는 속도보다 정비가 먼저입니다.`;

  const intentHint = {
    career: orientation === 'upright'
      ? `${cardAxis} 관점에서 보면 준비된 건을 외부 검증(지원/면접)으로 옮기기 좋습니다.`
      : `${cardAxis} 관점에서 보면 실행 폭을 줄이고 서류·답변 완성도를 먼저 끌어올리는 편이 안정적입니다.`,
    relationship: orientation === 'upright'
      ? `${cardAxis} 관점에서는 대화의 문을 여는 시도가 관계 회복에 실제 도움이 될 가능성이 큽니다.`
      : `${cardAxis} 관점에서는 감정 해석을 늦추고 확인 대화를 먼저 두는 편이 오해를 줄입니다.`,
    finance: orientation === 'upright'
      ? `${cardAxis} 관점에서는 수입·지출을 같은 표로 관리할수록 체감 안정성이 올라갑니다.`
      : `${cardAxis} 관점에서는 신규 지출 확대보다 손실 방어와 우선순위 재배치가 먼저입니다.`,
    general: orientation === 'upright'
      ? `${cardAxis} 관점에서 실행 반경을 조금 넓혀도 무리가 적겠습니다.`
      : `${cardAxis} 관점에서 계획을 줄이고 핵심 기준만 남기는 편이 더 안전합니다.`
  };
  return `${orientationLine} ${intentHint[yearlyIntent] ?? intentHint.general}`;
}

function buildYearlyMonthOrientationLine({ month, card, orientation, yearlyIntent }) {
  const cardName = card.nameKo;
  const cardAxis = describeCardAxis(card, yearlyIntent);
  if (yearlyIntent === 'career') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 ${cardAxis} 강점을 실행으로 옮길 여지가 크다는 신호입니다.`
      : `${month}의 ${cardName} 역방향은 ${cardAxis} 구간의 마찰을 먼저 줄여야 다음 달 전개가 편해진다는 신호입니다.`;
  }
  if (yearlyIntent === 'relationship') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 ${cardAxis}을 살린 대화가 관계 흐름을 앞으로 밀 수 있다는 신호입니다.`
      : `${month}의 ${cardName} 역방향은 ${cardAxis} 해석이 엇갈릴 수 있어 확인 대화를 먼저 두라는 신호입니다.`;
  }
  if (yearlyIntent === 'finance') {
    return orientation === 'upright'
      ? `${month}의 ${cardName} 정방향은 ${cardAxis}을 기반으로 재정 운영을 구조화하기 좋은 구간입니다.`
      : `${month}의 ${cardName} 역방향은 ${cardAxis}에서 새는 비용을 점검하라는 경고 신호입니다.`;
  }
  return orientation === 'upright'
    ? `${month}의 ${cardName} 정방향은 ${cardAxis}을 실제 행동으로 연결하기 좋은 구간입니다.`
    : `${month}의 ${cardName} 역방향은 ${cardAxis} 구간에서 속도 조절과 정비가 먼저라는 신호입니다.`;
}

function buildYearlyMonthIntro({ month, yearlyIntent, seed = '' }) {
  const byIntent = {
    career: [
      `${month} 흐름을 먼저 보면, 실행과 보완의 비중을 정하기가 훨씬 쉬워집니다.`,
      `${month}은 커리어 리듬의 강약을 조정하는 구간이라, 핵심 신호부터 짚어보겠습니다.`
    ],
    relationship: [
      `${month} 관계 흐름은 대화 속도와 표현 강도를 맞추는 데 핵심이 됩니다.`,
      `${month}은 관계 리듬의 변화를 확인하는 달이라, 카드 신호를 먼저 보겠습니다.`
    ],
    finance: [
      `${month} 재정 흐름은 지출 통제와 확장 판단의 기준이 되는 달입니다.`,
      `${month}은 돈의 흐름을 정비할지 확장할지 가르는 구간이라, 핵심 신호를 먼저 보겠습니다.`
    ],
    general: [
      `${month} 흐름을 먼저 점검하면 연간 리듬에서 무리 없는 선택이 쉬워집니다.`,
      `${month}은 연간 전개의 강약을 조정하는 구간이라, 핵심 신호부터 확인해보겠습니다.`
    ]
  };
  const lines = byIntent[yearlyIntent] ?? byIntent.general;
  return pickVariant(`${seed}:yearly-month-intro:${month}:${yearlyIntent}`, lines);
}

function buildYearlyMonthTimingLine({ month, monthRole, card, yearlyIntent, orientation, jobTimingQuestion }) {
  if (jobTimingQuestion) {
    return orientation === 'upright'
      ? `취직 시기 관점에서는 ${month}을 외부 접점을 늘리는 달로 활용하고, ${monthRole.replace(/ 자리$/, '')} 기준으로 우선순위를 좁혀 실행해보세요.`
      : `취직 시기 관점에서는 ${month}을 결과를 서두르기보다 서류·포트폴리오·면접 문장을 정비하는 달로 두는 편이 좋겠습니다.`;
  }
  const cardAxis = describeCardAxis(card, yearlyIntent);
  const roleShort = normalizeYearlyMonthRole(monthRole);
  const roleWithAnd = withKoreanParticle(roleShort, '과', '와');
  const intentAction = {
    relationship: orientation === 'upright'
      ? '요청 1개와 감정 1개를 분리해 짧게 전달하면 반응을 읽기 쉽습니다.'
      : '단정 문장은 줄이고 확인 질문 1개만 남기면 관계 피로를 줄일 수 있습니다.',
    finance: orientation === 'upright'
      ? '고정비/변동비를 분리해 관리하면 흐름을 안정적으로 유지할 수 있습니다.'
      : '고정 지출부터 줄이고 신규 지출은 한 템포 늦추는 편이 손실을 줄입니다.',
    career: orientation === 'upright'
      ? '작은 지원·제안이라도 꾸준히 내보내면 다음 달 반응이 붙기 쉽습니다.'
      : '실행 수를 줄이고 자료 완성도와 답변 구조를 먼저 보완하는 편이 좋습니다.',
    general: orientation === 'upright'
      ? '한 번에 크게 벌리기보다 한 가지 실행 기준을 고정하면 흔들림이 줄어듭니다.'
      : '속도를 낮추고 병목 요인 하나를 먼저 줄이면 다음 달이 편해집니다.'
  };
  return `이 달은 ${roleWithAnd} ${cardAxis}이 만나는 구간입니다. ${intentAction[yearlyIntent] ?? intentAction.general}`;
}

function buildYearlyMonthClose({ month, monthRole, orientation, yearlyIntent }) {
  const roleShort = normalizeYearlyMonthRole(monthRole);
  const roleObject = withKoreanParticle(roleShort, '을', '를');
  const mode = orientation === 'upright' ? '확장 가능 구간' : '정비 우선 구간';
  const action = {
    relationship: orientation === 'upright'
      ? '대화는 짧고 명확하게, 해석은 천천히 가져가세요.'
      : '감정 강도를 낮추고 확인 대화를 먼저 두는 편이 무리가 적습니다.',
    finance: orientation === 'upright'
      ? '계획형 지출을 유지하며 소액 실험만 추가하는 방식이 안전합니다.'
      : '손실 방어와 우선순위 재배치를 먼저 마치고 확장을 검토하세요.',
    career: orientation === 'upright'
      ? '작은 지원/접점을 유지하며 실행 리듬을 끊지 않는 편이 좋습니다.'
      : '준비 밀도를 높여 다음 달 실행 효율을 올리는 편이 좋겠습니다.',
    general: orientation === 'upright'
      ? '작은 실행을 이어가며 흐름을 살리는 방식이 무리가 적습니다.'
      : '정비를 먼저 하고 천천히 전진하는 방식이 무리가 적습니다.'
  };
  return `요약하면 ${month}은 ${roleObject} 점검하는 ${mode}입니다. ${action[yearlyIntent] ?? action.general}`;
}

function describeCardAxis(card, yearlyIntent = 'general') {
  if (!card) return '핵심 축';
  if (card.arcana === 'major') {
    const majorMap = {
      '바보': '탐색·시도 축',
      '마법사': '주도권·실행 축',
      '여사제': '관찰·보류 축',
      '여황제': '회복·증가 축',
      '황제': '규칙·통제 축',
      '교황': '기준·원칙 축',
      '연인': '선택·정렬 축',
      '전차': '추진·집중 축',
      '정의': '균형·판단 축',
      '악마': '의존·소모 관리 축',
      '심판': '평가·전환 축'
    };
    return majorMap[card.nameKo] ?? `${card.nameKo} 카드의 핵심 축`;
  }
  const suitMapByIntent = {
    relationship: {
      Cups: '감정 교류 축',
      Swords: '대화 조율 축',
      Wands: '관계 추진 축',
      Pentacles: '신뢰 회복 축'
    },
    finance: {
      Cups: '소비 감정 관리 축',
      Swords: '지출 판단 축',
      Wands: '수입 확장 시도 축',
      Pentacles: '자산·현금흐름 축'
    },
    career: {
      Cups: '협업 감정 관리 축',
      Swords: '의사결정·커뮤니케이션 축',
      Wands: '추진·성과 확장 축',
      Pentacles: '실무·지속성 축'
    },
    general: {
      Cups: '감정 균형 축',
      Swords: '판단·정리 축',
      Wands: '행동 추진 축',
      Pentacles: '현실 운영 축'
    }
  };
  const suitMap = suitMapByIntent[yearlyIntent] ?? suitMapByIntent.general;
  const rank = card.rankKo ? `${card.rankKo} 단계` : '현재 단계';
  const suitAxis = suitMap[card.suit] ?? '핵심 운영 축';
  return `${suitAxis}의 ${rank}`;
}

function normalizeYearlyMonthRole(monthRole = '') {
  const text = String(monthRole || '').trim();
  if (!text) return '해당 달 운영';
  if (text.endsWith('하는 자리')) return text.replace(/하는 자리$/, '하는 단계');
  if (text.endsWith('는 자리')) return text.replace(/는 자리$/, '는 구간');
  if (text.endsWith('자리')) return text.replace(/자리$/, '구간');
  return text;
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

function buildTarotAdviceLine({ spreadId, positionName, contextProfile, tone, orientation, seed }) {
  const cautionPosition = isCautionPosition(positionName);
  const outcomePosition = isOutcomePosition(positionName);
  const direction = cautionPosition
    ? '이 포지션은 문제를 단정하기보다 위험 신호를 먼저 분리해보는 편이 좋겠습니다.'
    : outcomePosition
      ? (orientation === 'upright'
          ? '결과 신호는 열려 있으니 실행 문장을 짧고 분명하게 고정해보시는 편이 좋겠습니다.'
          : '결과 신호의 마찰이 있어 속도보다 전달 방식을 먼저 정리하시는 편이 좋겠습니다.')
      : orientation === 'upright'
        ? '지금은 핵심을 하나만 정해 차분하게 확인해보시는 편이 좋겠습니다.'
        : '지금은 무리하게 밀기보다 컨디션과 리듬을 먼저 회복하시는 편이 좋겠습니다.';
  const clientActionHint = buildClientActionHint(contextProfile);
  const clientAnchorHint = buildClientAnchorHint(contextProfile);
  const lines = [
    `${direction} ${clientActionHint}`,
    `${direction} ${tone.defaultPrompt}`,
    `${direction} 오늘은 ${clientAnchorHint}`
  ];
  return pickVariant(`${seed}:${spreadId}:tarot-advice`, lines);
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
  const positionTopic = withKoreanParticle(positionName, '은', '는');
  const defaultOptions = [
    positionPrompt,
    `${positionTopic} 이 포지션의 핵심 역할을 먼저 짚는 구간입니다.`,
    `${positionName} 자리는 앞뒤 카드와 함께 읽으면 포인트가 더 또렷해집니다.`
  ];
  const options = spreadId === 'celtic-cross'
    ? map[spreadId]
    : defaultOptions;
  return pickVariant(`${seed}:spread-guide`, options);
}

function buildOrientationCounselLine({ spreadId, positionName, cardName, orientation, tone, seed }) {
  const cardNameSubject = withSmartSubject(cardName);
  const cautionPosition = isCautionPosition(positionName);
  const outcomePosition = isOutcomePosition(positionName);
  const toneLine = cautionPosition
    ? (orientation === 'upright'
        ? '이 자리에서는 낙관보다 리스크 점검을 우선해야 합니다.'
        : '이 자리에서는 병목 정리를 우선해야 다음 카드가 살아납니다.')
    : orientation === 'upright'
      ? tone.uprightLine
      : tone.reversedLine;
  const lineByPosition = orientation === 'upright'
    ? cautionPosition
      ? `${cardNameSubject} 정방향이더라도 ${positionName} 자리에서는 리스크를 먼저 확인해야 합니다.`
      : outcomePosition
        ? `${cardNameSubject} 정방향이라 결과 가능성은 열려 있지만, 실행 강도에 따라 체감이 달라질 수 있습니다.`
        : `${cardNameSubject} 정방향이라 이 자리의 신호를 실행으로 옮기기 좋은 구간입니다.`
    : cautionPosition
      ? `${cardNameSubject} 역방향이라 ${positionName} 자리의 병목을 먼저 정리해야 후속 전개가 안정됩니다.`
      : `${cardNameSubject} 역방향이라 속도 조절과 기준 정비를 먼저 두는 편이 안전합니다.`;
  const lines = orientation === 'upright'
    ? [
      `${lineByPosition} ${toneLine}`,
      `${cardName} 정방향은 지금 이 포지션의 핵심을 선명하게 잡으면 흐름이 정리됩니다. ${toneLine}`
    ]
    : [
      `${lineByPosition} ${toneLine}`,
      `${cardName} 역방향은 서두르기보다 한 박자 쉬고 정리하라는 메시지에 가깝습니다. ${toneLine}`
    ];
  return pickVariant(`${seed}:${spreadId}:orientation-counsel`, lines);
}

function buildKeywordCounselLine({ card, focus, seed }) {
  const main = card.keywords?.[0] ?? '핵심';
  const sub = card.keywords?.[1] ?? main;
  const focusWithParticle = withKoreanParticle(focus, '을', '를');
  const cardNameTopic = withKoreanParticle(card.nameKo, '은', '는');
  const mainSubject = withKoreanParticle(main, '이', '가');
  const subSubject = withKoreanParticle(sub, '이', '가');
  const lines = [
    `${cardNameTopic} '${main}'에서 '${sub}'으로 넘어가는 과정을 보여주니, 지금은 ${focusWithParticle} 선명하게 잡는 게 중요합니다.`,
    `카드 키워드를 풀어보면 ${mainSubject} 출발점이고 ${subSubject} 다음 단계입니다. 오늘은 ${focusWithParticle} 중심으로 우선순위를 정하면 흐름이 더 선명해집니다.`
  ];
  return pickVariant(`${seed}:keyword-counsel`, lines);
}

function buildTarotActionLine({ spreadId, positionName, contextProfile, orientation, seed }) {
  const cautionPosition = isCautionPosition(positionName);
  const outcomePosition = isOutcomePosition(positionName);
  const direction = cautionPosition
    ? '이 자리에서는 결론을 서두르지 말고 위험 신호를 먼저 분리해보세요.'
    : outcomePosition
      ? (orientation === 'upright'
          ? '결과 신호를 살리려면 오늘 실행 문장을 짧고 분명하게 고정해보세요.'
          : '결과 마찰을 줄이려면 실행 타이밍과 전달 강도를 다시 맞춰보세요.')
      : orientation === 'upright'
        ? '오늘은 가볍게 한 걸음만 보태보세요.'
        : '오늘은 속도를 줄이고 몸과 마음을 먼저 챙겨보세요.';
  const clientActionHint = buildClientActionHint(contextProfile);
  const lines = [
    `${direction} ${clientActionHint}`,
    `${direction} 선택이 끝난 뒤에는 몸의 반응과 마음의 반응을 짧게 체크해 보세요.`,
    `${direction} 너무 완벽하게 하려 하지 말고, 오늘 가능한 선에서만 실천해도 충분합니다.`
  ];
  return pickVariant(`${seed}:${spreadId}:tarot-action`, lines);
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

function buildCoreContextLine({ spreadId, positionName, contextProfile, seed }) {
  const positionTopic = withKoreanParticle(positionName, '은', '는');
  const lines = spreadId === 'one-card'
    ? [
      `질문 맥락에서는 ${contextProfile.anchor}`,
      `이번 질문에서는 ${contextProfile.anchor}`,
      `핵심 맥락 기준으로는 ${contextProfile.anchor}`
    ]
    : [
      `${positionTopic} 질문 맥락상 ${contextProfile.anchor}`,
      `${positionName} 자리에서는 ${contextProfile.anchor}`,
      `${positionTopic} 읽을 때는 ${contextProfile.anchor}`
    ];
  return pickVariant(`${seed}:core-context`, lines);
}

function buildWeeklyContextLine({ positionName, seed = '' }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const lines = [
    `${topic} 이번 주 전체 리듬에서 해당 요일의 조정 포인트를 확인하는 구간입니다.`,
    `${positionName}은 앞뒤 요일 카드와 연결해서 대화 강도를 맞추는 기준이 됩니다.`,
    `${topic} 단독 해석보다 주간 흐름과 연결해서 읽을 때 정확도가 올라갑니다.`
  ];
  return pickVariant(`${seed}:weekly-context:${positionName}`, lines);
}

function buildSpreadCoreLead({ spreadId = 'default', positionName = '', seed = '' }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const linesBySpread = {
    'daily-fortune': [
      `${topic} 오늘 리듬을 조정하는 핵심 포지션입니다.`,
      `${positionName} 자리에서 오늘 운영 포인트를 먼저 확인해보겠습니다.`
    ],
    'choice-a-b': [
      `${topic} 선택 비교에서 유지 비용을 가르는 기준입니다.`,
      `${positionName} 포지션은 A/B 판단의 분기점 역할을 합니다.`
    ],
    'relationship-recovery': [
      `${topic} 관계 회복 대화 순서를 정하는 핵심 자리입니다.`,
      `${positionName} 자리에서 회복 흐름의 기준 신호를 짚어보겠습니다.`
    ],
    'weekly-fortune': [
      `${topic} 이번 주 감정 흐름 안에서 해당 요일의 포인트를 확인하는 구간입니다.`,
      `${positionName} 카드로 오늘 관계 리듬의 강약을 먼저 살펴보겠습니다.`
    ],
    default: [
      `${topic} 전체 리딩의 연결 고리 역할을 합니다.`,
      `${positionName} 자리의 핵심 신호를 먼저 확인해보겠습니다.`
    ]
  };
  const lines = linesBySpread[spreadId] ?? linesBySpread.default;
  return pickVariant(`${seed}:spread-core-lead`, lines);
}

function isCautionPosition(positionName = '') {
  const text = String(positionName || '');
  return /(주의|장애|갈등|거리|리스크)/.test(text);
}

function isOutcomePosition(positionName = '') {
  const text = String(positionName || '');
  return /(결과|조언|다음 7일 흐름|행동 조언|4주차·정리|주간 조언)/.test(text);
}

function inferCelticQuestionIntent(context = '') {
  const text = String(context || '').toLowerCase();
  if (/(화해|친구|싸웠|싸움|다툼|갈등|서운|오해|관계 회복)/.test(text)) return 'relationship-repair';
  if (/(연애|재회|상대|썸|결혼|이별)/.test(text)) return 'relationship';
  if (/(이직|취업|커리어|업무|면접|회사|직장)/.test(text)) return 'career';
  if (/(재정|돈|지출|수입|저축|투자|소비|자산)/.test(text)) return 'finance';
  return 'general';
}

function buildCelticSpreadGuideLine({ positionName = '', seed = '' }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const lines = [
    `${topic} 전체 서사에서 역할이 분명한 자리라, 한 줄 핵심으로 정리해야 다음 카드와 연결이 정확해집니다.`,
    `${positionName} 포지션은 앞뒤 카드와 연결해서 읽을수록 해석 오차가 줄어듭니다.`,
    `${positionName} 자리는 단독 해석보다 중심축-결과축 연결로 볼 때 의미가 선명해집니다.`
  ];
  return pickVariant(`${seed}:celtic-spread-guide`, lines);
}

function buildCelticOrientationLine({ cardName, positionName, orientation, intent = 'general', seed = '' }) {
  const isObstacle = positionName === '교차/장애';
  const isOutcome = positionName === '결과';
  const isOuter = positionName === '외부 환경';
  let baseLine = '';
  let relationLine = '';

  if (orientation === 'upright') {
    if (isObstacle) {
      baseLine = `${cardName} 정방향이더라도 이 자리는 병목 포지션이라, 문제를 곧장 풀기보다 충돌 패턴을 먼저 특정하는 게 우선입니다.`;
    } else if (isOuter) {
      baseLine = `${cardName} 정방향은 외부 조건에 활용 가능한 여지가 있다는 뜻이지만, 제3의 반응에 끌려가면 중심 흐름이 약해질 수 있습니다.`;
    } else if (isOutcome) {
      baseLine = `${cardName} 정방향이면 결과 가능성은 열려 있습니다. 다만 결과는 현재 행동의 질에 따라 강도가 달라집니다.`;
    } else {
      baseLine = `${cardName} 정방향은 이 자리의 의미를 실행으로 옮길 여지가 있다는 신호입니다.`;
    }
  } else if (isObstacle) {
    baseLine = `${cardName} 역방향이면 병목이 누적된 상태라, 결론보다 감정 과열과 해석 충돌을 먼저 낮춰야 합니다.`;
  } else if (isOutcome) {
    baseLine = `${cardName} 역방향이면 결과 구간의 마찰이 남아 있다는 뜻이므로, 실행 타이밍과 전달 방식을 재조정해야 합니다.`;
  } else {
    baseLine = `${cardName} 역방향은 이 자리에서 속도 조절이 필요하다는 신호라, 무리한 확장보다 정비를 먼저 두는 편이 안전합니다.`;
  }

  if (intent === 'relationship-repair' || intent === 'relationship') {
    relationLine = isObstacle
      ? '관계 질문에서는 누가 맞는지보다, 어떤 문장이 방어 반응을 키우는지부터 분리해보는 접근이 효과적입니다.'
      : '관계 질문에서는 감정 해석보다 확인 가능한 사실 문장을 먼저 놓아야 대화 리듬이 살아납니다.';
  }

  return [baseLine, relationLine].filter(Boolean).join(' ');
}

function buildCelticKeywordLine({ card, focus, positionName, seed = '' }) {
  const main = card.keywords?.[0] ?? '핵심';
  const sub = card.keywords?.[1] ?? main;
  const cardNameTopic = withKoreanParticle(card.nameKo, '은', '는');
  const focusWithParticle = withKoreanParticle(focus, '을', '를');
  const role = positionName === '교차/장애'
    ? '판단 기준'
    : positionName === '결과'
      ? '결과 판단 기준'
      : '핵심 판단 기준';
  const lines = [
    `${cardNameTopic} '${main}'에서 '${sub}'으로 넘어가는 흐름을 보여주며, 이 자리에서는 ${focusWithParticle} ${role}으로 고정해 읽는 편이 정확합니다.`,
    `키워드 축을 풀면 '${main}'은 현재 신호, '${sub}'은 다음 조정 포인트입니다. ${focusWithParticle} 한 문장으로 고정하면 해석 흔들림이 줄어듭니다.`
  ];
  return pickVariant(`${seed}:celtic-keyword`, lines);
}

function buildCelticActionLine({ positionName, orientation, intent = 'general', contextProfile, seed = '' }) {
  const relationshipHint = orientation === 'upright'
    ? '짧은 확인 질문 1개와 요청 1개만 남기면 대화 충돌을 줄일 수 있습니다.'
    : '설득보다 감정 정리 문장을 먼저 두고, 반응 확인 후 다음 문장을 이어가는 편이 안전합니다.';
  const neutralHint = orientation === 'upright'
    ? '지금은 실행 항목을 하나로 좁혀 실제 반응을 먼저 확인해 보세요.'
    : '지금은 속도를 늦추고 병목 요인 하나를 먼저 정리한 뒤 다음 행동을 이어가세요.';
  const positionHint = positionName === '교차/장애'
    ? '이 포지션은 해결책 제시보다 충돌 지점을 정확히 이름 붙이는 단계가 우선입니다.'
    : positionName === '결과'
      ? '결과 포지션의 신호를 살리려면, 오늘 실행 문장을 짧고 측정 가능하게 정하는 편이 좋습니다.'
      : buildClientActionHint(contextProfile);
  const lines = [
    positionHint,
    intent === 'relationship-repair' || intent === 'relationship' ? relationshipHint : neutralHint
  ];
  return lines.join(' ');
}

function buildCelticCoreAdviceLine({ positionName, orientation, contextProfile, seed = '' }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const direction = orientation === 'upright'
    ? `${topic} 과하게 확장하기보다 핵심 한 줄을 분명히 두면 흐름이 더 안정됩니다.`
    : `${topic} 속도를 낮추고 해석 기준을 정리한 뒤 움직이면 어긋남이 줄어듭니다.`;
  const lines = [
    `${direction} ${buildClientActionHint(contextProfile)}`,
    `${direction} ${buildClientAnchorHint(contextProfile)}`
  ];
  return pickVariant(`${seed}:celtic-core-advice`, lines);
}

function buildCelticCoreLead({ positionName = '', seed = '' }) {
  const topic = withKoreanParticle(positionName, '은', '는');
  const lines = [
    `${topic} 전체 해석의 연결 고리 역할을 합니다.`,
    `${positionName} 포지션을 기준으로 현재 흐름을 짚어보겠습니다.`,
    `${positionName} 자리에서 드러난 핵심 신호를 먼저 확인해보겠습니다.`
  ];
  return pickVariant(`${seed}:celtic-core-lead`, lines);
}

function buildCelticCoreMeaningLine({ cardName, positionName, orientation, focus, mainKeyword }) {
  const keywordSubject = withKoreanParticle(mainKeyword, '이', '가');
  const focusWithParticle = withKoreanParticle(focus, '을', '를');
  if (positionName === '교차/장애') {
    return orientation === 'upright'
      ? `${cardName}의 '${mainKeyword}' 신호는 문제의 형태를 분명히 보여줍니다. 이 자리는 해결보다 병목 정의가 먼저입니다.`
      : `${cardName}의 '${mainKeyword}' 신호가 뒤집혀 있어, 병목이 누적된 지점을 먼저 분리해야 다음 전개가 열립니다.`;
  }
  if (positionName === '결과') {
    return orientation === 'upright'
      ? `${cardName}의 '${mainKeyword}' 신호는 결과 가능성이 열려 있음을 보여줍니다. ${focusWithParticle} 지금 행동으로 연결하면 체감이 올라갑니다.`
      : `${cardName}의 '${mainKeyword}' 신호는 결과 구간의 마찰을 보여줍니다. ${focus}의 기준을 다시 세우는 편이 안전합니다.`;
  }
  return orientation === 'upright'
    ? `${cardName}의 핵심 키워드인 ${keywordSubject} 열려 있어 ${focus}의 방향성을 정리하기 좋은 흐름입니다.`
    : `${cardName}의 핵심 키워드인 ${keywordSubject} 조정 구간에 있어 ${focus}에서는 속도를 낮추고 기준을 먼저 맞추는 편이 좋습니다.`;
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

function withSmartSubject(word = '') {
  const text = String(word || '').trim();
  if (!text) return text;
  const last = text[text.length - 1];
  if (!/[가-힣]/.test(last)) return text;
  return withKoreanParticle(text, '이', '가');
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
      월요일: '월요일 카드는 이번 주 시동을 거는 기준 카드입니다.',
      화요일: '화요일 카드는 초반 리듬을 안정화하는 구간입니다.',
      수요일: '수요일 카드는 중반 변수 대응력과 전환점을 점검하는 구간입니다.',
      목요일: '목요일 카드는 진행 중인 이슈를 정리해 마감 품질을 높이는 구간입니다.',
      금요일: '금요일 카드는 성과 확인과 마감 품질을 좌우합니다.',
      토요일: '토요일 카드는 회복/정비를 통해 다음 주 효율을 만드는 구간입니다.',
      일요일: '일요일 카드는 복기와 다음 주 준비 루틴의 완성도를 뜻합니다.'
    },
    positionFocus: {
      월요일: '주간 시동과 기준 고정',
      화요일: '초반 리듬 안정화',
      수요일: '중반 대응 포인트',
      목요일: '중반 정리와 마감 준비',
      금요일: '마감 품질과 정리',
      토요일: '회복과 재정비',
      일요일: '복기와 다음 주 준비'
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
  'relationship-recovery': {
    uprightLine: '정방향이면 관계 회복 대화의 접점을 만들 수 있는 흐름입니다.',
    reversedLine: '역방향이면 감정 과열을 낮추고 대화 구조를 먼저 정리해야 하는 흐름입니다.',
    defaultPrompt: '관계 회복 리딩은 감정 추측보다 신호 해석과 실행 행동 분리가 핵심입니다.',
    defaultFocus: '관계 회복 행동 우선순위',
    positionPrompts: {
      '현재 관계 상태': '현재 관계 상태 카드는 해석의 출발점이므로 기대보다 실제 신호를 먼저 읽어야 합니다.',
      '거리/갈등의 핵심': '거리/갈등 카드에서는 누가 맞는지보다 반복되는 충돌 패턴을 먼저 특정하세요.',
      '상대 관점 신호': '상대 관점 카드는 단정이 아니라 반응 단서를 읽는 포지션입니다.',
      '회복 행동': '회복 행동 카드는 오늘 실행할 문장/행동 1개로 번역해야 효과가 있습니다.',
      '다음 7일 흐름': '다음 7일 카드는 결과 확정이 아니라 대화 리듬과 주의 구간을 보여주는 신호입니다.'
    },
    positionFocus: {
      '현재 관계 상태': '현재 관계 온도와 거리감',
      '거리/갈등의 핵심': '반복 충돌 패턴',
      '상대 관점 신호': '상대 반응 단서',
      '회복 행동': '즉시 실행할 대화 행동',
      '다음 7일 흐름': '단기 관계 리듬과 주의점'
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
