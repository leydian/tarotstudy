import React, { useState } from 'react';

type Timeframe = 'daily' | 'weekly' | 'monthly';
type Category = 'general' | 'love' | 'career' | 'finance';

type Card = { id: string; nameKo: string; image: string; summary: string };
type Position = { id: number; label: string; x: number; y: number };
type Spread = { id: string; name: string; positions: Position[] };

export function Reading() {
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [category, setCategory] = useState<Category>('general');
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);

  const timeframes: { id: Timeframe; label: string }[] = [
    { id: 'daily', label: '하루 운세' },
    { id: 'weekly', label: '주별 운세' },
    { id: 'monthly', label: '월별 운세' }
  ];

  const categories: { id: Category; label: string; icon: string }[] = [
    { id: 'general', label: '종합운', icon: '🔮' },
    { id: 'love', label: '연애운', icon: '❤️' },
    { id: 'career', label: '직업운', icon: '💼' },
    { id: 'finance', label: '금전운', icon: '💰' }
  ];

  const handleDraw = async () => {
    setLoading(true);
    try {
      const spreadsRes = await fetch('/api/spreads');
      const spreads: Spread[] = await spreadsRes.json();
      const currentSpread = spreads.find(s => s.id === timeframe) || spreads[0];
      setSpreadLayout(currentSpread);

      const cardCount = currentSpread.positions.length;
      const allCardsRes = await fetch('/api/cards');
      const allCards: Card[] = await allCardsRes.json();
      
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, cardCount);
      setDrawnCards(selectedCards);

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardIds: selectedCards.map(c => c.id), 
          timeframe, 
          category,
          question: `${timeframes.find(t => t.id === timeframe)?.label} - ${categories.find(c => c.id === category)?.label}`
        })
      });
      const data = await res.json();
      setReading(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reading-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', color: 'var(--accent-gold)' }}>운명 읽기</h2>
      
      {!reading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div className="card-panel" style={{ padding: '2.5rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', textAlign: 'center' }}>1. 기간 선택</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                {timeframes.map(t => (
                  <button key={t.id} onClick={() => setTimeframe(t.id)} style={{ flex: 1, padding: '1rem', backgroundColor: timeframe === t.id ? 'var(--accent-gold)' : 'transparent', color: timeframe === t.id ? 'var(--bg-color)' : 'var(--accent-gold)', border: '1px solid var(--accent-gold)', fontWeight: 'bold', cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', textAlign: 'center' }}>2. 분야 선택</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} style={{ padding: '1.2rem', backgroundColor: category === c.id ? 'rgba(212, 175, 55, 0.2)' : 'transparent', color: category === c.id ? 'white' : 'var(--text-secondary)', border: category === c.id ? '1px solid var(--accent-gold)' : '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '1.1rem' }}>
                    <span>{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleDraw} disabled={loading} style={{ fontSize: '1.5rem', padding: '1.2rem 5rem', backgroundColor: 'var(--accent-gold)', color: 'var(--bg-color)', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)' }}>
              {loading ? '운명의 실타래를 푸는 중...' : '셔플 및 카드 뽑기'}
            </button>
          </div>
        </div>
      )}

      {reading && spreadLayout && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {/* 스프레드 시각화 섹션 */}
          <section className="spread-visualizer" style={{ 
            height: timeframe === 'monthly' ? '1000px' : '600px', 
            position: 'relative', 
            margin: '2rem 0',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '24px',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            backgroundImage: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.05) 0%, transparent 70%)'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
              {spreadLayout.positions.map((pos, idx) => {
                const card = drawnCards[idx];
                const isCenter = idx === 0;
                
                return (
                  <div 
                    key={pos.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: 'translate(-50%, -50%)',
                      transition: 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.8rem',
                      zIndex: isCenter ? 100 : 10 + idx
                    }}
                  >
                    {/* 카드 본체 - 크기 통일 및 효과 제거 */}
                    <div style={{
                      width: '160px',
                      aspectRatio: '2/3.5',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                      border: '1px solid var(--accent-gold)',
                      backgroundColor: '#0a0a0a',
                      position: 'relative'
                    }}>
                      <img 
                        src={card.image} 
                        alt={card.nameKo} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.style.display = 'flex';
                            parent.style.alignItems = 'center';
                            parent.style.justifyContent = 'center';
                            parent.style.padding = '1rem';
                            parent.style.textAlign = 'center';
                            parent.innerHTML = `<span style="color: var(--accent-gold); font-size: 1.1rem; font-weight: bold;">${card.nameKo}</span>`;
                          }
                        }}
                      />
                    </div>
                    
                    {/* 레이블 섹션 - 가독성 중심 정리 */}
                    <div style={{
                      backgroundColor: 'rgba(18, 18, 18, 0.95)',
                      padding: '0.5rem 1.2rem',
                      borderRadius: '4px',
                      border: isCenter ? '1px solid var(--accent-gold)' : '1px solid #444',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '150px'
                    }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        opacity: 0.6, 
                        color: 'var(--accent-gold)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '2px'
                      }}>
                        {pos.label}
                      </span>
                      <span style={{ 
                        fontSize: isCenter ? '1rem' : '0.9rem', 
                        fontWeight: 'bold',
                        color: isCenter ? 'var(--accent-gold)' : 'white'
                      }}>
                        {card.nameKo}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 리딩 텍스트 섹션 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="card-panel" style={{ borderLeft: '4px solid var(--accent-gold)', padding: '2.5rem' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.8rem' }}>🔮 리딩 결론</h3>
              <p style={{ fontSize: '1.25rem', lineHeight: '1.8', color: '#eee' }}>{reading.conclusion}</p>
            </div>

            <div className="card-panel" style={{ padding: '2.5rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.5rem' }}>📜 카드별 분석</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {reading.evidence.map((ev: string, i: number) => (
                  <div key={i} style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid #333' }}>
                    <p style={{ margin: 0, lineHeight: '1.7' }}>{ev}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-panel" style={{ background: 'rgba(107, 76, 154, 0.05)', border: '1px solid var(--accent-purple)', padding: '2.5rem' }}>
              <h3 style={{ color: 'var(--accent-purple)', marginBottom: '1.5rem', fontSize: '1.5rem' }}>✨ 운명의 조언</h3>
              <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reading.action.map((act: string, i: number) => (
                  <li key={i} style={{ color: '#e2d1b3', fontSize: '1.1rem', lineHeight: '1.6' }}>{act}</li>
                ))}
              </ul>
            </div>
            
            <button onClick={() => { setReading(null); setDrawnCards([]); }} style={{ alignSelf: 'center', marginTop: '2rem', backgroundColor: 'transparent', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', padding: '0.8rem 3rem', cursor: 'pointer' }}>
              새로운 질문하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
