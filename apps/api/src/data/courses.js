import { cards } from './cards.js';

const majorIds = cards.filter((c) => c.arcana === 'major').map((c) => c.id);
const minorWands = cards.filter((c) => c.suit === 'Wands').map((c) => c.id);
const minorCups = cards.filter((c) => c.suit === 'Cups').map((c) => c.id);
const minorSwords = cards.filter((c) => c.suit === 'Swords').map((c) => c.id);
const minorPentacles = cards.filter((c) => c.suit === 'Pentacles').map((c) => c.id);

const courtIds = cards
  .filter((card) => ['Page', 'Knight', 'Queen', 'King'].includes(card.rank))
  .map((card) => card.id);
const aceIds = cards.filter((card) => card.rank === 'Ace').map((card) => card.id);
const tenIds = cards.filter((card) => card.rank === 'Ten').map((card) => card.id);
const reversalCoreIds = [
  'major-12',
  'major-13',
  'major-15',
  'major-16',
  'minor-cups-four',
  'minor-swords-eight',
  'minor-swords-nine',
  'minor-pentacles-five',
  'minor-wands-seven'
];

function pick(...idGroups) {
  return idGroups.flat().filter(Boolean);
}

export const courses = [
  {
    id: 'foundation-zero-to-one',
    track: 'foundation',
    stage: '기초 입문',
    title: '기초 입문: 카드 읽기 0→1',
    description: '정/역방향, 키워드, 한 줄 해석을 가장 짧은 루틴으로 익힙니다.',
    level: 'beginner'
  },
  {
    id: 'foundation-major-story',
    track: 'foundation',
    stage: '기초 입문',
    title: '기초 입문: 메이저 서사 지도',
    description: '메이저 22장을 흐름 중심으로 묶어 큰 맥락을 빠르게 잡습니다.',
    level: 'beginner'
  },
  {
    id: 'beginner-daily-practice',
    track: 'beginner',
    stage: '입문 실전',
    title: '입문 실전: 하루 1카드 루틴',
    description: '오늘의 질문과 행동 1개를 연결하는 실전 루틴을 만듭니다.',
    level: 'beginner'
  },
  {
    id: 'beginner-three-card-basics',
    track: 'beginner',
    stage: '입문 실전',
    title: '입문 실전: 3카드 기본 구조',
    description: '상황-행동-결과 3단 구조로 해석을 안정화합니다.',
    level: 'beginner'
  },
  {
    id: 'upper-beginner-reversals',
    track: 'upper-beginner',
    stage: '입문 심화',
    title: '입문 심화: 역방향 해석 기초',
    description: '막힘/지연/과잉 신호를 실전 교정 문장으로 바꿉니다.',
    level: 'beginner'
  },
  {
    id: 'upper-beginner-suit-basics',
    track: 'upper-beginner',
    stage: '입문 심화',
    title: '입문 심화: 4수트 체감 정리',
    description: '완드·컵·소드·펜타클의 차이를 일상 사례로 구분합니다.',
    level: 'beginner'
  },
  {
    id: 'intermediate-context-branch',
    track: 'intermediate',
    stage: '중급 코어',
    title: '중급 코어: 질문 맥락 분기',
    description: '관계/커리어/재정/학습 맥락에 따라 카드 문장을 달리 읽습니다.',
    level: 'intermediate'
  },
  {
    id: 'intermediate-court-voices',
    track: 'intermediate',
    stage: '중급 코어',
    title: '중급 코어: 코트 카드 역할 비교',
    description: '페이지/나이트/퀸/킹의 말투와 행동 패턴을 분리합니다.',
    level: 'intermediate'
  },
  {
    id: 'intermediate-choice-reading',
    track: 'intermediate',
    stage: '중급 코어',
    title: '중급 코어: 양자택일 판정 훈련',
    description: 'A/B 선택의 근거, 리스크, 유지 가능성을 같이 평가합니다.',
    level: 'intermediate'
  },
  {
    id: 'upper-intermediate-spread-link',
    track: 'upper-intermediate',
    stage: '중급 심화',
    title: '중급 심화: 스프레드 연결 해석',
    description: '포지션 간 연결, 충돌 신호, 보정 액션을 구조적으로 정리합니다.',
    level: 'intermediate'
  },
  {
    id: 'upper-intermediate-proof-log',
    track: 'upper-intermediate',
    stage: '중급 심화',
    title: '중급 심화: 근거 로그와 복기',
    description: '해석 가설과 반례를 동시에 기록해 재현성을 높입니다.',
    level: 'intermediate'
  },
  {
    id: 'advanced-celtic-system',
    track: 'advanced',
    stage: '고급 운영',
    title: '고급 운영: 켈틱 크로스 시스템',
    description: '복합 질문을 10포지션 스토리로 통합하는 운영법을 다룹니다.',
    level: 'intermediate'
  },
  {
    id: 'advanced-year-cycle',
    track: 'advanced',
    stage: '고급 운영',
    title: '고급 운영: 주간·월간·연간 흐름',
    description: '기간형 리딩을 일관된 판단 기준으로 연결합니다.',
    level: 'intermediate'
  },
  {
    id: 'expert-quality-lab',
    track: 'expert',
    stage: '전문가 랩',
    title: '전문가 랩: 리딩 품질 검증',
    description: '판정 문장, 행동 가이드, 복기 품질을 체크리스트로 검증합니다.',
    level: 'intermediate'
  }
].map((course, index) => ({
  ...course,
  order: index + 1,
  stageOrder: ({
    '기초 입문': 1,
    '입문 실전': 2,
    '입문 심화': 3,
    '중급 코어': 4,
    '중급 심화': 5,
    '고급 운영': 6,
    '전문가 랩': 7
  }[course.stage] ?? 99)
}));

export const lessonsByCourse = {
  'foundation-zero-to-one': [
    {
      id: 'fz-1',
      title: '정/역방향 한 줄 해석',
      summary: '정방향과 역방향을 한 문장으로 요약하는 연습',
      cardIds: majorIds.slice(0, 6)
    },
    {
      id: 'fz-2',
      title: '키워드 1개로 해석하기',
      summary: '카드별 핵심 키워드 1개를 행동 문장으로 변환',
      cardIds: pick(minorWands.slice(0, 3), minorCups.slice(0, 3), minorSwords.slice(0, 3), minorPentacles.slice(0, 3))
    },
    {
      id: 'fz-3',
      title: '오늘 할 일/복기 루틴',
      summary: '카드 해석을 당일 행동과 복기 1줄로 연결',
      cardIds: pick(majorIds.slice(6, 10), aceIds.slice(0, 2))
    }
  ],
  'foundation-major-story': [
    {
      id: 'fm-1',
      title: '메이저 0~7: 시작과 추진',
      summary: '바보~전차 구간을 시작/선택/추진으로 읽기',
      cardIds: majorIds.slice(0, 8)
    },
    {
      id: 'fm-2',
      title: '메이저 8~14: 조율과 전환',
      summary: '힘~절제 구간의 조율·중단·전환 신호 읽기',
      cardIds: majorIds.slice(8, 15)
    },
    {
      id: 'fm-3',
      title: '메이저 15~21: 리셋과 완성',
      summary: '악마~세계 구간의 리스크/회복/완결 구조',
      cardIds: majorIds.slice(15)
    }
  ],
  'beginner-daily-practice': [
    {
      id: 'bd-1',
      title: '하루 질문 세우기',
      summary: '오늘 질문을 짧고 구체적으로 만드는 법',
      cardIds: pick(majorIds.slice(0, 4), minorCups.slice(0, 2))
    },
    {
      id: 'bd-2',
      title: '한 줄 결론 + 근거 1개',
      summary: '결론 문장과 카드 근거를 같이 적는 연습',
      cardIds: pick(minorWands.slice(0, 4), minorSwords.slice(0, 2))
    },
    {
      id: 'bd-3',
      title: '복기 기록 습관',
      summary: '맞음/부분맞음/다름으로 해석 결과를 점검',
      cardIds: pick(minorPentacles.slice(0, 4), majorIds.slice(10, 12))
    }
  ],
  'beginner-three-card-basics': [
    {
      id: 'bt-1',
      title: '상황 카드 읽기',
      summary: '현재 상태를 과장 없이 정리하는 훈련',
      cardIds: pick(majorIds.slice(12, 16), minorSwords.slice(2, 6))
    },
    {
      id: 'bt-2',
      title: '행동 카드 읽기',
      summary: '실행 가능한 행동 문장으로 바꾸기',
      cardIds: pick(minorWands.slice(3, 8), minorPentacles.slice(2, 6))
    },
    {
      id: 'bt-3',
      title: '결과 카드 읽기',
      summary: '단기 결과와 리스크를 같이 쓰는 법',
      cardIds: pick(majorIds.slice(16, 20), tenIds.slice(0, 2))
    }
  ],
  'upper-beginner-reversals': [
    {
      id: 'ubr-1',
      title: '역방향 기본 신호',
      summary: '지연/과잉/회피 패턴 구분',
      cardIds: reversalCoreIds.slice(0, 5)
    },
    {
      id: 'ubr-2',
      title: '역방향 교정 문장',
      summary: '막힘을 행동 교정 문장으로 바꾸기',
      cardIds: reversalCoreIds.slice(4)
    },
    {
      id: 'ubr-3',
      title: '리스크 완화 루틴',
      summary: '오늘 줄일 것 1개, 지킬 것 1개로 운영',
      cardIds: pick(minorSwords.slice(6, 10), majorIds.slice(14, 18))
    }
  ],
  'upper-beginner-suit-basics': [
    {
      id: 'ubs-1',
      title: '완드/컵 비교',
      summary: '행동과 감정의 속도 차이 이해',
      cardIds: pick(minorWands.slice(0, 7), minorCups.slice(0, 7))
    },
    {
      id: 'ubs-2',
      title: '소드/펜타클 비교',
      summary: '판단과 현실 운영의 균형 잡기',
      cardIds: pick(minorSwords.slice(0, 7), minorPentacles.slice(0, 7))
    },
    {
      id: 'ubs-3',
      title: '수트별 실전 문장',
      summary: '같은 질문을 수트별로 다르게 표현',
      cardIds: pick(minorWands.slice(7, 10), minorCups.slice(7, 10), minorSwords.slice(7, 10), minorPentacles.slice(7, 10))
    }
  ],
  'intermediate-context-branch': [
    {
      id: 'icb-1',
      title: '관계 맥락 분기',
      summary: '관계 질문에서 해석 초점을 고정하는 법',
      cardIds: pick(minorCups.slice(2, 10), ['major-6', 'major-14', 'major-17'])
    },
    {
      id: 'icb-2',
      title: '커리어/학습 맥락 분기',
      summary: '업무·학습 질문에서 실행 기준 세우기',
      cardIds: pick(minorWands.slice(2, 10), minorSwords.slice(2, 10))
    },
    {
      id: 'icb-3',
      title: '재정/일상 맥락 분기',
      summary: '현실 운영 질문에서 리스크 통제하기',
      cardIds: pick(minorPentacles.slice(2, 12), ['major-10', 'major-11'])
    }
  ],
  'intermediate-court-voices': [
    {
      id: 'icv-1',
      title: '페이지/나이트의 추진 차이',
      summary: '탐색형과 추진형의 말투·행동 분리',
      cardIds: courtIds.filter((id) => id.includes('page') || id.includes('knight'))
    },
    {
      id: 'icv-2',
      title: '퀸/킹의 운영 차이',
      summary: '내면 안정과 책임 운영의 관점 구분',
      cardIds: courtIds.filter((id) => id.includes('queen') || id.includes('king'))
    },
    {
      id: 'icv-3',
      title: '코트카드 통합 적용',
      summary: '상황별로 코트카드 역할을 선택 적용',
      cardIds: courtIds
    }
  ],
  'intermediate-choice-reading': [
    {
      id: 'ich-1',
      title: 'A/B 근거 설계',
      summary: '현재상황-가까운미래-결과로 근거 고정',
      cardIds: pick(majorIds.slice(3, 9), minorSwords.slice(4, 10))
    },
    {
      id: 'ich-2',
      title: '우세/조건부/박빙 판정',
      summary: '판정 라벨과 리스크 문장을 함께 쓰기',
      cardIds: pick(minorPentacles.slice(4, 10), minorWands.slice(4, 10))
    },
    {
      id: 'ich-3',
      title: '선택 후 복기 설계',
      summary: '선택 결과를 7일 단위로 검증하는 루틴',
      cardIds: pick(minorCups.slice(4, 10), ['major-10', 'major-20'])
    }
  ],
  'upper-intermediate-spread-link': [
    {
      id: 'uis-1',
      title: '포지션 간 연결 해석',
      summary: '카드별 단문을 스토리로 연결하는 훈련',
      cardIds: pick(majorIds.slice(6, 13), minorWands.slice(6, 11))
    },
    {
      id: 'uis-2',
      title: '충돌 신호 보정',
      summary: '긍정/리스크 신호가 섞일 때 판정하기',
      cardIds: pick(minorSwords.slice(5, 11), minorCups.slice(5, 11))
    },
    {
      id: 'uis-3',
      title: '실행 가이드 생성',
      summary: '해석을 7일 행동 계획으로 변환',
      cardIds: pick(minorPentacles.slice(5, 11), ['major-14', 'major-19'])
    }
  ],
  'upper-intermediate-proof-log': [
    {
      id: 'uip-1',
      title: '가설/근거/반례 기록',
      summary: '중급 복기 로그 양식 만들기',
      cardIds: pick(majorIds.slice(8, 14), minorSwords.slice(8, 12))
    },
    {
      id: 'uip-2',
      title: '오차 분류와 교정',
      summary: '과해석/누락/오판을 유형별로 교정',
      cardIds: pick(minorWands.slice(8, 12), minorPentacles.slice(8, 12))
    },
    {
      id: 'uip-3',
      title: '반복률 낮추기',
      summary: '표현 반복을 줄이고 근거 다양화',
      cardIds: pick(minorCups.slice(8, 12), ['major-9', 'major-11', 'major-17'])
    }
  ],
  'advanced-celtic-system': [
    {
      id: 'acs-1',
      title: '켈틱 10포지션 문법',
      summary: '포지션 역할과 읽기 순서 고정',
      cardIds: pick(majorIds.slice(0, 10), minorSwords.slice(0, 4))
    },
    {
      id: 'acs-2',
      title: '복합 질문 분해',
      summary: '하나의 질문을 변수별로 분해해 해석',
      cardIds: pick(majorIds.slice(10, 18), minorPentacles.slice(4, 8))
    },
    {
      id: 'acs-3',
      title: '장문 요약 압축',
      summary: '긴 리딩을 결론/근거/행동으로 압축',
      cardIds: pick(majorIds.slice(18), minorWands.slice(8, 12))
    }
  ],
  'advanced-year-cycle': [
    {
      id: 'ayc-1',
      title: '주간 리듬 설계',
      summary: '월~일 포지션 흐름을 행동 계획으로 전환',
      cardIds: pick(minorWands.slice(0, 7), minorPentacles.slice(0, 4))
    },
    {
      id: 'ayc-2',
      title: '월간 4주 요약',
      summary: '총평/주차 흐름/실행가이드 구성 훈련',
      cardIds: pick(minorCups.slice(3, 10), majorIds.slice(12, 16))
    },
    {
      id: 'ayc-3',
      title: '연간 분기 운영',
      summary: '확장 구간과 정비 구간을 분리 운영',
      cardIds: pick(majorIds.slice(9, 22), tenIds)
    }
  ],
  'expert-quality-lab': [
    {
      id: 'eql-1',
      title: '판정 문장 품질 체크',
      summary: '우세/조건부/박빙 라벨의 근거 일치 검증',
      cardIds: pick(majorIds.slice(5, 11), minorSwords.slice(6, 11))
    },
    {
      id: 'eql-2',
      title: '행동 가이드 품질 체크',
      summary: '실행 문장의 구체성/실행가능성 점검',
      cardIds: pick(minorWands.slice(6, 11), minorPentacles.slice(6, 11))
    },
    {
      id: 'eql-3',
      title: '복기 리포트 운영',
      summary: '복기 로그로 다음 리딩 품질 끌어올리기',
      cardIds: pick(minorCups.slice(6, 11), ['major-0', 'major-10', 'major-20'])
    }
  ]
};

const stagePlaybook = {
  '기초 입문': {
    focus: '카드를 길게 설명하려 하지 말고, 핵심 키워드 1개를 오늘 상황 1개와 연결하는 훈련',
    mistakes: '뜻을 외우는 데만 시간을 쓰고, 실제 질문/상황에 연결하지 못하는 실수',
    review: '리딩 뒤에 "내가 근거로 쓴 단어가 실제 상황과 맞았는가?"를 짧게 확인'
  },
  '입문 실전': {
    focus: '결론 1문장 + 근거 1문장 + 오늘 행동 1개로 리딩을 짧고 선명하게 만드는 훈련',
    mistakes: '결론 없이 느낌만 길어지거나, 행동 없이 해석만 끝나는 실수',
    review: '당일 저녁에 "실행했는지/안 했는지"와 이유 1개를 반드시 기록'
  },
  '입문 심화': {
    focus: '역방향/수트 차이를 "위험 신호와 보정 행동"으로 번역하는 훈련',
    mistakes: '역방향을 무조건 부정으로 읽거나, 수트 차이를 비슷하게 읽는 실수',
    review: '막힘 원인 1개와 바로 바꿀 행동 1개를 짝으로 남기는 복기'
  },
  '중급 코어': {
    focus: '질문 맥락에 따라 같은 카드도 해석 기준을 다르게 잡는 훈련',
    mistakes: '관계/커리어/재정 질문을 같은 문장 톤으로 읽어 맥락이 흐려지는 실수',
    review: '해석 가설 1개, 반례 1개, 검증 행동 1개를 분리해 점검'
  },
  '중급 심화': {
    focus: '포지션 연결과 충돌 신호를 하나의 스토리로 묶어 판정하는 훈련',
    mistakes: '카드별 해석은 맞지만 전체 결론과 행동 계획이 분리되는 실수',
    review: '적중 근거와 오차 근거를 각각 1개씩 남겨 다음 리딩 기준 보정'
  },
  '고급 운영': {
    focus: '긴 리딩을 결론-근거-실행 순서로 압축해 전달 품질을 높이는 훈련',
    mistakes: '장문 설명은 많지만, 실제 의사결정에 바로 쓰기 어려운 실수',
    review: '리딩 후 "실행 가능한 문장으로 끝났는가?"를 체크리스트로 검증'
  },
  '전문가 랩': {
    focus: '문장 품질/판정 정확도/복기 데이터로 리딩 재현성을 관리하는 훈련',
    mistakes: '느낌 좋은 문장에 의존하고, 근거 기록 없이 다음 리딩으로 넘어가는 실수',
    review: '주간 단위로 오판 유형을 분류하고 교정 규칙을 업데이트'
  }
};

const cardNameById = new Map(cards.map((card) => [card.id, card.nameKo]));
const cardKeywordsByName = new Map(cards.map((card) => [card.nameKo, card.keywords || []]));

function getCardNames(cardIds = [], limit = 6) {
  return cardIds
    .slice(0, limit)
    .map((id) => cardNameById.get(id) || id);
}

function buildNovelExampleCardNamesByLessonId() {
  const lessons = courses.flatMap((course) => lessonsByCourse[course.id] || []);
  const allCardNames = cards.map((card) => card.nameKo).filter(Boolean);
  const map = new Map();
  const usedPrimary = new Set();

  function hashText(text = '') {
    let hash = 0;
    for (const ch of text) {
      hash = ((hash * 33) + ch.charCodeAt(0)) >>> 0;
    }
    return hash;
  }

  function pickCard(options, startIndex, blocked = new Set()) {
    if (options.length === 0) return '';
    const len = options.length;
    for (let i = 0; i < len; i += 1) {
      const candidate = options[(startIndex + i) % len];
      if (!blocked.has(candidate)) return candidate;
    }
    return options[startIndex % len];
  }

  lessons.forEach((lesson) => {
    const optionNames = getCardNames(lesson.cardIds, lesson.cardIds?.length || 6)
      .filter(Boolean);
    const baseOptions = optionNames.length > 0 ? optionNames : allCardNames;
    const start = hashText(lesson.id) % baseOptions.length;

    let primary = '';
    for (let i = 0; i < baseOptions.length; i += 1) {
      const candidate = baseOptions[(start + i) % baseOptions.length];
      if (!usedPrimary.has(candidate)) {
        primary = candidate;
        break;
      }
    }
    if (!primary) primary = pickCard(baseOptions, start);

    const blocked = new Set([primary]);
    const secondStart = (start + Math.max(1, Math.floor(baseOptions.length / 2))) % baseOptions.length;
    const second = pickCard(baseOptions, secondStart, blocked);
    blocked.add(second);
    const thirdStart = (start + Math.max(2, Math.floor((baseOptions.length * 2) / 3))) % baseOptions.length;
    const third = pickCard(baseOptions, thirdStart, blocked);

    usedPrimary.add(primary);
    map.set(lesson.id, [primary, second, third]);
  });

  return map;
}

const novelExampleCardNamesByLessonId = buildNovelExampleCardNamesByLessonId();

function inferLessonDomain(lesson, course) {
  const id = String(lesson.id || '');
  if (id.startsWith('fz-') || id.startsWith('fm-') || id.startsWith('bd-') || id.startsWith('bt-')) return 'general';
  if (id.startsWith('ubr-')) return 'risk';
  if (course?.stage === '기초 입문' || course?.stage === '입문 실전' || course?.stage === '입문 심화') return 'general';

  const text = `${lesson.title} ${lesson.summary}`.toLowerCase();
  if (['관계', '연애', '재회', '갈등'].some((k) => text.includes(k))) return 'relationship';
  if (['커리어', '업무', '학업', '학습', '시험', '취업', '면접'].some((k) => text.includes(k))) return 'career';
  if (['재정', '지출', '수입'].some((k) => text.includes(k))) return 'finance';
  if (['역방향', '리스크', '교정'].some((k) => text.includes(k))) return 'risk';
  return 'general';
}

function buildDomainGuides(domain) {
  const guide = {
    relationship: {
      questionTemplate: '상대와의 관계에서 오늘 내가 바꿔야 할 대화 방식은 무엇인가?',
      evidenceHint: '감정 신호 1개 + 대화 패턴 1개 + 타이밍 1개',
      actionHint: '오늘 보낼 문장 1개와 피할 문장 1개를 확정',
      reviewHint: '대화 후 상대 반응과 내 감정 변화를 각각 1줄로 기록'
    },
    career: {
      questionTemplate: '일/학업에서 이번 주 성과를 올리기 위해 가장 먼저 실행할 한 가지는 무엇인가?',
      evidenceHint: '우선순위 1개 + 리스크 1개 + 자원 상태 1개',
      actionHint: '오늘 20~40분 안에 완료 가능한 작업 1개를 실행',
      reviewHint: '실행 전후 생산성/집중도/결과물을 1줄씩 기록'
    },
    finance: {
      questionTemplate: '지출 흐름을 안정화하려면 지금 가장 먼저 조정할 항목은 무엇인가?',
      evidenceHint: '고정비/변동비 중 핵심 누수 1개 + 보호 항목 1개',
      actionHint: '줄일 지출 1개, 유지할 지출 1개를 나눠 즉시 적용',
      reviewHint: '하루 지출에서 바뀐 금액 또는 빈도를 짧게 기록'
    },
    risk: {
      questionTemplate: '지금 흐름에서 가장 먼저 조정해야 할 위험 신호는 무엇인가?',
      evidenceHint: '막힘 신호 1개 + 과속 신호 1개 + 완충 방법 1개',
      actionHint: '속도를 낮추는 행동 1개와 유지할 기준 1개를 확정',
      reviewHint: '실행 후 긴장도/혼란도/명확도 변화를 기록'
    },
    general: {
      questionTemplate: '오늘 질문에서 실제로 바꿀 수 있는 행동 한 가지는 무엇인가?',
      evidenceHint: '카드 키워드 1개 + 포지션 의미 1개 + 상황 근거 1개',
      actionHint: '오늘 바로 실행할 행동 1개를 문장으로 확정',
      reviewHint: '그 행동이 실제로 도움이 되었는지 한 줄 복기'
    }
  };
  return guide[domain] || guide.general;
}

const lessonSeriesProfiles = {
  fz: [
    {
      signature: '정방향/역방향을 한 문장으로 압축해 말하는 기초 문법',
      questionTemplate: '이 카드가 지금 흐름에서 열리는 부분과 막히는 부분은 무엇인가?',
      evidenceHint: '정/역방향 차이 1개 + 키워드 1개 + 현재 상황 1개',
      actionHint: '정방향이면 유지 행동 1개, 역방향이면 교정 행동 1개를 확정',
      reviewHint: '해석 전후 판단이 바뀐 지점을 한 줄로 기록'
    },
    {
      signature: '키워드 1개로 결론을 세우는 압축 훈련',
      questionTemplate: '지금 상황에서 가장 중심이 되는 카드 키워드는 무엇인가?',
      evidenceHint: '핵심 키워드 1개 + 보조 신호 1개 + 질문 맥락 1개',
      actionHint: '핵심 키워드를 오늘 행동 문장으로 번역',
      reviewHint: '키워드 해석이 실제 상황과 맞았는지 짧게 점검'
    },
    {
      signature: '오늘 행동과 복기 1줄을 붙여 리딩을 완결하는 훈련',
      questionTemplate: '오늘 바로 실행하면 흐름이 달라질 행동 1개는 무엇인가?',
      evidenceHint: '행동 근거 카드 1개 + 실행 타이밍 1개 + 기대 변화 1개',
      actionHint: '오늘 안에 완료할 행동 1개를 시간과 함께 고정',
      reviewHint: '실행 여부와 체감 변화를 2줄로 기록'
    }
  ],
  fm: [
    {
      signature: '메이저 0~7의 시작/선택/추진 서사를 하나로 연결하는 훈련',
      questionTemplate: '지금 단계가 시작-선택-추진 중 어디에 있는가?',
      evidenceHint: '메이저 번호 흐름 + 카드 키워드 + 현재 상황',
      actionHint: '현재 단계에 맞는 실행 강도(시작/정비/가속) 1개 선택',
      reviewHint: '단계 판별이 맞았는지 다음 사건으로 확인'
    },
    {
      signature: '메이저 8~14의 조율/전환 신호를 읽는 훈련',
      questionTemplate: '지금은 밀어붙일 시기인가, 균형을 맞출 시기인가?',
      evidenceHint: '조율 신호 1개 + 멈춤 신호 1개 + 전환 조건 1개',
      actionHint: '줄일 행동 1개와 유지할 행동 1개를 분리',
      reviewHint: '조율 이후 결과 안정성이 높아졌는지 기록'
    },
    {
      signature: '메이저 15~21의 리스크/회복/완결 구조 읽기',
      questionTemplate: '지금 흐름에서 끊어야 할 반복과 완성해야 할 과제는 무엇인가?',
      evidenceHint: '리스크 요인 1개 + 회복 자원 1개 + 완결 신호 1개',
      actionHint: '끊을 패턴 1개와 마무리 행동 1개를 확정',
      reviewHint: '반복 패턴이 줄었는지 주간 단위 점검'
    }
  ],
  bd: [
    {
      signature: '하루 질문을 짧고 선명하게 만드는 훈련',
      questionTemplate: '오늘 질문을 한 문장으로 줄이면 무엇이 핵심인가?',
      evidenceHint: '질문 핵심 1개 + 제외할 잡음 1개 + 카드 연결 1개',
      actionHint: '질문을 한 줄로 고정하고 리딩 시작',
      reviewHint: '질문이 짧아졌을 때 해석 정확도 변화 기록'
    },
    {
      signature: '결론 1문장과 근거 1문장을 분리하는 훈련',
      questionTemplate: '이 리딩의 결론은 무엇이고, 근거는 무엇인가?',
      evidenceHint: '결론 문장 1개 + 근거 문장 1개를 명확히 분리',
      actionHint: '결론 뒤에 오늘 실행 문장 1개 연결',
      reviewHint: '근거 문장이 실제 상황 설명에 도움이 됐는지 점검'
    },
    {
      signature: '맞음/부분맞음/다름 복기 루틴 정착',
      questionTemplate: '이번 해석은 실제 결과와 얼마나 맞았는가?',
      evidenceHint: '맞은 근거 1개 + 빗나간 근거 1개 + 원인 1개',
      actionHint: '다음 리딩에서 바꿀 문장 1개 지정',
      reviewHint: '복기 누적 3회 후 반복 오차 패턴 확인'
    }
  ],
  bt: [
    {
      signature: '상황 카드를 과장 없이 사실 중심으로 읽는 훈련',
      questionTemplate: '현재 상황에서 이미 벌어진 사실은 무엇인가?',
      evidenceHint: '상황 사실 1개 + 감정 상태 1개 + 제약 조건 1개',
      actionHint: '상황 설명을 추측 없이 2문장으로 요약',
      reviewHint: '사실/해석을 섞지 않았는지 점검'
    },
    {
      signature: '행동 카드를 실행 문장으로 번역하는 훈련',
      questionTemplate: '이 카드가 지금 당장 요구하는 행동은 무엇인가?',
      evidenceHint: '행동 근거 1개 + 실행 순서 1개 + 중단 조건 1개',
      actionHint: '20~40분 내 가능한 행동 1개를 즉시 실행',
      reviewHint: '실행 여부와 난이도를 함께 기록'
    },
    {
      signature: '결과 카드에서 기대효과와 리스크를 같이 쓰는 훈련',
      questionTemplate: '이 흐름을 유지했을 때 얻는 것과 잃는 것은 무엇인가?',
      evidenceHint: '기대 결과 1개 + 리스크 1개 + 완충 행동 1개',
      actionHint: '결과를 살리는 행동 1개와 리스크 완충 1개 설정',
      reviewHint: '예측과 실제 결과의 차이를 체크'
    }
  ],
  ubr: [
    {
      signature: '역방향의 지연/과잉/회피 신호 구분 훈련',
      questionTemplate: '이 역방향이 말하는 핵심 문제는 지연인가, 과잉인가, 회피인가?',
      evidenceHint: '막힘 원인 1개 + 과속 요인 1개 + 누락 요소 1개',
      actionHint: '가장 큰 병목 1개만 먼저 교정',
      reviewHint: '교정 후 혼란이 줄었는지 기록'
    },
    {
      signature: '역방향을 교정 문장으로 변환하는 훈련',
      questionTemplate: '지금 필요한 교정 문장을 한 줄로 쓰면 어떻게 되는가?',
      evidenceHint: '문제 문장 1개 + 교정 문장 1개 + 실행 근거 1개',
      actionHint: '오늘 적용할 교정 문장 1개를 대화/업무에 사용',
      reviewHint: '교정 문장 적용 후 반응 변화 확인'
    },
    {
      signature: '리스크 완화 루틴을 행동 규칙으로 고정하는 훈련',
      questionTemplate: '지금 당장 줄여야 할 리스크와 지켜야 할 기준은 무엇인가?',
      evidenceHint: '리스크 행동 1개 + 보호 기준 1개 + 완충 시간 1개',
      actionHint: '줄일 것 1개, 지킬 것 1개를 하루 루틴에 삽입',
      reviewHint: '리스크 체감 강도 변화를 3일간 기록'
    }
  ],
  ubs: [
    {
      signature: '완드/컵의 속도 차이를 실전 문장으로 읽는 훈련',
      questionTemplate: '이 상황은 행동 속도 문제인가, 감정 온도 문제인가?',
      evidenceHint: '속도 신호 1개 + 감정 신호 1개 + 충돌 지점 1개',
      actionHint: '속도 조절 또는 감정 조절 중 1개 우선 적용',
      reviewHint: '조절 이후 마찰 감소 여부 점검'
    },
    {
      signature: '소드/펜타클의 판단/운영 차이 훈련',
      questionTemplate: '지금 필요한 것은 판단 정리인가, 현실 운영 정리인가?',
      evidenceHint: '판단 기준 1개 + 실행 기준 1개 + 누락 자원 1개',
      actionHint: '기준표 2칸(판단/운영)으로 오늘 과제 분류',
      reviewHint: '기준표 사용 후 의사결정 속도 점검'
    },
    {
      signature: '같은 질문을 수트별로 다르게 표현하는 훈련',
      questionTemplate: '같은 질문을 완드/컵/소드/펜타클 관점으로 바꾸면 어떻게 달라지는가?',
      evidenceHint: '수트별 핵심 문장 1개씩 + 공통 결론 1개',
      actionHint: '수트별 문장 중 실전성이 가장 높은 1개 채택',
      reviewHint: '채택 문장의 실행 적합도 기록'
    }
  ],
  icb: [
    {
      signature: '관계 질문 맥락 분기 훈련',
      questionTemplate: '이 관계 질문은 감정 회복, 대화 조정, 경계 설정 중 어디에 해당하는가?',
      evidenceHint: '감정 사실 1개 + 대화 패턴 1개 + 관계 리듬 1개',
      actionHint: '전할 문장 1개와 멈출 문장 1개 확정',
      reviewHint: '대화 후 반응 변화와 오해 감소 여부 점검'
    },
    {
      signature: '커리어/학습 질문 분기 훈련',
      questionTemplate: '이 질문은 성과 문제인가, 준비 문제인가, 운영 문제인가?',
      evidenceHint: '성과 지표 1개 + 준비 상태 1개 + 운영 리스크 1개',
      actionHint: '실행 우선순위 1개를 시간과 함께 고정',
      reviewHint: '실행 전후 성과 지표 비교'
    },
    {
      signature: '재정/일상 질문 분기 훈련',
      questionTemplate: '이 흐름은 누수 관리가 핵심인가, 습관 교정이 핵심인가?',
      evidenceHint: '지출/소모 요인 1개 + 유지 자원 1개 + 개선 여지 1개',
      actionHint: '오늘 줄일 항목 1개와 유지할 루틴 1개 확정',
      reviewHint: '체감 소모량이 줄었는지 일일 점검'
    }
  ],
  icv: [
    {
      signature: '페이지/나이트 역할 차이 훈련',
      questionTemplate: '지금은 탐색형 접근이 맞는가, 추진형 접근이 맞는가?',
      evidenceHint: '탐색 신호 1개 + 추진 신호 1개 + 충돌 리스크 1개',
      actionHint: '탐색 질문 1개 또는 추진 행동 1개 선택',
      reviewHint: '선택한 접근의 적합도 기록'
    },
    {
      signature: '퀸/킹 운영 차이 훈련',
      questionTemplate: '지금 필요한 것은 내면 안정 운영인가, 외부 책임 운영인가?',
      evidenceHint: '정서 안정 1개 + 구조 운영 1개 + 균형 조건 1개',
      actionHint: '안정 루틴 1개와 책임 행동 1개를 짝으로 운영',
      reviewHint: '균형이 맞았는지 피로도/성과로 확인'
    },
    {
      signature: '코트카드 통합 적용 훈련',
      questionTemplate: '현재 상황에서 어떤 역할(탐색/추진/안정/운영)을 우선 적용해야 하는가?',
      evidenceHint: '역할 후보 2개 + 선택 근거 1개 + 보완 역할 1개',
      actionHint: '우선 역할 1개를 오늘 행동으로 변환',
      reviewHint: '역할 선택이 결과에 미친 영향 기록'
    }
  ],
  ich: [
    {
      signature: 'A/B 선택 근거 설계 훈련',
      questionTemplate: 'A와 B 중 현재 상황에서 유지 가능성이 높은 선택은 무엇인가?',
      evidenceHint: '현재 상황 + 가까운 미래 + 결과 포지션 근거',
      actionHint: '우세 선택 1개와 조건부 리스크 1개를 함께 제시',
      reviewHint: '선택 이후 7일간 결과 추적'
    },
    {
      signature: '우세/조건부/박빙 판정 훈련',
      questionTemplate: '이 선택은 확실 우세인가, 조건부 가능인가, 박빙인가?',
      evidenceHint: '강점 근거 1개 + 위험 근거 1개 + 지속 가능성 1개',
      actionHint: '판정 라벨과 실행 조건을 한 문단으로 명시',
      reviewHint: '판정 정확도와 리스크 현실화 여부 점검'
    },
    {
      signature: '선택 이후 복기 루틴 설계 훈련',
      questionTemplate: '선택 후 어떤 지표로 결과를 검증할 것인가?',
      evidenceHint: '검증 지표 1개 + 확인 시점 1개 + 실패 신호 1개',
      actionHint: '7일 복기표(날짜/행동/결과) 작성',
      reviewHint: '복기 결과로 다음 선택 규칙 업데이트'
    }
  ],
  uis: [
    {
      signature: '포지션 간 연결로 스토리 만들기 훈련',
      questionTemplate: '카드 단문을 연결하면 어떤 흐름 스토리가 되는가?',
      evidenceHint: '시작 포지션 1개 + 전환 포지션 1개 + 결과 포지션 1개',
      actionHint: '스토리 한 문단과 실행 문장 1개 작성',
      reviewHint: '스토리와 실제 전개의 일치도 점검'
    },
    {
      signature: '충돌 신호를 판정으로 보정하는 훈련',
      questionTemplate: '긍정 신호와 경고 신호가 충돌할 때 어떤 판정을 내려야 하는가?',
      evidenceHint: '긍정 근거 1개 + 경고 근거 1개 + 완충 기준 1개',
      actionHint: '우세를 조건부로 낮출 기준 명시',
      reviewHint: '충돌 판정의 적중률 추적'
    },
    {
      signature: '해석을 7일 실행 가이드로 전환하는 훈련',
      questionTemplate: '이 리딩을 7일 행동 계획으로 바꾸면 무엇을 해야 하는가?',
      evidenceHint: '오늘 행동 1개 + 3일차 점검 1개 + 7일차 평가 1개',
      actionHint: '7일 계획표를 실제 일정과 연결',
      reviewHint: '7일 후 유지/중단/교정 항목 분류'
    }
  ],
  uip: [
    {
      signature: '가설/근거/반례 동시 기록 훈련',
      questionTemplate: '내 해석 가설은 무엇이고, 어떤 반례가 가능한가?',
      evidenceHint: '가설 1개 + 근거 1개 + 반례 1개',
      actionHint: '반례를 확인할 행동 1개 설정',
      reviewHint: '가설 적중/오차 원인 분리 기록'
    },
    {
      signature: '오차 분류와 교정 훈련',
      questionTemplate: '이번 오차는 정보 부족, 과확장, 근거 누락 중 무엇인가?',
      evidenceHint: '오차 유형 1개 + 발생 장면 1개 + 교정 규칙 1개',
      actionHint: '다음 리딩에 교정 규칙 1개 적용',
      reviewHint: '같은 오차 재발률 점검'
    },
    {
      signature: '반복 표현 감소와 근거 다양화 훈련',
      questionTemplate: '같은 의미를 다른 근거 표현으로 바꿀 수 있는가?',
      evidenceHint: '기존 문장 1개 + 대체 문장 2개 + 선택 기준 1개',
      actionHint: '이번 리딩에서 반복 표현 1개를 교체',
      reviewHint: '문장 다양화가 이해도에 미친 영향 기록'
    }
  ],
  acs: [
    {
      signature: '켈틱 10포지션 문법 고정 훈련',
      questionTemplate: '10포지션을 어떤 순서로 읽어야 스토리가 안정되는가?',
      evidenceHint: '현재/교차/기반/미래 핵심 신호 분리',
      actionHint: '포지션 순서대로 10문장 초안을 작성',
      reviewHint: '순서 누락/중복 여부 점검'
    },
    {
      signature: '복합 질문 분해 훈련',
      questionTemplate: '이 질문을 변수별(관계/일정/리스크)로 나누면 어떻게 되는가?',
      evidenceHint: '변수 3개 + 변수별 카드 근거 1개씩',
      actionHint: '변수별 결론 후 통합 결론 1개 작성',
      reviewHint: '변수 충돌 지점 기록 및 보정'
    },
    {
      signature: '장문 요약을 결론/근거/행동으로 압축하는 훈련',
      questionTemplate: '긴 리딩에서 지금 당장 필요한 결론은 무엇인가?',
      evidenceHint: '핵심 결론 1개 + 뒷받침 근거 2개 + 실행 1개',
      actionHint: '장문을 5~7문장으로 압축',
      reviewHint: '압축 후 의미 손실 여부 확인'
    }
  ],
  ayc: [
    {
      signature: '주간 리듬을 행동 계획으로 설계하는 훈련',
      questionTemplate: '이번 주 흐름에서 언제 밀고, 언제 조정해야 하는가?',
      evidenceHint: '초반/중반/후반 신호 1개씩',
      actionHint: '요일별 핵심 행동 1개를 배치',
      reviewHint: '요일별 계획 이행률 체크'
    },
    {
      signature: '월간 4주 요약 훈련',
      questionTemplate: '4주 흐름을 한 줄 요약 4개로 정리하면 무엇이 남는가?',
      evidenceHint: '주차별 핵심 포인트 1개 + 연결 문장 1개',
      actionHint: '주차별 실행 우선순위 1개씩 설정',
      reviewHint: '주차 간 흐름 단절 여부 확인'
    },
    {
      signature: '연간 분기 운영 훈련',
      questionTemplate: '연간 흐름에서 확장 구간과 정비 구간을 어떻게 나눌 것인가?',
      evidenceHint: '분기별 기회 1개 + 분기별 주의 1개',
      actionHint: '분기별 실행 계획 1개씩 확정',
      reviewHint: '분기 종료 시 계획 대비 실적 점검'
    }
  ],
  eql: [
    {
      signature: '판정 문장 품질 검증 훈련',
      questionTemplate: '판정 라벨이 근거와 정확히 맞물리는가?',
      evidenceHint: '라벨 근거 1개 + 반대 근거 1개 + 최종 판정 이유',
      actionHint: '판정 문장과 근거 문장 일치 여부 체크',
      reviewHint: '오판 라벨 사례를 별도 기록'
    },
    {
      signature: '행동 가이드 품질 검증 훈련',
      questionTemplate: '이 행동 문장은 오늘 실제로 실행 가능한가?',
      evidenceHint: '구체성 1개 + 실행 가능성 1개 + 측정 가능성 1개',
      actionHint: '행동 문장을 시간/장소/완료 기준으로 재작성',
      reviewHint: '실행률과 완료율 점검'
    },
    {
      signature: '복기 리포트 운영 훈련',
      questionTemplate: '복기 데이터로 다음 리딩을 어떻게 개선할 것인가?',
      evidenceHint: '적중 패턴 1개 + 오차 패턴 1개 + 개선 규칙 1개',
      actionHint: '주간 복기 리포트 1회 작성',
      reviewHint: '다음 리딩에서 개선 규칙 적용 여부 확인'
    }
  ]
};

function getLessonProfile(lesson, domainGuide) {
  const [series, rawIndex] = String(lesson.id || '').split('-');
  const index = Number(rawIndex) - 1;
  const profile = lessonSeriesProfiles[series]?.[index];
  if (profile) return profile;
  return {
    signature: `${lesson.title} 핵심 훈련`,
    questionTemplate: domainGuide.questionTemplate,
    evidenceHint: domainGuide.evidenceHint,
    actionHint: domainGuide.actionHint,
    reviewHint: domainGuide.reviewHint
  };
}

function buildOnePassScript({ lesson, cardNames, lessonProfile }) {
  const easyEvidence = '카드 신호 1개 + 내 상황 사실 1개';
  const easyAction = '오늘 안에 할 행동 1개를 시간까지 고정';
  const easyReview = '적중 1줄 + 오차 1줄';
  const a = cardNames[0] || '샘플 카드 A';
  const b = cardNames[1] || '샘플 카드 B';
  const c = cardNames[2] || '샘플 카드 C';
  return [
    `미션 1: 질문을 한 줄로 씁니다. 예: "${lessonProfile.questionTemplate}"`,
    `미션 2: 카드 ${a}, ${b}, ${c} 중 오늘 상황에 가장 가까운 카드 1장을 고릅니다.`,
    '미션 3: 결론 한 줄을 씁니다. "지금 무엇을 먼저 할지"가 보이면 됩니다.',
    `미션 4: 근거 한 줄을 붙입니다. "${easyEvidence}" 구조면 충분합니다.`,
    `미션 5: 실행 한 줄로 닫습니다. "${easyAction}" 방식으로 씁니다.`,
    `미션 6: 복기 2줄을 남깁니다. "${easyReview}"만 쓰면 완료입니다.`
  ];
}

function buildFriendlyFz1Detail({ lesson, stageMeta, cardNames }) {
  const cardPreview = cardNames.slice(0, 4).join(', ');
  const onePassScript = [
    '시작: 오늘 질문을 한 줄로 적어요. 예) "오늘 내가 먼저 바꿔야 할 행동은?"',
    `카드 보기: ${cardPreview}를 보고, 지금 내 상황에 가장 가까운 카드 1장을 고릅니다.`,
    '한 줄 결론: "지금은 A를 먼저 하고, B는 잠시 미룬다"처럼 바로 결정이 보이게 씁니다.',
    '한 줄 근거: "카드 키워드 + 현재 상황 근거"를 한 문장으로 붙입니다.',
    '한 줄 실행: 오늘 언제, 어디서, 무엇을 할지 적습니다. (예: 저녁 8시, 책상에서, 20분 정리)',
    '복기 2줄: 적중 1줄, 오차 1줄만 쓰면 끝입니다.',
    '완료: 다음 리딩에서 바꿀 표현 1개만 정하고 마무리합니다.'
  ];
  const a = cardNames[0] || '바보';
  const b = cardNames[1] || '마법사';
  const c = cardNames[2] || '여교황';
  const d = cardNames[3] || '여황제';
  const storyScript = [
    `장면 1 - 시작: 민지는 일이 밀려 머리가 복잡합니다. 질문을 딱 한 줄로 정합니다. "오늘 뭐부터 하면 흐름이 살아날까?"`,
    `장면 2 - 카드 선택: ${a}, ${b}, ${c}, ${d} 중에서 지금 마음에 가장 먼저 들어온 카드를 고릅니다.`,
    `장면 3 - 해석 한 줄: "${a} 신호가 강하니, 욕심 줄이고 가장 쉬운 일 1개부터 시작하자."`,
    `장면 4 - 근거 한 줄: "${a} 키워드는 시작/가벼움이라, 완벽하게 하려는 마음보다 착수가 맞다."`,
    '장면 5 - 실행 한 줄: "오늘 저녁 8시, 책상에서, 20분만 첫 작업 실행."',
    '장면 6 - 복기 두 줄: "적중: 시작이 쉬워졌다." / "오차: 끝내고 더 벌려서 피곤해졌다."',
    '장면 7 - 다음 한 줄: "다음 리딩에서도 실행 시간을 20분으로 고정한다."'
  ];

  return {
    intro: `${lesson.title}는 읽고 바로 실행하는 실전 레슨입니다. 45분 안에 끝낼 수 있고, 카드 초보도 그대로 따라올 수 있게 구성했습니다.`,
    learningGoals: [
      '목표 1: 카드 뜻을 길게 설명하지 않고, 핵심 키워드 1개를 오늘 상황 1개와 연결한다.',
      '목표 2: 결론 1문장 + 근거 1문장 + 실행 1문장으로 리딩을 완성한다.',
      '목표 3: 듣는 사람이 바로 행동할 수 있도록 시간/행동이 보이게 쓴다.'
    ],
    lessonFlow: storyScript,
    lessonBody: [
      `이 레슨은 ${cardPreview} 카드로 "질문 1줄 → 해석 1줄 → 실행 1줄" 루틴을 몸에 붙이는 수업입니다.`,
      '핵심은 이론 암기가 아니라, 오늘 바로 적용 가능한 문장을 만드는 것입니다.',
      '아래 스토리와 예시를 위에서 아래로 읽고 그대로 따라 쓰면 됩니다.'
    ],
    coreConcepts: [
      '개념 1 - 질문 축소: 질문은 한 줄로 시작합니다.',
      '개념 2 - 결론 우선: 첫 문장에서 방향을 보여줍니다.',
      '개념 3 - 실행 고정: 오늘 안에 끝낼 행동 1개로 닫습니다.'
    ],
    coachingScript: [],
    workedExample: [
      [
        '예시 스크립트 A',
        '질문: 오늘 일정을 덜 흔들리게 하려면 무엇부터 해야 할까?',
        `결론: ${a} 카드 기준으로, 오늘은 가장 쉬운 일 1개부터 시작한다.`,
        `근거: ${a} 키워드는 완벽주의보다 착수에 강점이 있다.`,
        '실행: 저녁 8시, 책상에서, 20분 동안 첫 작업만 진행한다.',
        '복기: 적중-시작은 쉬웠다 / 오차-20분 뒤 욕심이 붙었다.'
      ].join('\n'),
      [
        '예시 스크립트 B',
        '질문: 대화가 자꾸 꼬이는데 오늘 어떻게 말해야 할까?',
        `결론: ${c} 카드 기준으로, 오늘은 말 수를 줄이고 핵심 1문장만 말한다.`,
        `근거: ${c} 키워드는 즉답보다 신중한 표현에 강점이 있다.`,
        '실행: 점심 1시 대화에서 "내 요청 1문장"만 전달하고 추가 설명은 미룬다.',
        '복기: 적중-충돌이 줄었다 / 오차-내 의도가 충분히 전달되진 않았다.'
      ].join('\n'),
      [
        '예시 스크립트 C',
        '질문: 공부 루틴이 자꾸 끊기는데 오늘은 어떻게 유지할까?',
        `결론: ${b} 카드 기준으로, 오늘은 계획보다 실행 슬롯 1개를 먼저 지킨다.`,
        `근거: ${b} 키워드는 준비 완료보다 즉시 착수에 힘이 있다.`,
        `실행: 밤 9시, 책상에서, 25분 학습 + 5분 복기 1세트만 완료한다. (${d} 흐름 참고)`,
        '복기: 적중-집중 시간이 확보됐다 / 오차-복기 문장이 너무 짧았다.'
      ].join('\n')
    ],
    practiceChecklist: [
      '체크 1: 첫 문장에 결론이 들어갔는가?',
      '체크 2: 카드 키워드 1개가 실제 상황 근거와 연결됐는가?',
      '체크 3: 실행 문장에 시간/행동이 포함됐는가?',
      `체크 4: 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 2줄을 남겼는가?'
    ],
    commonMistakes: [],
    assignment: '1차 과제: 같은 질문으로 2회 리딩하고, 결론/근거/실행이 어떻게 달라졌는지 3줄로 비교하세요.',
    completionCriteria: [
      '완료 기준 1: 결론-근거-실행 3문장을 5분 안에 작성할 수 있다.',
      '완료 기준 2: 정방향/역방향 문장을 각각 1개씩 만들 수 있다.',
      '완료 기준 3: 복기 2줄(적중/오차)을 빠짐없이 남긴다.',
      '완료 기준 4: 다음 리딩에서 바꿀 표현 1개를 말할 수 있다.'
    ],
    reflectionQuestions: [
      '질문 1: 오늘 내가 가장 잘 쓴 한 줄은 무엇이었나?',
      '질문 2: 내가 흔들린 지점은 카드 이해였나, 질문 정리였나?',
      '질문 3: 다음 리딩에서 지울 표현 1개와 살릴 표현 1개는 무엇인가?'
    ],
    onePassScript
  };
}

function buildFriendlyFm1Detail({ lesson, stageMeta, cardNames }) {
  const [fool, magician, highPriestess, empress] = [
    cardNames[0] || '바보',
    cardNames[1] || '마법사',
    cardNames[2] || '여교황',
    cardNames[3] || '여황제'
  ];

  const onePassScript = [
    `미션 1: 질문을 한 줄로 씁니다. 예: "지금 단계가 시작-선택-추진 중 어디에 있는가?"`,
    `미션 2: ${fool}, ${magician}, ${highPriestess}, ${empress} 중 오늘 내 상황과 가장 가까운 카드 1장을 고릅니다.`,
    '미션 3: 결론 한 줄을 씁니다. 예: "지금은 시작 단계라서 작은 착수가 우선이다."',
    '미션 4: 근거 한 줄을 붙입니다. "카드 신호 1개 + 내 상황 사실 1개" 구조로 씁니다.',
    '미션 5: 실행 한 줄로 닫습니다. "오늘 안에 할 행동 1개를 시간까지 고정"하면 됩니다.',
    '미션 6: 복기 2줄을 남깁니다. "적중 1줄 + 오차 1줄"이면 완료입니다.'
  ];

  const storyFlow = [
    '장면 1 - 시작: 학습자는 해야 할 일이 많아 우선순위를 못 정한 상태로 들어옵니다.',
    `장면 2 - 카드 선택: ${fool}를 뽑고, 오늘은 "시작"이 핵심이라는 힌트를 잡습니다.`,
    `장면 3 - 결론: "${fool} 신호가 강하니, 지금은 완벽보다 착수가 먼저다."`,
    '장면 4 - 근거: "시작 신호가 뜬 상황인데, 실제로 첫 행동을 미루고 있었다."',
    '장면 5 - 실행: "오늘 19:30, 책상에서, 20분 동안 첫 작업 1개만 실행."',
    '장면 6 - 복기: "적중: 시작 문턱이 낮아졌다." / "오차: 20분 뒤 욕심이 붙었다."',
    '장면 7 - 다음 리딩: "다음에도 시작 카드는 20분 착수 규칙으로 고정한다."'
  ];

  return {
    intro: `${lesson.title}는 메이저 0~7을 "시작-선택-추진" 흐름으로 바로 써먹는 실전 레슨입니다.`,
    learningGoals: [
      '목표 1: 메이저 0~7을 암기하지 않고 단계(시작/선택/추진)로 빠르게 분류한다.',
      '목표 2: 결론 1문장 + 근거 1문장 + 실행 1문장으로 즉시 리딩한다.',
      '목표 3: 오늘 안에 끝낼 행동 1개를 시간까지 고정한다.',
      '목표 4: 복기 2줄로 다음 리딩 규칙 1개를 만든다.'
    ],
    lessonFlow: storyFlow,
    lessonBody: [
      '이 레슨은 "메이저 카드 설명"이 아니라 "오늘 무엇을 먼저 할지 정하는 훈련"입니다.',
      '0~7 카드를 볼 때는 복잡하게 해석하지 말고 시작/선택/추진 중 어디인지 먼저 고릅니다.',
      '그리고 결론-근거-실행 3줄을 바로 작성합니다.',
      '핵심은 길게 맞추는 해석이 아니라, 바로 행동으로 이어지는 짧은 해석입니다.'
    ],
    coreConcepts: [
      '개념 1 - 시작 단계: 바보/마법사 계열은 "작게 시작" 신호로 읽습니다.',
      '개념 2 - 선택 단계: 여교황/연인 계열은 "무엇을 고를지"를 먼저 정합니다.',
      '개념 3 - 추진 단계: 전차/힘 계열은 "어떻게 밀고 갈지" 실행 기준을 붙입니다.',
      '개념 4 - 실행 문장: 오늘 시간 + 장소 + 행동 1개로 닫습니다.',
      '개념 5 - 복기 문장: 적중 1줄, 오차 1줄만 남겨도 충분합니다.'
    ],
    coachingScript: [],
    workedExample: [
      [
        '예시 스크립트 A (시작)',
        '질문: 지금 단계가 시작-선택-추진 중 어디에 있는가?',
        `결론: ${fool} 흐름이므로 지금은 시작 단계다.`,
        `근거: ${fool} 신호가 강하고, 실제로 첫 작업을 미루고 있었다.`,
        '실행: 오늘 19:30, 20분, 첫 작업 1개만 착수.',
        '복기: 적중 1줄 / 오차 1줄'
      ].join('\n'),
      [
        '예시 스크립트 B (선택)',
        '질문: 지금 단계가 시작-선택-추진 중 어디에 있는가?',
        `결론: ${highPriestess} 흐름이므로 지금은 선택 단계다.`,
        `근거: ${highPriestess} 신호는 즉시 확장보다 우선순위 선택에 맞다.`,
        '실행: 오늘 21:00, 선택지 2개 중 1개만 확정.',
        '복기: 적중 1줄 / 오차 1줄'
      ].join('\n'),
      [
        '예시 스크립트 C (추진)',
        '질문: 지금 단계가 시작-선택-추진 중 어디에 있는가?',
        `결론: ${magician} 흐름이므로 지금은 추진 단계다.`,
        `근거: ${magician} 신호는 준비 완료보다 실행 고정에 강점이 있다.`,
        '실행: 오늘 대화/업무에서 핵심 행동 1개만 끝까지 밀기.',
        '복기: 적중 1줄 / 오차 1줄'
      ].join('\n')
    ],
    practiceChecklist: [
      '체크 1: 시작/선택/추진 중 단계 분류가 한 줄로 명확한가?',
      '체크 2: 근거가 카드 신호 1개 + 상황 사실 1개로 쓰였는가?',
      '체크 3: 실행 문장에 시간/행동이 들어갔는가?',
      `체크 4: 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 2줄을 남겼는가?'
    ],
    commonMistakes: [],
    assignment: '1차 과제: 같은 질문으로 2회 리딩하고, 단계 판단(시작/선택/추진)이 왜 달라졌는지 3줄로 비교하세요.',
    completionCriteria: [
      '완료 기준 1: 단계(시작/선택/추진)를 5초 안에 말할 수 있다.',
      '완료 기준 2: 결론-근거-실행 3문장을 5분 안에 작성할 수 있다.',
      '완료 기준 3: 복기 2줄을 빠짐없이 남긴다.',
      '완료 기준 4: 다음 리딩에서 유지할 규칙 1개를 정한다.'
    ],
    reflectionQuestions: [
      '질문 1: 오늘 단계 판단이 가장 정확했던 순간은 언제였나?',
      '질문 2: 흔들린 지점은 카드 해석이었나, 상황 판단이었나?',
      '질문 3: 다음 리딩에서 유지할 문장 규칙 1개는 무엇인가?'
    ],
    onePassScript
  };
}

const lessonStoryBlueprints = {
  'fz-1': { character: '민지', situation: '할 일이 밀려 시작을 못함', question: '오늘 뭐부터 하면 흐름이 살아날까?', action: '20분 첫 작업 착수', review: '착수 성공 여부' },
  'fz-2': { character: '지훈', situation: '키워드는 아는데 문장이 안 나옴', question: '이 카드의 핵심 키워드를 오늘 상황에 어떻게 붙일까?', action: '키워드 1개로 결론 작성', review: '키워드-상황 연결도' },
  'fz-3': { character: '수아', situation: '리딩하고도 행동이 없음', question: '오늘 바로 실행할 행동 한 가지는 무엇인가?', action: '시간 고정 행동 1개', review: '실행 완료율' },
  'fm-1': { character: '현우', situation: '지금 단계 판단이 안 됨', question: '지금 단계가 시작-선택-추진 중 어디에 있는가?', action: '단계 1개 확정', review: '단계 판단 정확도' },
  'fm-2': { character: '서연', situation: '밀어붙일지 조절할지 헷갈림', question: '지금은 속도를 올릴 시기인가, 조율할 시기인가?', action: '줄일 것 1개/유지할 것 1개', review: '과속 감소 여부' },
  'fm-3': { character: '도윤', situation: '반복 패턴을 끊지 못함', question: '지금 끊어야 할 반복과 마무리할 과제는 무엇인가?', action: '중단 1개/완결 1개', review: '반복 감소 여부' },
  'bd-1': { character: '유진', situation: '질문이 길어 해석이 흔들림', question: '오늘 질문을 한 줄로 줄이면 무엇이 핵심인가?', action: '질문 1줄 고정', review: '질문 선명도' },
  'bd-2': { character: '태민', situation: '결론과 근거가 섞임', question: '결론 1문장과 근거 1문장을 어떻게 분리할까?', action: '결론/근거 분리 작성', review: '문장 분리 정확도' },
  'bd-3': { character: '하린', situation: '복기를 자주 생략함', question: '이번 해석은 어디가 맞고 어디가 빗나갔는가?', action: '복기 2줄 작성', review: '복기 지속률' },
  'bt-1': { character: '정우', situation: '상황 설명이 감상 위주임', question: '지금 이미 벌어진 사실은 무엇인가?', action: '사실 2문장 정리', review: '사실/해석 분리도' },
  'bt-2': { character: '예린', situation: '행동 카드가 추상적으로 끝남', question: '이 카드가 지금 요구하는 행동은 무엇인가?', action: '행동 1개 시간 고정', review: '행동 실행률' },
  'bt-3': { character: '지아', situation: '결과를 좋게만 해석함', question: '기대 결과와 리스크를 함께 쓰면 어떻게 되는가?', action: '결과 1개/리스크 1개', review: '리스크 반영률' },
  'ubr-1': { character: '성민', situation: '역방향을 무조건 나쁘게 해석함', question: '지연/과속/누락 중 핵심 문제는 무엇인가?', action: '병목 1개 지정', review: '병목 진단 정확도' },
  'ubr-2': { character: '가은', situation: '교정 문장을 못 만듦', question: '막힌 흐름을 어떤 교정 문장으로 바꿀까?', action: '교정 문장 1개', review: '교정 적용률' },
  'ubr-3': { character: '민석', situation: '리스크 완화 루틴이 없음', question: '오늘 줄일 것과 지킬 것은 무엇인가?', action: '줄일 것/지킬 것 확정', review: '리스크 체감 변화' },
  'ubs-1': { character: '다연', situation: '행동과 감정을 구분 못함', question: '지금 문제는 속도인가 감정 온도인가?', action: '속도/감정 우선축 결정', review: '마찰 감소도' },
  'ubs-2': { character: '영훈', situation: '판단과 운영을 섞어 씀', question: '판단 정리가 먼저인가 운영 정리가 먼저인가?', action: '판단/운영 2칸 분류', review: '의사결정 속도' },
  'ubs-3': { character: '채원', situation: '수트별 문장 차이가 없음', question: '같은 질문을 수트별로 다르게 말하면 어떻게 달라지는가?', action: '수트별 문장 4개 작성', review: '문장 차별성' },
  'icb-1': { character: '보람', situation: '관계 질문을 일반 문장으로 처리함', question: '이 관계 질문의 핵심은 감정/대화/경계 중 무엇인가?', action: '관계축 1개 고정', review: '관계 맥락 적합도' },
  'icb-2': { character: '준호', situation: '업무/학습 질문이 추상적임', question: '성과/준비/운영 중 핵심 축은 무엇인가?', action: '우선순위 1개 확정', review: '성과 지표 변화' },
  'icb-3': { character: '소희', situation: '재정/일상 질문이 막연함', question: '지금은 누수 관리인가 습관 교정인가?', action: '누수 1개 차단', review: '소모 감소율' },
  'icv-1': { character: '경민', situation: '탐색형/추진형 구분 실패', question: '지금은 탐색이 맞나 추진이 맞나?', action: '역할 1개 선택', review: '역할 적합도' },
  'icv-2': { character: '선우', situation: '안정과 책임 균형이 깨짐', question: '내면 안정과 외부 책임 중 무엇을 먼저 잡아야 하나?', action: '안정 1개/책임 1개', review: '균형 회복도' },
  'icv-3': { character: '지민', situation: '코트카드 역할 선택이 흔들림', question: '지금 상황에 가장 맞는 역할은 무엇인가?', action: '역할 적용 행동 1개', review: '역할 적용 적중도' },
  'ich-1': { character: '태희', situation: 'A/B 근거가 모호함', question: 'A와 B 중 유지 가능성이 높은 선택은 무엇인가?', action: '우세 선택 1개', review: '7일 후 적중도' },
  'ich-2': { character: '민호', situation: '판정 라벨이 근거와 불일치', question: '우세/조건부/박빙 중 어디인가?', action: '라벨+조건 문장화', review: '라벨 정확도' },
  'ich-3': { character: '유나', situation: '선택 후 검증을 안 함', question: '선택 결과를 어떤 지표로 확인할까?', action: '검증 지표 1개 설정', review: '검증 루프 유지율' },
  'uis-1': { character: '상혁', situation: '카드 문장이 서로 끊김', question: '이 카드들을 한 흐름으로 연결하면 어떤 이야기인가?', action: '연결 문단 1개', review: '스토리 일관성' },
  'uis-2': { character: '하정', situation: '긍정/경고 충돌을 못 다룸', question: '충돌 신호에서 최종 판정을 어떻게 내릴까?', action: '완충 조건 1개', review: '충돌 판정 정확도' },
  'uis-3': { character: '동현', situation: '해석이 행동으로 안 내려옴', question: '이 해석을 7일 행동 계획으로 바꾸면?', action: '7일 계획 1개', review: '실행 연속성' },
  'uip-1': { character: '윤서', situation: '가설만 있고 반례가 없음', question: '내 해석 가설의 반례는 무엇인가?', action: '가설/반례 1쌍', review: '오판 감소율' },
  'uip-2': { character: '세진', situation: '오차 원인 분류가 안 됨', question: '이번 오차는 무엇 때문인가?', action: '오차 유형 1개 분류', review: '재발률' },
  'uip-3': { character: '주원', situation: '표현 반복이 심함', question: '같은 뜻을 다른 문장으로 바꾸면?', action: '대체 문장 2개 작성', review: '문장 다양성' },
  'acs-1': { character: '은채', situation: '켈틱 순서가 자주 꼬임', question: '10포지션을 어떤 순서로 읽어야 하나?', action: '순서 고정 초안 1개', review: '순서 누락률' },
  'acs-2': { character: '승우', situation: '복합 질문이 뒤엉킴', question: '질문을 변수로 나누면 무엇이 보이나?', action: '변수 3개 분해', review: '충돌 감소도' },
  'acs-3': { character: '나연', situation: '장문 요약이 길기만 함', question: '긴 리딩에서 지금 필요한 결론은 무엇인가?', action: '5문장 압축', review: '핵심 전달률' },
  'ayc-1': { character: '현지', situation: '주간 계획이 감으로 작성됨', question: '이번 주 언제 밀고 언제 조정할까?', action: '요일별 행동 1개', review: '이행률' },
  'ayc-2': { character: '재윤', situation: '월간 흐름 연결이 끊김', question: '4주 흐름을 한 줄씩 어떻게 요약할까?', action: '주차별 핵심 1개', review: '연결성' },
  'ayc-3': { character: '다희', situation: '분기 계획이 추상적임', question: '확장 구간과 정비 구간을 어떻게 나눌까?', action: '분기 실행 1개', review: '분기 적합도' },
  'eql-1': { character: '지후', situation: '판정 문장과 근거가 어긋남', question: '판정 라벨이 근거와 일치하는가?', action: '근거 재정렬 1회', review: '라벨 정합성' },
  'eql-2': { character: '은호', situation: '행동 문장이 막연함', question: '이 행동 문장은 오늘 실행 가능한가?', action: '행동 문장 재작성', review: '실행 성공률' },
  'eql-3': { character: '민채', situation: '복기 리포트가 끊김', question: '복기 데이터로 다음 리딩을 어떻게 개선할까?', action: '주간 리포트 1회', review: '개선 적용률' }
};

const lessonNovelConclusionsById = {
  'fz-1': '정방향과 역방향 중 오늘 흐름에 맞는 해석 1개를 정했습니다.',
  'fz-2': '핵심 키워드 1개를 행동 문장으로 바꿔 결론을 정했습니다.',
  'fz-3': '오늘 바로 실행할 행동 1개를 먼저 고정하기로 정했습니다.',
  'fm-1': '지금 단계를 시작/선택/추진 중 1개로 확정했습니다.',
  'fm-2': '속도를 올릴지 조율할지 오늘 기준을 1개로 정했습니다.',
  'fm-3': '끊어야 할 반복 1개와 마무리할 과제 1개를 정했습니다.',
  'bd-1': '질문을 한 줄로 줄여 오늘 핵심을 먼저 확정했습니다.',
  'bd-2': '결론 문장과 근거 문장을 분리해 핵심을 정했습니다.',
  'bd-3': '이번 해석에서 맞은 점과 빗나간 점을 먼저 구분했습니다.',
  'bt-1': '현재 상황의 사실 1개를 먼저 고정해 해석 방향을 정했습니다.',
  'bt-2': '카드가 요구하는 행동 1개를 오늘 일정에 반영하기로 정했습니다.',
  'bt-3': '기대 결과 1개와 리스크 1개를 함께 쓰는 결론으로 정했습니다.',
  'ubr-1': '지연/과속/누락 중 지금 병목 1개를 먼저 정했습니다.',
  'ubr-2': '막힌 흐름을 바꿀 교정 문장 1개를 결론으로 정했습니다.',
  'ubr-3': '오늘 줄일 것 1개와 지킬 것 1개를 같이 정했습니다.',
  'ubs-1': '속도와 감정 중 오늘 먼저 다룰 축 1개를 정했습니다.',
  'ubs-2': '판단과 운영 중 먼저 정리할 축 1개를 정했습니다.',
  'ubs-3': '같은 질문을 수트별로 나눠 보고 주력 문장 1개를 정했습니다.',
  'icb-1': '관계 질문의 핵심 축을 감정/대화/경계 중 1개로 정했습니다.',
  'icb-2': '업무·학습 질문의 핵심 축을 성과/준비/운영 중 1개로 정했습니다.',
  'icb-3': '재정·일상 질문의 핵심을 누수 관리/습관 교정 중 1개로 정했습니다.',
  'icv-1': '탐색형과 추진형 중 지금 맞는 역할 1개를 정했습니다.',
  'icv-2': '내면 안정과 외부 책임 중 우선할 축 1개를 정했습니다.',
  'icv-3': '현재 상황에 가장 맞는 코트 역할 1개를 정했습니다.',
  'ich-1': 'A와 B를 비교해 유지 가능성이 높은 선택 1개를 정했습니다.',
  'ich-2': '우세/조건부/박빙 중 현재 판정 라벨 1개를 정했습니다.',
  'ich-3': '선택 결과를 확인할 검증 지표 1개를 먼저 정했습니다.',
  'uis-1': '카드 단문을 연결해 하나의 흐름 문장으로 결론을 정했습니다.',
  'uis-2': '충돌 신호를 판정하기 위한 완충 조건 1개를 정했습니다.',
  'uis-3': '해석을 7일 실행 계획으로 바꿀 핵심 행동 1개를 정했습니다.',
  'uip-1': '해석 가설 1개와 반례 1개를 함께 두고 결론을 정했습니다.',
  'uip-2': '이번 오차의 유형 1개를 분류해 교정 기준을 정했습니다.',
  'uip-3': '같은 뜻의 대체 문장 중 오늘 쓸 표현 1개를 정했습니다.',
  'acs-1': '켈틱 10포지션 읽기 순서를 오늘 기준으로 고정했습니다.',
  'acs-2': '복합 질문을 변수 단위로 나눠 핵심 변수 1개를 정했습니다.',
  'acs-3': '장문 리딩을 결론 중심의 짧은 문장으로 압축해 정했습니다.',
  'ayc-1': '주간 리듬에서 오늘 먼저 실행할 행동 1개를 정했습니다.',
  'ayc-2': '월간 4주 흐름에서 이번 주 핵심 1개를 정했습니다.',
  'ayc-3': '연간 운영에서 확장 구간과 정비 구간의 기준을 정했습니다.',
  'eql-1': '판정 라벨과 근거가 실제로 맞는지 먼저 점검하기로 정했습니다.',
  'eql-2': '행동 문장을 오늘 실행 가능한 형태로 다시 정했습니다.',
  'eql-3': '복기 데이터를 기반으로 다음 리딩의 개선점 1개를 정했습니다.'
};

function selectStoryNovelType(lessonId, order) {
  let hash = 0;
  for (const ch of lessonId) {
    hash = ((hash * 33) + ch.charCodeAt(0)) >>> 0;
  }
  return (hash + order) % 8;
}

function hasFinalConsonant(word = '') {
  const chars = [...String(word).trim()];
  const last = chars[chars.length - 1];
  if (!last) return false;
  if (/[0-9]/.test(last)) {
    return ['0', '1', '3', '6', '7', '8'].includes(last);
  }
  const code = last.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return ((code - 0xAC00) % 28) !== 0;
}

function withTopicParticle(word = '') {
  return `${word}${hasFinalConsonant(word) ? '은' : '는'}`;
}

function withSubjectParticle(word = '') {
  return `${word}${hasFinalConsonant(word) ? '이' : '가'}`;
}

function withObjectParticle(word = '') {
  return `${word}${hasFinalConsonant(word) ? '을' : '를'}`;
}

function buildKeywordEvidence(cardName = '', factExample = '') {
  const keywords = (cardKeywordsByName.get(cardName) || []).slice(0, 2);
  const factLine = factExample ? ` 실제로는 ${factExample}` : '';
  if (keywords.length === 0) return `${cardName} 키워드를 현재 상황 사실과 연결했습니다.${factLine}`;
  const keywordPhrase = keywords.join(', ');
  const obj = hasFinalConsonant(keywordPhrase) ? '을' : '를';
  return `${cardName}의 핵심 키워드 "${keywordPhrase}"${obj} 현재 상황 사실과 연결했습니다.${factLine}`;
}

function buildNovelConclusionByLesson(lessonId, blueprint) {
  const id = String(lessonId || '');
  if (id === 'bt-2') return '결론은 "오늘 20:30, 책상에서 발표 자료 1페이지를 15분 안에 수정한다"로 정했습니다.';
  if (id.startsWith('ich-')) return '결론은 "A안(출퇴근 35분)을 선택하고 이번 주 5일 유지해 본다"로 정했습니다.';
  if (id.startsWith('eql-')) return '결론은 "판정 라벨 1개를 고르고 근거 2줄이 실제 기록과 맞는지 바로 대조한다"로 정했습니다.';
  if (id.startsWith('ubs-')) return '결론은 "오늘은 감정 정리 10분 후 실행 20분 순서로 진행한다"로 정했습니다.';
  if (id.startsWith('icb-')) return '결론은 "질문 축을 1개만 고르고 그 축에 맞는 문장 2개만 쓴다"로 정했습니다.';
  if (id.startsWith('icv-')) return '결론은 "오늘 회의에서는 진행 역할 1개만 맡아 발화 3회로 제한한다"로 정했습니다.';
  if (id.startsWith('fm-')) return '결론은 "지금 단계를 시작으로 보고 20분 착수 1회를 바로 실행한다"로 정했습니다.';
  if (id.startsWith('ubr-')) return '결론은 "지금 병목 1개를 지우기 위해 방해 알림 3개를 먼저 끈다"로 정했습니다.';
  if (id.startsWith('ayc-')) return '결론은 "이번 주 월·수·금 21:00에 핵심 작업 25분씩 고정한다"로 정했습니다.';
  if (id.startsWith('acs-')) return '결론은 "질문 변수를 3개로 쪼개고 1변수당 근거 1줄만 남긴다"로 정했습니다.';
  if (id.startsWith('uip-')) return '결론은 "가설 1개와 반례 1개를 같은 페이지에 기록한다"로 정했습니다.';
  if (id.startsWith('uis-')) return '결론은 "카드 3장을 원인-전환-결과 문장으로 1문단 연결한다"로 정했습니다.';
  if (id.startsWith('fz-') || id.startsWith('bd-') || id.startsWith('bt-')) {
    return '결론은 "오늘 20:00에 가장 작은 작업 1개를 20분 안에 끝낸다"로 정했습니다.';
  }
  if (lessonNovelConclusionsById[id]) return `결론은 "${lessonNovelConclusionsById[id]}"`;
  return '결론은 "오늘 20:00, 책상에서 핵심 작업 1개를 20분 실행한다"로 정했습니다.';
}

function buildConcreteFactPairByLesson(lessonId, blueprint = {}) {
  const id = String(lessonId || '');
  const q = blueprint.question || '질문';
  const action = blueprint.action || '행동 1개';
  if (id.startsWith('fz-') || id.startsWith('bd-')) {
    return [
      `"${q}"를 적기 전에는 해야 할 일이 여러 갈래로 흩어져 있었습니다.`,
      `${withObjectParticle(action)} 실행 기준으로 정한 뒤에는 첫 행동 1개부터 바로 시작할 수 있었습니다.`
    ];
  }
  if (id.startsWith('fm-')) {
    return [
      `"${q}"를 정리하기 전에는 시작을 미루는 시간이 반복됐습니다.`,
      `단계를 정하고 ${withObjectParticle(action)} 옮기자 실제 시작 시간이 앞당겨졌습니다.`
    ];
  }
  if (id.startsWith('ich-')) {
    return [
      'A안은 출퇴근 35분, B안은 70분으로 기록했습니다.',
      '이번 달 유지 비용은 A안 3만원, B안 7만원으로 비교했습니다.'
    ];
  }
  if (id.startsWith('icb-')) {
    return [
      `"${q}"를 여러 주제로 섞어 쓰다 보니 결론이 흔들렸습니다.`,
      `${withObjectParticle(action)} 핵심 기준으로 고정하자 문장 길이가 짧아졌습니다.`
    ];
  }
  if (id.startsWith('icv-')) {
    return [
      '역할을 정하지 않으면 말이 길어지고 핵심 전달이 늦어졌습니다.',
      `${withObjectParticle(action)} 고정한 날에는 필요한 말만 짧게 정리됐습니다.`
    ];
  }
  if (id.startsWith('uis-')) {
    return [
      `"${q}"에 카드 3장을 따로 붙일 때는 결론이 충돌했습니다.`,
      `${withObjectParticle(action)} 기준으로 연결하자 행동 문장이 하나로 정리됐습니다.`
    ];
  }
  if (id.startsWith('uip-')) {
    return [
      `"${q}"를 가설만으로 쓰면 맞고 틀림을 확인하기 어려웠습니다.`,
      `${withObjectParticle(action)} 함께 남기자 오판 원인을 바로 찾을 수 있었습니다.`
    ];
  }
  if (id.startsWith('acs-')) {
    return [
      `"${q}"를 한 문단으로 쓰자 핵심이 뒤섞였습니다.`,
      `${withObjectParticle(action)} 나누자 각 요소별 근거가 선명해졌습니다.`
    ];
  }
  if (id.startsWith('eql-')) {
    return [
      '어제 판정 이름은 우세였지만 실제 실행은 0회였습니다.',
      '근거 2줄 중 1줄은 일정표 기록과 맞지 않았습니다.'
    ];
  }
  if (id.startsWith('ubs-')) {
    return [
      '감정이 올라간 직후 답장해 대화가 길어졌습니다.',
      `${withObjectParticle(action)} 순서로 진행했을 때 같은 주제 대화 시간이 줄었습니다.`
    ];
  }
  if (id.startsWith('bt-')) {
    return [
      `"${q}"를 기준으로 분류하니 해야 할 항목 중 오늘 마감은 1개였습니다.`,
      `${withObjectParticle(action)} 적은 날에는 첫 착수가 더 빨라졌습니다.`
    ];
  }
  if (id.startsWith('ubr-')) {
    return [
      `"${q}"를 쓰기 전에는 같은 작업을 반복해서 미뤘습니다.`,
      `${withObjectParticle(action)} 고정하자 방해를 줄이고 집중 시간을 늘릴 수 있었습니다.`
    ];
  }
  if (id.startsWith('ayc-')) {
    return [
      '지난주 계획은 적었지만 고정 시간 없이 적어 실행 누락이 많았습니다.',
      `${withObjectParticle(action)} 시간을 먼저 고정하자 미루는 항목이 줄었습니다.`
    ];
  }
  return [
    `"${q}"를 쓰기 전에는 일정표에서 미뤄진 항목이 여러 개였습니다.`,
    `${withObjectParticle(action)} 고정한 뒤에는 오늘 끝낼 항목을 분명하게 정할 수 있었습니다.`
  ];
}

function buildConcreteExecutionByLesson(lessonId, action) {
  const id = String(lessonId || '');
  if (id.startsWith('fz-') || id.startsWith('bd-')) return '오늘 20:00, 책상에서 핵심 작업 1개를 20분 먼저 시작했습니다.';
  if (id.startsWith('fm-')) return '오늘 19:30, 20분 타이머를 켜고 첫 작업 1개를 바로 착수했습니다.';
  if (id.startsWith('icb-')) return '오늘 20:20, 질문 주제를 1개로 고정하고 근거 문장 2개만 적었습니다.';
  if (id.startsWith('icv-')) return '오늘 18:40, 역할 1개를 정한 뒤 대화 핵심 문장 3개만 사용했습니다.';
  if (id.startsWith('ich-')) return '오늘 21:00, 노트 앱에서 A/B 비교표(비용·시간·피로) 3칸을 채우고 A안을 확정했습니다.';
  if (id.startsWith('eql-')) return '오늘 20:40, 복기 노트에서 라벨 1개와 근거 2줄을 대조해 어긋난 1줄을 바로 수정했습니다.';
  if (id.startsWith('ubs-')) return '오늘 19:50, 감정 정리 10분 후 핵심 작업 20분을 실행해 순서를 고정했습니다.';
  if (id.startsWith('bt-2')) return '오늘 20:30, 책상에서 보고서 첫 단락 5줄을 15분 안에 수정했습니다.';
  if (id.startsWith('bt-')) return '오늘 20:10, 현재 마감 항목 1개를 먼저 20분 집중으로 처리했습니다.';
  if (id.startsWith('ubr-')) return '오늘 19:30, 방해 알림을 끄고 병목 작업 1개를 25분 집중으로 처리했습니다.';
  if (id.startsWith('acs-')) return '오늘 21:10, 질문을 변수 3개로 나누고 변수별 근거를 각 1줄씩 작성했습니다.';
  if (id.startsWith('uis-')) return '오늘 20:50, 카드 3장을 원인-전환-결과 순서의 한 문단으로 연결했습니다.';
  if (id.startsWith('uip-')) return '오늘 21:15, 가설 1개와 반례 1개를 같은 칸에 적고 근거 로그를 붙였습니다.';
  if (id.startsWith('ayc-')) return '오늘 21:00, 이번 주 계획표에 월·수·금 실행 슬롯 25분씩을 먼저 고정했습니다.';
  return `오늘 20:00, 책상에서 ${withObjectParticle(action)} 20분 안에 실행하도록 일정에 넣었습니다.`;
}

function buildReviewExampleByLesson(lessonId) {
  const id = String(lessonId || '');
  if (id.startsWith('fz-') || id.startsWith('bd-')) {
    return {
      hit: '질문을 줄이자 첫 행동까지 걸린 시간이 줄었다.',
      miss: '근거 문장 중 1줄은 여전히 느낌 표현이 많았다.'
    };
  }
  if (id.startsWith('fm-')) {
    return {
      hit: '단계를 먼저 정하니 착수 속도가 빨라졌다.',
      miss: '단계는 맞았지만 종료 기준을 적지 않아 길어졌다.'
    };
  }
  if (id.startsWith('bt-')) {
    return {
      hit: '20:30에 15분 수정을 완료해 실제로 작업이 시작됐다.',
      miss: '수정은 했지만 마감 전 최종 점검 1회를 빼먹었다.'
    };
  }
  if (id.startsWith('icb-')) {
    return {
      hit: '질문 축을 1개로 고정하니 결론 문장이 바로 나왔다.',
      miss: '보조 근거를 하나만 써서 설득력이 약했다.'
    };
  }
  if (id.startsWith('icv-')) {
    return {
      hit: '역할을 먼저 정하니 대화 핵심이 흔들리지 않았다.',
      miss: '역할은 정했지만 실행 장면 기록이 빠졌다.'
    };
  }
  if (id.startsWith('ich-')) {
    return {
      hit: 'A안 기준표를 채운 뒤 선택이 흔들리지 않았다.',
      miss: '비용은 비교했지만 피로 지표를 숫자로 남기지 못했다.'
    };
  }
  if (id.startsWith('eql-')) {
    return {
      hit: '판정 이름과 근거를 대조해 어긋난 문장 1줄을 바로 고쳤다.',
      miss: '근거 출처를 캡처로 남기지 않아 다음 확인에 시간이 걸렸다.'
    };
  }
  if (id.startsWith('uis-')) {
    return {
      hit: '카드 3장을 한 흐름으로 묶자 실행 문장이 선명해졌다.',
      miss: '전환 구간 근거 1개를 빠뜨려 설명이 짧게 끊겼다.'
    };
  }
  if (id.startsWith('uip-')) {
    return {
      hit: '가설과 반례를 같이 적어 오판 원인을 바로 찾았다.',
      miss: '반례 기록은 했지만 다음 확인 기준을 숫자로 못 남겼다.'
    };
  }
  if (id.startsWith('acs-')) {
    return {
      hit: '질문을 요소로 나누자 해석 충돌이 줄었다.',
      miss: '요소 중 1개에 실행 문장을 연결하지 못했다.'
    };
  }
  if (id.startsWith('ayc-')) {
    return {
      hit: '주간 슬롯을 고정하니 실행 누락이 줄었다.',
      miss: '고정 시간은 지켰지만 복기 기록을 하루 빼먹었다.'
    };
  }
  return {
    hit: '정한 시간에 핵심 행동 1개를 실제로 실행했다.',
    miss: '복기 문장 2줄 중 1줄이 추상적으로 남아 다음 기준이 흐려졌다.'
  };
}

function buildConcreteDirectionByLesson(lessonId) {
  const id = String(lessonId || '');
  if (id.startsWith('fz-') || id.startsWith('bd-')) return '그래서 오늘은 할 일을 1개만 남기고 나머지는 내일 목록으로 옮겼습니다.';
  if (id.startsWith('fm-')) return '그래서 지금 단계를 하나로 정하고 첫 20분 착수를 바로 시작했습니다.';
  if (id.startsWith('bt-')) return '그래서 마감이 가까운 항목 1개만 먼저 처리하고 나머지는 순서를 뒤로 미뤘습니다.';
  if (id.startsWith('ubr-')) return '그래서 방해 요소를 먼저 끄고 막히는 지점 1개만 집중해서 처리했습니다.';
  if (id.startsWith('ubs-')) return '그래서 감정 정리 시간을 먼저 두고 실행 시간을 뒤에 붙여 순서를 고정했습니다.';
  if (id.startsWith('icb-')) return '그래서 질문 기준을 1개로 고정해 근거 문장을 2개만 남겼습니다.';
  if (id.startsWith('icv-')) return '그래서 오늘 맡을 역할 1개를 정하고 말할 문장을 짧게 줄였습니다.';
  if (id.startsWith('ich-')) return '그래서 A/B 중 1개를 먼저 선택하고 비교표로 선택 이유를 확인했습니다.';
  if (id.startsWith('uis-')) return '그래서 카드 3장을 한 흐름으로 묶어 실행 문장을 1개로 정리했습니다.';
  if (id.startsWith('uip-')) return '그래서 가설과 반례를 같은 칸에 적어 오판 원인을 바로 확인했습니다.';
  if (id.startsWith('acs-')) return '그래서 질문을 요소별로 나눠 요소마다 근거 1줄씩만 남겼습니다.';
  if (id.startsWith('ayc-')) return '그래서 주간 일정에 실행 시간부터 먼저 고정했습니다.';
  if (id.startsWith('eql-')) return '그래서 판정 이름 1개와 근거 2줄을 바로 대조해 어긋난 문장을 수정했습니다.';
  return '그래서 오늘 해야 할 행동 1개를 먼저 확정하고 바로 실행했습니다.';
}

function normalizeNovelLanguage(text = '') {
  const replacements = [
    ['라벨 정합성', '판정 일치 정도'],
    ['판정 라벨', '판정 이름'],
    ['라벨', '판정 이름'],
    ['병목', '막히는 지점'],
    ['정합성', '일치 정도'],
    ['변수', '요소'],
    ['보정점', '고칠 점'],
    ['교정', '수정'],
    ['검증 지표', '확인 기준'],
    ['누수', '새는 지출'],
    ['축', '기준'],
    ['완충', '충돌 줄이기'],
    ['리스크', '위험'],
    ['루틴', '습관'],
    ['지표', '확인 수치']
  ];
  return replacements.reduce((out, [from, to]) => out.replaceAll(from, to), text);
}

function buildStoryNovelByType({ lessonId, type, blueprint, cardPreview, a, b, c }) {
  void type;
  const cards = cardPreview || '카드';
  const supportCard = b || a;
  const checkCard = c || b || a;
  const characterTopic = withTopicParticle(blueprint.character);
  const aSubject = withSubjectParticle(a);
  const [factA, factB] = buildConcreteFactPairByLesson(lessonId, blueprint);
  const keywordEvidenceA = buildKeywordEvidence(a, factA);
  const keywordEvidenceB = buildKeywordEvidence(supportCard, factB);
  const conclusion = normalizeNovelLanguage(
    buildNovelConclusionByLesson(lessonId, blueprint).replace(/[.?!\s]+$/u, '')
  );
  const execution = normalizeNovelLanguage(buildConcreteExecutionByLesson(lessonId, blueprint.action));
  const reviewExample = buildReviewExampleByLesson(lessonId);
  const directionExample = buildConcreteDirectionByLesson(lessonId);
  const everydaySituation = normalizeNovelLanguage(blueprint.situation);
  const everydayQuestion = normalizeNovelLanguage(blueprint.question);
  const everydayReview = normalizeNovelLanguage(blueprint.review);
  const lines = [
    `${characterTopic} 오늘 리딩이 어렵게 느껴졌습니다. 이유는 ${everydaySituation} 때문이었습니다.`,
    `노트 첫 줄에 "${everydayQuestion}"를 쓰자, 지금 다룰 핵심이 선명해졌습니다.`,
    `${cards} 중에서는 ${aSubject} 가장 먼저 눈에 들어왔고, ${conclusion}.`,
    `${keywordEvidenceA} ${keywordEvidenceB} ${directionExample}`,
    `${characterTopic} ${execution}`,
    `마지막에는 ${withObjectParticle(everydayReview)} 기준으로 기록을 남겼습니다. 먼저 "${reviewExample.hit}"라는 성과를 확인했고, 이어서 "${reviewExample.miss}"라는 고칠 점을 적었습니다. 그리고 ${checkCard} 카드는 다음 리딩 시작 전에 먼저 확인할 카드로 메모해 두었습니다.`
  ];
  return lines;
}

function buildDedicatedLessonDetail({ lesson, stageMeta, cardNames, lessonProfile, order }) {
  const blueprint = lessonStoryBlueprints[lesson.id] || {
    character: '학습자',
    situation: '질문은 있는데 문장이 흔들림',
    question: lessonProfile.questionTemplate,
    action: '오늘 실행 행동 1개 고정',
    review: '복기 정확도'
  };
  const novelCards = novelExampleCardNamesByLessonId.get(lesson.id) || cardNames.slice(0, 3);
  const cardPreview = novelCards.slice(0, 3).join(', ');
  const a = novelCards[0] || '샘플 카드 A';
  const b = novelCards[1] || '샘플 카드 B';
  const c = novelCards[2] || '샘플 카드 C';
  const storyType = selectStoryNovelType(lesson.id, order);
  const onePassScript = [
    `미션 1: 질문 한 줄 작성 - "${blueprint.question}"`,
    `미션 2: ${cardPreview || '샘플 카드'} 중 중심 카드 1장 선택`,
    '미션 3: 결론 한 줄 작성 - "지금 먼저 할 일 1개"',
    '미션 4: 근거 한 줄 작성 - 카드 신호 1개 + 내 상황 사실 1개',
    `미션 5: 실행 한 줄 작성 - ${blueprint.action}`,
    '미션 6: 복기 두 줄 작성 - 적중 1줄 + 오차 1줄'
  ];
  const storyFlow = [
    `장면 1 - 시작: ${blueprint.character}는 ${blueprint.situation} 상태로 레슨을 시작합니다.`,
    `장면 2 - 질문: "${blueprint.question}"를 노트 맨 위에 적습니다.`,
    `장면 3 - 카드 선택: ${cardPreview || '샘플 카드'} 중 가장 먼저 떠오르는 카드 1장을 고릅니다.`,
    `장면 4 - 결론: ${a} 기준으로 지금 가장 먼저 할 일 1개를 정합니다.`,
    `장면 5 - 근거: ${a} 신호와 현재 상황 사실 1개를 붙여 결론 이유를 씁니다.`,
    `장면 6 - 실행: ${blueprint.action} 문장으로 오늘 행동을 고정합니다.`,
    `장면 7 - 복기: ${blueprint.review}를 확인하며 적중 1줄/오차 1줄로 마무리합니다.`
  ];
  const storyNovel = buildStoryNovelByType({ lessonId: lesson.id, type: storyType, blueprint, cardPreview, a, b, c });

  return {
    intro:
      `"${lesson.title}" 레슨의 핵심 목표는 "${lesson.summary}"입니다. `
      + `이번 레슨은 "${blueprint.question}" 질문으로 시작해 ${blueprint.action}까지 연결합니다.`,
    storyNovel,
    learningGoals: [
      '목표 1: 질문-결론-근거-실행을 4줄로 끝낸다.',
      '목표 2: 카드 신호를 상황 사실과 붙여 한 문장으로 설명한다.',
      '목표 3: 오늘 안에 가능한 행동 1개를 시간까지 고정한다.',
      '목표 4: 복기 2줄로 다음 리딩 보정점을 남긴다.'
    ],
    lessonFlow: storyFlow,
    lessonBody: [
      '이번 레슨 본문은 질문을 줄이고 결론을 먼저 쓰는 연습에 집중합니다.',
      '카드를 설명하기보다 카드 근거를 현실 사실과 연결하는 방식으로 진행합니다.',
      '실행 문장은 반드시 시간과 행동을 포함해 당일 적용 가능하게 작성합니다.',
      '마지막에는 적중/오차 기록으로 다음 리딩 보정 포인트를 남깁니다.'
    ],
    coreConcepts: [
      `개념 1 - 질문 축소: "${blueprint.question}"처럼 한 줄로 고정합니다.`,
      '개념 2 - 결론 우선: 첫 문장에 방향을 먼저 씁니다.',
      '개념 3 - 근거 연결: 카드 신호 1개 + 상황 사실 1개를 붙입니다.',
      `개념 4 - 실행 고정: ${blueprint.action} 방식으로 닫습니다.`,
      '개념 5 - 복기 루프: 적중 1줄 + 오차 1줄을 반복합니다.'
    ],
    coachingScript: [],
    workedExample: [
      [
        '예시 스크립트 A',
        `질문: ${blueprint.question}`,
        `결론: ${a} 흐름이 강하므로 우선순위 1개를 먼저 끝낸다.`,
        `근거: ${a} 신호와 내 상황 사실 1개를 붙이면 분산보다 집중이 유리하다.`,
        `실행: ${blueprint.action}.`,
        `복기: 적중 1줄(${c} 연결 적중) / 오차 1줄`
      ].join('\n'),
      [
        '예시 스크립트 B',
        `질문: ${blueprint.question}`,
        `결론: ${b} 기준으로 속도를 조절하고 정확도를 먼저 잡는다.`,
        `근거: ${b} 신호는 확장보다 정비가 유리하다는 증거가 된다.`,
        '실행: 오늘 21:00, 20분, 보완 행동 1개 진행.',
        '복기: 적중 1줄 / 오차 1줄'
      ].join('\n'),
      [
        '예시 스크립트 C',
        `질문: ${blueprint.question}`,
        `결론: ${c} 흐름으로 핵심 메시지 1개에 집중한다.`,
        `근거: ${c} 신호는 과한 확장보다 선명한 전달이 맞다.`,
        '실행: 오늘 대화/업무에서 핵심 문장 1개만 사용.',
        '복기: 적중 1줄 / 오차 1줄'
      ].join('\n')
    ],
    practiceChecklist: [
      '체크 1: 첫 문장에 결론이 들어갔는가?',
      '체크 2: 근거가 카드 신호 1개 + 상황 사실 1개로 쓰였는가?',
      '체크 3: 실행 문장이 시간/행동까지 구체화됐는가?',
      `체크 4: 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 2줄을 남겼는가?'
    ],
    commonMistakes: [],
    assignment:
      `${order}차 과제: 같은 질문으로 2회 리딩하고, 결론/근거/실행 차이를 3줄로 비교하세요.`,
    completionCriteria: [
      '완료 기준 1: 결론-근거-실행 3문장을 5분 안에 작성한다.',
      '완료 기준 2: 질문 한 줄을 고정한 채 2회 리딩 비교가 가능하다.',
      '완료 기준 3: 복기 2줄을 누락 없이 남긴다.',
      '완료 기준 4: 다음 리딩에서 유지할 규칙 1개를 말할 수 있다.'
    ],
    reflectionQuestions: [
      '질문 1: 오늘 가장 잘 맞은 근거 문장은 무엇인가?',
      '질문 2: 흔들린 지점은 카드 해석 문제였나, 상황 판단 문제였나?',
      '질문 3: 다음 리딩에서 바꿀 표현 1개는 무엇인가?'
    ],
    onePassScript
  };
}

function buildLessonDetail(course, lesson, lessonIndex) {
  const stageMeta = stagePlaybook[course.stage] || stagePlaybook['기초 입문'];
  const cardNames = getCardNames(lesson.cardIds, 6);
  const cardPreview = cardNames.slice(0, 4).join(', ');
  const domain = inferLessonDomain(lesson, course);
  const domainGuide = buildDomainGuides(domain);
  const lessonProfile = getLessonProfile(lesson, domainGuide);
  const order = lessonIndex + 1;
  const onePassScript = buildOnePassScript({ lesson, cardNames, lessonProfile });
  const easyEvidence = '카드 신호 1개 + 내 상황 사실 1개';
  const easyAction = '오늘 안에 할 행동 1개를 시간까지 고정';
  const easyReview = '적중 1줄 + 오차 1줄';

  if (lessonStoryBlueprints[lesson.id]) {
    return buildDedicatedLessonDetail({ lesson, stageMeta, cardNames, lessonProfile, order });
  }

  const sampleCardA = cardNames[0] || '샘플 카드 A';
  const sampleCardB = cardNames[1] || '샘플 카드 B';
  const sampleCardC = cardNames[2] || '샘플 카드 C';
  const sampleCardD = cardNames[3] || '샘플 카드 D';
  const storyFlow = [
    `장면 1 - 시작: 학습자 한 명이 "${lessonProfile.questionTemplate}" 질문을 들고 들어옵니다.`,
    `장면 2 - 카드 선택: ${cardPreview || '샘플 카드'} 중 오늘 이야기의 중심 카드 1장을 고릅니다.`,
    `장면 3 - 결론: ${sampleCardA} 기준으로 지금 가장 먼저 할 일 1개를 정합니다.`,
    `장면 4 - 근거: ${sampleCardA} 신호와 내 상황 사실 1가지를 붙여 결론 이유를 설명합니다.`,
    '장면 5 - 실행: 오늘 안에 가능한 행동 1개를 시간/장소와 함께 확정합니다.',
    '장면 6 - 복기: 적중 1줄, 오차 1줄로 마무리합니다.',
    '장면 7 - 다음 리딩: 다음에 바꿀 표현 1개를 정하고 종료합니다.'
  ];

  return {
    intro:
      `${lesson.title}는 ${lesson.summary}를 목표로 합니다. 이 레슨에서는 "${course.stage}" 단계 기준으로 `
      + `어려운 이론보다 바로 써먹는 실전 문장을 만드는 데 집중합니다. `
      + `추천 학습 시간은 40~50분이며, 마지막 5분은 복기에 씁니다.`,
    learningGoals: [
      '목표 1: 카드 설명을 길게 하지 않고 핵심 한 줄로 정리하기',
      '목표 2: 카드 근거를 지금 상황과 자연스럽게 연결하기',
      '목표 3: 읽는 사람이 바로 따라할 수 있게 실행 문장으로 끝내기',
      '목표 4: 복기 2줄을 남겨 다음 리딩을 더 쉽게 만들기'
    ],
    lessonFlow: storyFlow,
    lessonBody: [
      '이번 레슨 본문은 질문 정리와 실행 연결을 한 세트로 훈련하는 데 초점을 둡니다.',
      '해석 문장은 카드 신호와 상황 근거가 분리되도록 짧게 작성합니다.',
      `권장 문장 흐름은 ${easyEvidence} → ${easyAction} → ${easyReview} 순서입니다.`,
      '마무리 복기에서 다음 시도에 유지할 규칙 1개를 확정합니다.'
    ],
    coreConcepts: [
      `개념 1 - 질문 축소: "${lessonProfile.questionTemplate}"처럼 질문을 한 줄로 고정합니다.`,
      '개념 2 - 결론 우선: 첫 문장에서 방향을 먼저 보여줍니다.',
      `개념 3 - 근거 구조화: ${easyEvidence} 방식으로 근거를 분리합니다.`,
      `개념 4 - 실행 연결: ${easyAction} 형태로 문장을 끝냅니다.`,
      `개념 5 - 복기 루프: ${easyReview}를 반복하면 정확도가 올라갑니다.`
    ],
    coachingScript: [],
    workedExample: [
      [
        '예시 스크립트 A',
        `질문: ${lessonProfile.questionTemplate}`,
        `결론: ${sampleCardA} 흐름이 강하므로 오늘은 우선순위 1개만 먼저 끝낸다.`,
        `근거: ${sampleCardA} 신호와 내 상황 사실 1가지를 붙이면 분산보다 집중이 유리하다.`,
        '실행: 오늘 19:30, 30분, 핵심 작업 1개 완료.',
        `복기: 잘한 점 1줄(${sampleCardC} 해석 적중) / 아쉬운 점 1줄`
      ].join('\n'),
      [
        '예시 스크립트 B',
        `질문: ${lessonProfile.questionTemplate}`,
        `결론: ${sampleCardB} 기준으로 속도를 낮추고 정확도를 먼저 올린다.`,
        `근거: ${sampleCardB} 신호는 확장보다 정비가 유리하다는 증거가 된다.`,
        '실행: 오늘 21:00, 20분, 보완 작업 1개만 진행.',
        `복기: 잘한 점 1줄(${sampleCardD} 연결 성공) / 아쉬운 점 1줄`
      ].join('\n'),
      [
        '예시 스크립트 C',
        `질문: ${lessonProfile.questionTemplate}`,
        `결론: ${sampleCardC} 흐름으로, 말/행동을 줄이고 핵심 메시지 1개에 집중한다.`,
        `근거: ${sampleCardC} 신호는 과한 확장보다 선명한 전달이 맞다.`,
        '실행: 오늘 대화/업무에서 핵심 문장 1개만 사용.',
        '복기: 잘한 점 1줄 / 아쉬운 점 1줄'
      ].join('\n')
    ],
    practiceChecklist: [
      '체크 1: 해석 첫 문장에 결론이 분명하게 들어갔는가?',
      '체크 2: 카드 키워드가 단어 나열이 아니라 실제 상황 근거로 쓰였는가?',
      '체크 3: 실행 문장이 "언제/무엇을" 수준까지 구체화되었는가?',
      `체크 4: 이 단계의 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 메모를 2줄 이상 남겼는가?'
    ],
    commonMistakes: [],
    assignment:
      `${order}차 과제: 같은 질문으로 2회 리딩을 진행하고, 두 결과의 차이를 `
      + '"결론 차이 1개 / 근거 차이 1개 / 실행 차이 1개" 형식으로 정리하세요.',
    completionCriteria: [
      '완료 기준 1: 결론-근거-실행 3문장 구조를 스스로 재현할 수 있다.',
      '완료 기준 2: 같은 질문을 2회 리딩했을 때 근거 차이를 설명할 수 있다.',
      '완료 기준 3: 복기 2줄(적중 1줄, 오차 1줄)을 누락 없이 남길 수 있다.',
      '완료 기준 4: 다음 리딩에서 바꿀 표현 1개를 명확히 말할 수 있다.'
    ],
    reflectionQuestions: [
      '질문 1: 이번 레슨에서 내가 가장 자신 있게 설명할 수 있는 근거 문장은 무엇인가?',
      '질문 2: 해석이 흔들린 지점은 카드 이해 문제였는가, 질문 맥락 문제였는가?',
      '질문 3: 다음 리딩에서 반드시 바꿀 표현 1개는 무엇인가?'
    ],
    onePassScript
  };
}

for (const course of courses) {
  const baseLessons = lessonsByCourse[course.id] || [];
  lessonsByCourse[course.id] = baseLessons.map((lesson, index) => ({
    ...lesson,
    detail: buildLessonDetail(course, lesson, index)
  }));
}

export function getCourseById(courseId) {
  return courses.find((course) => course.id === courseId);
}

export function getLessonById(lessonId) {
  return Object.values(lessonsByCourse)
    .flat()
    .find((lesson) => lesson.id === lessonId);
}
