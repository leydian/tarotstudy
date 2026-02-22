import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useProgressStore } from '../state/progress';
import type { Lesson } from '../types';

export function CoursesPage() {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: api.getCourses });

  const courses = coursesQuery.data ?? [];
  const lessonQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['lessons', course.id],
      queryFn: () => api.getLessons(course.id)
    }))
  });
  const completedSet = useMemo(() => new Set(completedLessons), [completedLessons]);

  if (coursesQuery.isLoading) return <p>코스를 불러오는 중...</p>;
  if (coursesQuery.isError) return <p>코스를 불러오지 못했습니다.</p>;
  const stageCounts = courses.reduce<Record<string, number>>((acc, course) => {
    const key = course.stage || course.track || '기타';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const stageEntries = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);
  const courseProgress = useMemo(() => {
    return courses.map((course, index) => {
      const lessonQuery = lessonQueries[index];
      const lessons = (lessonQuery?.data ?? []) as Lesson[];
      const completedCount = lessons.filter((lesson) => completedSet.has(lesson.id)).length;
      const nextLesson = lessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;
      const status =
        lessonQuery?.isLoading
          ? 'loading'
          : lessons.length > 0 && completedCount === lessons.length
            ? 'done'
            : completedCount > 0
              ? 'in-progress'
              : 'not-started';
      return {
        courseId: course.id,
        lessons,
        isLoading: lessonQuery?.isLoading ?? false,
        completedCount,
        totalCount: lessons.length,
        nextLesson,
        status
      };
    });
  }, [completedSet, courses, lessonQueries]);

  const progressByCourseId = useMemo(
    () => new Map(courseProgress.map((item) => [item.courseId, item])),
    [courseProgress]
  );
  const nextTarget = useMemo(() => {
    for (const course of courses) {
      const progress = progressByCourseId.get(course.id);
      if (!progress || progress.isLoading) continue;
      if (progress.nextLesson) {
        return { course, lesson: progress.nextLesson };
      }
    }
    return null;
  }, [courses, progressByCourseId]);

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

      {nextTarget && (
        <article className="panel">
          <p className="eyebrow">추천 다음 레슨</p>
          <h3>{nextTarget.course.title}</h3>
          <p>{nextTarget.lesson.title}</p>
          <div className="hero-actions">
            <Link
              to={`/courses/${nextTarget.course.id}/lessons/${nextTarget.lesson.id}`}
              className="btn primary"
            >
              바로 이어서 학습
            </Link>
          </div>
        </article>
      )}

      <section className="content-grid">
        <div className="content-main stack">
          {courses.map((course) => {
            const progress = progressByCourseId.get(course.id);
            const statusLabel =
              progress?.status === 'done'
                ? '완료'
                : progress?.status === 'in-progress'
                  ? '진행중'
                  : progress?.status === 'loading'
                    ? '계산 중'
                    : '미시작';
            const statusClass =
              progress?.status === 'done'
                ? 'status-done'
                : progress?.status === 'in-progress'
                  ? 'status-progress'
                  : progress?.status === 'loading'
                    ? 'status-loading'
                    : 'status-idle';
            const lessons = progress?.lessons ?? [];

            return (
              <article key={course.id} className="panel">
                <div className="course-progress-row">
                  <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                  <span className="sub">
                    완료 레슨 {progress?.completedCount ?? 0}/{progress?.totalCount ?? 0}
                  </span>
                </div>
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
                    {progress?.isLoading && <p>레슨 로딩 중...</p>}
                    {lessons.map((lesson) => (
                      <div key={lesson.id} className="lesson-item">
                        <div>
                          <h4>{lesson.title}</h4>
                          <p>{lesson.summary}</p>
                          {completedSet.has(lesson.id) && <p className="sub">완료됨</p>}
                        </div>
                        <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="btn primary">
                          학습 시작
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
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
