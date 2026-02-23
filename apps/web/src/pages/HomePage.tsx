import { Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getProgressUserId, useProgressStore } from '../state/progress';
import { PageHero } from '../components/PageHero';
import { KpiRow } from '../components/KpiRow';
import type { RecommendationReason } from '../types';

export function HomePage() {
  const completedLessonIds = useProgressStore((s) => s.completedLessons);
  const quizHistory = useProgressStore((s) => s.quizHistory);
  const completedLessons = completedLessonIds.length;
  const userId = getProgressUserId();
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: api.getCourses });
  const nextActionsQuery = useQuery({ queryKey: ['next-actions', userId], queryFn: () => api.getNextActions(userId) });
  const courses = coursesQuery.data ?? [];
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);

  useEffect(() => {
    void api.reportEventsBatch([{ type: 'home_viewed', path: '/', userId }]).catch(() => {});
  }, [userId]);

  const avgScore = quizHistory.length
    ? Math.round(quizHistory.reduce((acc, item) => acc + item.percent, 0) / quizHistory.length)
    : 0;
  const nextTarget = useMemo(() => {
    const ordered = [...courses].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    for (const course of ordered) {
      const lessons = course.lessonOutline || [];
      if (!lessons.length) {
        continue;
      }
      const nextLesson = lessons.find((lesson) => !completedSet.has(lesson.id));
      if (nextLesson) {
        return { course, lesson: nextLesson };
      }
    }
    return null;
  }, [completedSet, courses]);
  const reason = useMemo<RecommendationReason | null>(() => {
    if (!nextTarget) return null;
    const remaining = (nextTarget.course.lessonOutline || []).filter((lesson) => !completedSet.has(lesson.id)).length;
    return {
      stage: nextTarget.course.stage || '기타',
      remainingLessons: remaining,
      message: `${nextTarget.course.stage} 단계에서 남은 ${remaining}개 레슨 중 우선순위입니다.`
    };
  }, [completedSet, nextTarget]);
  const nextStepLabel = nextTarget ? `${nextTarget.course.stage}: ${nextTarget.lesson.title}` : '스프레드 복기';

  if (coursesQuery.isLoading) {
    return (
      <section className="page-shell">
        <article className="panel">
          <p className="sub">홈 데이터를 불러오는 중...</p>
        </article>
      </section>
    );
  }

  if (coursesQuery.isError) {
    return (
      <section className="page-shell">
        <article className="panel">
          <h3>홈 데이터를 불러오지 못했습니다.</h3>
          <p className="sub">API 연결 상태를 확인한 뒤 다시 시도해주세요.</p>
          <button className="btn" onClick={() => coursesQuery.refetch()}>다시 시도</button>
        </article>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <PageHero
        eyebrow="코스형 학습"
        title={'타로를 "암기"가 아니라 "해석"으로 익히기'}
        description="라이더웨이트 78장 전체를 입문/중급 트랙으로 나눠 학습하고, 카드별 상세 설명과 퀴즈 해설로 실력을 누적합니다."
        actions={
          <>
          <Link to="/courses" className="btn primary">코스 시작</Link>
          <Link to="/library" className="btn">카드 도감 보기</Link>
          <Link to="/spreads" className="btn">스프레드 실습</Link>
          </>
        }
      />

      <KpiRow
        items={[
          { label: '완료 레슨', value: completedLessons },
          { label: '퀴즈 평균', value: `${avgScore}%` },
          { label: '추천 다음 단계', value: nextStepLabel }
        ]}
      />

      <section className="content-grid">
        <article className="panel content-main">
          <h3>학습 현황</h3>
          <p>완료한 레슨: <strong>{completedLessons}</strong></p>
          <p>최근 퀴즈 평균: <strong>{avgScore}%</strong></p>
          {nextTarget && (
            <p>
              다음 추천 레슨:{' '}
              <Link
                className="text-link"
                to={`/courses/${nextTarget.course.id}/lessons/${nextTarget.lesson.id}`}
              >
                {nextTarget.lesson.title}
              </Link>
            </p>
          )}
          {reason && <p className="sub">추천 근거: {reason.message}</p>}
          <Link to="/dashboard" className="text-link">대시보드로 이동</Link>
        </article>
        <article className="panel content-side">
          <h3>다음 액션</h3>
          {nextActionsQuery.isLoading && <p className="sub">추천 액션 계산 중...</p>}
          {nextActionsQuery.isError && <p className="sub">추천 액션을 불러오지 못했습니다.</p>}
          {!nextActionsQuery.isLoading && (
            <ol className="clean-list">
              {(nextActionsQuery.data?.actions || []).slice(0, 4).map((action) => (
                <li key={action.id}>
                  <strong>{action.title}</strong>
                  <p className="sub">{action.description}</p>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </section>
  );
}
