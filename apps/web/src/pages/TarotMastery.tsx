import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type Message = { role: 'user' | 'bot'; text: string; isAction?: boolean };
type Card = { id: string; nameKo: string; image: string; summary: string; symbolism?: string; description?: string; keywords?: string[] };
type Position = { id: number; label: string; x: number; y: number };
type Spread = { id: string; name: string; positions: Position[] };

export function TarotMastery() {
  const [step, setStep] = useState<'input' | 'reading' | 'result'>('input');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "어서 오세요. 이곳은 운명과 지혜가 만나는 '아르카나 성소'입니다. 오늘 당신의 영혼이 찾고 있는 답은 무엇인가요? 질문을 들려주시면 운명의 지도를 그려드릴게요." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);
  const [reading, setReading] = useState<any>(null);
  const [isStudyMode, setIsStudyMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const positionDefinitions: { [key: string]: string } = {
    "핵심 조언": "이 자리는 당신의 질문에 대한 가장 본질적이고 근원적인 답을 상징합니다.",
    "현재 상황": "지금 당신이 처한 현실적인 환경과 당신의 표면적인 상태를 보여줍니다.",
    "다가올 변화": "머지않아 당신에게 찾아올 새로운 사건이나 에너지의 흐름을 의미합니다.",
    "과거의 풍경": "이 질문이 시작된 원인, 배경, 그리고 당신이 지나온 길을 상징합니다.",
    "현재의 모습": "지금 당신의 마음가짐과 현실에서 가장 크게 작용하고 있는 힘을 뜻합니다.",
    "미래의 빛": "현재의 흐름이 이어졌을 때 도달하게 될 최종 결과와 운명의 방향입니다.",
    "선택 A의 길": "첫 번째 선택지를 택했을 때 펼쳐질 미래의 시나리오와 기운을 보여줍니다.",
    "선택 B의 길": "두 번째 선택지를 택했을 때 마주하게 될 상황과 결과의 흐름입니다."
  };

  const handleStartRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userQuestion }]);
    setLoading(true);
    setInput('');

    try {
      let cardCount = 3;
      if (userQuestion.includes('언제') || userQuestion.includes('몇월')) cardCount = 3;
      else if (userQuestion.includes('할까') || userQuestion.includes('말까') || userQuestion.includes('vs')) cardCount = 2;
      else if (userQuestion.length > 25) cardCount = 7;

      const spreadsRes = await fetch('/api/spreads');
      const spreads: Spread[] = await spreadsRes.json();
      const currentSpread = spreads.find(s => s.positions.length === cardCount) || spreads[0];
      setSpreadLayout(currentSpread);

      const allCardsRes = await fetch('/api/cards');
      const allCards = await allCardsRes.json();
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, currentSpread.positions.length);
      setDrawnCards(selectedCards);

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: selectedCards.map(c => c.id), question: userQuestion })
      });
      const data = await res.json();
      setReading(data);

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: `질문에 맞춰 [${currentSpread.name}] 스프레드를 구성했습니다. 당신의 손길로 카드를 하나씩 뒤집어 운명을 확인해 보세요.` }]);
        setStep('reading');
        setLoading(false);
      }, 1000);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '운명의 실타래가 엉켰습니다. 잠시 후 다시 시도해 주세요.' }]);
      setLoading(false);
    }
  };

  const revealCard = (idx: number) => {
    if (!revealedIdx.includes(idx)) {
      setRevealedIdx(prev => {
        const next = [...prev, idx];
        if (next.length === drawnCards.length) {
          setTimeout(() => setStep('result'), 1000);
        }
        return next;
      });
      
      const posLabel = spreadLayout?.positions[idx].label || '해석';
      const interpretation = reading?.evidence[idx]?.split(']')[1] || '카드가 뒤집혔습니다.';
      
      if (isStudyMode) {
        const info = getPositionInfo(idx);
        const card = drawnCards[idx];
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: `[학습 리딩: ${card.nameKo}]\n\n◈ 해석: ${interpretation}\n\n◈ ${posLabel}의 의미: ${info.posDesc}\n\n◈ 카드 상징: ${card.description || card.summary}\n\n◈ 키워드: ${card.keywords?.join(', ') || '정보 없음'}` 
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: `[${posLabel}: ${drawnCards[idx].nameKo}]\n${interpretation}` }]);
      }
    }
  };

  const getPositionInfo = (idx: number) => {
    const posLabel = spreadLayout?.positions[idx].label || "";
    const posDesc = positionDefinitions[posLabel] || "운명의 중요한 단계입니다.";
    const card = drawnCards[idx];
    return { posLabel, posDesc, card };
  };

  return (
    <div className="tarot-mastery-page" style={{ 
      maxWidth: '1800px', 
      margin: '0 auto', 
      display: 'grid', 
      gridTemplateColumns: '450px 1fr', 
      gap: '3.5rem', 
      height: 'calc(100vh - 160px)',
      padding: '0 3rem'
    }}>
      
      {/* 왼쪽: 챗봇 세션 (상담 기록) */}
      <div className="chat-sidebar" style={{ 
        backgroundColor: '#161616', 
        borderRadius: '28px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: '1px solid #333',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '1.8rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #1a1a1a, #161616)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-gold)', letterSpacing: '1px' }}>아르카나 사서</h3>
          {step === 'result' && (
            <button 
              onClick={() => {
                const nextMode = !isStudyMode;
                setIsStudyMode(nextMode);
                if (nextMode) {
                  setMessages(prev => [...prev, { role: 'bot', text: "✨ 학습 모드가 활성화되었습니다. 이번 리딩의 각 카드를 상징학적으로 분석해 드릴게요." }]);
                  drawnCards.forEach((card, i) => {
                    setTimeout(() => {
                      const info = getPositionInfo(i);
                      const interpretation = reading?.evidence[i]?.split(']')[1] || '';
                      setMessages(prev => [...prev, { 
                        role: 'bot', 
                        text: `[심화 학습: ${card.nameKo}]\n\n◈ ${info.posLabel}: ${info.posDesc}\n\n◈ 상징 분석: ${card.description || card.summary}\n\n◈ 키워드: ${card.keywords?.join(', ') || ''}\n\n◈ 이번 리딩에서의 해석: ${interpretation}` 
                      }]);
                    }, 600 * (i + 1));
                  });
                }
              }} 
              style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: '12px', backgroundColor: isStudyMode ? 'var(--accent-gold)' : '#333', color: isStudyMode ? 'black' : 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
            >
              학습 모드 {isStudyMode ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
              <div style={{ 
                padding: '1.1rem 1.5rem', 
                borderRadius: msg.role === 'user' ? '20px 20px 2px 20px' : '20px 20px 20px 20px', 
                backgroundColor: msg.role === 'user' ? 'var(--accent-gold)' : '#252525',
                color: msg.role === 'user' ? 'black' : 'white',
                fontSize: '1rem',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                position: 'relative'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {step === 'input' && (
          <form onSubmit={handleStartRitual} style={{ padding: '1.8rem', borderTop: '1px solid #333', display: 'flex', gap: '0.8rem', backgroundColor: '#1a1a1a' }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="당신의 운명을 물어보세요..." style={{ flex: 1, backgroundColor: '#000', border: '1px solid #444', color: 'white', padding: '1rem', borderRadius: '12px', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: 'var(--accent-gold)', border: 'none', padding: '0 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '...' : '전송'}</button>
          </form>
        )}
      </div>

      {/* 오른쪽: 메인 작업 영역 */}
      <div className="main-ritual-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', paddingRight: '1rem' }}>
        
        {step === 'input' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: '2.5rem', opacity: 0.8 }}>
            <div style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 20px var(--accent-gold))' }}>🃏</div>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', letterSpacing: '-1px' }}>의식을 시작할 준비가 되셨나요?</h2>
            <p style={{ fontSize: '1.2rem', color: '#888' }}>질문을 입력하시면 카드들이 당신의 길을 비추어 줄 것입니다.</p>
          </div>
        )}

        {(step === 'reading' || step === 'result') && spreadLayout && (
          <div style={{ 
            position: 'relative', 
            minHeight: '650px', 
            backgroundColor: 'rgba(0,0,0,0.4)', 
            borderRadius: '32px', 
            border: '1px solid rgba(212,175,55,0.1)', 
            backgroundImage: 'radial-gradient(circle at center, rgba(212,175,55,0.08) 0%, transparent 80%)',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
              {spreadLayout.positions.map((pos, idx) => {
                const isRevealed = revealedIdx.includes(idx);
                const info = getPositionInfo(idx);
                return (
                  <div key={pos.id} style={{ position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                    <div onClick={() => revealCard(idx)} style={{ 
                      width: '130px', 
                      height: '230px', 
                      perspective: '1000px', 
                      cursor: isRevealed && !isStudyMode ? 'default' : 'pointer',
                      transition: 'transform 0.3s'
                    }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformStyle: 'preserve-3d', transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '2px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '2.5rem', opacity: 0.2, color: 'var(--accent-gold)' }}>?</span>
                        </div>
                        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--accent-gold)' }}>
                          <img src={info.card.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{pos.label}</div>
                      <div style={{ fontSize: '0.9rem', color: isRevealed ? 'white' : '#555' }}>{isRevealed ? info.card.nameKo : '미공개'}</div>
                    </div>

                    {isStudyMode && isRevealed && (
                      <div style={{ position: 'absolute', top: '-120px', width: '280px', backgroundColor: '#222', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--accent-gold)', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.8)', fontSize: '0.85rem' }}>
                        <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.4rem' }}>◈ {info.posLabel} 의 정의</div>
                        <p style={{ margin: 0, color: '#eee', lineHeight: '1.5' }}>{info.posDesc}</p>
                        <div style={{ marginTop: '1rem', color: 'var(--accent-gold)', fontStyle: 'italic', fontSize: '0.8rem' }}>"{info.card.summary}"</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'result' && (
          <div style={{ paddingBottom: '4rem', animation: 'fadeIn 1s' }}>
            <div style={{ backgroundColor: '#1e1e1e', padding: '3rem', borderRadius: '32px', borderLeft: '8px solid var(--accent-gold)', marginBottom: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginTop: 0, fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '1rem' }}>📜 운명의 마스터 리포트</h3>
              <p style={{ lineHeight: '2', whiteSpace: 'pre-wrap', fontSize: '1.15rem', color: '#f0f0f0' }}>{reading.conclusion}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', marginBottom: '3rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', paddingLeft: '1.2rem', borderLeft: '3px solid #444', letterSpacing: '1px' }}>◈ 카드별 심층 분석</h4>
              {reading.evidence.map((ev: string, i: number) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '2.2rem', borderRadius: '24px', border: '1px solid #333', lineHeight: '1.8', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#ddd', fontSize: '1.05rem' }}>{ev}</p>
                </div>
              ))}
            </div>

            {/* 아르카나의 지침 - 와이드 레이아웃 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              <div style={{ 
                backgroundColor: 'rgba(107, 76, 154, 0.08)', 
                padding: '3rem', 
                borderRadius: '32px', 
                border: '1px solid var(--accent-purple)', 
                boxShadow: '0 15px 40px rgba(107,76,154,0.1)' 
              }}>
                <h4 style={{ color: 'var(--accent-purple)', marginTop: 0, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(107,76,154,0.2)', paddingBottom: '1rem' }}>✨ 아르카나의 지침</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reading.action.map((act: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--accent-purple)', fontSize: '1.3rem' }}>●</span>
                      <p style={{ margin: 0, color: '#e2d1b3', fontSize: '1.15rem', lineHeight: '1.8' }}>{act}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setStep('input'); setReading(null); setMessages([{ role: 'bot', text: '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?' }]); setRevealedIdx([]); }} 
                  style={{ 
                    padding: '1.5rem 6rem', 
                    backgroundColor: 'var(--accent-gold)', 
                    color: 'black', 
                    border: 'none', 
                    borderRadius: '60px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer', 
                    fontSize: '1.3rem', 
                    boxShadow: '0 15px 40px rgba(212, 175, 55, 0.4)', 
                    transition: 'transform 0.2s' 
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  새로운 질문하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .chat-sidebar::-webkit-scrollbar { width: 6px; }
        .chat-sidebar::-webkit-scrollbar-thumb { backgroundColor: #333; borderRadius: 10px; }
        .main-ritual-area::-webkit-scrollbar { width: 6px; }
        .main-ritual-area::-webkit-scrollbar-thumb { backgroundColor: #333; borderRadius: 10px; }
      `}</style>
    </div>
  );
}
