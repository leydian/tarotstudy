export const spreads = [
  {
    id: 'one-card',
    name: '원카드',
    level: 'beginner',
    cardCount: 1,
    purpose: '하루 메시지, 빠른 점검, 단기 선택 정리에 적합합니다.',
    whenToUse: [
      '오늘의 집중 포인트를 한 문장으로 정리하고 싶을 때',
      '질문이 넓고 복잡해서 우선 핵심 축을 잡아야 할 때',
      '리딩 초보가 카드-문맥 연결 훈련을 시작할 때'
    ],
    positions: [
      { name: '핵심 메시지', meaning: '현재 상황에서 가장 우선적으로 보아야 할 에너지' }
    ],
    layout: {
      cols: 3,
      rows: 1,
      slots: [{ position: '핵심 메시지', col: 2, row: 1 }]
    },
    studyGuide: [
      '질문을 한 문장으로 좁히고, 카드 키워드 3개를 먼저 적습니다.',
      '정방향/역방향에 따라 행동 방식을 어떻게 바꿀지 비교합니다.',
      '마지막에 24시간 안에 실행할 행동 1개를 결정합니다.'
    ]
  },
  {
    id: 'three-card',
    name: '3카드 스프레드',
    level: 'beginner',
    cardCount: 3,
    purpose: '흐름 파악과 문제 해결 구조를 짧게 해석하는 데 적합합니다.',
    whenToUse: [
      '문제의 배경과 현재 장애물을 함께 보고 싶을 때',
      '질문을 3단 구조로 단순화해 빠르게 의사결정할 때',
      '리딩 초중급이 해석 논리를 훈련할 때'
    ],
    positions: [
      { name: '과거', meaning: '현재에 영향을 준 배경 요인 또는 누적 패턴' },
      { name: '현재', meaning: '지금 가장 강하게 작동하는 에너지와 핵심 과제' },
      { name: '미래', meaning: '현재 흐름을 유지할 때 예상되는 다음 전개' }
    ],
    variants: [
      {
        id: 'past-present-future',
        name: '과거-현재-미래',
        positions: [
          { name: '과거', meaning: '지금 상황을 만든 원인과 배경' },
          { name: '현재', meaning: '현재 핵심 쟁점과 체감 에너지' },
          { name: '미래', meaning: '현 흐름을 유지했을 때의 전개' }
        ]
      },
      {
        id: 'problem-solution-advice',
        name: '문제-해결방법-조언',
        positions: [
          { name: '문제', meaning: '지금 막히는 핵심 원인 또는 병목' },
          { name: '해결방법', meaning: '실제로 적용 가능한 접근법' },
          { name: '조언', meaning: '행동 우선순위와 주의점' }
        ]
      },
      {
        id: 'situation-action-outcome',
        name: '상황-행동-결과',
        positions: [
          { name: '상황', meaning: '현재 객관적 상태와 조건' },
          { name: '행동', meaning: '지금 취해야 할 구체적 행동' },
          { name: '결과', meaning: '행동 실행 시 기대 가능한 변화' }
        ]
      }
    ],
    layout: {
      cols: 3,
      rows: 1,
      slots: [
        { position: '1', col: 1, row: 1 },
        { position: '2', col: 2, row: 1 },
        { position: '3', col: 3, row: 1 }
      ]
    },
    studyGuide: [
      '카드 3장을 따로 해석한 뒤 연결 문장을 1개 만듭니다.',
      '중앙 카드(2번)를 기준으로 좌우 카드의 맥락을 재정렬합니다.',
      '마지막에 실행 가능한 행동 1개를 반드시 적습니다.'
    ]
  },
  {
    id: 'choice-a-b',
    name: '양자택일 (A/B)',
    level: 'beginner',
    cardCount: 5,
    purpose: '현재 상황에서 A/B 선택 시 가까운 미래와 결과를 비교해 의사결정을 돕습니다.',
    whenToUse: [
      '옵션 A와 B 중 무엇을 선택할지 고민할 때',
      '각 선택의 단기 흐름과 최종 결과를 함께 보고 싶을 때',
      '결정 전 시나리오 비교를 구조적으로 하고 싶을 때'
    ],
    positions: [
      { name: '현재 상황', meaning: '지금 의사결정에 영향을 주는 핵심 조건' },
      { name: 'A 선택 시 가까운 미래', meaning: 'A를 택했을 때 단기 전개' },
      { name: 'A 선택 시 결과', meaning: 'A를 유지했을 때 도달 가능성이 큰 결과' },
      { name: 'B 선택 시 가까운 미래', meaning: 'B를 택했을 때 단기 전개' },
      { name: 'B 선택 시 결과', meaning: 'B를 유지했을 때 도달 가능성이 큰 결과' }
    ],
    layout: {
      cols: 3,
      rows: 3,
      slots: [
        { position: '현재 상황', col: 2, row: 1 },
        { position: 'A 선택 시 가까운 미래', col: 1, row: 2 },
        { position: 'B 선택 시 가까운 미래', col: 3, row: 2 },
        { position: 'A 선택 시 결과', col: 1, row: 3 },
        { position: 'B 선택 시 결과', col: 3, row: 3 }
      ]
    },
    studyGuide: [
      '현재 상황 카드를 기준으로 의사결정 기준(시간, 비용, 감정)을 먼저 고정합니다.',
      'A/B의 가까운 미래 카드에서 단기 리스크를 비교합니다.',
      'A/B 결과 카드를 보고 실행 가능성이 높은 쪽을 선택합니다.'
    ]
  },
  {
    id: 'daily-fortune',
    name: '일별 운세',
    level: 'beginner',
    cardCount: 3,
    purpose: '오늘의 에너지, 주의점, 실천 포인트를 빠르게 정리합니다.',
    whenToUse: [
      '출근/등교 전에 오늘의 우선순위를 정하고 싶을 때',
      '감정 기복이 큰 날 루틴을 안정화하고 싶을 때',
      '짧은 셀프체크 리딩이 필요할 때'
    ],
    positions: [
      { name: '오늘의 흐름', meaning: '오늘 전반의 핵심 분위기' },
      { name: '주의할 점', meaning: '실수/충돌/소모가 큰 지점' },
      { name: '행동 조언', meaning: '오늘 바로 실행할 우선 행동' }
    ],
    layout: {
      cols: 3,
      rows: 1,
      slots: [
        { position: '오늘의 흐름', col: 1, row: 1 },
        { position: '주의할 점', col: 2, row: 1 },
        { position: '행동 조언', col: 3, row: 1 }
      ]
    },
    studyGuide: [
      '아침에 뽑고 저녁에 실제 결과와 비교 복기합니다.',
      '주의 카드가 말한 리스크가 어떻게 나타났는지 기록합니다.',
      '행동 조언을 1개만 실행하고 체감 변화를 점수화합니다.'
    ]
  },
  {
    id: 'weekly-fortune',
    name: '주별 운세',
    level: 'beginner',
    cardCount: 7,
    purpose: '월요일부터 일요일까지의 흐름을 시간순으로 읽고 주간 전략을 세웁니다.',
    whenToUse: [
      '주간 목표를 세우기 전에 전체 흐름을 점검할 때',
      '업무/관계/자기관리 밸런스를 조정할 때',
      '주간 루틴을 개선하고 싶을 때'
    ],
    positions: [
      { name: '주간 테마', meaning: '이번 주의 핵심 키워드' },
      { name: '월-화', meaning: '주 초반 페이스와 집중 포인트' },
      { name: '수-목', meaning: '중반 변수와 전환점' },
      { name: '금요일', meaning: '성과 확인과 마무리 준비' },
      { name: '토요일', meaning: '회복/관계/정비 흐름' },
      { name: '일요일', meaning: '복기와 다음 주 준비' },
      { name: '주간 조언', meaning: '이번 주 전체 실행 전략' }
    ],
    layout: {
      cols: 7,
      rows: 1,
      slots: [
        { position: '주간 테마', col: 1, row: 1 },
        { position: '월-화', col: 2, row: 1 },
        { position: '수-목', col: 3, row: 1 },
        { position: '금요일', col: 4, row: 1 },
        { position: '토요일', col: 5, row: 1 },
        { position: '일요일', col: 6, row: 1 },
        { position: '주간 조언', col: 7, row: 1 }
      ]
    },
    studyGuide: [
      '주간 테마 카드를 기준으로 캘린더 우선순위를 재배치합니다.',
      '중반 전환점 카드에 맞춰 일정 완충 구간을 확보합니다.',
      '일요일/주간 조언 카드를 기준으로 다음 주 준비 루틴을 만듭니다.'
    ]
  },
  {
    id: 'monthly-fortune',
    name: '월별 운세',
    level: 'intermediate',
    cardCount: 5,
    purpose: '한 달의 큰 주기와 주차별 관리 포인트를 읽습니다.',
    whenToUse: [
      '월간 목표/예산/관계 계획을 잡기 전',
      '중장기 프로젝트 리듬을 조정할 때',
      '월말 복기 기준을 미리 세울 때'
    ],
    positions: [
      { name: '월간 테마', meaning: '한 달 전체를 관통하는 에너지' },
      { name: '1주차', meaning: '시작 단계의 핵심 과제' },
      { name: '2주차', meaning: '중간 점검과 조정 포인트' },
      { name: '3주차', meaning: '성과/갈등/피로 누적 구간' },
      { name: '4주차·정리', meaning: '마무리와 다음 달 인수인계 포인트' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '월간 테마', col: 2, row: 1 },
        { position: '1주차', col: 1, row: 1 },
        { position: '2주차', col: 3, row: 1 },
        { position: '3주차', col: 1, row: 2 },
        { position: '4주차·정리', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '월간 테마 카드를 목표 설정의 기준 문장으로 바꿉니다.',
      '주차 카드별로 KPI 또는 체크리스트 1개씩 연결합니다.',
      '월말에 카드별 실제 결과를 기록해 해석 정확도를 점검합니다.'
    ]
  },
  {
    id: 'yearly-fortune',
    name: '연간 운세 (12개월)',
    level: 'intermediate',
    cardCount: 12,
    purpose: '12개월 리듬을 조망하며 분기별 전략을 세우는 데 적합합니다.',
    whenToUse: [
      '신년 계획/연간 목표를 수립할 때',
      '커리어/재정/관계의 큰 흐름을 함께 보고 싶을 때',
      '분기별 실행 전략을 미리 설계할 때'
    ],
    positions: [
      { name: '1월', meaning: '시작 에너지' },
      { name: '2월', meaning: '적응/정렬' },
      { name: '3월', meaning: '초기 성과' },
      { name: '4월', meaning: '확장 준비' },
      { name: '5월', meaning: '변수 대응' },
      { name: '6월', meaning: '상반기 결산' },
      { name: '7월', meaning: '재정비' },
      { name: '8월', meaning: '중반 가속' },
      { name: '9월', meaning: '성과 조율' },
      { name: '10월', meaning: '리스크 점검' },
      { name: '11월', meaning: '마무리 수확' },
      { name: '12월', meaning: '종합 정리' }
    ],
    layout: {
      cols: 4,
      rows: 3,
      slots: [
        { position: '1월', col: 1, row: 1 },
        { position: '2월', col: 2, row: 1 },
        { position: '3월', col: 3, row: 1 },
        { position: '4월', col: 4, row: 1 },
        { position: '5월', col: 1, row: 2 },
        { position: '6월', col: 2, row: 2 },
        { position: '7월', col: 3, row: 2 },
        { position: '8월', col: 4, row: 2 },
        { position: '9월', col: 1, row: 3 },
        { position: '10월', col: 2, row: 3 },
        { position: '11월', col: 3, row: 3 },
        { position: '12월', col: 4, row: 3 }
      ]
    },
    studyGuide: [
      '월 카드 12장을 분기별로 묶어 공통 키워드를 추출합니다.',
      '리스크가 큰 달은 일정/예산 완충치를 사전에 설정합니다.',
      '매월 말 실제 결과를 반영해 다음 달 실행 전략을 조정합니다.'
    ]
  },
  {
    id: 'celtic-cross',
    name: '켈틱 크로스',
    level: 'intermediate',
    cardCount: 10,
    purpose: '복합 이슈를 다층적으로 해석하는 대표 심화 스프레드입니다.',
    whenToUse: [
      '상황, 내면, 외부 변수, 결과 가능성을 함께 봐야 할 때',
      '의사결정 리스크를 구조화해서 분석하고 싶을 때',
      '중급 이상 리더가 해석 일관성을 훈련할 때'
    ],
    positions: [
      { name: '현재', meaning: '문제의 중심 주제' },
      { name: '교차/장애', meaning: '진행을 방해하거나 긴장을 만드는 요인' },
      { name: '기반', meaning: '의식 아래에서 작동하는 근본 동기' },
      { name: '가까운 과거', meaning: '직전 사건과 영향' },
      { name: '가능성', meaning: '의식적으로 지향하는 방향' },
      { name: '가까운 미래', meaning: '단기 전개' },
      { name: '자기 인식', meaning: '질문자의 태도와 자기 서사' },
      { name: '외부 환경', meaning: '타인/환경이 미치는 영향' },
      { name: '희망·두려움', meaning: '양가 감정과 내적 저항' },
      { name: '결과', meaning: '현재 흐름 지속 시의 종합 결과' }
    ],
    layout: {
      cols: 5,
      rows: 4,
      slots: [
        { position: '현재', col: 2, row: 2 },
        { position: '교차/장애', col: 2, row: 2, rotate: 90 },
        { position: '기반', col: 2, row: 3 },
        { position: '가까운 과거', col: 1, row: 2 },
        { position: '가능성', col: 2, row: 1 },
        { position: '가까운 미래', col: 3, row: 2 },
        { position: '자기 인식', col: 4, row: 1 },
        { position: '외부 환경', col: 4, row: 2 },
        { position: '희망·두려움', col: 4, row: 3 },
        { position: '결과', col: 4, row: 4 }
      ]
    },
    studyGuide: [
      '1~6번으로 상황 서사를 만들고, 7~10번으로 현실 검증을 수행합니다.',
      '결과 카드를 단정하지 말고, 변수를 바꾸면 달라질 지점을 명시합니다.',
      '리딩 후 행동 계획을 단기(7일)·중기(30일)로 나눠 기록합니다.'
    ]
  }
];
