import React, { useEffect, useState } from 'react';

type Card = { 
  id: string; 
  name: string; 
  nameKo: string; 
  keywords: string[]; 
  summary: string; 
  image: string;
  description: string;
  symbolism?: string; // 상세 상징 분석
  meanings: {
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
  reversed: { // 역방향 리딩
    summary: string;
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
};

export function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    fetch('http://localhost:8787/api/cards')
      .then(res => res.json())
      .then(data => setCards(data));
  }, []);

  return (
    <div className="cards-page">
      <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', color: 'var(--accent-gold)' }}>신비의 카드 도서관</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>78장 타로 카드의 깊은 상징과 역방향의 지혜를 탐구하세요.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2.5rem' }}>
        {cards.map(card => (
          <div 
            key={card.id} 
            className="card-panel" 
            onClick={() => setSelectedCard(card)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: '1rem',
              border: '1px solid rgba(212, 175, 55, 0.1)',
              background: 'linear-gradient(145deg, #1e1e1e, #141414)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ 
              width: '100%', 
              aspectRatio: '2/3.5', 
              overflow: 'hidden', 
              borderRadius: '8px',
              backgroundColor: '#000'
            }}>
              <img 
                src={card.image} 
                alt={card.nameKo} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                loading="lazy"
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0.5rem 0', color: 'var(--accent-gold)' }}>{card.nameKo}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{card.keywords.slice(0, 3).join(' · ')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 정보 모달 */}
      {selectedCard && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedCard(null)}
        >
          <div 
            style={{
              backgroundColor: '#121212',
              width: '95%',
              maxWidth: '1200px',
              height: '90vh',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              border: '1px solid #333',
              boxShadow: '0 0 50px rgba(0,0,0,1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 왼쪽: 이미지 섹션 */}
            <div style={{ 
              flex: '0 0 400px', 
              backgroundColor: '#0a0a0a', 
              padding: '2rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #222'
            }}>
              <img 
                src={selectedCard.image} 
                alt={selectedCard.nameKo} 
                style={{ width: '100%', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
              />
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <h1 style={{ color: 'var(--accent-gold)', margin: '0 0 0.5rem 0', fontSize: '2.2rem' }}>{selectedCard.nameKo}</h1>
                <p style={{ color: 'var(--text-secondary)', letterSpacing: '2px', fontSize: '1.1rem' }}>{selectedCard.name.toUpperCase()}</p>
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {selectedCard.keywords.map(k => (
                    <span key={k} style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', fontSize: '0.8rem' }}>
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 텍스트 섹션 (스크롤 가능) */}
            <div style={{ 
              flex: 1, 
              padding: '3rem', 
              overflowY: 'auto', 
              lineHeight: '1.8', 
              color: '#e0e0e0',
              fontFamily: '"Noto Serif KR", serif'
            }}>
              <button 
                onClick={() => setSelectedCard(null)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer' }}
              >✕</button>

              <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ color: 'var(--accent-gold)', borderBottom: '2px solid var(--accent-gold)', display: 'inline-block', marginBottom: '1.5rem' }}>카드의 서사</h3>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', textAlign: 'justify' }}>{selectedCard.description}</p>
              </section>

              {selectedCard.symbolism && (
                <section style={{ marginBottom: '3rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>주요 상징 분석</h3>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: '#ccc' }}>{selectedCard.symbolism}</p>
                </section>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                {/* 정방향 섹션 */}
                <div style={{ border: '1px solid rgba(105, 219, 124, 0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ color: '#69db7c', marginBottom: '1.5rem', textAlign: 'center' }}>↑ 정방향 (Upright)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div><strong style={{ color: '#ff6b6b' }}>[연애]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.meanings.love}</span></div>
                    <div><strong style={{ color: '#4dabf7' }}>[직업]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.meanings.career}</span></div>
                    <div><strong style={{ color: '#ffd43b' }}>[금전]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.meanings.finance}</span></div>
                    <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'rgba(105, 219, 124, 0.05)', borderRadius: '4px' }}>
                      <strong style={{ color: '#69db7c' }}>💡 조언:</strong><br/>
                      <span style={{fontSize: '0.95rem'}}>{selectedCard.meanings.advice}</span>
                    </div>
                  </div>
                </div>

                {/* 역방향 섹션 */}
                <div style={{ border: '1px solid rgba(255, 107, 107, 0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ color: '#ff6b6b', marginBottom: '1.5rem', textAlign: 'center' }}>↓ 역방향 (Reversed)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ marginBottom: '0.5rem', fontStyle: 'italic', color: '#aaa', fontSize: '0.9rem' }}>"{selectedCard.reversed.summary}"</div>
                    <div><strong style={{ color: '#ff6b6b' }}>[연애]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.reversed.love}</span></div>
                    <div><strong style={{ color: '#4dabf7' }}>[직업]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.reversed.career}</span></div>
                    <div><strong style={{ color: '#ffd43b' }}>[금전]</strong> <span style={{fontSize: '0.9rem'}}>{selectedCard.reversed.finance}</span></div>
                    <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'rgba(255, 107, 107, 0.05)', borderRadius: '4px' }}>
                      <strong style={{ color: '#ff6b6b' }}>💡 조언:</strong><br/>
                      <span style={{fontSize: '0.95rem'}}>{selectedCard.reversed.advice}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
