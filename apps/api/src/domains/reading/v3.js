// AI 리딩 엔진 V3의 기초 구조 (Mock)
// 실제 환경에서는 외부 LLM(OpenAI 등)과 연동하여 동적으로 생성됩니다.
export const generateReadingV3 = (cards, question) => {
  const cardNames = cards.map(c => c.nameKo).join(', ');
  
  return {
    conclusion: `당신의 질문 "${question}"에 대해, 뽑힌 카드(${cardNames})들은 긍정적인 변화와 인내의 필요성을 말하고 있습니다.`,
    evidence: cards.map(card => {
      return `[${card.nameKo}] 카드는 '${card.keywords.join(', ')}'를 상징하며, 이는 현재 상황에서 매우 중요한 열쇠가 됩니다. ${card.summary}`;
    }),
    action: [
      "지금은 섣부른 행동보다 상황을 관망하며 내면의 목소리에 귀를 기울이세요.",
      "가까운 시일 내에 새로운 기회가 다가올 것이니, 열린 마음을 유지하는 것이 좋습니다."
    ]
  };
};
