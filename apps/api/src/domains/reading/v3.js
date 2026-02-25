// AI 리딩 엔진 V3.7 (전체 장수 대응 및 안정화 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  // 조사(과/와, 을/를) 자동 선택 함수
  const getParticle = (word, type) => {
    const lastChar = word.charCodeAt(word.length - 1);
    const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
    if (type === 'wa/gwa') return hasBatchim ? '과' : '와';
    if (type === 'eul/reul') return hasBatchim ? '을' : '를';
    return '';
  };

  const timeframeKo = { daily: '오늘 하루', weekly: '이번 한 주', monthly: '이번 한 달', yearly: '이번 한 해' }[timeframe] || '이번 시기';
  const categoryName = { general: '종합적인 운세', love: '연애운', career: '직업운', finance: '금전운' }[category] || '운세';
  const categoryWithEul = `${categoryName}${getParticle(categoryName, 'eul/reul')}`;
  const categoryWithGwa = `${categoryName}${getParticle(categoryName, 'wa/gwa')}`;

  const cardCount = cards.length;
  const majorCount = cards.filter(c => c.id.startsWith('m')).length;
  const isNegative = (card) => ['m13', 'm15', 'm16', 's03', 's05', 's08', 's09', 's10', 'w10', 'c05', 'c08'].includes(card.id) || card.id.startsWith('s');
  const cleanAdvice = (text) => text.endsWith('.') ? text.slice(0, -1) : text;

  // 1. 공통 결론 (Conclusion) 생성
  const firstCard = cards[0];
  const lastCard = cards[cards.length - 1];
  const firstNeg = isNegative(firstCard);
  const lastNeg = isNegative(lastCard);

  let conclusion = `${timeframeKo} 당신의 ${categoryWithEul} 분석한 결과입니다. `;
  if (majorCount >= 1) conclusion += `운명의 중대한 변화를 상징하는 메이저 기운이 느껴지네요. `;

  if (firstNeg && !lastNeg) {
    conclusion += `시작은 [${firstCard.nameKo}]로 인해 다소 무겁지만, 결국 [${lastCard.nameKo}]의 밝은 에너지가 '고진감래'의 결실을 가져다줄 것입니다. `;
  } else if (!firstNeg && lastNeg) {
    conclusion += `현재 [${firstCard.nameKo}]의 기세는 좋으나, 갈수록 [${lastCard.nameKo}]가 주는 경고가 매섭습니다. '유비무환'의 자세가 필요합니다. `;
  } else if (firstNeg && lastNeg) {
    conclusion += `처음과 끝 모두 [${firstCard.nameKo}]와 [${lastCard.nameKo}] 같은 긴장감 있는 카드들이 배치되어, 지금은 무리한 전진보다 내실을 기할 때입니다. `;
  } else {
    conclusion += `[${firstCard.nameKo}]에서 [${lastCard.nameKo}]까지 에너지가 막힘없이 흐르는 아주 상서로운 형국입니다. 자신감을 갖고 나아가세요. `;
  }

  // 2. 증거 (Evidence) 생성 - 카드 장수에 따라 유연하게 대응
  let evidence = [];
  if (cardCount >= 10) {
    // 켈틱/연간은 요약 위주
    evidence = cards.map((c, i) => `${cardCount === 12 ? (i+1)+'월' : '위치 '+ (i+1)}: [${c.nameKo}] - ${c.keywords[0]}`);
  } else {
    // 일반(1, 2, 3, 5장)은 상세 해설
    evidence = cards.map(card => {
      const meaning = category === 'love' ? card.meanings.love : category === 'career' ? card.meanings.career : category === 'finance' ? card.meanings.finance : card.summary;
      return `[${card.nameKo}] (${card.keywords.slice(0,2).join(', ')}): ${meaning}`;
    });
  }

  // 3. 행동 (Action) 생성
  const action = [
    `[단계 1: 내면 조율] "${cleanAdvice(firstCard.meanings.advice)}" 하는 태도를 유지하세요.`,
    `[단계 2: 실천적 도약] "${cleanAdvice(lastCard.meanings.advice)}" 하는 방향으로 움직이십시오.`
  ];

  const challengingCard = cards.find(isNegative);
  if (challengingCard) {
    action.push(`[주의사항] 리딩 중 나타난 [${challengingCard.nameKo}] 카드의 '${challengingCard.keywords[0]}' 기운을 경계하며 신중함을 잃지 마세요.`);
  }

  return { conclusion, evidence, action };
};
