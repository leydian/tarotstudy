import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type Message = {
  role: 'user' | 'bot';
  text: string;
  cards?: any[];
  isAction?: boolean;
  yesNo?: 'YES' | 'NO' | 'MAYBE';
  isStudyLink?: boolean;
};

export function StudyReading() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '학습형 리딩 모드에 오신 것을 환영합니다. 여기서는 운명을 점치는 것을 넘어, 뽑힌 카드들의 깊은 상징을 직접 공부하고 내면의 지혜를 쌓을 수 있습니다. 어떤 주제로 학습을 시작해 볼까요?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCards, setSessionCards] = useState<any[]>([]);
  const [sessionReading, setSessionReading] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // 스프레드 결정 로직 (ChatReading과 동일하게 유지)
      let cardCount = 3;
      let spreadName = '지혜의 탐구(3-Card)';

      const yearlyKeywords = ['올해', '이번 년', '연간', '1년', '년도'];
      const celticKeywords = ['심층', '자세히', '켈틱', '정밀', '상세히', '깊게'];
      const relationshipKeywords = ['그 사람', '속마음', '연애', '사랑', '재회', '커플', '썸', '연인'];
      const careerKeywords = ['이직', '취업', '퇴사', '직장', '승진', '회사', '합격', '공부'];
      const choiceKeywords = ['vs', '또는', '중에서', '어떤게', '어느게', '아니면'];

      const hasChoice = (userMessage.match(/[가-힣]까/g) || []).length >= 2 || choiceKeywords.some(key => userMessage.includes(key));

      let category = 'general';
      if (relationshipKeywords.some(k => userMessage.includes(k))) category = 'love';
      else if (careerKeywords.some(k => userMessage.includes(k))) category = 'career';

      if (yearlyKeywords.some(k => userMessage.includes(k))) { cardCount = 12; spreadName = '연간 호로스코프(12-Card)'; }
      else if (celticKeywords.some(k => userMessage.includes(k))) { cardCount = 10; spreadName = '켈틱 크로스(10-Card)'; }
      else if (relationshipKeywords.some(k => userMessage.includes(k))) { cardCount = 7; spreadName = '관계의 거울(7-Card)'; }
      else if (careerKeywords.some(k => userMessage.includes(k))) { cardCount = 5; spreadName = '커리어 패스(5-Card)'; }
      else if (hasChoice) { cardCount = 2; spreadName = '양자택일(2-Card)'; }

      const allCardsRes = await fetch('/api/cards');
      const allCards = await allCardsRes.json();
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, cardCount);
      setSessionCards(selectedCards);

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardIds: selectedCards.map(c => c.id), 
          question: userMessage,
          timeframe: cardCount === 12 ? 'yearly' : 'daily',
          category: category
        })
      });
      
      const reading = await res.json();
      setSessionReading(reading);

      // 리딩 출력
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: `질문에 맞춰 [${spreadName}] 스프레드를 구성했습니다. 카드를 펼쳐보겠습니다.`, cards: selectedCards }]);
      }, 600);

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: reading.conclusion, yesNo: reading.yesNoVerdict }]);
      }, 1800);

      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: `💡 학습 포인트:\n오늘 뽑힌 ${cardCount}장의 카드는 당신의 운명에 중요한 메시지를 담고 있습니다. 각 카드가 이번 질문에서 어떤 역할을 했는지 더 깊이 공부해 보시겠습니까?`,
          isStudyLink: true
        }]);
      }, 3500);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '죄송합니다. 학습 시스템에 일시적인 장애가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  const startLearning = () => {
    setMessages(prev => [...prev, { role: 'bot', text: '탁월한 선택입니다! 이번 리딩에서 각 카드가 어떤 역할을 맡았는지, 그리고 그 자리가 상징하는 바가 무엇인지 상세히 분석해 드릴게요.' }]);
    
    // 위치별 상세 정의 (Position Role Definitions)
    const positionDefinitions: { [key: string]: string } = {
      "핵심 조언": "이 자리는 당신의 질문에 대한 가장 본질적이고 근원적인 답을 상징합니다.",
      "현재 상황": "지금 당신이 처한 현실적인 환경과 당신의 표면적인 상태를 보여줍니다.",
      "다가올 변화": "머지않아 당신에게 찾아올 새로운 사건이나 에너지의 흐름을 의미합니다.",
      "과거의 풍경": "이 질문이 시작된 원인, 배경, 그리고 당신이 지나온 길을 상징합니다.",
      "현재의 모습": "지금 당신의 마음가짐과 현실에서 가장 크게 작용하고 있는 힘을 뜻합니다.",
      "미래의 빛": "현재의 흐름이 이어졌을 때 도달하게 될 최종 결과와 운명의 방향입니다.",
      "지나온 길": "당신이 겪어온 과거의 경험과 그로 인해 축적된 내면의 에너지를 의미합니다.",
      "지금의 마음": "현재 당신의 무의식 속에 자리 잡은 감정과 생각의 핵심입니다.",
      "다가올 시간": "가까운 미래에 당신이 맞이하게 될 구체적인 사건과 기회를 상징합니다.",
      "숨겨진 난관": "당신이 인지하지 못하고 있거나 주의해야 할 잠재적인 장애물을 경고합니다.",
      "마지막 열쇠": "문제를 해결하거나 목표를 달성하기 위해 필요한 최종적인 깨달음입니다.",
      "선택 A의 길": "첫 번째 선택지를 택했을 때 펼쳐질 미래의 시나리오와 기운을 보여줍니다.",
      "선택 B의 길": "두 번째 선택지를 택했을 때 마주하게 될 상황과 결과의 흐름입니다.",
      "당신의 초상": "질문자인 당신 자신의 현재 에너지와 사회적인 위치를 상징합니다.",
      "그 사람의 속마음": "상대방이 겉으로 드러내지 않는 진심과 감정의 깊이를 의미합니다.",
      "두 사람의 인연": "현재 두 사람 사이에 흐르는 인연의 끈과 관계의 성격을 뜻합니다.",
      "과거의 그림자": "관계에 영향을 미치고 있는 과거의 사건이나 트라우마를 보여줍니다.",
      "뜻밖의 변수": "전혀 예상하지 못했던 외부의 개입이나 환경의 변화를 상징합니다.",
      "가까운 계절": "조만간 당신에게 다가올 구체적인 타이밍과 환경의 변화입니다.",
      "운명의 결론": "모든 요소를 종합했을 때 도출되는 이 질문의 최종적인 마침표입니다."
    };

    sessionCards.forEach((card, i) => {
      setTimeout(() => {
        const originalInterpretation = sessionReading?.evidence[i] || '';
        // " [위치명: 카드명] " 형태에서 위치명 추출
        const posMatch = originalInterpretation.match(/\[(.+):/);
        const posLabel = posMatch ? posMatch[1].trim() : "여정의 단계";
        const posDesc = positionDefinitions[posLabel] || "이 위치는 당신의 운명 여정에서 중요한 전환점을 의미합니다.";

        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: `[학습: ${card.nameKo}]\n\n◈ 이 위치의 역할: ${posLabel}\n☞ ${posDesc}\n\n◈ 이번 질문에서의 구체적 해석:\n${originalInterpretation}\n\n◈ 카드의 고유 상징 분석:\n${card.symbolism || '준비 중인 데이터입니다.'}\n\n◈ 상세 설명 및 조언:\n${card.description}\n\n◈ 핵심 키워드: ${card.keywords.join(', ')}`
        }]);
      }, 1000 * (i + 1));
    });
  };

  return (
    <div className="study-reading-page" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ 
              padding: '1.2rem 1.8rem', 
              borderRadius: '20px', 
              backgroundColor: msg.role === 'user' ? 'var(--accent-gold)' : '#1e1e1e',
              color: msg.role === 'user' ? 'var(--bg-color)' : 'white',
              border: msg.role === 'user' ? 'none' : '1px solid #333',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.7',
              boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              {msg.yesNo && (
                <div style={{ position: 'absolute', top: '-10px', right: '15px', backgroundColor: msg.yesNo === 'YES' ? '#2f9e44' : (msg.yesNo === 'NO' ? '#e03131' : '#f08c00'), color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{msg.yesNo}</div>
              )}
              {msg.text}

              {msg.isStudyLink && (
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                  <button onClick={startLearning} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'var(--accent-gold)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>네, 깊이 배우고 싶어요</button>
                  <button onClick={() => navigate('/cards')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>카드 도서관으로 가기</button>
                </div>
              )}
            </div>

            {msg.cards && (
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {msg.cards.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} style={{ width: '90px', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/cards?id=${c.id}`)}>
                    <img src={c.image} alt={c.nameKo} style={{ width: '100%', borderRadius: '8px', border: '2px solid var(--accent-gold)' }} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '0.3rem', fontWeight: 'bold' }}>{c.nameKo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '2rem 0', display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="오늘의 운명에서 배울 점을 찾아볼까요?"
          style={{ flex: 1, padding: '1.2rem', borderRadius: '12px', backgroundColor: '#121212', border: '1px solid #333', color: 'white', fontSize: '1rem' }}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: '0 2.5rem', backgroundColor: 'var(--accent-gold)', color: 'var(--bg-color)', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? '...' : '배움 시작'}</button>
      </form>
    </div>
  );
}
