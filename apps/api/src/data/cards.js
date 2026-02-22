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
    descriptions: {
      beginner: buildBeginnerDescription(card),
      intermediate: buildIntermediateDescription(card)
    }
  };
}

function buildBeginnerDescription(card) {
  return [
    `${card.nameKo}의 핵심 키워드는 ${card.keywords.join(', ')}입니다. 먼저 키워드 1개를 오늘 상황과 연결해 보세요.`,
    buildBeginnerFlowLine(card),
    buildBeginnerLearningPoint(card)
  ].join('\n');
}

function buildBeginnerFlowLine(card) {
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
  return pickCardVariant(card.id, 'beginner-flow-line', variants);
}

function buildBeginnerLearningPoint(card) {
  const keyword = card.keywords?.[0] || '핵심';
  const keyword2 = card.keywords?.[1] || keyword;

  const majorVariants = [
    `입문 학습 포인트: 오늘 있었던 선택 1개를 떠올리고 "${keyword}"이 강화된 순간/약해진 순간을 한 줄씩 기록하세요.`,
    `입문 학습 포인트: "${keyword}" 키워드를 기준으로 오늘 행동 1개를 고르고, 결과를 짧게 메모해 보세요.`,
    '입문 학습 포인트: 같은 상황을 정방향/역방향 두 관점으로 각각 1문장씩 써보면 카드 감각이 빨리 붙습니다.',
    `입문 학습 포인트: "${keyword2}" 키워드가 대화/일정/감정 중 어디에서 가장 크게 드러났는지 체크해 보세요.`
  ];

  const minorBySuit = {
    Wands: [
      `입문 학습 포인트: 추진 에너지가 분산되지 않게 오늘 우선순위 1개를 정하고 "${keyword}" 실행 여부를 체크하세요.`,
      `입문 학습 포인트: 시작 속도와 완주율을 같이 적어보세요. ${card.nameKo}는 '착수'와 '완료' 균형을 볼 때 정확해집니다.`
    ],
    Cups: [
      `입문 학습 포인트: 감정 표현 1개와 요청 1개를 분리해 기록해 보세요. ${card.nameKo}는 관계 온도 변화를 읽는 데 강합니다.`,
      `입문 학습 포인트: 오늘 대화에서 "${keyword2}"가 높아진 장면 1개를 적고, 그때 사용한 표현을 함께 남겨보세요.`
    ],
    Swords: [
      `입문 학습 포인트: 판단 기준 1개를 먼저 정한 뒤 결정을 내려보세요. ${card.nameKo} 카드는 기준 명확화 연습에 적합합니다.`,
      `입문 학습 포인트: 추측 대신 확인 질문 1개를 실행하고 결과를 기록하세요. "${keyword}" 키워드의 정확도가 빠르게 올라갑니다.`
    ],
    Pentacles: [
      `입문 학습 포인트: 눈에 보이는 결과물 1개를 남기는 습관을 들여보세요. ${card.nameKo}는 현실 성과와 연결할 때 해석이 안정됩니다.`,
      `입문 학습 포인트: 시간/비용/완료 여부 중 1개를 숫자로 기록해 보세요. "${keyword}" 키워드를 실전 기준으로 바꿀 수 있습니다.`
    ]
  };

  const variants = card.arcana === 'major'
    ? majorVariants
    : (minorBySuit[card.suit] || majorVariants);
  return pickCardVariant(card.id, 'beginner-learning-point', variants);
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

function buildIntermediateDescription(card) {
  const rankLine = card.rank
    ? `${card.rankKo} 단계는 ${rankStage(card.rank)} 맥락을 덧붙입니다.`
    : '원형 카드이므로 개인 심리·상황 구조·타이밍의 3축으로 분해해 해석합니다.';

  return [
    `${card.nameKo}를 중급 관점에서 볼 때, 단일 키워드보다 카드 위치(과거/현재/미래)와 인접 카드의 상호작용을 우선 평가합니다.`,
    `${rankLine} 같은 카드라도 질문 범주(연애/일/관계)에 따라 긍정 신호와 경고 신호를 분리해서 기록하세요.`,
    `중급 학습 포인트: "사실(관찰) → 해석(가설) → 조언(행동)" 3단계로 문장을 구성하면 리딩 일관성이 크게 높아집니다.`
  ].join('\n');
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
