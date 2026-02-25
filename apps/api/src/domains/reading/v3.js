// AI 리딩 엔진 V4.0 (Arcane Master - 정밀 분석 및 가변 서사 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  const cardCount = cards.length;
  
  // 1. 시간대별 페르소나 인사
  const hour = new Date().getHours();
  let timeGreeting = "";
  if (hour >= 5 && hour < 12) timeGreeting = "창가로 스며드는 새벽볕이 당신의 운명 위로 내려앉는 아침입니다.";
  else if (hour >= 12 && hour < 18) timeGreeting = "가장 밝은 태양이 당신의 숨겨진 길을 비추는 오후군요.";
  else timeGreeting = "고요한 밤의 장막이 내리고, 오직 당신의 별자리만이 반짝이는 시간입니다.";

  const personaIntro = `어서 오세요. 이곳은 기록되지 않은 운명들이 모이는 '아르카나 도서관'입니다. 사서인 제가 당신의 질문 "${question}"에 대한 답이 담긴 오래된 책 한 권을 꺼내 보았습니다.`;

  // 2. 상황 및 카테고리 인지
  const isRelationship = category === 'love' || ['그 사람', '속마음', '연애', '사랑', '재회'].some(k => question.includes(k));
  const isWorker = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어'].some(k => question.includes(k));
  const isLight = question.length < 10 || ['커피', '메뉴', '할까', '말까'].some(k => question.includes(k));
  const isModern = /[a-zA-Z]/.test(question) || ['메탈', '여신', '이직', '코인', '주식', '게임'].some(k => question.includes(k));

  // 3. 원소 밸런스 및 시너지
  const suits = {
    fire: cards.filter(c => c.id.startsWith('w')).length,
    water: cards.filter(c => c.id.startsWith('c')).length,
    air: cards.filter(c => c.id.startsWith('s')).length,
    earth: cards.filter(c => c.id.startsWith('p')).length,
    spirit: cards.filter(c => c.id.startsWith('m')).length
  };

  let elementTheme = "";
  if (suits.spirit >= cardCount * 0.5) elementTheme = "운명의 거대한 파도가 당신의 삶을 근본적으로 흔들고 있습니다.";
  else if (suits.water > suits.fire) elementTheme = "지금 당신의 마음은 깊은 호수처럼 감정의 물결이 잔잔히 일렁이고 있군요.";
  else if (suits.fire > suits.water) elementTheme = "무언가를 향한 뜨거운 열망이 당신의 발걸음을 재촉하고 있는 시기입니다.";
  else elementTheme = "현실적인 토대 위에서 신중하게 한 걸음을 내딛는 안정이 느껴집니다.";

  // 4. 예스노 판정 (V4: 판정 기준 확대)
  const getYesNoScore = (card) => {
    const id = card.id;
    // 강력 긍정 (1점)
    if (['m01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21', 'w01', 'w02', 'w03', 'w06', 'c01', 'c02', 'c03', 'c09', 'c10', 'p01', 'p03', 'p08', 'p09', 'p10'].includes(id)) return 1;
    // 강력 부정 (-1점)
    if (['m09', 'm12', 'm13', 'm15', 'm16', 'm18', 's03', 's05', 's08', 's09', 's10', 'w09', 'w10', 'c05', 'c08', 'p05'].includes(id)) return -1;
    return 0;
  };
  const totalScore = cards.reduce((acc, card) => acc + getYesNoScore(card), 0);
  const yesNoVerdict = totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE');

  // 5. 비유 뱅크 (Metaphor Bank)
  const metaphors = [
    { intro: "어두운 밤길을 비추는 등불", outro: "추운 겨울 끝에 찾아오는 따스한 봄볕" },
    { intro: "거친 바다 위를 항해하는 나침반", outro: "긴 가뭄 뒤에 내리는 단비" },
    { intro: "복잡한 미로 속에서 발견한 실타래", outro: "새벽 안개를 뚫고 솟아오르는 태양" },
    { intro: "무거운 짐을 내려놓는 휴식처", outro: "막혔던 물줄기가 시원하게 터지는 강물" },
    { intro: "오래된 지도가 가리키는 보물", outro: "단단한 껍질을 깨고 피어나는 새순" }
  ];
  const selectedMetaphor = metaphors[Math.floor(Math.random() * metaphors.length)];

  // 6. 유기적 서사 조립
  const firstCard = cards[0];
  const lastCard = cards[cards.length - 1];
  
  let bridge = "";
  if (firstCard.id.startsWith('s') && lastCard.id.startsWith('c')) bridge = "차가운 이성의 고민을 지나 마침내 따스한 감정의 항구에 도착하는 흐름입니다.";
  else if (firstCard.id.startsWith('w') && lastCard.id.startsWith('p')) bridge = "뜨거운 열정의 씨앗이 마침내 단단한 현실의 열매를 맺어가는 과정에 있습니다.";
  else if (firstCard.id.startsWith('m') && lastCard.id.startsWith('m')) bridge = "정신적인 성숙함이 또 다른 차원의 깨달음으로 이어지는 매우 강력한 변화의 시기입니다.";
  else bridge = `${firstCard.nameKo}의 에너지가 ${lastCard.nameKo}의 결과로 이어지는 유기적인 여정이 그려집니다.`;

  let conclusion = isLight ? `${timeGreeting} 가벼운 질문 속에 담긴 운명의 조각을 찾아보았습니다. ` : `${timeGreeting} ${personaIntro}\n\n${elementTheme} ${bridge}`;
  
  if (isModern && !isLight) {
    conclusion = `[분석 결과] ${timeGreeting} ${elementTheme} 현재 ${bridge} 이러한 흐름을 바탕으로 질문하신 내용에 대해 현실적인 관점에서 조언해 드릴게요.`;
  }

  if (['할까', '될까', '맞을까', '있을까', '있나요'].some(k => question.includes(k))) {
    const verdictKo = { YES: '긍정적인 기운이 강합니다(YES)', NO: '지금은 신중함이 필요한 때입니다(NO)', MAYBE: '안개 속처럼 상황을 더 지켜봐야 합니다(MAYBE)' }[yesNoVerdict];
    conclusion = `[판정: ${verdictKo}]\n\n${conclusion}`;
  }

  // 7. 시각적 카드 묘사 및 해설
  const evidence = cards.map((card, i) => {
    const pos = {
      1: ["핵심 조언"],
      2: ["선택 A", "선택 B"],
      3: ["과거의 풍경", "현재의 모습", "미래의 빛"],
      5: ["지나온 길", "지금의 마음", "다가올 시간", "숨겨진 난관", "마지막 열쇠"],
      7: ["당신의 초상", "그 사람의 속마음", "두 사람의 인연", "과거의 그림자", "뜻밖의 변수", "가까운 계절", "운명의 결론"],
      10: ["현재 상황", "장애물", "의식의 목표", "무의식의 뿌리", "지나온 과거", "다가올 미래", "나의 태도", "주변 환경", "희망과 공포", "최종 결과"],
      12: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
    }[cardCount]?.[i] || `여정의 ${i+1}단계`;

    const visualHint = card.description ? card.description.split('.')[1]?.trim() + "." : card.summary;
    
    let meaning = card.summary;
    if (isRelationship) meaning = card.meanings.love;
    else if (isWorker || category === 'career') meaning = card.meanings.career;
    else if (category === 'finance') meaning = card.meanings.finance;

    return `[${pos}: ${card.nameKo}]\n"${visualHint}"\n${meaning}`;
  });

  // 8. 감성적 비유 조언
  const action = [
    `[영혼의 조율] "${firstCard.meanings.advice.replace(/\.$/, '')}" 하는 태도는 마치 ${selectedMetaphor.intro}와 같습니다.`,
    `[운명의 실천] ${isRelationship ? '그 사람에게는' : '세상을 향해'} "${lastCard.meanings.advice.replace(/\.$/, '')}" 하는 마음으로 다가가 보세요. ${selectedMetaphor.outro}처럼 당신에게 평온이 깃들 것입니다.`
  ];

  return { conclusion, evidence, action, yesNoVerdict };
};
