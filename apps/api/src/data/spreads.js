export const spreads = [
  {
    id: 'one-card',
    name: '오늘의 운세 (One Card)',
    description: '하나의 카드로 상황의 핵심이나 오늘의 기운을 확인합니다.',
    positions: [
      { id: 1, label: '오늘의 조언', x: 0, y: 0 }
    ]
  },
  {
    id: 'three-card',
    name: '과거/현재/미래 (Three Card)',
    description: '흐름을 분석하여 상황의 변화를 입체적으로 이해합니다.',
    positions: [
      { id: 1, label: '과거', x: -150, y: 0 },
      { id: 2, label: '현재', x: 0, y: 0 },
      { id: 3, label: '미래', x: 150, y: 0 }
    ]
  }
];

export const getSpreadById = (id) => spreads.find(s => s.id === id);
