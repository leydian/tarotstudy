// AI 리딩 엔진 V5.2 (Context-Aware - 상황 인지 및 객체 합성 버전)
export const generateReadingV3 = (cards, question, timeframe = 'daily', category = 'general') => {
  if (!cards || cards.length === 0) return null;

  const cardCount = cards.length;
  
  // 1. 질문 상황 및 객체 분석 (NLP-lite)
  const extractEntities = (q) => {
    // 1단계: 'A 아니면 B', 'A vs B' 패턴 처리
    const splitRegex = /(.+?)\s*(?:아니면|vs|또는|혹은)\s*(.+?)(?:\?|$)/;
    const splitMatch = q.match(splitRegex);
    if (splitMatch) return [splitMatch[1].trim(), splitMatch[2].trim()];

    // 2단계: 'A 할까 B 할까' 패턴 처리 (동사형)
    const verbs = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '될까'];
    const verbPattern = verbs.join('|');
    const binaryRegex = new RegExp(`(.+?)\\s*(?:${verbPattern})\\s*(.+?)(?:${verbPattern})(?:\\?|$)`);
    const match = q.match(binaryRegex);
    
    if (match) {
      // "걸어갈 때 버스 탈까 걸어갈까" 에서 앞부분의 '걸어갈 때' 같은 컨텍스트를 제거하고 
      // 순수하게 '버스'와 '걸어' 만을 추출하기 위해 공백으로 자름
      const a = match[1].split(' ').pop().trim();
      const b = match[2].trim();
      return [a, b];
    }
    return null;
  };

  const entities = extractEntities(question);
  const isBinary = !!entities && cardCount === 2;

  // 질문 무게(Gravity) 감지: 일상적인 단어가 포함되거나 짧으면 'Light'
  const lightKeywords = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];
  const isLight = question.length < 15 && lightKeywords.some(k => question.includes(k));

  // 2. 시간대별 및 감정 인지 기반 페르소나 설정
  const hour = new Date().getHours();
  let timeGreeting = "";
  if (hour >= 5 && hour < 12) timeGreeting = "창가로 스며드는 새벽볕이 당신의 운명 위로 내려앉는 아침입니다.";
  else if (hour >= 12 && hour < 18) timeGreeting = "가장 밝은 태양이 당신의 숨겨진 길을 비추는 오후군요.";
  else timeGreeting = "고요한 밤의 장막이 내리고, 오직 당신의 별자리만이 반짝이는 시간입니다.";

  // 사용자 감정 인지
  const isSad = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'].some(k => question.includes(k));
  
  let personaIntro = isLight 
    ? "어서 오세요. 가벼운 고민이라도 아르카나 도서관은 언제나 열려 있답니다. 당신의 질문에 카드가 어떤 다정한 힌트를 주는지 읽어드릴게요."
    : `어서 오세요. 이곳은 기록되지 않은 운명들이 모이는 '아르카나 도서관'입니다. 사서인 제가 당신의 질문 "${question}"에 대한 답이 담긴 오래된 책 한 권을 꺼내 보았습니다.`;

  if (isSad) {
    personaIntro = "마음이 많이 무거우셨군요. 괜찮습니다. 이곳 '아르카나 도서관'에서는 당신의 어떤 아픔도 온전히 들어드릴게요. 사서인 제가 당신을 위로할 가장 따뜻한 책 한 권을 꺼내 보았습니다.";
  }

  // 3. 카테고리 분석
  const isRelationship = category === 'love' || ['그 사람', '속마음', '연애', '사랑', '재회', '결혼', '썸', '이별', '연락'].some(k => question.includes(k));
  const isWorker = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'].some(k => question.includes(k));
  const isFinance = category === 'finance' || ['돈', '주식', '코인', '투자', '매수', '매도', '로또', '적금', '대출', '청약', '부동산'].some(k => question.includes(k));
  const isStudy = ['시험', '합격', '공부', '성적', '수능', '학점', '자격증', '면접', '학교', '대학'].some(k => question.includes(k));
  const isTiming = ['언제', '몇월', '시기', '날짜', '기간', '며칠'].some(k => question.includes(k));

  // 4. 원소 밸런스 및 시너지
  const suits = {
    fire: cards.filter(c => c.id.startsWith('w')).length,
    water: cards.filter(c => c.id.startsWith('c')).length,
    air: cards.filter(c => c.id.startsWith('s')).length,
    earth: cards.filter(c => c.id.startsWith('p')).length,
    spirit: cards.filter(c => c.id.startsWith('m')).length
  };

  let elementTheme = "";
  if (suits.spirit >= cardCount * 0.5) elementTheme = isLight ? "오늘은 운명의 직관이 강하게 작용하는 날이네요." : "운명의 거대한 파도가 당신의 삶을 근본적으로 흔들고 있습니다.";
  else if (suits.water > suits.fire) elementTheme = "지금 당신의 마음은 깊은 호수처럼 감정의 물결이 잔잔히 일렁이고 있군요.";
  else if (suits.fire > suits.water) elementTheme = "무언가를 향한 뜨거운 열망이 당신의 발걸음을 재촉하고 있는 시기입니다.";
  else elementTheme = "현실적인 토대 위에서 신중하게 한 걸음을 내딛는 안정이 느껴집니다.";

  // 5. 예스노 점수 판정
  const getYesNoScore = (card) => {
    const id = card.id;
    if (['m01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21', 'w01', 'w02', 'w03', 'w04', 'w06', 'c01', 'c02', 'c03', 'c09', 'c10', 'p01', 'p03', 'p08', 'p09', 'p10'].includes(id)) return 1;
    if (['m09', 'm12', 'm13', 'm15', 'm16', 'm18', 's03', 's05', 's08', 's09', 's10', 'w09', 'w10', 'c05', 'c08', 'p05'].includes(id)) return -1;
    return 0;
  };
  
  const totalScore = cards.reduce((acc, card) => acc + getYesNoScore(card), 0);
  const yesNoVerdict = totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE');

  let verdictKo = "";
  if (isBinary) {
    const scoreA = getYesNoScore(cards[0]);
    const scoreB = getYesNoScore(cards[1]);
    if (scoreA > scoreB) verdictKo = `기운을 보니 첫 번째 선택지인 [${entities[0]}] 쪽이 더 즐겁고 긍정적인 흐름이 될 것 같아요`;
    else if (scoreB > scoreA) verdictKo = `기운을 보니 두 번째 선택지인 [${entities[1]}] 쪽이 당신에게 더 좋은 결과나 편안함을 줄 것 같네요`;
    else verdictKo = "두 가지 길 모두 비슷한 기운을 가지고 있어서, 당신의 마음이 조금 더 끌리는 쪽을 골라도 괜찮아요";
  } else {
    verdictKo = { YES: '긍정적인 기운이 강합니다(YES)', NO: '지금은 신중함이 필요한 때입니다(NO)', MAYBE: '안개 속처럼 상황을 더 지켜봐야 합니다(MAYBE)' }[yesNoVerdict];
  }

  // 6. 비유 및 서사 조립
  const getMetaphor = (card) => {
    const suitMetaphors = {
      'w': { intro: "거친 바다 위를 항해하는 나침반", outro: "긴 가뭄 뒤에 내리는 단비" },
      'c': { intro: "무거운 짐을 내려놓는 휴식처", outro: "막혔던 물줄기가 시원하게 터지는 강물" },
      's': { intro: "복잡한 미로 속에서 발견한 실타래", outro: "새벽 안개를 뚫고 솟아오르는 태양" },
      'p': { intro: "오래된 지도가 가리키는 보물", outro: "단단한 껍질을 깨고 피어나는 새순" },
      'm': { intro: "어두운 밤길을 비추는 등불", outro: "추운 겨울 끝에 찾아오는 따스한 봄볕" },
    };
    return suitMetaphors[card.id[0]] || { intro: "어두운 밤길을 비추는 등불", outro: "따스한 봄볕" };
  };

  const selectedMetaphor = getMetaphor(cards[0]);
  let bridge = `${cards[0].nameKo}에서 시작된 이 기운이 ${cards[cards.length - 1].nameKo}의 결실로 향하며, 당신의 질문에 대한 답을 완성해가고 있습니다.`;

  let introduction = `${timeGreeting} ${personaIntro}\n\n${elementTheme} ${bridge}`;

  const getJosa = (text, type) => {
    const lastChar = text.charCodeAt(text.length - 1);
    const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
    if (type === 'wa') return hasBatchim ? '과' : '와';
    if (type === 'reul') return hasBatchim ? '을' : '를';
    if (type === 'eun') return hasBatchim ? '은' : '는';
    return '';
  };

  const smoothConnect = (text) => text ? text.replace(/입니다$/, '임을 보여주며').replace(/것입니다$/, '것을 의미하며').replace(/\.$/, '') : "";

  // 7. 서사 생성 (Context Mapping)
  let narrativeFlow = [];
  cards.forEach((c, i) => {
    const coreSummary = smoothConnect(c.summary || "");
    const adviceText = c.meanings.advice.replace(/\.$/, '');
    
    let posIntro = "";
    let contextSentence = "";
    
    if (isBinary) {
      const entity = entities[i];
      posIntro = i === 0 
        ? `먼저 당신이 고민 중인 **[${entity}]**의 길을 살펴보니 **[${c.nameKo}]** 카드가 그 풍경을 보여주네요.`
        : `반면, 다른 선택지인 **[${entity}]**의 자리에는 **[${c.nameKo}]** 카드가 놓여 있습니다.`;
      
      if (isLight) {
        const lightMeaning = (c.id.startsWith('s')) ? "이성적인 판단이 필요한 이동" : (c.id.startsWith('c') ? "마음이 편안해지는 선택" : "현실적인 효율을 따지는 길");
        contextSentence = `지금 고민 중인 [${entity}]${getJosa(entity, 'reul')} 선택한다면, 이 카드는 ${lightMeaning}이 될 것이라고 말하고 있어요.`;
      }
    } else {
      const positionName = c.positionLabel || `운명의 ${i+1}단계`;
      if (i === 0) posIntro = `가장 먼저 당신의 ${positionName}${getJosa(positionName, 'reul')} 보여주는 자리에 **[${c.nameKo}]** 카드가 나타났습니다.`;
      else if (i === cards.length - 1) posIntro = `마지막으로 이 모든 흐름이 귀결되는 **[${positionName}]**의 자리에는 **[${c.nameKo}]** 카드가 기다리고 있네요.`;
      else posIntro = `이어서 당신의 **[${positionName}]**이 머무는 자리를 살펴보니 **[${c.nameKo}]** 카드가 놓여 있습니다.`;
    }

    const paragraph = `${posIntro} 이 카드는 ${coreSummary}. ${contextSentence} 무엇보다 "**${adviceText}**"라는 사서의 조언을 참고해 보세요.`;
    narrativeFlow.push(paragraph);
  });

  const narrative = narrativeFlow.join('\n\n');
  const finalSummary = `\n\n[종합 분석] 사서인 제가 읽어낸 이번 리딩의 결론입니다. 질문하신 "${question}"에 대하여, ${verdictKo}. 카드가 전해준 힌트들을 나침반 삼아 당신에게 가장 기분 좋은 선택을 하시길 바랍니다.`;

  const conclusion = `${introduction}\n\n[운명의 서사 분석]\n${narrative}${finalSummary}`;

  // 8. 카드별 증거 (evidence)
  const evidence = cards.map((card, i) => {
    const posLabel = isBinary ? `선택: ${entities[i]}` : (card.positionLabel || `단계 ${i+1}`);
    const visualDesc = card.description ? card.description.split('\n\n')[0] : card.summary;
    let meaning = card.summary;
    if (isRelationship) meaning = card.meanings.love;
    else if (isWorker) meaning = card.meanings.career;
    else if (isFinance) meaning = card.meanings.finance;

    return `[${posLabel}: ${card.nameKo}]\n\n이 카드의 그림을 가만히 들여다보세요. "${visualDesc}"\n\n이러한 카드의 모습은 현재 당신의 상황에서 다음과 같은 의미를 갖습니다. ${meaning}\n\n사서로서 조언을 드리자면, ${card.meanings.advice}`;
  });

  // 9. 최종 지침 (action)
  const action = isBinary ? [
    `[${entities[0]}의 길] "${cards[0].meanings.advice.replace(/\.$/, '')}" 하는 마음이 이 선택을 더 빛나게 할 것입니다.`,
    `[${entities[1]}의 길] "${cards[1].meanings.advice.replace(/\.$/, '')}" 하는 태도가 당신을 더 편안하게 안내할 것입니다.`
  ] : [
    `[영혼의 조율] ${cards[0].meanings.advice.replace(/\.$/, '')} 하여, 이 흐름이 마치 ${selectedMetaphor.intro}처럼 당신의 앞길을 밝혀줄 것입니다.`,
    `[운명의 실천] ${cards[cards.length - 1].meanings.advice.replace(/\.$/, '')} 한다면, 마치 ${selectedMetaphor.outro}처럼 당신의 삶에 새로운 변화가 찾아올 것입니다.`
  ];

  if (isSad) action.push(`[사서의 위로] 지금은 모든 것이 막막해 보일 수 있지만, 비가 온 뒤에 땅이 굳어지듯 이 시련 또한 당신을 더 단단하게 만들어 줄 거예요. 당신은 혼자가 아닙니다.`);

  return { conclusion, evidence, action, yesNoVerdict: totalScore > 0 ? 'YES' : (totalScore < 0 ? 'NO' : 'MAYBE') };
};
