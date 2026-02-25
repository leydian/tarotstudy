import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="hero card-panel" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem' }}>환영합니다, 탐구자여</h2>
        <p style={{ maxWidth: '600px', margin: '1.5rem auto', fontSize: '1.1rem' }}>
          고대의 지혜가 담긴 카드를 통해 당신의 내면을 들여다보고, 
          타로의 신비로운 언어를 배우는 여정을 시작하세요.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button 
            style={{ background: 'var(--accent-gold)', color: 'var(--bg-color)' }}
            onClick={() => navigate('/reading')}
          >
            오늘의 카드 뽑기
          </button>
          <button onClick={() => navigate('/learning')}>학습 이어가기</button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card-panel">
          <h3>최근 학습</h3>
          <p style={{ color: 'var(--text-secondary)' }}>아직 진행 중인 강의가 없습니다. 타로의 기초부터 시작해볼까요?</p>
          <button style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/learning')}>기초 강의 보기</button>
        </div>
        <div className="card-panel">
          <h3>운명의 흐름</h3>
          <p style={{ color: 'var(--text-secondary)' }}>당신을 위한 맞춤형 스프레드 리딩이 준비되어 있습니다.</p>
          <button style={{ marginTop: '1rem', width: '100%' }} onClick={() => navigate('/reading')}>스프레드 선택</button>
        </div>
      </div>
    </div>
  );
}
