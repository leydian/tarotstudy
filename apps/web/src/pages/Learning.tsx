import React, { useEffect, useState } from 'react';

type Lesson = { id: string; title: string; cardId: string; guide?: string; task?: string };
type Course = { id: string; title: string; description: string; level: string; lessons: Lesson[] };
type Card = { id: string; nameKo: string; name: string; image: string; description: string; symbolism: string; keywords: string[] };

export function Learning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    fetch('http://localhost:8787/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data));
  }, []);

  const startLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    // 해당 카드 상세 데이터 가져오기
    const res = await fetch('http://localhost:8787/api/cards');
    const allCards: Card[] = await res.json();
    const card = allCards.find(c => c.id === lesson.cardId);
    if (card) setSelectedCard(card);
  };

  return (
    <div className="learning-page">
      <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem', color: 'var(--accent-gold)' }}>학습의 여정</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        {courses.map(course => (
          <div key={course.id} className="course-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '2px solid rgba(212, 175, 55, 0.3)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent-gold)' }}>{course.title}</h3>
              <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent-gold)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--accent-gold)' }}>
                {course.level}
              </span>
            </div>
            <p style={{ color: '#ccc', marginBottom: '2.5rem', fontSize: '1.15rem', lineHeight: '1.6', maxWidth: '800px' }}>
              {course.description}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {course.lessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="card-panel" 
                  onClick={() => startLesson(lesson)}
                  style={{ 
                    padding: '2rem', 
                    cursor: 'pointer', 
                    transition: 'all 0.3s ease', 
                    border: '1px dashed rgba(212, 175, 55, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <h4 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.2rem' }}>{lesson.title}</h4>
                  <button style={{ 
                    width: '100%', 
                    padding: '0.8rem', 
                    fontSize: '1rem', 
                    backgroundColor: 'transparent', 
                    border: '1px solid var(--accent-gold)',
                    color: 'var(--accent-gold)',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}>학습 시작하기</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 학습 모달 */}
      {selectedLesson && selectedCard && (
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
          onClick={() => { setSelectedLesson(null); setSelectedCard(null); }}
        >
          <div 
            style={{
              backgroundColor: '#121212',
              width: '95%',
              maxWidth: '1100px',
              height: '85vh',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              border: '1px solid var(--accent-gold)',
              boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 왼쪽: 카드 이미지 및 퀘스트 */}
            <div style={{ 
              flex: '0 0 380px', 
              backgroundColor: '#0a0a0a', 
              padding: '2.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2rem',
              borderRight: '1px solid #222'
            }}>
              <img 
                src={selectedCard.image} 
                alt={selectedCard.nameKo} 
                style={{ width: '100%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
              />
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                borderRadius: '8px',
                borderLeft: '4px solid var(--accent-gold)'
              }}>
                <h5 style={{ color: 'var(--accent-gold)', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>🧐 오늘의 과제</h5>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#eee', lineHeight: '1.5' }}>{selectedLesson.task}</p>
              </div>
            </div>

            {/* 오른쪽: 학습 내용 */}
            <div style={{ 
              flex: 1, 
              padding: '3rem', 
              overflowY: 'auto', 
              lineHeight: '1.8'
            }}>
              <button 
                onClick={() => { setSelectedLesson(null); setSelectedCard(null); }}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer' }}
              >✕</button>

              <h4 style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>LESSON STEP</h4>
              <h1 style={{ margin: '0 0 2rem 0', fontSize: '2.2rem' }}>{selectedLesson.title}</h1>

              <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>가이드 및 핵심 철학</h3>
                <p style={{ fontSize: '1.1rem', color: '#ddd' }}>{selectedLesson.guide}</p>
              </section>

              <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>카드의 상징과 해설</h3>
                <p style={{ fontSize: '1rem', color: '#aaa', whiteSpace: 'pre-wrap' }}>{selectedCard.description}</p>
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-gold)' }}>주요 상징 분석</h5>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#ccc' }}>{selectedCard.symbolism}</p>
                </div>
              </section>

              <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <button 
                  onClick={() => { setSelectedLesson(null); setSelectedCard(null); }}
                  style={{ 
                    padding: '1rem 3rem', 
                    fontSize: '1.1rem', 
                    backgroundColor: 'var(--accent-gold)', 
                    color: 'var(--bg-color)', 
                    border: 'none', 
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >이해했습니다. 학습 완료!</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
