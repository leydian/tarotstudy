// AI 리딩 엔진 V5.0 (Omniscient Master - 전방위 컨텍스트 인지 및 공감 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  const cardCount = cards.length;
  
  // 1. 시간대별 및 감정 인지 기반 페르소나 인사
  const hour = new Date().getHours();
  let timeGreeting = "";
  if (hour >= 5 && hour < 12) timeGreeting = "창가로 스며드는 새벽볕이 당신의 운명 위로 내려앉는 아침입니다.";
  else if (hour >= 12 && hour < 18) timeGreeting = "가장 밝은 태양이 당신의 숨겨진 길을 비추는 오후군요.";
  else timeGreeting = "고요한 밤의 장막이 내리고, 오직 당신의 별자리만이 반짝이는 시간입니다.";

  // 사용자 감정 인지
  const isSad = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'].some(k => question.includes(k));
  
  let personaIntro = `어서 오세요. 이곳은 기록되지 않은 운명들이 모이는 '아르카나 도서관'입니다. 사서인 제가 당신의 질문 "${question}"에 대한 답이 담긴 오래된 책 한 권을 꺼내 보았습니다.`;
  if (isSad) {
    personaIntro = `마음이 많이 무거우셨군요. 괜찮습니다. 이곳 '아르카나 도서관'에서는 당신의 어떤 아픔도 온전히 들어드릴게요. 사서인 제가 당신을 위로할 가장 따뜻한 책 한 권을 꺼내 보았습니다.`;
  }

  // 2. 카테고리 초정밀 인지 (확장)
  const isRelationship = category === 'love' || ['그 사람', '속마음', '연애', '사랑', '재회', '결혼', '썸', '이별', '연락'].some(k => question.includes(k));
  const isWorker = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'].some(k => question.includes(k));
  const isFinance = category === 'finance' || ['돈', '주식', '코인', '투자', '매수', '매도', '로또', '적금', '대출', '청약', '부동산'].some(k => question.includes(k));
  const isStudy = ['시험', '합격', '공부', '성적', '수능', '학점', '자격증', '면접', '학교', '대학'].some(k => question.includes(k));
  const isHealth = ['건강', '수술', '병원', '다이어트', '체력', '회복', '질병', '아파', '치료'].some(k => question.includes(k));
  
  const isTiming = ['언제', '몇월', '시기', '날짜', '기간', '며칠'].some(k => question.includes(k));
  const isLight = question.length < 10 || ['커피', '메뉴', '할까', '말까', '점심', '저녁', '야식'].some(k => question.includes(k));
  const isModern = /[a-zA-Z]/.test(question) || ['코인', '가챠', '덕질', '티켓팅', '게임', '앱', '개발'].some(k => question.includes(k));

  // 양자택일 감지 강화: "A 할까 B 할까", "갈까 말까", "A 아니면 B" 등 패턴 매칭
  const binaryPattern = /(.+)(할까|갈까|마실까|먹을까|될까).+\1?\2/;
  const isBinary = binaryPattern.test(question) || question.includes(' 아니면 ') || question.includes(' vs ');
  const isMultiChoice = (question.includes('중') && (question.includes('어디') || question.includes('누구') || question.includes('무엇'))) || question.split(',').length > 1;

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

  // 4. 예스노 및 시기/순위 판정 (V5: 판정 기준 고도화)
  const getYesNoScore = (card) => {
    const id = card.id;
    if (['m01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21', 'w01', 'w02', 'w03', 'w04', 'w06', 'c01', 'c02', 'c03', 'c09', 'c10', 'p01', 'p03', 'p08', 'p09', 'p10'].includes(id)) return 1;
    if (['m09', 'm12', 'm13', 'm15', 'm16', 'm18', 's03', 's05', 's08', 's09', 's10', 'w09', 'w10', 'c05', 'c08', 'p05'].includes(id)) return -1;
    return 0;
  };
  
  const totalScore = cards.reduce((acc, card) => acc + getYesNoScore(card), 0);
  const yesNoVerdict = totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE');

  let verdictKo = "";
  if (isMultiChoice && cardCount >= 2) {
    const scoredCards = cards.map((c, i) => ({ index: i, score: getYesNoScore(c) }));
    scoredCards.sort((a, b) => b.score - a.score); // 내림차순 정렬
    if (scoredCards[0].score === scoredCards[1].score) {
      verdictKo = "우열을 가리기 힘들 정도로 여러 선택지들이 비슷한 기운을 띠고 있습니다. 당신의 직관을 믿어야 할 때입니다.";
    } else {
      verdictKo = `제시된 선택지들 중 [${scoredCards[0].index + 1}번째 선택지]가 가장 강력하고 긍정적인 운기를 띠고 있습니다.`;
    }
  } else if (isBinary && cardCount === 2) {
    const scoreA = getYesNoScore(cards[0]);
    const scoreB = getYesNoScore(cards[1]);
    if (scoreA > scoreB) verdictKo = "첫 번째 선택지(A)가 더 긍정적으로 보입니다";
    else if (scoreB > scoreA) verdictKo = "두 번째 선택지(B)가 더 긍정적으로 보입니다";
    else verdictKo = "두 선택지 모두 비슷한 기운을 가지고 있네요";
  } else if (isTiming) {
    const fc = cards[0].id[0];
    if (fc === 'w') verdictKo = "지팡이의 빠른 에너지로 보아, 생각보다 이른 시일(수일~수주 내) 또는 다가오는 봄에 명확한 소식이 있을 것입니다.";
    else if (fc === 's') verdictKo = "검의 예리한 에너지로 보아, 상황이 정리되는 몇 주 안, 혹은 가을 무렵에 윤곽이 드러날 것입니다.";
    else if (fc === 'c') verdictKo = "컵의 부드러운 에너지로 보아, 감정이 무르익는 몇 달 안, 혹은 여름쯤에 좋은 결과가 기대됩니다.";
    else if (fc === 'p') verdictKo = "펜타클의 신중한 에너지로 보아, 1년 정도의 긴 시간 혹은 겨울이 되어서야 확실한 결실을 맺을 것입니다.";
    else verdictKo = "메이저 아르카나의 거대한 흐름입니다. 운명적인 시기가 곧 자연스럽게 찾아올 것입니다.";
  } else {
    verdictKo = { YES: '긍정적인 기운이 강합니다(YES)', NO: '지금은 신중함이 필요한 때입니다(NO)', MAYBE: '안개 속처럼 상황을 더 지켜봐야 합니다(MAYBE)' }[yesNoVerdict];
  }

  // 5. 비유 뱅크
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

  let conclusion = isLight ? `${timeGreeting} 가벼운 질문 속에 담긴 운명의 조각을 찾아보았습니다.` : `${timeGreeting} ${personaIntro}\n\n${elementTheme} ${bridge}`;
  
  if (isModern && !isLight) {
    conclusion = `[분석 결과] ${timeGreeting} ${elementTheme} 현재 ${bridge} 이러한 흐름을 바탕으로, 현대적인 관점에서 조언을 드릴게요.`;
  }

  // 결론에 판정 결과 항상 병합 (Master V5.1)
  conclusion = `${conclusion}\n\n[운명의 나침반] ${verdictKo}`;

  // 7. 시각적 카드 묘사 및 해설 (스마트 컨텍스트 변환 적용)
  const evidence = cards.map((card, i) => {
    let posLabel = "";
    if (isMultiChoice) {
      posLabel = `선택지 ${i + 1}`;
    } else if (isBinary && cardCount === 2) {
      posLabel = i === 0 ? "선택 A의 길" : "선택 B의 길";
    } else {
      posLabel = {
        1: ["핵심 조언"],
        2: ["현재 상황", "다가올 변화"],
        3: ["과거의 풍경", "현재의 모습", "미래의 빛"],
        5: ["지나온 길", "지금의 마음", "다가올 시간", "숨겨진 난관", "마지막 열쇠"],
        7: ["당신의 초상", "그 사람의 속마음", "두 사람의 인연", "과거의 그림자", "뜻밖의 변수", "가까운 계절", "운명의 결론"],
        10: ["현재 상황", "장애물", "의식의 목표", "무의식의 뿌리", "지나온 과거", "다가올 미래", "나의 태도", "주변 환경", "희망과 공포", "최종 결과"],
        12: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
      }[cardCount]?.[i] || `여정의 ${i+1}단계`;
    }

    const visualHint = card.description ? card.description.split('.')[1]?.trim() + "." : card.summary;
    
    let meaning = card.summary;
    if (isRelationship) meaning = card.meanings.love;
    else if (isFinance) meaning = card.meanings.finance;
    else if (isStudy) {
      // 직장/커리어 데이터를 학업 데이터로 스마트 치환
      meaning = `[학업/시험] ` + (card.meanings.career 
        ? card.meanings.career.replace(/직장|업무|프로젝트|사업/g, '학업').replace(/동료|상사/g, '학우/교수님').replace(/취업/g, '합격').replace(/승진/g, '성적 향상')
        : card.summary);
    } else if (isHealth) {
      // 기본 요약을 건강 맥락으로 포장
      meaning = `[건강/심리] ` + card.summary + ` 이 시기에는 무리하지 말고 내면과 신체의 소리에 귀 기울이는 것이 좋습니다.`;
    } else if (isWorker || category === 'career') {
      meaning = card.meanings.career;
    }

    return `[${posLabel}: ${card.nameKo}]\n"${visualHint}"\n${meaning}`;
  });

  // 8. 감성적 비유 조언
  let action = [];
  if (isMultiChoice) {
    action = [`[영혼의 조율] 너무 많은 생각은 오히려 시야를 흐리게 합니다. 카드가 가리키는 방향을 참고하되, 결국 ${selectedMetaphor.intro}처럼 당신의 가장 깊은 곳에 있는 직관을 따르세요.`];
  } else if (isBinary && cardCount === 2) {
    action = [
      `[선택 A의 길] "${cards[0].meanings.advice.replace(/\.$/, '')}" 하는 방향은 당신에게 ${selectedMetaphor.intro}와 같은 흐름을 가져다줄 것입니다.`,
      `[선택 B의 길] "${cards[1].meanings.advice.replace(/\.$/, '')}" 하는 선택은 마치 ${selectedMetaphor.outro}처럼 당신을 평온하게 안내할 것입니다.`
    ];
  } else {
    action = [
      `[영혼의 조율] "${firstCard.meanings.advice.replace(/\.$/, '')}" 하는 태도는 마치 ${selectedMetaphor.intro}와 같습니다.`,
      `[운명의 실천] ${isRelationship ? '그 사람에게는' : '세상을 향해'} "${lastCard.meanings.advice.replace(/\.$/, '')}" 하는 마음으로 다가가 보세요. ${selectedMetaphor.outro}처럼 당신에게 평온이 깃들 것입니다.`
    ];
  }

  // 위로가 필요한 경우 특별 조언 추가
  if (isSad) {
    action.push(`[사서의 위로] 지금은 모든 것이 막막해 보일 수 있지만, 비가 온 뒤에 땅이 굳어지듯 이 시련 또한 당신을 더 단단하게 만들어 줄 거예요. 당신은 혼자가 아닙니다.`);
  }

  return { conclusion, evidence, action, yesNoVerdict: totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE') };
};