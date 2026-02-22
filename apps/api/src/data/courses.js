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

function getCardNames(cardIds = [], limit = 6) {
  return cardIds
    .slice(0, limit)
    .map((id) => cardNameById.get(id) || id);
}

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
  const easyEvidence = '카드 신호 2개 + 지금 상황 1개';
  const easyAction = '오늘 안에 할 행동 1개를 시간까지 적기';
  const easyReview = '잘한 점 1줄 + 아쉬운 점 1줄';
  const a = cardNames[0] || '샘플 카드 A';
  const b = cardNames[1] || '샘플 카드 B';
  const c = cardNames[2] || '샘플 카드 C';
  return [
    `1. 오늘 질문을 한 줄로 씁니다. 예: "${lessonProfile.questionTemplate}"`,
    `2. 카드 ${a}, ${b}, ${c} 중 오늘 상황에 가장 먼저 떠오르는 카드 1장을 고릅니다.`,
    '3. 결론 한 줄을 먼저 말합니다. "지금 무엇을 먼저 할지"가 보이면 됩니다.',
    `4. 근거 한 줄을 붙입니다. "${easyEvidence}"만 넣으면 충분합니다.`,
    `5. 실행 한 줄로 마무리합니다. "${easyAction}" 방식으로 씁니다.`,
    '6. 리딩이 끝나면 복기 2줄을 남깁니다. 적중 1줄, 오차 1줄이면 충분합니다.',
    `7. 마지막으로 "${easyReview}" 기준으로 내 문장이 실제 상황과 맞았는지 확인합니다.`
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

  return {
    intro: `${lesson.title}는 어려운 이론 암기가 아니라, 바로 써먹는 한 줄 리딩을 만드는 레슨입니다. 45분 안에 끝낼 수 있고, 처음 하는 사람도 따라올 수 있게 구성했습니다.`,
    learningGoals: [
      '목표 1: 카드 뜻을 길게 설명하지 않고, 핵심 키워드 1개를 오늘 상황 1개와 연결한다.',
      '목표 2: 결론 1문장 + 근거 1문장 + 실행 1문장으로 리딩을 완성한다.',
      '목표 3: 듣는 사람이 바로 행동할 수 있도록 시간/행동이 보이게 쓴다.',
      `목표 4: ${stageMeta.review}`
    ],
    lessonFlow: [
      `1단계(도입 10분): 질문을 한 줄로 고정하고, 카드 후보(${cardPreview})를 빠르게 확인합니다.`,
      '2단계(핵심 15분): 정방향/역방향을 각각 한 줄 결론으로 써봅니다.',
      '3단계(확장 10분): 같은 카드로 관계/일/학습 맥락 문장을 각각 1개씩 만듭니다.',
      '4단계(실행 10분): 오늘 바로 실행할 행동 1개를 시간까지 붙여 확정합니다.',
      '5단계(복기 5분): 적중 1줄 + 오차 1줄을 남기고, 다음에 바꿀 표현 1개를 정합니다.'
    ],
    lessonBody: [
      '이 레슨은 "잘 해석하는 사람"이 아니라 "실행까지 연결하는 사람"이 되는 연습입니다.',
      `자주 쓰는 카드 예시는 ${cardPreview}입니다. 카드 전체 의미를 다 말할 필요 없이, 오늘 질문에 필요한 부분만 씁니다.`,
      '문장 공식은 딱 3개입니다. 결론 1줄, 근거 1줄, 실행 1줄.',
      '결론은 방향이 보여야 합니다. 근거는 카드 키워드와 현재 상황이 연결되어야 합니다.',
      '실행은 시간/장소/행동이 보여야 합니다. "잘해보자" 같은 추상 문장은 금지합니다.',
      '복기는 길게 쓰지 말고 2줄만 씁니다. 이 2줄이 다음 리딩 실력을 빠르게 올립니다.'
    ],
    coreConcepts: [
      '개념 1 - 질문 축소: 질문이 길어지면 해석도 흔들립니다. 한 줄 질문으로 시작합니다.',
      '개념 2 - 결론 우선: 첫 문장에서 방향이 보이면 듣는 사람이 바로 이해합니다.',
      '개념 3 - 근거 연결: 카드 키워드 1개와 현재 상황 1개를 붙이면 과해석이 줄어듭니다.',
      '개념 4 - 실행 고정: 오늘 안에 끝낼 행동 1개를 적으면 리딩이 현실이 됩니다.',
      '개념 5 - 복기 루프: 적중/오차 2줄 복기를 반복하면 문장이 점점 정확해집니다.'
    ],
    coachingScript: [
      '코치 1: "좋아요, 질문을 한 줄로 줄여볼까요?"',
      '코치 2: "결론부터 한 문장으로 말해보세요. 길게 말하지 않아도 됩니다."',
      '코치 3: "왜 그렇게 읽었는지 카드 키워드 1개만 근거로 붙여볼게요."',
      '코치 4: "마지막으로 오늘 바로 할 행동 1개를 시간까지 적고 끝내요."'
    ],
    workedExample: [
      '예시 질문: 오늘 일정을 덜 흔들리게 하려면 무엇부터 해야 할까?',
      '예시 결론: 바보 카드가 나왔으니, 오늘은 욕심을 줄이고 가장 쉬운 일 1개부터 시작하는 게 맞다.',
      '예시 근거: 바보의 키워드(시작/가벼움)는 완벽주의보다 착수에 강점이 있으니, 시작 문턱을 낮추는 해석이 맞다.',
      '예시 실행: 오늘 저녁 8시에 책상에 앉아서 20분만 첫 작업을 진행하고, 끝나면 체크 표시를 남긴다.',
      '예시 복기: 적중 - 시작은 쉬워졌다. 오차 - 20분 뒤 추가 작업으로 늘어 피로가 생겼다.'
    ],
    practiceChecklist: [
      '체크 1: 첫 문장에 결론이 들어갔는가?',
      '체크 2: 카드 키워드 1개가 실제 상황 근거와 연결됐는가?',
      '체크 3: 실행 문장에 시간/행동이 포함됐는가?',
      `체크 4: 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 2줄을 남겼는가?'
    ],
    commonMistakes: [
      `실수 1: ${stageMeta.mistakes}`,
      '실수 2: 결론 없이 감상만 길어지는 경우',
      '실수 3: 키워드 나열만 하고 현재 상황과 연결하지 않는 경우',
      '실수 4: 실행 문장이 추상적이라 바로 행동이 안 되는 경우',
      '실수 5: 복기를 생략해 같은 오차를 반복하는 경우'
    ],
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

function buildLessonDetail(course, lesson, lessonIndex) {
  const stageMeta = stagePlaybook[course.stage] || stagePlaybook['기초 입문'];
  const cardNames = getCardNames(lesson.cardIds, 6);
  const cardPreview = cardNames.slice(0, 4).join(', ');
  const domain = inferLessonDomain(lesson, course);
  const domainGuide = buildDomainGuides(domain);
  const lessonProfile = getLessonProfile(lesson, domainGuide);
  const order = lessonIndex + 1;
  const onePassScript = buildOnePassScript({ lesson, cardNames, lessonProfile });
  const easyEvidence = '카드 신호 2개 + 지금 상황 1개';
  const easyAction = '오늘 안에 할 행동 1개를 시간까지 적기';
  const easyReview = '잘한 점 1줄 + 아쉬운 점 1줄';

  if (lesson.id === 'fz-1') {
    return buildFriendlyFz1Detail({ lesson, stageMeta, cardNames });
  }

  const sampleCardA = cardNames[0] || '샘플 카드 A';
  const sampleCardB = cardNames[1] || '샘플 카드 B';
  const sampleCardC = cardNames[2] || '샘플 카드 C';

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
    lessonFlow: [
      `1단계(도입 10분): 레슨 질문을 한 문장으로 고정하고, 사용할 카드 후보(${cardPreview || '샘플 카드'})를 빠르게 훑습니다.`,
      `2단계(핵심 15분): "${lesson.title}" 방식으로 결론 1문장 + 근거 1문장을 작성합니다.`,
      '3단계(확장 10분): 같은 결론을 정방향/역방향 또는 맥락(관계/일/학습) 기준으로 각각 1회 재작성합니다.',
      '4단계(실행 10분): 오늘 실제로 시도할 행동 1개를 정하고, 실행 조건(시간/장소/완료 기준)을 붙입니다.',
      '5단계(복기 5분): 적중한 근거 1개와 빗나간 근거 1개를 분리해 다음 리딩 보정 포인트를 남깁니다.'
    ],
    lessonBody: [
      `${lesson.title} 레슨의 핵심은 "읽기 쉽고 바로 실행되는 문장"입니다. 어려운 용어보다 쉬운 말로 먼저 쓰세요.`,
      `이 레슨에서 자주 쓰는 카드 예시는 ${cardPreview || '샘플 카드'}입니다. 카드의 뜻을 전부 말하려고 하지 말고, 이번 질문에 필요한 의미만 선택해 연결하세요.`,
      '본문 운영 원칙 1: 결론 문장을 먼저 말합니다. 본문 운영 원칙 2: 근거 문장을 이어 말합니다. 본문 운영 원칙 3: 마지막에 오늘 실행 행동 1개를 붙입니다.',
      `근거 문장은 "${easyEvidence}"처럼 간단하게 씁니다. 이 구조만 지켜도 리딩이 훨씬 쉬워집니다.`,
      `실행 문장은 "${easyAction}" 원칙으로 씁니다. "좋게 해보자" 같은 추상 표현은 피하고, 바로 실행 가능한 문장으로 바꿉니다.`,
      `레슨 마무리는 "${easyReview}"만 쓰면 충분합니다. 복기 2줄이 다음 리딩 실력을 빠르게 올립니다.`
    ],
    coreConcepts: [
      `개념 1 - 질문 축소: "${lessonProfile.questionTemplate}"처럼 질문을 한 줄로 고정합니다.`,
      '개념 2 - 결론 우선: 첫 문장에서 방향을 먼저 보여줍니다.',
      `개념 3 - 근거 구조화: ${easyEvidence} 방식으로 근거를 분리합니다.`,
      `개념 4 - 실행 연결: ${easyAction} 형태로 문장을 끝냅니다.`,
      `개념 5 - 복기 루프: ${easyReview}를 반복하면 정확도가 올라갑니다.`
    ],
    coachingScript: [
      '코치 스크립트 1: "좋아요, 결론 한 줄부터 말해볼게요."',
      `코치 스크립트 2: "이제 근거를 ${easyEvidence} 순서로 짧게 붙여볼까요?"`,
      '코치 스크립트 3: "좋습니다. 이제 오늘 실행 행동 1개를 시간까지 적어볼게요."',
      `코치 스크립트 4: "끝으로 ${easyReview} 2줄만 남기면 오늘 레슨 완료입니다."`
    ],
    workedExample: [
      `예시 질문: ${lessonProfile.questionTemplate}`,
      `예시 결론: ${sampleCardA} 신호가 강하므로, 오늘은 우선순위 1개만 먼저 끝내는 게 좋습니다.`,
      `예시 근거: ${sampleCardA}는 시작 신호, ${sampleCardB}는 조정 신호를 보여서 "${easyEvidence}" 기준으로 보면 분산보다 집중이 유리합니다.`,
      `예시 실행: ${easyAction}. 예: 오늘 19:30에 30분 동안 핵심 작업 1개만 끝내기.`,
      `예시 복기: ${easyReview}. 예: 잘한 점 1줄(${sampleCardC} 해석이 맞은 이유), 아쉬운 점 1줄(빗나간 이유).`
    ],
    practiceChecklist: [
      '체크 1: 해석 첫 문장에 결론이 분명하게 들어갔는가?',
      '체크 2: 카드 키워드가 단어 나열이 아니라 실제 상황 근거로 쓰였는가?',
      '체크 3: 실행 문장이 "언제/무엇을" 수준까지 구체화되었는가?',
      `체크 4: 이 단계의 대표 실수("${stageMeta.mistakes}")를 피했는가?`,
      '체크 5: 복기 메모를 2줄 이상 남겼는가?'
    ],
    commonMistakes: [
      `실수 1: ${stageMeta.mistakes}`,
      '실수 2: 결론 없이 감상만 길어져서 듣는 사람이 무엇을 해야 할지 모르게 되는 경우',
      '실수 3: 카드 키워드를 나열만 하고 질문 맥락(관계/일/재정/학습) 연결이 빠지는 경우',
      '실수 4: 실행 문장이 없거나 너무 추상적이라 실제 행동으로 이어지지 않는 경우',
      '실수 5: 복기를 생략해 같은 오차를 반복하는 경우'
    ],
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
