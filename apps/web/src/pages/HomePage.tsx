import { Link } from 'react-router-dom';
import { useProgressStore } from '../state/progress';

export function HomePage() {
  const completedLessons = useProgressStore((s) => s.completedLessons.length);
  const quizHistory = useProgressStore((s) => s.quizHistory);

  const avgScore = quizHistory.length
    ? Math.round(quizHistory.reduce((acc, item) => acc + item.percent, 0) / quizHistory.length)
    : 0;

  return (
    <section className="page-shell">
      <article className="hero-card page-hero">
        <div>
          <p className="eyebrow">코스형 학습</p>
          <h2>타로를 "암기"가 아니라 "해석"으로 익히기</h2>
          <p>
            라이더웨이트 78장 전체를 입문/중급 트랙으로 나눠 학습하고,
            카드별 상세 설명과 퀴즈 해설로 실력을 누적합니다.
          </p>
        </div>
        <div className="hero-actions">
          <Link to="/courses" className="btn primary">코스 시작</Link>
          <Link to="/library" className="btn">카드 도감 보기</Link>
          <Link to="/spreads" className="btn">스프레드 실습</Link>
        </div>
      </article>

      <section className="kpi-row">
        <article className="kpi-card">
          <p className="sub">완료 레슨</p>
          <h3>{completedLessons}</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">퀴즈 평균</p>
          <h3>{avgScore}%</h3>
        </article>
        <article className="kpi-card">
          <p className="sub">추천 다음 단계</p>
          <h3>스프레드 복기</h3>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel content-main">
          <h3>학습 현황</h3>
          <p>완료한 레슨: <strong>{completedLessons}</strong></p>
          <p>최근 퀴즈 평균: <strong>{avgScore}%</strong></p>
          <Link to="/dashboard" className="text-link">대시보드로 이동</Link>
        </article>
        <article className="panel content-side">
          <h3>추천 학습 루트</h3>
          <ol className="clean-list">
            <li>입문 코어(메이저) 3개 레슨 완료</li>
            <li>카드 도감에서 약점 카드 북마크</li>
            <li>중급 비교 해석 퀴즈 반복</li>
          </ol>
        </article>
      </section>
    </section>
  );
}
