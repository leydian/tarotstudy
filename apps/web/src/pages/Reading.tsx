import React, { useState } from 'react';

export function Reading() {
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDraw = async () => {
    setLoading(true);
    try {
      // 랜덤으로 카드 3장 뽑기 (데모용)
      const allCardsRes = await fetch('http://localhost:8787/api/cards');
      const allCards = await allCardsRes.json();
      
      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, 3).map(c => c.id);

      const res = await fetch('http://localhost:8787/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: selectedIds, question: '지금 나에게 필요한 조언은?' })
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
    <div className="reading-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>운명 읽기 (Reading Engine V3)</h2>
      
      {!reading && (
        <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>마음을 비우고 질문에 집중하세요. 3장의 카드를 뽑습니다.</p>
          <button onClick={handleDraw} disabled={loading} style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
            {loading ? '운명의 실타래를 푸는 중...' : '카드 뽑기'}
          </button>
        </div>
      )}

      {reading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card-panel" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>🔮 결론 (Conclusion)</h3>
            <p style={{ fontSize: '1.2rem' }}>{reading.conclusion}</p>
          </div>

          <div className="card-panel">
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>📜 증거 (Evidence)</h3>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reading.evidence.map((ev: string, i: number) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>

          <div className="card-panel" style={{ background: 'rgba(107, 76, 154, 0.1)', border: '1px solid var(--accent-purple)' }}>
            <h3 style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }}>✨ 행동 (Action)</h3>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reading.action.map((act: string, i: number) => (
                <li key={i} style={{ color: '#e2d1b3' }}>{act}</li>
              ))}
            </ul>
          </div>
          
          <button onClick={() => setReading(null)} style={{ alignSelf: 'center', marginTop: '2rem' }}>
            새로운 질문하기
          </button>
        </div>
      )}
    </div>
  );
}
