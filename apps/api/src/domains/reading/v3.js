// AI 리딩 엔진 V3.8 (Arcane Insight - 고도화 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  const cardCount = cards.length;
  
  // 1. 상황 및 페르소나 인지 (Persona Awareness)
  const isStudent = ['시험', '공부', '합격', '입시', '성적', '대학'].some(k => question.includes(k));
  const isWorker = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '프로젝트'].some(k => question.includes(k));
  const isSolo = ['썸', '소개팅', '언제쯤', '생길까'].some(k => question.includes(k));
  const isCouple = ['남자친구', '여자친구', '남친', '여친', '부부', '싸움', '권태기'].some(k => question.includes(k));
  const isLight = question.length < 10 || ['커피', '점심', '메뉴', '할까', '말까'].some(k => question.includes(k));

  // 2. 원소 밸런스 분석 (Elemental Analysis)
  const suits = {
    fire: cards.filter(c => c.id.startsWith('w')).length,    // Wands (열정, 실행)
    water: cards.filter(c => c.id.startsWith('c')).length,   // Cups (감정, 관계)
    air: cards.filter(c => c.id.startsWith('s')).length,     // Swords (생각, 갈등)
    earth: cards.filter(c => c.id.startsWith('p')).length,   // Pentacles (현실, 금전)
    spirit: cards.filter(c => c.id.startsWith('m')).length   // Major (운명, 정신)
  };

  let elementAnalysis = "";
  if (suits.spirit >= cardCount * 0.5) elementAnalysis = "현재 삶에서 매우 중대한 영적 전환점을 맞이하고 계시군요. ";
  else if (suits.fire > suits.water && suits.fire > suits.air) elementAnalysis = "지금은 생각보다 행동이 앞서는 에너지가 강합니다. 추진력이 좋은 시기네요. ";
  else if (suits.water > suits.fire && suits.water > suits.earth) elementAnalysis = "이성적인 판단보다는 감정적인 흐름에 몸을 맡기고 있는 상태입니다. ";
  else if (suits.air > suits.fire) elementAnalysis = "논리적이고 냉철한 분석이 앞서 있지만, 그만큼 스트레스와 고민이 깊어 보입니다. ";
  else if (suits.earth > suits.water) elementAnalysis = "매우 현실적이고 실질적인 결과물에 집중하고 계시는군요. ";

  // 3. 카드 간 시너지/콤비네이션 감지 (Card Combinations)
  const cardIds = cards.map(c => c.id);
  let synergyNarrative = "";
  if (cardIds.includes('m13') && cardIds.includes('m19')) synergyNarrative = "고통스러운 종결(Death) 뒤에 찬란한 부활(Sun)이 기다리는 '전화위복'의 강한 기운이 보입니다. ";
  if (cardIds.includes('m06') && cardIds.includes('m15')) synergyNarrative = "진실한 사랑(Lovers) 뒤에 숨은 집착이나 유혹(Devil)을 경계해야 하는 시기입니다. ";
  if (cardIds.includes('m10') && cardIds.includes('m00')) synergyNarrative = "운명의 수레바퀴가 돌기 시작했습니다. 아무런 두려움 없이 새로운 여정을 시작해도 좋습니다. ";

  // 4. 스프레드 위치학 (Positional Logic)
  const getPositionMeaning = (index, count) => {
    if (count === 1) return "핵심 조언";
    if (count === 2) return index === 0 ? "선택 A의 흐름" : "선택 B의 흐름";
    if (count === 3) return ["과거(원인)", "현재(진행)", "미래(결과)"][index];
    if (count === 5) return ["과거", "현재", "미래", "장애물", "최종 조언"][index];
    if (count === 7) return ["당신의 상태", "상대방의 마음", "두 사람의 관계", "과거의 영향", "숨겨진 변수", "가까운 미래", "최종 결론"][index];
    return `단계 ${index + 1}`;
  };

  // 5. 서사 조립
  const firstCard = cards[0];
  const lastCard = cards[cards.length - 1];
  
  let conclusion = isLight ? "가벼운 질문에 대한 타로의 직관적인 답입니다. " : `${elementAnalysis}${synergyNarrative}`;
  if (conclusion === "") conclusion = "카드들이 보여주는 오늘의 운명적 흐름을 정리해 드립니다. ";

  const evidence = cards.map((card, i) => {
    const pos = getPositionMeaning(i, cardCount);
    let meaning = card.summary;
    if (isCouple || isSolo) meaning = card.meanings.love;
    else if (isWorker || category === 'career') meaning = card.meanings.career;
    else if (category === 'finance') meaning = card.meanings.finance;

    return `[${pos}: ${card.nameKo}] (${card.keywords.slice(0,2).join(', ')}): ${meaning}`;
  });

  const action = [
    `[내면의 지혜] "${firstCard.meanings.advice.replace(/\.$/, '')}" 하는 마음가짐이 가장 중요합니다.`,
    `[실천적 지침] ${isWorker ? '업무적으로는' : (isCouple ? '관계에 있어서는' : '현실적으로는')} "${lastCard.meanings.advice.replace(/\.$/, '')}" 하는 방향을 추천합니다.`
  ];

  return { conclusion, evidence, action };
};
