// AI 리딩 엔진 V3.9 (Arcane Storyteller - 감성 서사 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  const cardCount = cards.length;
  
  // 1. 시간대별 페르소나 인사 (Atmospheric Greeting)
  const hour = new Date().getHours();
  let timeGreeting = "";
  if (hour >= 5 && hour < 12) timeGreeting = "창가로 스며드는 새벽볕이 당신의 운명 위로 내려앉는 아침입니다.";
  else if (hour >= 12 && hour < 18) timeGreeting = "가장 밝은 태양이 당신의 숨겨진 길을 비추는 오후군요.";
  else timeGreeting = "고요한 밤의 장막이 내리고, 오직 당신의 별자리만이 반짝이는 시간입니다.";

  const personaIntro = `어서 오세요. 이곳은 기록되지 않은 운명들이 모이는 '아르카나 도서관'입니다. 사서인 제가 당신의 질문 "${question}"에 대한 답이 담긴 오래된 책 한 권을 꺼내 보았습니다.`;

  // 2. 상황 및 카테고리 인지
  const isRelationship = category === 'love' || ['그 사람', '속마음', '연애', '사랑', '재회'].some(k => question.includes(k));
  const isWorker = ['이직', '회사', '상사', '퇴사', '연봉', '업무'].some(k => question.includes(k));
  const isLight = question.length < 10 || ['커피', '메뉴', '할까', '말까'].some(k => question.includes(k));

  // 3. 원소 밸런스 및 시너지 (기존 로직 유지 및 강화)
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

  // 4. 예스노 판정
  const getYesNoScore = (card) => {
    const id = card.id;
    if (['m19', 'm21', 'm03', 'm06', 'm10', 'm17', 'w01', 'w06', 'c01', 'c09', 'p01'].includes(id)) return 1;
    if (['m13', 'm15', 'm16', 'm18', 's03', 's05', 's08', 's09', 's10'].includes(id)) return -1;
    return 0;
  };
  const totalScore = cards.reduce((acc, card) => acc + getYesNoScore(card), 0);
  const yesNoVerdict = totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE');

  // 5. 유기적 서사 조립 (Narrative Flow)
  const firstCard = cards[0];
  const lastCard = cards[cards.length - 1];
  
  let bridge = "";
  if (firstCard.id.startsWith('s') && lastCard.id.startsWith('c')) bridge = "차가운 이성의 고민을 지나 마침내 따스한 감정의 항구에 도착하는 흐름입니다.";
  else if (firstCard.id.startsWith('w') && lastCard.id.startsWith('p')) bridge = "뜨거운 열정의 씨앗이 마침내 단단한 현실의 열매를 맺어가는 과정에 있습니다.";
  else bridge = `${firstCard.nameKo}의 에너지가 ${lastCard.nameKo}의 결과로 이어지는 유기적인 여정이 그려집니다.`;

  let conclusion = isLight ? `${timeGreeting} 가벼운 질문 속에 담긴 운명의 조각을 찾아보았습니다. ` : `${timeGreeting} ${personaIntro}\n\n${elementTheme} ${bridge}`;

  if (['할까', '될까', '맞을까', '있을까', '있나요'].some(k => question.includes(k))) {
    const verdictKo = { YES: '긍정적인 기운이 강합니다(YES)', NO: '지금은 신중함이 필요한 때입니다(NO)', MAYBE: '안개 속처럼 상황을 더 지켜봐야 합니다(MAYBE)' }[yesNoVerdict];
    conclusion = `[판정: ${verdictKo}]\n\n${conclusion}`;
  }

  // 6. 시각적 카드 묘사 및 해설
  const evidence = cards.map((card, i) => {
    const pos = {
      1: ["핵심 조언"],
      2: ["선택 A", "선택 B"],
      3: ["과거의 풍경", "현재의 모습", "미래의 빛"],
      5: ["지나온 길", "지금의 마음", "다가올 시간", "숨겨진 난관", "마지막 열쇠"],
      7: ["당신의 초상", "그 사람의 속마음", "두 사람의 인연", "과거의 그림자", "뜻밖의 변수", "가까운 계절", "운명의 결론"]
    }[cardCount]?.[i] || `여정의 ${i+1}단계`;

    // 이미지 묘사 (설명문에서 첫 문장 추출 혹은 요약)
    const visualHint = card.description ? card.description.split('.')[1]?.trim() + "." : card.summary;
    
    let meaning = card.summary;
    if (isRelationship) meaning = card.meanings.love;
    else if (isWorker) meaning = card.meanings.career;

    return `[${pos}: ${card.nameKo}]\n"${visualHint}"\n${meaning}`;
  });

  // 7. 감성적 비유 조언
  const action = [
    `[영혼의 조율] "${firstCard.meanings.advice.replace(/\.$/, '')}" 하는 태도는 마치 어두운 밤길을 비추는 등불과 같습니다.`,
    `[운명의 실천] ${isRelationship ? '그 사람에게는' : '세상을 향해'} "${lastCard.meanings.advice.replace(/\.$/, '')}" 하는 마음으로 다가가 보세요. 추운 겨울 끝에 찾아오는 따스한 봄볕처럼 당신에게 평온이 깃들 것입니다.`
  ];

  return { conclusion, evidence, action, yesNoVerdict };
};
