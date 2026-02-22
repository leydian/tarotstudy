import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function LessonPage() {
  const { courseId, lessonId } = useParams();

  const lessonsQuery = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => api.getLessons(courseId as string),
    enabled: Boolean(courseId)
  });

  if (lessonsQuery.isLoading) return <p>레슨을 불러오는 중...</p>;
  if (lessonsQuery.isError || !lessonsQuery.data) return <p>레슨을 불러오지 못했습니다.</p>;

  const lesson = lessonsQuery.data.find((item) => item.id === lessonId);
  if (!lesson) return <p>해당 레슨을 찾을 수 없습니다.</p>;

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

      {lesson.detail && (
        <article className="panel">
          {lesson.detail.onePassScript && lesson.detail.onePassScript.length > 0 && (
            <>
              <h3>한 번에 읽는 실전 스크립트</h3>
              <ul className="clean-list">
                {lesson.detail.onePassScript.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.learningGoals.length > 0 && (
            <>
              <h3>학습 목표</h3>
              <ul className="clean-list">
                {lesson.detail.learningGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.lessonFlow.length > 0 && (
            <>
              <h3>레슨 진행 순서</h3>
              <ul className="clean-list">
                {lesson.detail.lessonFlow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.lessonBody.length > 0 && (
            <>
              <h3>레슨 본문</h3>
              <ul className="clean-list">
                {lesson.detail.lessonBody.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.coreConcepts.length > 0 && (
            <>
              <h3>핵심 이론</h3>
              <ul className="clean-list">
                {lesson.detail.coreConcepts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.coachingScript.length > 0 && (
            <>
              <h3>지도 스크립트</h3>
              <ul className="clean-list">
                {lesson.detail.coachingScript.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.workedExample.length > 0 && (
            <>
              <h3>예시 리딩</h3>
              <ul className="clean-list">
                {lesson.detail.workedExample.map((line) => (
                  <li key={line}>
                    <pre>{line}</pre>
                  </li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.practiceChecklist.length > 0 && (
            <>
              <h3>실전 체크리스트</h3>
              <ul className="clean-list">
                {lesson.detail.practiceChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.commonMistakes.length > 0 && (
            <>
              <h3>흔한 실수와 교정 포인트</h3>
              <ul className="clean-list">
                {lesson.detail.commonMistakes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.assignment && (
            <>
              <h3>과제</h3>
              <p>{lesson.detail.assignment}</p>
            </>
          )}

          {lesson.detail.completionCriteria.length > 0 && (
            <>
              <h3>완료 기준</h3>
              <ul className="clean-list">
                {lesson.detail.completionCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {lesson.detail.reflectionQuestions.length > 0 && (
            <>
              <h3>복기 질문</h3>
              <ul className="clean-list">
                {lesson.detail.reflectionQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </>
          )}
        </article>
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
    </section>
  );
}
