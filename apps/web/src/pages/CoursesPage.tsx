import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useProgressStore } from '../state/progress';

const STAGE_ORDER = [
  '기초 입문',
  '입문 실전',
  '입문 심화',
  '중급 코어',
  '중급 심화',
  '고급 운영',
  '전문가 랩'
];

export function CoursesPage() {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const completedLessons = useProgressStore((s) => s.completedLessons);
  const quizHistory = useProgressStore((s) => s.quizHistory);
  const completedSet = useMemo(() => new Set(completedLessons), [completedLessons]);
  const quizScoreByLessonId = useMemo(
    () => new Map(quizHistory.map((item) => [item.lessonId, item.percent])),
    [quizHistory]
  );

  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: api.getCourses });
  const openLessonsQuery = useQuery({
    queryKey: ['lessons', openCourseId],
    queryFn: () => api.getLessons(openCourseId as string),
    enabled: Boolean(openCourseId)
  });

  if (coursesQuery.isLoading) return <p>코스를 불러오는 중...</p>;
  if (coursesQuery.isError) return <p>코스를 불러오지 못했습니다.</p>;

  const orderedCourses = [...(coursesQuery.data ?? [])].sort((a, b) => {
    if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
    return a.order - b.order;
  });

  const courseProgress = orderedCourses.map((course) => {
    const outline = course.lessonOutline || [];
    const completedCount = outline.filter((lesson) => completedSet.has(lesson.id)).length;
    const nextLesson = outline.find((lesson) => !completedSet.has(lesson.id)) ?? null;
    const status =
      completedCount === outline.length
        ? 'done'
        : completedCount > 0
          ? 'in-progress'
          : 'not-started';

    const scoreSamples = outline
      .map((lesson) => quizScoreByLessonId.get(lesson.id))
      .filter((score): score is number => typeof score === 'number');
    const avgScore = scoreSamples.length
      ? Math.round(scoreSamples.reduce((acc, score) => acc + score, 0) / scoreSamples.length)
      : null;

    return {
      course,
      completedCount,
      totalCount: outline.length,
      nextLesson,
      status,
      avgScore
    };
  });

  const progressByCourseId = new Map(courseProgress.map((item) => [item.course.id, item]));
  const stageOptions = STAGE_ORDER.filter((stage) => orderedCourses.some((course) => course.stage === stage));

  const stageStats = stageOptions.map((stage) => {
    const rows = courseProgress.filter((item) => item.course.stage === stage);
    const totalCourses = rows.length;
    const totalLessons = rows.reduce((acc, row) => acc + row.totalCount, 0);
    const completedLessonsCount = rows.reduce((acc, row) => acc + row.completedCount, 0);
    const nextCourse = rows.find((row) => row.status !== 'done')?.course ?? null;
    return {
      stage,
      totalCourses,
      totalLessons,
      completedLessonsCount,
      nextCourse
    };
  });

  const currentStage = stageStats.find((item) => item.completedLessonsCount < item.totalLessons)?.stage ?? '전 단계 완료';

  const searchText = search.trim().toLowerCase();
  const filtered = courseProgress.filter((item) => {
    if (stageFilter !== 'all' && item.course.stage !== stageFilter) return false;
    if (onlyIncomplete && item.status === 'done') return false;
    if (!searchText) return true;

    const hay = [
      item.course.title,
      item.course.description,
      ...(item.course.lessonOutline || []).map((lesson) => lesson.title)
    ].join(' ').toLowerCase();
    return hay.includes(searchText);
  });

  const nextTarget = courseProgress.find((item) => item.nextLesson) ?? null;

  const openLessons = openLessonsQuery.data ?? [];

  return (
    <section className="page-shell">
      <article className="hero-card page-hero">
        <div>
          <p className="eyebrow">Courses</p>
          <h2>코스 목록</h2>
          <p>기초부터 전문가 랩까지, 단계 순서대로 진도를 이어서 학습합니다.</p>
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={() => setOpenCourseId(null)}>모두 접기</button>
        </div>
      </article>

      <section className="kpi-row">
        <article className="kpi-card">
          <p className="sub">전체 코스</p>
          <h3>{orderedCourses.length}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">학습 단계</p>
          <h3>{stageOptions.length}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">현재 내 진행 단계</p>
          <h3>{currentStage}</h3>
        </article>
      </section>

      <article className="panel">
        <div className="filters">
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">전체 단계</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="코스/레슨 검색"
          />
          <label className="review-check-item">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
            />
            <span>미완료 코스만 보기</span>
          </label>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">추천 다음 레슨</p>
        {nextTarget?.nextLesson ? (
          <>
            <h3>{nextTarget.course.title}</h3>
            <p>{nextTarget.nextLesson.title}</p>
            <div className="hero-actions">
              <Link
                to={`/courses/${nextTarget.course.id}/lessons/${nextTarget.nextLesson.id}`}
                className="btn primary"
              >
                바로 이어서 학습
              </Link>
            </div>
          </>
        ) : (
          <p>모든 코스를 완료했습니다. 복습 모드로 전환해 약점 레슨을 다시 학습해보세요.</p>
        )}
      </article>

      <section className="content-grid">
        <div className="content-main stack">
          {filtered.length === 0 && (
            <article className="panel">
              <p>필터 조건에 맞는 코스가 없습니다.</p>
            </article>
          )}

          {filtered.map((row) => {
            const { course, completedCount, totalCount, nextLesson, status, avgScore } = row;
            const statusLabel = status === 'done' ? '완료' : status === 'in-progress' ? '진행중' : '미시작';
            const statusClass = status === 'done' ? 'status-done' : status === 'in-progress' ? 'status-progress' : 'status-idle';

            return (
              <article key={course.id} className="panel">
                <div className="course-progress-row">
                  <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                  <span className="sub">완료 레슨 {completedCount}/{totalCount}</span>
                </div>

                <div className="row between">
                  <div>
                    <p className="badge">{course.stage || course.track}</p>
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <p className="sub">레슨 수 {course.lessonCount}개 · 다음 레슨 {nextLesson?.title ?? '완료'}</p>
                    {avgScore != null && <p className="sub">최근 퀴즈 평균 {avgScore}%</p>}
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
                    {openLessonsQuery.isLoading && <p>레슨 로딩 중...</p>}
                    {openLessonsQuery.isError && (
                      <div className="stack">
                        <p>레슨을 불러오지 못했습니다.</p>
                        <button className="btn" onClick={() => openLessonsQuery.refetch()}>다시 시도</button>
                      </div>
                    )}
                    {openLessons.map((lesson) => (
                      <div key={lesson.id} className="lesson-item">
                        <div>
                          <h4>{lesson.title}</h4>
                          <p>{lesson.summary}</p>
                          {completedSet.has(lesson.id) && <p className="sub">완료됨</p>}
                        </div>
                        <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="btn primary">
                          {completedSet.has(lesson.id) ? '복습하기' : '학습 시작'}
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
            {stageStats.map((stage) => (
              <li key={stage.stage}>
                {stage.stage}: {stage.completedLessonsCount}/{stage.totalLessons} 레슨 완료 · {stage.totalCourses}개 코스
                {stage.nextCourse && (
                  <>
                    {' '}· <button
                      className="text-link-btn"
                      onClick={() => {
                        setStageFilter(stage.stage);
                        setOpenCourseId(stage.nextCourse?.id || null);
                      }}
                    >
                      다음 코스: {stage.nextCourse.title}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <h3>코스 선택 팁</h3>
          <ul className="clean-list">
            <li>입문은 결론-근거-실행 3문장 구조를 먼저 고정하세요.</li>
            <li>중급부터는 반례/오차 복기를 같이 기록해 정확도를 올리세요.</li>
            <li>미완료 필터로 현재 단계를 끝낸 뒤 다음 단계로 넘어가세요.</li>
          </ul>
        </aside>
      </section>
    </section>
  );
}
