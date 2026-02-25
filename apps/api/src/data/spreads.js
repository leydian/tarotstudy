export const spreads = [
  {
    id: 'daily',
    name: '하루 운세 (One Card)',
    description: '하나의 카드로 상황의 핵심이나 오늘의 기운을 확인합니다.',
    positions: [{ id: 1, label: '오늘의 조언', x: 0, y: 0 }]
  },
  {
    id: 'choice',
    name: '양자택일 (Two Cards)',
    description: '두 가지 선택지 사이의 에너지를 비교합니다.',
    positions: [
      { id: 1, label: '선택 A', x: -150, y: 0 },
      { id: 2, label: '선택 B', x: 150, y: 0 }
    ]
  },
  {
    id: 'weekly',
    name: '주별 운세 (Three Card)',
    description: '이번 주의 흐름을 과거-현재-미래의 관점에서 분석합니다.',
    positions: [
      { id: 1, label: '과거/기반', x: -220, y: 0 },
      { id: 2, label: '현재/중심', x: 0, y: 0 },
      { id: 3, label: '미래/흐름', x: 220, y: 0 }
    ]
  },
  {
    id: 'monthly',
    name: '월별 운세 (Penta Spread)',
    description: '한 달의 흐름을 다각도로 조명하는 5장 스프레드입니다.',
    positions: [
      { id: 1, label: '현재 상태', x: 0, y: 0 },
      { id: 2, label: '과거의 영향', x: -220, y: 0 },
      { id: 3, label: '잠재적 미래', x: 220, y: 0 },
      { id: 4, label: '내면의 빛', x: 0, y: -320 },
      { id: 5, label: '외부의 환경', x: 0, y: 320 }
    ]
  },
  {
    id: 'celtic',
    name: '켈틱 크로스 (10 Cards)',
    description: '문제의 근본부터 결말까지 모든 면을 분석하는 최고 권위의 스프레드입니다.',
    positions: [
      { id: 1, label: '현재 상황', x: 0, y: 0 },
      { id: 2, label: '장애물', x: 0, y: 0 },
      { id: 3, label: '잠재의식', x: 0, y: 150 },
      { id: 4, label: '과거', x: -150, y: 0 },
      { id: 5, label: '현재 의식', x: 0, y: -150 },
      { id: 6, label: '가까운 미래', x: 150, y: 0 },
      { id: 7, label: '당신의 태도', x: 350, y: 200 },
      { id: 8, label: '주변 환경', x: 350, y: 70 },
      { id: 9, label: '희망과 공포', x: 350, y: -60 },
      { id: 10, label: '최종 결과', x: 350, y: -190 }
    ]
  },
  {
    id: 'yearly',
    name: '연간 운세 (12 Cards)',
    description: '1월부터 12월까지 각 달의 흐름을 분석합니다.',
    positions: [
      { id: 1, label: '1월', x: 0, y: -300 },
      { id: 2, label: '2월', x: 150, y: -260 },
      { id: 3, label: '3월', x: 260, y: -150 },
      { id: 4, label: '4월', x: 300, y: 0 },
      { id: 5, label: '5월', x: 260, y: 150 },
      { id: 6, label: '6월', x: 150, y: 260 },
      { id: 7, label: '7월', x: 0, y: 300 },
      { id: 8, label: '8월', x: -150, y: 260 },
      { id: 9, label: '9월', x: -260, y: 150 },
      { id: 10, label: '10월', x: -300, y: 0 },
      { id: 11, label: '11월', x: -260, y: -150 },
      { id: 12, label: '12월', x: -150, y: -260 }
    ]
  }
];

export const getSpreadById = (id) => spreads.find(s => s.id === id);
