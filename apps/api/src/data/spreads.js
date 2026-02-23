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
      { name: '월요일', meaning: '주간 시동과 우선순위 고정' },
      { name: '화요일', meaning: '초반 리듬 안정화와 실행 유지' },
      { name: '수요일', meaning: '중반 변수 대응과 전환점' },
      { name: '목요일', meaning: '중반 마무리와 정리 품질' },
      { name: '금요일', meaning: '성과 확인과 마감 준비' },
      { name: '토요일', meaning: '회복/관계/정비 흐름' },
      { name: '일요일', meaning: '복기와 다음 주 준비' }
    ],
    layout: {
      cols: 7,
      rows: 1,
      slots: [
        { position: '월요일', col: 1, row: 1 },
        { position: '화요일', col: 2, row: 1 },
        { position: '수요일', col: 3, row: 1 },
        { position: '목요일', col: 4, row: 1 },
        { position: '금요일', col: 5, row: 1 },
        { position: '토요일', col: 6, row: 1 },
        { position: '일요일', col: 7, row: 1 }
      ]
    },
    studyGuide: [
      '월요일 카드로 이번 주 핵심 우선순위 1개를 먼저 고정합니다.',
      '수요일/목요일 카드에 맞춰 중반 완충 구간과 정리 구간을 분리합니다.',
      '일요일 카드 기준으로 다음 주 준비 루틴 1개를 확정합니다.'
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
    id: 'relationship-recovery',
    name: '관계 회복 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '관계 거리감의 원인과 회복 행동을 분리해 7일 실행 계획으로 연결합니다.',
    whenToUse: [
      '재회 가능성과 대화 재개 타이밍을 구조적으로 보고 싶을 때',
      '갈등 이후 감정 해석보다 행동 우선순위를 정리하고 싶을 때',
      '상대 신호와 내 행동 계획을 분리해 오판을 줄이고 싶을 때'
    ],
    positions: [
      { name: '현재 관계 상태', meaning: '지금 관계 온도와 연결 상태' },
      { name: '거리/갈등의 핵심', meaning: '반복되는 오해 또는 충돌의 중심 요인' },
      { name: '상대 관점 신호', meaning: '상대 반응에서 읽히는 관심/방어 신호' },
      { name: '회복 행동', meaning: '관계 회복을 위해 바로 실행할 행동' },
      { name: '다음 7일 흐름', meaning: '이번 주 예상되는 관계 흐름과 주의점' }
    ],
    layout: {
      cols: 3,
      rows: 3,
      slots: [
        { position: '상대 관점 신호', col: 2, row: 1 },
        { position: '거리/갈등의 핵심', col: 1, row: 2 },
        { position: '현재 관계 상태', col: 2, row: 2 },
        { position: '회복 행동', col: 3, row: 2 },
        { position: '다음 7일 흐름', col: 2, row: 3 }
      ]
    },
    studyGuide: [
      '현재 관계 상태 카드를 기준으로 감정 추측과 사실 신호를 분리해 기록합니다.',
      '회복 행동 카드를 오늘 실행 가능한 문장 1개로 번역합니다.',
      '7일 뒤 실제 반응을 복기해 다음 리딩에서 행동 강도를 조정합니다.'
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
  },
  {
    id: 'exam-success-5',
    name: '시험 합격 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '시험 준비의 강점/약점을 분리해 합격 확률을 높이는 실행 순서를 잡습니다.',
    whenToUse: [
      '시험 직전 무엇부터 정리할지 막막할 때',
      '공부량보다 공부 방식의 효율을 점검하고 싶을 때',
      '불안 관리와 실전 운영을 동시에 잡고 싶을 때'
    ],
    positions: [
      { name: '현재 실력 흐름', meaning: '지금 기준점과 기본 체력' },
      { name: '취약 파트', meaning: '점수 누수가 나는 핵심 구간' },
      { name: '강점 파트', meaning: '점수 방어/상승이 가능한 구간' },
      { name: '실전 운영', meaning: '시험 당일 시간/멘탈 운영 포인트' },
      { name: '합격 가능성', meaning: '현재 흐름 유지 시 결과 가능성' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '현재 실력 흐름', col: 2, row: 1 },
        { position: '취약 파트', col: 1, row: 1 },
        { position: '강점 파트', col: 3, row: 1 },
        { position: '실전 운영', col: 1, row: 2 },
        { position: '합격 가능성', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '취약 파트 1개와 강점 파트 1개를 분리해 학습 비중을 정합니다.',
      '실전 운영 카드를 기준으로 시험 당일 루틴을 미리 적어둡니다.',
      '합격 가능성 카드를 보며 남은 기간 현실적인 점수 목표를 고정합니다.'
    ]
  },
  {
    id: 'interview-4',
    name: '면접 전략 4카드',
    level: 'beginner',
    cardCount: 4,
    purpose: '면접 메시지, 약점 보완, 전달 톤을 빠르게 점검합니다.',
    whenToUse: [
      '면접을 앞두고 답변 구조를 점검할 때',
      '자기소개/지원동기 톤을 조절하고 싶을 때',
      '강점 전달과 리스크 질문 대응을 함께 준비할 때'
    ],
    positions: [
      { name: '첫인상 신호', meaning: '초반 인상과 전달 톤' },
      { name: '핵심 강점', meaning: '가장 설득력 있게 전달할 강점' },
      { name: '보완 질문', meaning: '꼬리 질문/약점 질문 대응 포인트' },
      { name: '최종 인상', meaning: '면접 종료 시 남길 인상' }
    ],
    layout: {
      cols: 4,
      rows: 1,
      slots: [
        { position: '첫인상 신호', col: 1, row: 1 },
        { position: '핵심 강점', col: 2, row: 1 },
        { position: '보완 질문', col: 3, row: 1 },
        { position: '최종 인상', col: 4, row: 1 }
      ]
    },
    studyGuide: [
      '첫인상 카드와 최종 인상 카드를 비교해 말투 강도를 맞춥니다.',
      '핵심 강점은 사례 1개로, 보완 질문은 대응 문장 1개로 고정합니다.',
      '면접 전 10분 리허설로 답변 길이를 점검합니다.'
    ]
  },
  {
    id: 'career-transition-6',
    name: '커리어 전환 6카드',
    level: 'intermediate',
    cardCount: 6,
    purpose: '이직/직무 전환의 준비도와 리스크를 단계별로 점검합니다.',
    whenToUse: [
      '현재 직무를 유지할지 전환할지 고민할 때',
      '전환 시점과 준비 우선순위를 정하고 싶을 때',
      '소모를 줄이며 현실적으로 실행하고 싶을 때'
    ],
    positions: [
      { name: '현재 포지션', meaning: '지금 일에서의 안정성/한계' },
      { name: '전환 동기', meaning: '전환을 원하는 핵심 이유' },
      { name: '시장 타이밍', meaning: '외부 기회/진입 타이밍' },
      { name: '준비 과제', meaning: '전환 전에 보완할 핵심 역량' },
      { name: '리스크', meaning: '재정/체력/관계 소모 요소' },
      { name: '실행 결론', meaning: '지금 행동 강도와 실행 방향' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '현재 포지션', col: 1, row: 1 },
        { position: '전환 동기', col: 2, row: 1 },
        { position: '시장 타이밍', col: 3, row: 1 },
        { position: '준비 과제', col: 1, row: 2 },
        { position: '리스크', col: 2, row: 2 },
        { position: '실행 결론', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '준비 과제 카드와 리스크 카드를 연결해 30일 보완 루틴을 만듭니다.',
      '시장 타이밍 카드로 지원서 제출 시점을 좁힙니다.',
      '실행 결론 카드를 기준으로 강도(보수/균형/공격)를 선택합니다.'
    ]
  },
  {
    id: 'project-planning-5',
    name: '프로젝트 기획 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '프로젝트 시작 전에 목표·일정·리스크를 구조화합니다.',
    whenToUse: [
      '새 프로젝트를 시작하기 전 우선순위를 정할 때',
      '일정이 자주 밀려 운영 구조를 다시 잡고 싶을 때',
      '팀/개인 프로젝트 모두 적용 가능한 점검표가 필요할 때'
    ],
    positions: [
      { name: '목표 선명도', meaning: '프로젝트 핵심 목표의 명확성' },
      { name: '자원 상태', meaning: '시간/인력/예산 여건' },
      { name: '핵심 병목', meaning: '일정을 늦추는 주요 장애물' },
      { name: '실행 레버', meaning: '성과를 키울 우선 행동' },
      { name: '마감 전망', meaning: '현재 운영 시 마감 가능성' }
    ],
    layout: {
      cols: 5,
      rows: 1,
      slots: [
        { position: '목표 선명도', col: 1, row: 1 },
        { position: '자원 상태', col: 2, row: 1 },
        { position: '핵심 병목', col: 3, row: 1 },
        { position: '실행 레버', col: 4, row: 1 },
        { position: '마감 전망', col: 5, row: 1 }
      ]
    },
    studyGuide: [
      '핵심 병목 카드 1개를 기준으로 일정 완충 규칙을 만듭니다.',
      '실행 레버 카드를 오늘 할 일 1개로 바로 번역합니다.',
      '마감 전망 카드를 바탕으로 주간 점검일을 고정합니다.'
    ]
  },
  {
    id: 'burnout-recovery-5',
    name: '번아웃 회복 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '소진 원인과 회복 루틴을 분리해 현실적인 회복 계획을 세웁니다.',
    whenToUse: [
      '의욕 저하와 피로가 동시에 누적될 때',
      '휴식해도 회복되지 않아 원인을 점검하고 싶을 때',
      '일·감정·몸 상태를 같이 정리하고 싶을 때'
    ],
    positions: [
      { name: '소진 신호', meaning: '지금 가장 강한 피로 신호' },
      { name: '원인 패턴', meaning: '반복되는 소모 습관/환경' },
      { name: '회복 자원', meaning: '회복을 돕는 보호 요인' },
      { name: '즉시 조치', meaning: '오늘 바로 적용할 회복 행동' },
      { name: '7일 회복 전망', meaning: '다음 1주 회복 흐름' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '소진 신호', col: 2, row: 1 },
        { position: '원인 패턴', col: 1, row: 1 },
        { position: '회복 자원', col: 3, row: 1 },
        { position: '즉시 조치', col: 1, row: 2 },
        { position: '7일 회복 전망', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '원인 패턴 카드에서 끊을 습관 1개를 먼저 정합니다.',
      '즉시 조치 카드를 오늘 일정 1개에 바로 반영합니다.',
      '7일 회복 전망 카드로 무리한 목표를 줄이고 회복 리듬을 유지합니다.'
    ]
  },
  {
    id: 'finance-checkup-5',
    name: '재정 점검 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '수입·지출·누수·저축 흐름을 빠르게 점검합니다.',
    whenToUse: [
      '지출이 늘어 원인을 구조적으로 확인하고 싶을 때',
      '예산을 다시 세우기 전 현재 재정 상태를 점검할 때',
      '현금흐름을 안정화하는 기준이 필요할 때'
    ],
    positions: [
      { name: '수입 흐름', meaning: '현금 유입의 안정성' },
      { name: '지출 구조', meaning: '현재 소비 구조의 특징' },
      { name: '누수 포인트', meaning: '줄여야 할 지출 구간' },
      { name: '저축/투자 균형', meaning: '축적 전략의 안정성' },
      { name: '다음 30일 전략', meaning: '한 달 실행 계획' }
    ],
    layout: {
      cols: 5,
      rows: 1,
      slots: [
        { position: '수입 흐름', col: 1, row: 1 },
        { position: '지출 구조', col: 2, row: 1 },
        { position: '누수 포인트', col: 3, row: 1 },
        { position: '저축/투자 균형', col: 4, row: 1 },
        { position: '다음 30일 전략', col: 5, row: 1 }
      ]
    },
    studyGuide: [
      '누수 포인트 카드 기준으로 감축 항목 1개를 고정합니다.',
      '저축/투자 균형 카드를 기반으로 비중을 재조정합니다.',
      '다음 30일 전략 카드를 주간 체크리스트로 변환합니다.'
    ]
  },
  {
    id: 'investment-balance-7',
    name: '투자 밸런스 7카드',
    level: 'intermediate',
    cardCount: 7,
    purpose: '리스크, 심리, 포트폴리오 균형을 함께 점검합니다.',
    whenToUse: [
      '투자 비중을 조정해야 할지 고민할 때',
      '수익보다 변동성 관리가 중요해졌을 때',
      '투자 판단에서 감정 개입을 줄이고 싶을 때'
    ],
    positions: [
      { name: '시장 온도', meaning: '현재 시장 분위기와 변동성' },
      { name: '보유 자산 강점', meaning: '현재 포트폴리오의 강점' },
      { name: '보유 자산 약점', meaning: '리스크가 큰 구간' },
      { name: '현금 비중', meaning: '유동성 관리 적정성' },
      { name: '추가 매수 판단', meaning: '추가 진입 시 유리/불리 조건' },
      { name: '리스크 관리', meaning: '손실 방어 규칙' },
      { name: '30일 운영 결론', meaning: '단기 운용 방향' }
    ],
    layout: {
      cols: 4,
      rows: 2,
      slots: [
        { position: '시장 온도', col: 2, row: 1 },
        { position: '보유 자산 강점', col: 1, row: 1 },
        { position: '보유 자산 약점', col: 3, row: 1 },
        { position: '현금 비중', col: 4, row: 1 },
        { position: '추가 매수 판단', col: 1, row: 2 },
        { position: '리스크 관리', col: 2, row: 2 },
        { position: '30일 운영 결론', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '시장 온도 카드와 현금 비중 카드를 같이 읽어 진입 강도를 정합니다.',
      '보유 자산 약점 카드의 리스크를 줄이는 규칙 1개를 고정합니다.',
      '30일 운영 결론 카드를 실행/관망 기준으로 문장화합니다.'
    ]
  },
  {
    id: 'home-move-5',
    name: '이사/거주 선택 5카드',
    level: 'beginner',
    cardCount: 5,
    purpose: '이사/거주 변경의 적합성, 비용, 생활 리듬을 점검합니다.',
    whenToUse: [
      '이사를 할지 유지할지 판단이 필요할 때',
      '입지·비용·생활 편의의 균형을 보고 싶을 때',
      '거주 선택이 일/관계에 미칠 영향을 확인하고 싶을 때'
    ],
    positions: [
      { name: '현재 거주 만족도', meaning: '현재 환경의 장단점' },
      { name: '이동 필요성', meaning: '변화 필요의 현실성' },
      { name: '비용/계약 리스크', meaning: '재정·계약 부담 요소' },
      { name: '생활 리듬 변화', meaning: '이동 후 생활 패턴 변화' },
      { name: '최종 선택 힌트', meaning: '지금 시점 최적 선택 방향' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '현재 거주 만족도', col: 2, row: 1 },
        { position: '이동 필요성', col: 1, row: 1 },
        { position: '비용/계약 리스크', col: 3, row: 1 },
        { position: '생활 리듬 변화', col: 1, row: 2 },
        { position: '최종 선택 힌트', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '비용/계약 리스크 카드 기준으로 체크리스트를 먼저 작성합니다.',
      '생활 리듬 변화 카드를 통근/수면/집중 시간표와 연결합니다.',
      '최종 선택 힌트를 3개월 유지 가능성 기준으로 검증합니다.'
    ]
  },
  {
    id: 'communication-reset-4',
    name: '대화 리셋 4카드',
    level: 'beginner',
    cardCount: 4,
    purpose: '엇갈린 대화 흐름을 정리하고 전달 방식을 재설계합니다.',
    whenToUse: [
      '대화가 반복적으로 꼬이고 오해가 커질 때',
      '말투/속도/타이밍을 조정하고 싶을 때',
      '관계를 끊지 않고 대화 방식을 바꾸고 싶을 때'
    ],
    positions: [
      { name: '현재 대화 온도', meaning: '지금 감정 강도와 긴장도' },
      { name: '오해 트리거', meaning: '갈등을 키우는 표현/패턴' },
      { name: '새 전달 방식', meaning: '효과적인 전달 프레임' },
      { name: '다음 대화 결과', meaning: '방식 변경 시 예상 흐름' }
    ],
    layout: {
      cols: 4,
      rows: 1,
      slots: [
        { position: '현재 대화 온도', col: 1, row: 1 },
        { position: '오해 트리거', col: 2, row: 1 },
        { position: '새 전달 방식', col: 3, row: 1 },
        { position: '다음 대화 결과', col: 4, row: 1 }
      ]
    },
    studyGuide: [
      '오해 트리거 카드로 금지 표현 1개를 정합니다.',
      '새 전달 방식 카드를 사실-감정-요청 1문장으로 변환합니다.',
      '다음 대화 결과 카드를 보고 대화 길이/타이밍을 설정합니다.'
    ]
  },
  {
    id: 'shadow-work-5',
    name: '내면 정리 5카드',
    level: 'intermediate',
    cardCount: 5,
    purpose: '반복되는 감정 패턴의 뿌리를 읽고 자기 이해를 돕습니다.',
    whenToUse: [
      '같은 문제를 반복하는 이유를 깊게 보고 싶을 때',
      '감정 반응 패턴을 정리하고 싶을 때',
      '내면 작업과 현실 행동을 함께 연결하고 싶을 때'
    ],
    positions: [
      { name: '표면 감정', meaning: '지금 드러난 감정 상태' },
      { name: '숨은 욕구', meaning: '감정 아래의 진짜 필요' },
      { name: '반복 패턴', meaning: '같은 문제를 만드는 습관' },
      { name: '회복 자원', meaning: '자기 회복을 돕는 요인' },
      { name: '통합 행동', meaning: '현실에 적용할 통합 실천' }
    ],
    layout: {
      cols: 3,
      rows: 2,
      slots: [
        { position: '표면 감정', col: 2, row: 1 },
        { position: '숨은 욕구', col: 1, row: 1 },
        { position: '반복 패턴', col: 3, row: 1 },
        { position: '회복 자원', col: 1, row: 2 },
        { position: '통합 행동', col: 3, row: 2 }
      ]
    },
    studyGuide: [
      '표면 감정과 숨은 욕구를 분리해 기록합니다.',
      '반복 패턴 카드 기준으로 중단할 반응 1개를 정합니다.',
      '통합 행동 카드를 일상 루틴 1개로 연결해 7일 실행합니다.'
    ]
  }
];
