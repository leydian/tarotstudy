import React, { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'bot';
  text: string;
  cards?: any[];
  isAction?: boolean;
};

export function ChatReading() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '어서오세요. 신비로운 타로의 세계에 오신 것을 환영합니다. 오늘 당신의 영혼은 어떤 답을 찾고 계신가요?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // 1. 질문 의도 분석 및 스프레드 결정
      let cardCount = 3;
      let spreadName = '운명의 실타래(3-Card)';

      const yearlyKeywords = ['올해', '이번 년', '연간', '1년', '년도'];
      const celticKeywords = ['심층', '자세히', '켈틱', '정밀', '상세히', '깊게'];
      const monthlyKeywords = ['이번 달', '월별', '한 달'];
      const relationshipKeywords = ['그 사람', '속마음', '연애', '사랑', '재회', '커플', '썸', '연인'];
      const careerKeywords = ['이직', '취업', '퇴사', '직장', '승진', '회사', '합격', '공부'];
      const horseshoeKeywords = ['흐름', '앞으로', '전체적인', '말편자', '전망'];
      const choiceKeywords = ['vs', '또는', '중에서', '어떤게', '어느게', '아니면'];
      const lightKeywords = ['커피', '점심', '메뉴', '할까', '말까', '먹을까', '살까'];

      const hasChoice = (userMessage.match(/[가-힣]까/g) || []).length >= 2 || 
                        (userMessage.match(/\?/g) || []).length >= 2 ||
                        choiceKeywords.some(key => userMessage.includes(key));

      let category = 'general';
      if (relationshipKeywords.some(k => userMessage.includes(k))) category = 'love';
      else if (careerKeywords.some(k => userMessage.includes(k))) category = 'career';
      else if (userMessage.includes('돈') || userMessage.includes('금전') || userMessage.includes('재물') || userMessage.includes('부자')) category = 'finance';

      if (yearlyKeywords.some(k => userMessage.includes(k))) {
        cardCount = 12;
        spreadName = '연간 호로스코프(12-Card)';
      } else if (celticKeywords.some(k => userMessage.includes(k))) {
        cardCount = 10;
        spreadName = '켈틱 크로스(10-Card)';
      } else if (relationshipKeywords.some(k => userMessage.includes(k))) {
        cardCount = 7;
        spreadName = '관계의 거울(7-Card)';
      } else if (careerKeywords.some(k => userMessage.includes(k))) {
        cardCount = 5;
        spreadName = '커리어 패스(5-Card)';
      } else if (horseshoeKeywords.some(k => userMessage.includes(k))) {
        cardCount = 7;
        spreadName = '행운의 말편자(7-Card)';
      } else if (monthlyKeywords.some(k => userMessage.includes(k))) {
        cardCount = 5;
        spreadName = '월별 펜타(5-Card)';
      } else if (hasChoice) {
        cardCount = 2;
        spreadName = '양자택일(2-Card)';
      } else if (userMessage.length < 10 || lightKeywords.some(k => userMessage.includes(k))) {
        cardCount = 1;
        spreadName = '마스터의 직관(1-Card)';
      }

      const allCardsRes = await fetch('/api/cards');
      const allCards = await allCardsRes.json();
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, cardCount);

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardIds: selectedCards.map(c => c.id), 
          question: userMessage,
          timeframe: cardCount === 12 ? 'yearly' : (cardCount === 5 ? 'monthly' : 'daily'),
          category: category
        })
      });
      
      if (!res.ok) throw new Error('API Error');
      const reading = await res.json();

      // 2. 봇의 답변 단계적 출력
      setTimeout(() => {
        let introText = `흐음... 당신의 질문을 위해 [${spreadName}] 스프레드를 준비했습니다. 운명의 지도가 펼쳐지고 있습니다.`;
        if (cardCount === 1) introText = `가벼운 고민이시군요. [${selectedCards[0].nameKo}] 카드를 하나 뽑아보았습니다.`;
        
        setMessages(prev => [...prev, { role: 'bot', text: introText, cards: selectedCards }]);
      }, 600);

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: reading.conclusion }]);
      }, 1800);

      if (cardCount > 1) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'bot', 
            text: `구체적인 분석입니다.\n\n${reading.evidence.join('\n\n')}`
          }]);
        }, 3500);
      }

      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: `💡 오늘의 가이드:\n${reading.action.join('\n')}`,
          isAction: true
        }]);
      }, cardCount > 1 ? 5500 : 3500);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '죄송합니다. 운명의 실타래가 엉켜 잠시 응답할 수 없습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-reading-page" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderRadius: '15px', 
              backgroundColor: msg.role === 'user' ? 'var(--accent-gold)' : '#1e1e1e',
              color: msg.role === 'user' ? 'var(--bg-color)' : 'white',
              border: msg.role === 'user' ? 'none' : '1px solid #333',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              {msg.text}
            </div>

            {msg.cards && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {msg.cards.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} style={{ width: '80px', textAlign: 'center' }}>
                    <img src={c.image} alt={c.nameKo} style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--accent-gold)' }} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '0.2rem', fontWeight: 'bold' }}>{c.nameKo}</div>
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
          placeholder="타로 마스터에게 궁금한 것을 물어보세요..."
          style={{ 
            flex: 1, 
            padding: '1.2rem', 
            borderRadius: '8px', 
            backgroundColor: '#121212', 
            border: '1px solid var(--accent-gold)', 
            color: 'white',
            fontSize: '1rem'
          }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          style={{ 
            padding: '0 2rem', 
            backgroundColor: 'var(--accent-gold)', 
            color: 'var(--bg-color)', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {loading ? '...' : '전송'}
        </button>
      </form>
    </div>
  );
}
