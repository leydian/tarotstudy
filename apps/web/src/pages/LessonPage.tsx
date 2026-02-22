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
        <div className="hero-actions">
          <Link to={`/quiz/${lesson.id}`} className="btn primary">퀴즈 시작</Link>
          <Link to="/courses" className="btn">코스로 돌아가기</Link>
        </div>
      </article>

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
