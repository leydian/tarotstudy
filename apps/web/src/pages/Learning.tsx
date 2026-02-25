import React, { useEffect, useState } from 'react';

type Lesson = { id: string; title: string; cardId: string };
type Course = { id: string; title: string; description: string; level: string; lessons: Lesson[] };

export function Learning() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetch('http://localhost:8787/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data));
  }, []);

  return (
    <div className="learning-page">
      <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>학습의 여정</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {courses.map(course => (
          <div key={course.id} className="course-section">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{course.title}</h3>
              <span style={{ background: 'var(--accent-gold)', color: 'var(--bg-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {course.level}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
              {course.description}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {course.lessons.map(lesson => (
                <div key={lesson.id} className="card-panel" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', borderStyle: 'dashed' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)' }}>{lesson.title}</h4>
                  <button style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}>학습 시작</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
