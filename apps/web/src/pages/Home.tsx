import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
      {/* 히어로 섹션 */}
      <section style={{ textAlign: 'center', marginBottom: '5rem', animation: 'fadeIn 1s' }}>
        <h2 style={{ fontSize: '3.5rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', letterSpacing: '-2px' }}>TAROT STUDY WEB APP</h2>
        <p style={{ fontSize: '1.25rem', color: '#aaa', maxWidth: '700px', margin: '0 auto', lineHeight: '1.8' }}>
          당신의 운명을 읽고, 타로의 깊은 상징을 배우는 지혜의 성소에 오신 것을 환영합니다.
          무엇을 먼저 시작하시겠습니까?
        </p>
      </section>

      {/* 메인 관문 (Portals) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', perspective: '1000px' }}>
        
        {/* 아르카나 성소 관문 */}
        <div 
          onClick={() => navigate('/mastery')}
          style={{ 
            backgroundColor: '#161616', 
            borderRadius: '32px', 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            border: '1px solid rgba(212, 175, 55, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-15px) scale(1.02)';
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.boxShadow = '0 30px 70px rgba(212, 175, 55, 0.15)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>🔮</div>
          <h3 style={{ fontSize: '2rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>아르카나 성소</h3>
          <p style={{ color: '#888', lineHeight: '1.6', marginBottom: '2rem' }}>
            AI 사서와 대화하며 당신의 운명을 읽고,<br />
            실시간 상담과 심화 학습을 동시에 경험하세요.
          </p>
          <div style={{ display: 'inline-block', padding: '1rem 3rem', backgroundColor: 'var(--accent-gold)', color: 'black', borderRadius: '50px', fontWeight: 'bold' }}>입장하기</div>
        </div>

        {/* 카드 도서관 관문 */}
        <div 
          onClick={() => navigate('/cards')}
          style={{ 
            backgroundColor: '#161616', 
            borderRadius: '32px', 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            border: '1px solid rgba(212, 175, 55, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-15px) scale(1.02)';
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.boxShadow = '0 30px 70px rgba(212, 175, 55, 0.15)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>📚</div>
          <h3 style={{ fontSize: '2rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>카드 도서관</h3>
          <p style={{ color: '#888', lineHeight: '1.6', marginBottom: '2rem' }}>
            78장의 타로 카드에 담긴 고대의 상징과<br />
            깊은 지혜를 체계적으로 탐구해 보세요.
          </p>
          <div style={{ display: 'inline-block', padding: '1rem 3rem', backgroundColor: 'transparent', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: '50px', fontWeight: 'bold' }}>지식 탐구하기</div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
