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

  return (
    <section className="stack">
      <h2>코스 목록</h2>
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
    </section>
  );
}
