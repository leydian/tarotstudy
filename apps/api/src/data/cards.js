const IMAGE_ORIGIN = 'https://upload.wikimedia.org/wikipedia/commons';
const IMAGE_MIRROR_BASE = (process.env.TAROT_IMAGE_MIRROR_BASE_URL || '').trim().replace(/\/+$/, '');
const IMAGE_ATTRIBUTION = {
  sourceName: 'Wikimedia Commons - Rider-Waite tarot deck',
  sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck',
  licenseName: 'Public domain',
  licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
};

const majorNames = [
  'The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'
];

const majorKo = [
  '바보','마법사','여교황','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'
];

const suitConfig = [
  { suit: 'Wands', suitKo: '완드', symbol: 'fire' },
  { suit: 'Cups', suitKo: '컵', symbol: 'water' },
  { suit: 'Swords', suitKo: '소드', symbol: 'air' },
  { suit: 'Pentacles', suitKo: '펜타클', symbol: 'earth' }
];

const rankConfig = [
  { rank: 'Ace', rankKo: '에이스' },
  { rank: 'Two', rankKo: '2' },
  { rank: 'Three', rankKo: '3' },
  { rank: 'Four', rankKo: '4' },
  { rank: 'Five', rankKo: '5' },
  { rank: 'Six', rankKo: '6' },
  { rank: 'Seven', rankKo: '7' },
  { rank: 'Eight', rankKo: '8' },
  { rank: 'Nine', rankKo: '9' },
  { rank: 'Ten', rankKo: '10' },
  { rank: 'Page', rankKo: '페이지' },
  { rank: 'Knight', rankKo: '나이트' },
  { rank: 'Queen', rankKo: '퀸' },
  { rank: 'King', rankKo: '킹' }
];

const majorCards = majorNames.map((name, i) => {
  const keywords = majorKeywords(name);
  const card = {
    id: `major-${i}`,
    number: i,
    arcana: 'major',
    suit: null,
    rank: null,
    name,
    nameKo: majorKo[i],
    keywords,
    summary: `${majorKo[i]} 카드는 삶의 전환점에서 의식적인 선택과 성장의 메시지를 강조합니다.`,
    difficulty: i < 11 ? 'beginner' : 'intermediate'
  };
  return enrichCard(card);
});

const minorCards = suitConfig.flatMap(({ suit, suitKo, symbol }) =>
  rankConfig.map((rankObj, idx) => {
    const keywords = minorKeywords(suit, rankObj.rank);
    const card = {
      id: `minor-${suit.toLowerCase()}-${rankObj.rank.toLowerCase()}`,
      number: idx + 1,
      arcana: 'minor',
      suit,
      suitKo,
      rank: rankObj.rank,
      rankKo: rankObj.rankKo,
      name: `${rankObj.rank} of ${suit}`,
      nameKo: `${suitKo} ${rankObj.rankKo}`,
      symbol,
      keywords,
      summary: `${suitKo} ${rankObj.rankKo} 카드는 ${suitTheme(suit)} 영역에서의 태도와 흐름을 보여줍니다.`,
      difficulty: idx < 7 ? 'beginner' : 'intermediate'
    };
    return enrichCard(card);
  })
);

function enrichCard(card) {
  const imagePath = getImagePath(card);
  const imageSources = buildImageSources(imagePath);
  return {
    ...card,
    imageUrl: imageSources[0],
    imageSources,
    imageAttribution: IMAGE_ATTRIBUTION,
    descriptions: buildCardDescriptions(card)
  };
}

export function buildCardDescriptions(card, { context = '' } = {}) {
  return {
    beginner: buildBeginnerDescription(card, { context }),
    intermediate: buildIntermediateDescription(card, { context })
  };
}

function buildBeginnerDescription(card, { context = '' } = {}) {
  const contextProfile = inferBasicContextProfile(context);
  return [
    buildBeginnerKeywordLine(card, { contextProfile }),
    buildBeginnerFlowLine(card, { contextProfile }),
    buildBeginnerLearningPoint(card, { contextProfile })
  ].join('\n');
}

function buildBeginnerKeywordLine(card, { contextProfile }) {
  const keyword = card.keywords?.[0] || '핵심';
  const keyword2 = card.keywords?.[1] || keyword;
  const keyword3 = card.keywords?.[2] || keyword;

  const majorVariants = [
    `${card.nameKo}의 핵심 키워드는 ${card.keywords.join(', ')}입니다. 오늘 선택 하나를 떠올리고 "${keyword}"이 드러난 장면을 먼저 잡아보세요.`,
    `${card.nameKo} 카드는 ${card.keywords.join(', ')} 흐름을 보여줍니다. 지금 가장 고민되는 상황 1개에 "${keyword2}" 키워드를 연결해 해석해 보세요.`,
    `${card.nameKo}의 키워드(${card.keywords.join(', ')})를 외우기보다, 오늘 행동 1개가 "${keyword3}"와 어떻게 연결되는지 확인해 보세요.`,
    `${card.nameKo} 카드는 ${card.keywords.join(', ')}을 통해 방향을 보여줍니다. 현재 상황에 가장 가까운 키워드 1개를 골라 이유를 붙여보세요.`
  ];

  const minorBySuit = {
    Wands: [
      `${card.nameKo}의 키워드는 ${card.keywords.join(', ')}입니다. 오늘 실행할 과제 1개를 고르고 "${keyword}" 키워드를 행동 기준으로 잡아보세요.`,
      `${card.nameKo}는 ${card.keywords.join(', ')} 흐름이 핵심입니다. 시작 속도와 완주 가능성을 기준으로 키워드 1개를 연결해 보세요.`
    ],
    Cups: [
      `${card.nameKo}의 키워드는 ${card.keywords.join(', ')}입니다. 오늘 대화 장면 1개를 떠올리고 "${keyword2}"가 어떻게 나타났는지 확인해 보세요.`,
      `${card.nameKo} 카드는 ${card.keywords.join(', ')}을 통해 감정 흐름을 읽습니다. 현재 관계 상황에 키워드 1개를 붙여 해석해 보세요.`
    ],
    Swords: [
      `${card.nameKo}의 키워드는 ${card.keywords.join(', ')}입니다. 지금 판단이 필요한 문제 1개를 골라 "${keyword}" 기준으로 정리해 보세요.`,
      `${card.nameKo} 카드는 ${card.keywords.join(', ')} 신호를 줍니다. 정보/해석을 분리한 뒤 키워드 1개를 선택해 연결해 보세요.`
    ],
    Pentacles: [
      `${card.nameKo}의 키워드는 ${card.keywords.join(', ')}입니다. 오늘 남길 결과물 1개를 정하고 "${keyword3}"를 완료 기준으로 잡아보세요.`,
      `${card.nameKo} 카드는 ${card.keywords.join(', ')}을 통해 현실 운영을 보여줍니다. 시간·비용·완료 중 하나에 키워드 1개를 연결해 보세요.`
    ]
  };

  const variants = card.arcana === 'major'
    ? majorVariants
    : (minorBySuit[card.suit] || majorVariants);
  const line = pickCardVariant(card.id, 'beginner-keyword-line', variants);
  if (!contextProfile || contextProfile.id === 'general') return line;
  return `${line} ${contextProfile.keywordHint}`;
}

function buildBeginnerFlowLine(card, { contextProfile }) {
  const majorVariants = [
    `${card.nameKo} 카드는 인생의 큰 전환을 다루므로 정방향에서는 흐름이 열리고, 역방향에서는 멈춤 신호가 먼저 드러날 수 있습니다.`,
    `${card.nameKo} 카드는 태도와 선택의 축을 보여줍니다. 정방향은 전개가 비교적 자연스럽고, 역방향은 지연·과잉·회피를 점검해야 합니다.`,
    `${card.nameKo} 카드는 사건보다 방향을 읽는 카드입니다. 정방향은 추진 타이밍이 맞는 편이고, 역방향은 리듬 조정이 우선입니다.`,
    `${card.nameKo} 카드는 큰 주제의 흐름을 비추므로 정방향은 확장 신호, 역방향은 정비 신호로 읽으면 입문 해석이 안정됩니다.`
  ];

  const minorBySuit = {
    Wands: [
      `${card.suitKo}는 행동력 영역을 다룹니다. 정방향은 추진이 붙는 상태, 역방향은 과열/소진/지연을 조정해야 하는 상태입니다.`,
      `${card.suitKo} 카드에서는 실행 속도가 핵심입니다. 정방향은 에너지 흐름이 살아 있고, 역방향은 목표 분산 여부를 먼저 확인해야 합니다.`
    ],
    Cups: [
      `${card.suitKo} 수트는 감정과 관계를 다룹니다. 정방향은 정서 흐름이 비교적 안정적이고, 역방향은 감정 과잉/회피를 점검해야 합니다.`,
      `${card.suitKo} 카드에서는 관계 온도 읽기가 중요합니다. 정방향은 교감이 쉬운 상태, 역방향은 표현 방식 조정이 필요한 상태입니다.`
    ],
    Swords: [
      `${card.suitKo}는 사고와 판단을 다룹니다. 정방향은 기준이 선명해지는 상태, 역방향은 과해석/단정/혼선을 점검해야 합니다.`,
      `${card.suitKo} 카드에서는 의사결정 정확도가 핵심입니다. 정방향은 판단이 정리된 흐름, 역방향은 정보 정제가 먼저 필요한 흐름입니다.`
    ],
    Pentacles: [
      `${card.suitKo}는 현실 운영과 성과를 다룹니다. 정방향은 누적이 붙는 상태, 역방향은 비효율/지연/과부하를 조정해야 하는 상태입니다.`,
      `${card.suitKo} 카드에서는 자원 관리가 중요합니다. 정방향은 실행 결과가 남기 쉬운 흐름, 역방향은 기준 재정비가 필요한 흐름입니다.`
    ]
  };

  const variants = card.arcana === 'major'
    ? majorVariants
    : (minorBySuit[card.suit] || majorVariants);
  const line = pickCardVariant(card.id, 'beginner-flow-line', variants);
  if (!contextProfile || contextProfile.id === 'general') return line;
  return `${line} ${contextProfile.flowHint}`;
}

function buildBeginnerLearningPoint(card, { contextProfile }) {
  const keyword = card.keywords?.[0] || '핵심';
  const keyword2 = card.keywords?.[1] || keyword;

  const majorVariants = [
    `입문 학습 포인트: 오늘 있었던 선택 1개를 떠올리고 "${keyword}"이 강화된 순간/약해진 순간을 한 줄씩 기록하세요.`,
    `입문 학습 포인트: "${keyword}" 키워드를 기준으로 오늘 행동 1개를 고르고, 결과를 짧게 메모해 보세요.`,
    '입문 학습 포인트: 같은 상황을 정방향/역방향 두 관점으로 각각 1문장씩 써보면 카드 감각이 빨리 붙습니다.',
    `입문 학습 포인트: "${keyword2}" 키워드가 대화/일정/감정 중 어디에서 가장 크게 드러났는지 체크해 보세요.`
  ];

  const minorVariants = buildMinorLearningPointVariants(card, keyword, keyword2, contextProfile);
  const variants = card.arcana === 'major' ? majorVariants : minorVariants;
  let line = pickCardVariant(card.id, 'beginner-learning-point', variants);
  if (card.arcana === 'major' && contextProfile && contextProfile.id !== 'general') {
    line = `${line} ${contextProfile.learningHint}`;
  }
  return line;
}

function buildMinorLearningPointVariants(card, keyword, keyword2, contextProfile) {
  const suitGuides = {
    Wands: {
      focus: '추진 에너지와 실행 우선순위',
      action: `오늘 할 일 1개를 고르고 "${keyword}" 키워드가 실제 행동으로 이어졌는지 체크하세요.`
    },
    Cups: {
      focus: '감정 신호와 관계 온도',
      action: `대화 장면 1개를 고른 뒤 "${keyword2}"가 높아진 순간과 낮아진 순간을 각각 기록하세요.`
    },
    Swords: {
      focus: '판단 기준과 의사소통 정확도',
      action: `결정이 필요한 문제 1개를 골라 "${keyword}" 기준으로 사실/해석을 분리해 적어보세요.`
    },
    Pentacles: {
      focus: '현실 운영과 결과물 축적',
      action: `오늘 남길 결과물 1개를 정하고 "${keyword}" 키워드를 완료 기준으로 고정해 보세요.`
    }
  };

  const rankGuides = {
    Ace: '시작 버튼을 누르는 연습이 핵심입니다.',
    Two: '선택지 비교 기준 1개를 먼저 세우는 연습이 중요합니다.',
    Three: '협업/확장 관점에서 역할을 나누어 보는 연습이 유효합니다.',
    Four: '기본 루틴을 안정화해 흔들림을 줄이는 연습이 필요합니다.',
    Five: '충돌 지점을 사실로 정리해 감정 소모를 줄이는 연습이 중요합니다.',
    Six: '회복 신호를 포착해 흐름을 다시 잇는 연습이 효과적입니다.',
    Seven: '점검 기준으로 전략을 수정하는 연습이 핵심입니다.',
    Eight: '반복 숙련을 통해 정확도를 높이는 연습이 필요합니다.',
    Nine: '완성 직전 미세 조정 포인트를 찾는 연습이 중요합니다.',
    Ten: '마무리 기준을 정하고 다음 단계로 넘기는 연습이 유효합니다.',
    Page: '탐색 결과를 작은 실행으로 연결하는 연습이 핵심입니다.',
    Knight: '속도와 품질의 균형을 맞추는 연습이 필요합니다.',
    Queen: '내면 반응을 안정적으로 다루는 연습이 중요합니다.',
    King: '책임 있는 운영 기준을 세우는 연습이 효과적입니다.'
  };

  const suit = suitGuides[card.suit] || suitGuides.Wands;
  const rankHint = rankGuides[card.rank] || '지금 카드 흐름에 맞는 작은 실행을 반복해 보세요.';
  const comboFocus = getMinorSuitRankFocus(card.suit, card.rank);
  const contextTail = contextProfile && contextProfile.id !== 'general'
    ? ` ${contextProfile.learningHint}`
    : '';

  return [
    `입문 학습 포인트: ${card.nameKo} 카드는 ${suit.focus} 중심으로 읽는 카드입니다. ${comboFocus} ${rankHint} ${suit.action}${contextTail}`,
    `입문 학습 포인트: ${card.rankKo} 단계에서는 ${comboFocus} ${rankHint} 오늘은 "${keyword}" 관련 행동 1개를 정해 실행 결과를 1줄로 남겨보세요.${contextTail}`,
    `입문 학습 포인트: ${card.suitKo} 수트 학습에서는 ${suit.focus} 중심 접근이 기본입니다. ${card.nameKo}에서는 ${comboFocus} ${rankHint} 실행 후 체감 변화를 짧게 기록하세요.${contextTail}`,
    `입문 학습 포인트: ${card.nameKo}를 볼 때 "${keyword2}" 키워드를 먼저 잡고, ${comboFocus} ${rankHint} ${suit.action}${contextTail}`
  ];
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

function buildIntermediateDescription(card, { context = '' } = {}) {
  const contextProfile = inferBasicContextProfile(context);
  const keyword = card.keywords?.[0] || '핵심';
  const keyword2 = card.keywords?.[1] || keyword;
  const rankLine = buildIntermediateRankLine(card);

  const leadMajor = [
    `${card.nameKo}를 중급 관점에서 볼 때, 키워드(${card.keywords.join(', ')}) 자체보다 카드 위치와 연결 흐름을 먼저 확정해야 해석 오차가 줄어듭니다.`,
    `${card.nameKo}는 단일 의미 카드가 아니라 해석 강도가 크게 변하는 카드입니다. 중급에서는 위치(과거/현재/미래)와 맥락 충돌 여부를 함께 봐야 합니다.`,
    `${card.nameKo}의 중급 해석은 "키워드 나열"보다 "상황 구조 분석"에 가깝습니다. 같은 카드라도 질문 의도에 따라 결과 해석이 달라집니다.`,
    `${card.nameKo}는 중급에서 방향성 카드로 다룹니다. "${keyword}" 신호가 언제 강화되고 언제 약해지는지 위치별로 분리해 읽어야 정확합니다.`
  ];
  const leadMinorBySuit = {
    Wands: [
      `${card.nameKo} 카드의 중급 해석 핵심은 추진 에너지의 지속 조건 분석입니다. "${keyword}" 키워드가 실제 실행으로 이어지는 구조를 먼저 점검하세요.`,
      `${card.nameKo} 카드는 실행력 카드처럼 보이지만, 중급에서는 속도·소모·완주율의 균형으로 읽어야 정확합니다.`
    ],
    Cups: [
      `${card.nameKo} 카드의 중급 해석 핵심은 감정 신호의 질과 방향성입니다. "${keyword2}" 키워드가 관계 리듬을 어떻게 바꾸는지 먼저 확인하세요.`,
      `${card.nameKo} 카드는 공감 카드가 아니라 관계 구조 카드로도 읽어야 합니다. 감정 반응과 행동 결과를 분리해 보세요.`
    ],
    Swords: [
      `${card.nameKo} 카드의 중급 해석 핵심은 판단 기준의 일관성입니다. "${keyword}" 신호가 사실 기반인지 해석 기반인지 먼저 나눠 보세요.`,
      `${card.nameKo} 카드는 사고 카드라서 중급에서는 정보 품질이 해석 품질을 결정합니다. 근거 없는 가설은 먼저 제거하세요.`
    ],
    Pentacles: [
      `${card.nameKo} 카드의 중급 해석 핵심은 운영 지표 연결입니다. "${keyword}" 키워드를 결과물·시간·비용 중 어디와 연결할지 먼저 정해야 합니다.`,
      `${card.nameKo} 카드는 현실 카드이므로 중급에서는 감보다 운영 기준이 우선입니다. 성과 정의를 먼저 고정하고 읽으세요.`
    ]
  };
  const leadVariants = card.arcana === 'major'
    ? leadMajor
    : (leadMinorBySuit[card.suit] || leadMajor);

  const signalMajor = [
    `${rankLine} 같은 카드라도 질문 범주(연애/일/관계/재정)에 따라 긍정 신호와 경고 신호를 분리해 기록해야 재현성이 생깁니다.`,
    `${rankLine} 중급에서는 "좋다/나쁘다" 이분법을 피하고, 신호의 지속 조건과 붕괴 조건을 동시에 적어두는 편이 좋습니다.`,
    `${rankLine} "${keyword2}"이 강화되는 상황과 약해지는 상황을 각각 남기면 카드 해석의 일관성이 높아집니다.`
  ];
  const signalMinorBySuit = {
    Wands: [
      `${rankLine} 완드 계열은 과열 리스크가 있으니 추진 신호와 소진 신호를 같이 기록하세요.`,
      `${rankLine} 실행 속도만 보지 말고 유지 가능성까지 함께 계산해야 과해석을 줄일 수 있습니다.`
    ],
    Cups: [
      `${rankLine} 컵 계열은 감정 신호가 왜곡되기 쉬우므로 사실(대화/행동)과 느낌을 분리해 기록하세요.`,
      `${rankLine} 관계 해석에서는 기대와 실제 반응 차이를 같이 적어야 정확도가 올라갑니다.`
    ],
    Swords: [
      `${rankLine} 소드 계열은 판단 편향 점검이 핵심이므로 반대 근거 1개를 항상 함께 써두세요.`,
      `${rankLine} 논리 정합성만 보지 말고 의사소통 결과까지 확인해야 신호 판별이 정확해집니다.`
    ],
    Pentacles: [
      `${rankLine} 펜타클 계열은 누적 흐름을 읽는 카드라 단기 성과와 장기 유지 조건을 분리해 보세요.`,
      `${rankLine} 운영 관점에서는 비용 대비 결과를 같이 적어야 카드 의미가 실전에 연결됩니다.`
    ]
  };
  const signalVariants = card.arcana === 'major'
    ? signalMajor
    : (signalMinorBySuit[card.suit] || signalMajor);

  const learningMajor = [
    `중급 학습 포인트: ${card.nameKo}는 "사실(관찰) → 해석(가설) → 행동(검증)" 3단계로 정리하고, 다음 리딩에서 검증 결과를 반드시 대조해 보세요.`,
    `중급 학습 포인트: ${card.nameKo}를 읽을 때는 가설 2개 이상을 세운 뒤, 어떤 근거로 1개를 채택했는지 기록하면 품질이 올라갑니다.`,
    `중급 학습 포인트: ${card.nameKo} 리딩은 단정 문장보다 조건 문장으로 쓰는 편이 좋습니다. "언제 맞고 언제 틀리는지"를 같이 남기세요.`
  ];
  const learningMinorBySuit = {
    Wands: [
      `중급 학습 포인트: ${card.nameKo}는 실행 로그(시작/완료/중단 이유)를 남기면 다음 해석 정확도가 크게 올라갑니다.`,
      `중급 학습 포인트: 추진 카드 해석에서는 목표 달성률보다 유지율 지표를 같이 보면 재현성이 좋아집니다.`
    ],
    Cups: [
      `중급 학습 포인트: ${card.nameKo}는 관계 대화 로그(표현·반응·결과)를 남겨야 카드 해석이 실전에서 맞아떨어집니다.`,
      `중급 학습 포인트: 감정 카드 해석은 체감만 기록하지 말고 행동 변화까지 함께 적어야 품질이 올라갑니다.`
    ],
    Swords: [
      `중급 학습 포인트: ${card.nameKo}는 판단 근거 표를 만들어 사실/해석/추정을 분리하면 오판율을 낮출 수 있습니다.`,
      `중급 학습 포인트: 사고 카드 해석은 결론보다 반례 점검을 먼저 기록할수록 안정적입니다.`
    ],
    Pentacles: [
      `중급 학습 포인트: ${card.nameKo}는 운영 지표(시간, 비용, 완료율) 중 1~2개를 고정해 추적하면 해석 품질이 빠르게 올라갑니다.`,
      `중급 학습 포인트: 현실 카드 해석은 결과물 기반 복기가 핵심입니다. 숫자/증거를 반드시 남겨보세요.`
    ]
  };
  const learningVariants = card.arcana === 'major'
    ? learningMajor
    : (learningMinorBySuit[card.suit] || learningMajor);

  return [
    appendContextHint(
      pickCardVariant(card.id, 'intermediate-lead-line', leadVariants),
      contextProfile.keywordHint
    ),
    appendContextHint(
      pickCardVariant(card.id, 'intermediate-signal-line', signalVariants),
      contextProfile.flowHint
    ),
    appendContextHint(
      pickCardVariant(card.id, 'intermediate-learning-line', learningVariants),
      contextProfile.learningHint
    )
  ].join('\n');
}

function buildIntermediateRankLine(card) {
  if (card.rank) {
    return `${card.rankKo} 단계는 ${rankStage(card.rank)} 맥락을 덧붙입니다.`;
  }

  const majorRankVariants = [
    `${card.nameKo} 카드는 원형 카드이므로 개인 심리·상황 구조·타이밍 축을 나눠 읽을수록 해석 오차가 줄어듭니다.`,
    `${card.nameKo} 카드는 단일 의미 카드가 아니라 층위가 많은 원형입니다. 중급에서는 내면 신호와 외부 조건을 분리해 보세요.`,
    `${card.nameKo} 카드는 사건 예측보다 구조 해석에 강한 카드입니다. 심리 흐름, 상황 제약, 시점을 따로 기록하는 방식이 유효합니다.`,
    `${card.nameKo} 카드의 원형 에너지는 고정된 답보다 방향 신호에 가깝습니다. 맥락별로 의미 강도를 나눠 기록해 보세요.`
  ];
  return pickCardVariant(card.id, 'intermediate-rank-line', majorRankVariants);
}

function inferBasicContextProfile(context = '') {
  const text = String(context || '').toLowerCase();
  const profiles = [
    {
      id: 'career',
      keywords: ['이직', '직장', '회사', '업무', '면접', '커리어', '프로젝트'],
      keywordHint: '커리어 맥락이라면 키워드를 실행 증거(산출물/일정)와 연결해 읽어보세요.',
      flowHint: '일정/역할/성과 기준을 같이 보면 해석 정확도가 올라갑니다.',
      learningHint: '기록할 때는 성과 지표 1개를 함께 남겨보세요.'
    },
    {
      id: 'relationship',
      keywords: ['연애', '관계', '재회', '갈등', '소통', '상대'],
      keywordHint: '관계 맥락이라면 키워드를 대화 장면 1개와 연결해 읽는 편이 좋습니다.',
      flowHint: '감정 사실과 요청 문장을 분리하면 오해를 줄일 수 있습니다.',
      learningHint: '대화 전/후 감정 변화를 짧게 기록해 보세요.'
    },
    {
      id: 'finance',
      keywords: ['돈', '재정', '지출', '소비', '수입', '저축', '투자'],
      keywordHint: '재정 맥락이라면 키워드를 지출/저축 선택과 연결해 해석해 보세요.',
      flowHint: '손실 방어 기준과 실행 기준을 함께 두면 해석이 안정됩니다.',
      learningHint: '금액/빈도 중 1개를 숫자로 기록하면 복기가 쉬워집니다.'
    },
    {
      id: 'study',
      keywords: ['공부', '시험', '학습', '자격증', '과제', '준비'],
      keywordHint: '학습 맥락이라면 키워드를 반복 주기와 연결해 보는 것이 효과적입니다.',
      flowHint: '학습량보다 복기 품질을 먼저 보면 개선이 빨라집니다.',
      learningHint: '학습 전/후 이해도 변화를 한 줄로 남겨보세요.'
    }
  ];

  for (const profile of profiles) {
    if (profile.keywords.some((keyword) => text.includes(keyword))) {
      return profile;
    }
  }

  return {
    id: 'general',
    keywordHint: '',
    flowHint: '',
    learningHint: ''
  };
}

function getMinorSuitRankFocus(suit, rank) {
  const suitFocus = {
    Wands: '추진 흐름을 유지하면서 과열을 통제하는',
    Cups: '감정 교류를 안정적으로 다루는',
    Swords: '판단 정확도와 소통 명료도를 높이는',
    Pentacles: '현실 운영과 결과 누적을 강화하는'
  };
  const rankFocus = {
    Ace: '시동 구간',
    Two: '균형 조정 구간',
    Three: '협업 확장 구간',
    Four: '기반 고정 구간',
    Five: '갈등 재정비 구간',
    Six: '회복 연결 구간',
    Seven: '점검 보정 구간',
    Eight: '숙련 축적 구간',
    Nine: '완성 조율 구간',
    Ten: '마무리 전환 구간',
    Page: '탐색 학습 구간',
    Knight: '추진 관리 구간',
    Queen: '내면 안정 구간',
    King: '운영 책임 구간'
  };
  const s = suitFocus[suit] || '핵심 흐름을 점검하는';
  const r = rankFocus[rank] || '성장 구간';
  return `${s} ${r}이라는 점을 같이 기억해 두세요.`;
}

function appendContextHint(line, hint = '') {
  if (!hint) return line;
  return `${line} ${hint}`;
}

function getImagePath(card) {
  const majorPaths = [
    '/9/90/RWS_Tarot_00_Fool.jpg',
    '/d/de/RWS_Tarot_01_Magician.jpg',
    '/8/88/RWS_Tarot_02_High_Priestess.jpg',
    '/d/d2/RWS_Tarot_03_Empress.jpg',
    '/c/c3/RWS_Tarot_04_Emperor.jpg',
    '/8/8d/RWS_Tarot_05_Hierophant.jpg',
    '/d/db/RWS_Tarot_06_Lovers.jpg',
    '/9/9b/RWS_Tarot_07_Chariot.jpg',
    '/f/f5/RWS_Tarot_08_Strength.jpg',
    '/4/4d/RWS_Tarot_09_Hermit.jpg',
    '/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
    '/e/e0/RWS_Tarot_11_Justice.jpg',
    '/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
    '/d/d7/RWS_Tarot_13_Death.jpg',
    '/f/f8/RWS_Tarot_14_Temperance.jpg',
    '/5/55/RWS_Tarot_15_Devil.jpg',
    '/5/53/RWS_Tarot_16_Tower.jpg',
    '/d/db/RWS_Tarot_17_Star.jpg',
    '/7/7f/RWS_Tarot_18_Moon.jpg',
    '/1/17/RWS_Tarot_19_Sun.jpg',
    '/d/dd/RWS_Tarot_20_Judgement.jpg',
    '/f/ff/RWS_Tarot_21_World.jpg'
  ];

  const suitPaths = {
    Wands: [
      '/1/11/Wands01.jpg','/0/0f/Wands02.jpg','/f/ff/Wands03.jpg','/a/a4/Wands04.jpg',
      '/9/9d/Wands05.jpg','/3/3b/Wands06.jpg','/e/e4/Wands07.jpg','/6/6b/Wands08.jpg',
      '/4/4d/Tarot_Nine_of_Wands.jpg','/0/0b/Wands10.jpg','/6/6a/Wands11.jpg','/1/16/Wands12.jpg',
      '/0/0d/Wands13.jpg','/c/ce/Wands14.jpg'
    ],
    Cups: [
      '/3/36/Cups01.jpg','/f/f8/Cups02.jpg','/7/7a/Cups03.jpg','/3/35/Cups04.jpg',
      '/d/d7/Cups05.jpg','/1/17/Cups06.jpg','/a/ae/Cups07.jpg','/6/60/Cups08.jpg',
      '/2/24/Cups09.jpg','/8/84/Cups10.jpg','/a/ad/Cups11.jpg','/f/fa/Cups12.jpg',
      '/6/62/Cups13.jpg','/0/04/Cups14.jpg'
    ],
    Swords: [
      '/1/1a/Swords01.jpg','/9/9e/Swords02.jpg','/0/02/Swords03.jpg','/b/bf/Swords04.jpg',
      '/2/23/Swords05.jpg','/2/29/Swords06.jpg','/3/34/Swords07.jpg','/a/a7/Swords08.jpg',
      '/2/2f/Swords09.jpg','/d/d4/Swords10.jpg','/4/4c/Swords11.jpg','/b/b0/Swords12.jpg',
      '/d/d4/Swords13.jpg','/3/33/Swords14.jpg'
    ],
    Pentacles: [
      '/f/fd/Pents01.jpg','/9/9f/Pents02.jpg','/4/42/Pents03.jpg','/3/35/Pents04.jpg',
      '/9/96/Pents05.jpg','/a/a6/Pents06.jpg','/6/6a/Pents07.jpg','/4/49/Pents08.jpg',
      '/f/f0/Pents09.jpg','/4/42/Pents10.jpg','/e/ec/Pents11.jpg','/d/d5/Pents12.jpg',
      '/8/88/Pents13.jpg','/1/1c/Pents14.jpg'
    ]
  };

  if (card.arcana === 'major') {
    return majorPaths[card.number];
  }

  const rankIdx = rankConfig.findIndex((r) => r.rank === card.rank);
  if (rankIdx < 0 || !suitPaths[card.suit]) return majorPaths[0];
  return suitPaths[card.suit][rankIdx];
}

function buildImageSources(imagePath) {
  const sources = [];
  if (IMAGE_MIRROR_BASE) {
    sources.push(`${IMAGE_MIRROR_BASE}${imagePath}`);
  }
  sources.push(`${IMAGE_ORIGIN}${imagePath}`);
  return sources;
}

function majorKeywords(name) {
  const map = {
    'The Fool': ['새 출발', '모험', '순수성'],
    'The Magician': ['의지', '실행력', '자원 활용'],
    'The High Priestess': ['직관', '무의식', '침묵의 지혜'],
    'The Empress': ['풍요', '양육', '창조성'],
    'The Emperor': ['질서', '권위', '책임'],
    'The Hierophant': ['전통', '가르침', '신념'],
    'The Lovers': ['선택', '가치 정렬', '관계'],
    'The Chariot': ['통제', '집중', '승리'],
    Strength: ['인내', '내면의 힘', '조율'],
    'The Hermit': ['성찰', '고독', '탐구'],
    'Wheel of Fortune': ['변화', '순환', '타이밍'],
    Justice: ['균형', '책임', '판단'],
    'The Hanged Man': ['관점 전환', '멈춤', '수용'],
    Death: ['종결', '정리', '재탄생'],
    Temperance: ['조화', '절제', '통합'],
    'The Devil': ['집착', '유혹', '속박'],
    'The Tower': ['붕괴', '진실 노출', '급변'],
    'The Star': ['희망', '회복', '신뢰'],
    'The Moon': ['불안', '환상', '감정의 파도'],
    'The Sun': ['명확성', '활력', '성취'],
    Judgement: ['각성', '호출', '결단'],
    'The World': ['완성', '통합', '다음 단계']
  };
  return map[name] ?? ['성장', '인식', '전환'];
}

function suitTheme(suit) {
  const map = {
    Wands: '열정과 행동',
    Cups: '감정과 관계',
    Swords: '사고와 판단',
    Pentacles: '현실과 자원'
  };
  return map[suit] ?? '삶의 실천';
}

function minorKeywords(suit, rank) {
  const base = {
    Wands: ['열정', '추진력'],
    Cups: ['감정', '공감'],
    Swords: ['판단', '의사소통'],
    Pentacles: ['안정', '성과']
  };

  const rankMap = {
    Ace: '씨앗',
    Two: '균형',
    Three: '확장',
    Four: '구조',
    Five: '갈등',
    Six: '회복',
    Seven: '점검',
    Eight: '숙련',
    Nine: '완성 직전',
    Ten: '완결',
    Page: '탐색',
    Knight: '추진',
    Queen: '내면화',
    King: '통제'
  };

  return [...(base[suit] ?? ['흐름', '학습']), rankMap[rank] ?? '성장'];
}

function rankStage(rank) {
  const map = {
    Ace: '가능성의 씨앗',
    Two: '선택과 균형 점검',
    Three: '협업과 확장',
    Four: '기반 안정화',
    Five: '긴장과 재조정',
    Six: '회복과 재정렬',
    Seven: '전략 점검',
    Eight: '반복 숙련',
    Nine: '완성 직전 조율',
    Ten: '주기의 마감',
    Page: '탐색과 학습',
    Knight: '추진과 실험',
    Queen: '내면 통합',
    King: '운영과 책임'
  };
  return map[rank] ?? '성장 단계';
}

export const cards = [...majorCards, ...minorCards];

export function getCardById(cardId) {
  return cards.find((card) => card.id === cardId);
}
