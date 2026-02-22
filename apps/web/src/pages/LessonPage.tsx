import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useProgressStore } from '../state/progress';

export function LessonPage() {
  const { courseId, lessonId } = useParams();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const spreadHistory = useProgressStore((s) => s.spreadHistory);
  const isCompleted = Boolean(lessonId && completedLessons.includes(lessonId));

  const lessonsQuery = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => api.getLessons(courseId as string),
    enabled: Boolean(courseId)
  });

  if (lessonsQuery.isLoading) return <p>레슨을 불러오는 중...</p>;
  if (lessonsQuery.isError || !lessonsQuery.data) return <p>레슨을 불러오지 못했습니다.</p>;

  const lesson = lessonsQuery.data.find((item) => item.id === lessonId);
  if (!lesson) return <p>해당 레슨을 찾을 수 없습니다.</p>;
  const hasStoryNovel = Boolean(lesson.detail?.storyNovel && lesson.detail.storyNovel.length > 0);
  const detail = lesson.detail;

  return (
    <section className="stack">
      <article className="panel">
        <p className="eyebrow">레슨</p>
        <h2>{lesson.title}</h2>
        <p>{lesson.summary}</p>
        {lesson.detail?.intro && <p>{lesson.detail.intro}</p>}
        <div className="hero-actions">
          <Link to={`/quiz/${lesson.id}`} className="btn primary">퀴즈 시작</Link>
          <Link to="/courses" className="btn">코스로 돌아가기</Link>
        </div>
      </article>

      {isCompleted && (
        <article className="panel lesson-panel">
          <h3>다음 액션 카드</h3>
          <ul className="clean-list lesson-detail-list">
            <li>복습: 같은 레슨 퀴즈를 `exam` 모드로 1회 재도전하세요.</li>
            <li>실습: 스프레드에서 현재 질문으로 1회 드로우 후 복기를 남기세요.</li>
            <li>누적 기록: {spreadHistory.length}건의 스프레드 복기 기록이 있습니다.</li>
          </ul>
          <div className="hero-actions">
            <Link to={`/quiz/${lesson.id}`} className="btn">퀴즈 재도전</Link>
            <Link to="/spreads" className="btn primary">스프레드 실습</Link>
          </div>
        </article>
      )}

      {detail && (
        <>
          {detail.learningGoals.length > 0 && (
            <article className="panel lesson-panel">
              <h3>학습 목표</h3>
              <ul className="clean-list lesson-detail-list">
                {detail.learningGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </article>
          )}

          {detail.storyNovel && detail.storyNovel.length > 0 && (
            <article className="panel lesson-panel lesson-prose-panel">
              <h3>레슨 소설</h3>
              <div className="lesson-prose-wrap">
                {detail.storyNovel.map((paragraph) => (
                  <p key={paragraph} className="lesson-prose-paragraph">{paragraph}</p>
                ))}
              </div>
            </article>
          )}

          {(detail.lessonBody.length > 0 || detail.coreConcepts.length > 0) && (
            <article className="panel lesson-panel">
              {detail.lessonBody.length > 0 && (
                <>
                  <h3>레슨 본문</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.lessonBody.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}

              {detail.coreConcepts.length > 0 && (
                <>
                  <h3>핵심 이론</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.coreConcepts.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          )}

          {!hasStoryNovel && detail.lessonFlow.length > 0 && (
            <article className="panel lesson-panel">
              <h3>레슨 진행 순서</h3>
              <ul className="clean-list lesson-detail-list">
                {detail.lessonFlow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          )}

          {!hasStoryNovel && detail.onePassScript && detail.onePassScript.length > 0 && (
            <article className="panel lesson-panel">
              <h3>한 번에 읽는 실전 스크립트</h3>
              <ul className="clean-list lesson-detail-list">
                {detail.onePassScript.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          )}

          {detail.workedExample.length > 0 && (
            <article className="panel lesson-panel">
              <h3>예시 리딩</h3>
              <ul className="clean-list lesson-detail-list">
                {detail.workedExample.map((line) => (
                  <li key={line}>
                    <pre className="lesson-example-pre">{line}</pre>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {(detail.practiceChecklist.length > 0 || detail.commonMistakes.length > 0 || detail.coachingScript.length > 0) && (
            <article className="panel lesson-panel">
              {detail.practiceChecklist.length > 0 && (
                <>
                  <h3>실전 체크리스트</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.practiceChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {detail.commonMistakes.length > 0 && (
                <>
                  <h3>흔한 실수와 교정 포인트</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.commonMistakes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {detail.coachingScript.length > 0 && (
                <>
                  <h3>지도 스크립트</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.coachingScript.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          )}

          {(detail.assignment || detail.completionCriteria.length > 0 || detail.reflectionQuestions.length > 0) && (
            <article className="panel lesson-panel">
              {detail.assignment && (
                <>
                  <h3>과제</h3>
                  <p className="lesson-assignment">{detail.assignment}</p>
                </>
              )}

              {detail.completionCriteria.length > 0 && (
                <>
                  <h3>완료 기준</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.completionCriteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {detail.reflectionQuestions.length > 0 && (
                <>
                  <h3>복기 질문</h3>
                  <ul className="clean-list lesson-detail-list">
                    {detail.reflectionQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          )}
        </>
      )}

      <article className="panel">
        <h3>학습 카드</h3>
        <div className="chip-wrap">
          {lesson.cards.map((card) => (
            <Link key={card.id} to={`/cards/${card.id}`} className="chip-link">
              {card.nameKo}
            </Link>
          ))}
        </div>
      </article>

      <article className="mobile-sticky-actions">
        <Link to={`/quiz/${lesson.id}`} className="btn primary">퀴즈 시작</Link>
        <Link to="/courses" className="btn">코스 목록</Link>
      </article>
    </section>
  );
}
