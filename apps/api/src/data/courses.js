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
];

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

export function getCourseById(courseId) {
  return courses.find((course) => course.id === courseId);
}

export function getLessonById(lessonId) {
  return Object.values(lessonsByCourse)
    .flat()
    .find((lesson) => lesson.id === lessonId);
}
