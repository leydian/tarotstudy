import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type Timeframe = 'daily' | 'weekly' | 'monthly';
type Category = 'general' | 'love' | 'career' | 'finance' | 'study' | 'health';

type Card = { id: string; nameKo: string; image: string; summary: string; symbolism?: string; description?: string; keywords?: string[] };
type Position = { id: number; label: string; x: number; y: number };
type Spread = { id: string; name: string; positions: Position[] };

export function Reading() {
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [category, setCategory] = useState<Category>('general');
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);
  const navigate = useNavigate();

  const timeframes: { id: Timeframe; label: string }[] = [
    { id: 'daily', label: '단기/하루' },
    { id: 'weekly', label: '주별 흐름' },
    { id: 'monthly', label: '월별/장기' }
  ];

  const categories: { id: Category; label: string; icon: string }[] = [
    { id: 'general', label: '종합운', icon: '🔮' },
    { id: 'love', label: '연애운', icon: '❤️' },
    { id: 'career', label: '직업운', icon: '💼' },
    { id: 'finance', label: '금전운', icon: '💰' },
    { id: 'study', label: '학업/시험', icon: '🎓' },
    { id: 'health', label: '건강/심리', icon: '🌿' }
  ];

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

  const handleDraw = async () => {
    if (!question.trim()) {
      alert("질문을 입력해 주세요. 그래야 운명의 지도가 더 선명하게 그려집니다.");
      return;
    }

    setLoading(true);
    setRevealedIdx([]);
    try {
      // 1. 질문 분석을 통한 카드 장수 결정
      let cardCount = 3;
      if (question.includes('언제') || question.includes('몇월')) cardCount = 3;
      else if (question.includes('할까') || question.includes('말까') || question.includes('vs')) cardCount = 2;
      else if (question.length > 25 || question.includes('상세')) cardCount = 7;
      else if (timeframe === 'monthly') cardCount = 5;

      const spreadsRes = await fetch('/api/spreads');
      const spreads: Spread[] = await spreadsRes.json();
      
      // 장수에 맞는 스프레드 찾기 (없으면 근사값)
      let currentSpread = spreads.find(s => s.positions.length === cardCount) || spreads.find(s => s.id === timeframe) || spreads[0];
      setSpreadLayout(currentSpread);

      const allCardsRes = await fetch('/api/cards');
      const allCards: Card[] = await allCardsRes.json();
      
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, currentSpread.positions.length);
      setDrawnCards(selectedCards);

      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cardIds: selectedCards.map(c => c.id), 
          timeframe, 
          category,
          question: question
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

  const revealCard = (idx: number) => {
    if (!revealedIdx.includes(idx)) {
      setRevealedIdx([...revealedIdx, idx]);
    }
  };

  const revealAll = () => {
    setRevealedIdx(drawnCards.map((_, i) => i));
  };

  return (
    <div className="reading-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.8rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>운명 읽기</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>아르카나 도서관의 지혜를 빌려 당신의 길을 비추어 드립니다.</p>
      </header>
      
      {!reading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card-panel" style={{ padding: '2.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid #333' }}>
            {/* 질문 입력창 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>◈ 당신의 질문을 들려주세요</h3>
              <textarea 
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="예: 3월 내에 이직할 수 있을까요? / 지금 그 사람의 속마음은 어떨까요?"
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  backgroundColor: '#121212', 
                  border: '1px solid #444', 
                  color: 'white', 
                  fontSize: '1.1rem',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>기간 선택</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {timeframes.map(t => (
                    <button key={t.id} onClick={() => setTimeframe(t.id)} style={{ flex: 1, padding: '0.8rem', backgroundColor: timeframe === t.id ? 'var(--accent-gold)' : 'transparent', color: timeframe === t.id ? 'var(--bg-color)' : 'white', border: '1px solid var(--accent-gold)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>분야 선택</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {categories.map(c => (
                    <button key={c.id} onClick={() => setCategory(c.id)} style={{ padding: '0.8rem', backgroundColor: category === c.id ? 'rgba(212, 175, 55, 0.2)' : 'transparent', color: category === c.id ? 'var(--accent-gold)' : 'var(--text-secondary)', border: category === c.id ? '1px solid var(--accent-gold)' : '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleDraw} 
            disabled={loading} 
            style={{ 
              fontSize: '1.4rem', 
              padding: '1.2rem 4rem', 
              backgroundColor: 'var(--accent-gold)', 
              color: 'var(--bg-color)', 
              border: 'none', 
              borderRadius: '50px',
              fontWeight: 'bold', 
              cursor: 'pointer', 
              alignSelf: 'center',
              boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? '운명의 지도를 그리는 중...' : '셔플 및 카드 뽑기'}
          </button>
        </div>
      )}

      {reading && spreadLayout && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* 스프레드 시각화 섹션 */}
          <section style={{ 
            height: spreadLayout.positions.length > 7 ? '1000px' : '650px', 
            position: 'relative', 
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '30px',
            border: '1px solid rgba(212, 175, 55, 0.1)',
            backgroundImage: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.08) 0%, transparent 75%)',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
              {spreadLayout.positions.map((pos, idx) => {
                const card = drawnCards[idx];
                const isRevealed = revealedIdx.includes(idx);
                
                return (
                  <div 
                    key={pos.id}
                    onClick={() => revealCard(idx)}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      zIndex: isRevealed ? 50 : 10
                    }}
                  >
                    {/* 카드 본체 - 뒤집기 애니메이션 */}
                    <div style={{
                      width: '140px',
                      height: '240px',
                      perspective: '1000px',
                      transition: 'transform 0.3s'
                    }}>
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transformStyle: 'preserve-3d',
                        transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}>
                        {/* 카드 뒷면 */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          backgroundColor: '#1a1a1a',
                          borderRadius: '10px',
                          border: '2px solid var(--accent-gold)',
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,175,55,0.05) 0, rgba(212,175,55,0.05) 2px, transparent 0, transparent 10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ width: '40px', height: '40px', border: '1px solid var(--accent-gold)', transform: 'rotate(45deg)', opacity: 0.5 }}></div>
                        </div>
                        {/* 카드 앞면 */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                          border: '1px solid var(--accent-gold)'
                        }}>
                          <img src={card.image} alt={card.nameKo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    </div>
                    
                    {/* 레이블 */}
                    <div style={{
                      backgroundColor: 'rgba(10,10,10,0.85)',
                      padding: '0.4rem 1rem',
                      borderRadius: '4px',
                      border: '1px solid #333',
                      textAlign: 'center',
                      minWidth: '120px',
                      opacity: isRevealed ? 1 : 0.6
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', marginBottom: '2px' }}>{pos.label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{isRevealed ? card.nameKo : '???'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {revealedIdx.length < drawnCards.length && (
              <button onClick={revealAll} style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', padding: '0.6rem 2rem', backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>한꺼번에 뒤집기</button>
            )}
          </section>

          {/* 결과 분석 섹션 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', opacity: revealedIdx.length > 0 ? 1 : 0.2, transition: 'opacity 0.5s' }}>
            {/* 결론 리포트 */}
            <div className="card-panel" style={{ padding: '3rem', backgroundColor: '#1e1e1e', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', backgroundColor: 'var(--accent-gold)' }}></div>
              <h3 style={{ color: 'var(--accent-gold)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                📜 운명의 마스터 리포트
              </h3>
              <p style={{ fontSize: '1.2rem', lineHeight: '1.9', color: '#f0f0f0', whiteSpace: 'pre-wrap' }}>{reading.conclusion}</p>
            </div>

            {/* 위치별 상세 분석 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {reading.evidence.map((ev: string, i: number) => {
                const posMatch = ev.match(/\[(.+):/);
                const posLabel = posMatch ? posMatch[1].trim() : "해석";
                const posDesc = positionDefinitions[posLabel] || "";
                
                return (
                  <div key={i} className="card-panel" style={{ padding: '2rem', border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{i+1}</div>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-gold)' }}>{posLabel}</h4>
                    </div>
                    {posDesc && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1rem' }}>"{posDesc}"</p>}
                    <p style={{ lineHeight: '1.7', color: '#ccc' }}>{ev.split(']')[1]}</p>
                    {revealedIdx.includes(i) && (
                      <button onClick={() => navigate(`/study-reading`)} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--accent-gold)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>상징 더 공부하기 →</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 최종 조언 배너 */}
            <div className="card-panel" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(107, 76, 154, 0.1) 0%, transparent 100%)', border: '1px solid var(--accent-purple)' }}>
              <h3 style={{ color: 'var(--accent-purple)', fontSize: '1.5rem', marginBottom: '1.5rem' }}>✨ 아르카나의 지침</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {reading.action.map((act: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent-purple)' }}>●</span>
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#e2d1b3' }}>{act}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
              <button onClick={() => { setReading(null); setDrawnCards([]); setQuestion(''); }} style={{ padding: '1rem 3rem', backgroundColor: 'transparent', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>새로운 질문하기</button>
              <button onClick={() => navigate('/study-reading')} style={{ padding: '1rem 3rem', backgroundColor: 'var(--accent-gold)', color: 'var(--bg-color)', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>이 결과로 학습하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
