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
  const stageCounts = courses.reduce<Record<string, number>>((acc, course) => {
    const key = course.stage || course.track || '기타';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const stageEntries = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);

  return (
    <section className="page-shell">
      <article className="hero-card page-hero">
        <div>
          <p className="eyebrow">Courses</p>
          <h2>코스 목록</h2>
          <p>기초 입문부터 전문가 랩까지, 단계별 실전 난이도로 코스를 이어서 학습합니다.</p>
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
          <p className="sub">학습 단계</p>
          <h3>{stageEntries.length}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">가장 많은 단계</p>
          <h3>{stageEntries[0]?.[0] ?? '-'}</h3>
        </article>
      </section>

      <section className="content-grid">
        <div className="content-main stack">
          {courses.map((course) => (
            <article key={course.id} className="panel">
              <div className="row between">
                <div>
                  <p className="badge">{course.stage || course.track}</p>
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
          <h3>학습 단계 현황</h3>
          <ul className="clean-list">
            {stageEntries.map(([stage, count]) => (
              <li key={stage}>{stage}: {count}개 코스</li>
            ))}
          </ul>
          <h3>코스 선택 팁</h3>
          <ul className="clean-list">
            <li>기초 입문은 카드 문장 이해, 중급 이상은 근거/복기 품질에 집중하세요.</li>
            <li>레슨마다 복기 문장 1개를 남기면 카드 해석 정확도가 빨라집니다.</li>
            <li>스프레드 실습과 병행하면 체감 속도가 올라갑니다.</li>
          </ul>
        </aside>
      </section>
    </section>
  );
}
