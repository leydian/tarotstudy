import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function CoursesPage() {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: api.getCourses });

  const lessonsQuery = useQuery({
    queryKey: ['lessons', openCourseId],
    queryFn: () => api.getLessons(openCourseId as string),
    enabled: Boolean(openCourseId)
  });

  if (coursesQuery.isLoading) return <p>코스를 불러오는 중...</p>;
  if (coursesQuery.isError) return <p>코스를 불러오지 못했습니다.</p>;
  const courses = coursesQuery.data ?? [];
  const beginnerCount = courses.filter((course) => course.track === 'beginner').length;
  const intermediateCount = courses.filter((course) => course.track === 'intermediate').length;

  return (
    <section className="page-shell">
      <article className="hero-card page-hero">
        <div>
          <p className="eyebrow">Courses</p>
          <h2>코스 목록</h2>
          <p>입문에서 중급까지, 카드 해석 근거를 쌓는 순서로 코스를 이어서 학습합니다.</p>
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={() => setOpenCourseId(null)}>모두 접기</button>
        </div>
      </article>

      <section className="kpi-row">
        <article className="kpi-card">
          <p className="sub">전체 코스</p>
          <h3>{courses.length}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">입문 트랙</p>
          <h3>{beginnerCount}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">중급 트랙</p>
          <h3>{intermediateCount}</h3>
        </article>
      </section>

      <section className="content-grid">
        <div className="content-main stack">
          {courses.map((course) => (
            <article key={course.id} className="panel">
              <div className="row between">
                <div>
                  <p className="badge">{course.track === 'beginner' ? '입문' : '중급'}</p>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </div>
                <button
                  className="btn"
                  onClick={() => setOpenCourseId((prev) => (prev === course.id ? null : course.id))}
                >
                  {openCourseId === course.id ? '접기' : '레슨 보기'}
                </button>
              </div>

              {openCourseId === course.id && (
                <div className="lesson-list">
                  {lessonsQuery.isLoading && <p>레슨 로딩 중...</p>}
                  {lessonsQuery.data?.map((lesson) => (
                    <div key={lesson.id} className="lesson-item">
                      <div>
                        <h4>{lesson.title}</h4>
                        <p>{lesson.summary}</p>
                      </div>
                      <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="btn primary">
                        학습 시작
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
        <aside className="panel content-side">
          <h3>코스 선택 팁</h3>
          <ul className="clean-list">
            <li>입문은 키워드 이해, 중급은 문맥 분기 연습에 집중하세요.</li>
            <li>레슨마다 복기 문장 1개를 남기면 카드 해석 정확도가 빨라집니다.</li>
            <li>스프레드 실습과 병행하면 체감 속도가 올라갑니다.</li>
          </ul>
        </aside>
      </section>
    </section>
  );
}
