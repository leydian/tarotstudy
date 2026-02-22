import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useProgressStore } from '../state/progress';

export function DashboardPage() {
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const weakCardIds = useProgressStore((s) => s.weakCardIds);
  const quizHistory = useProgressStore((s) => s.quizHistory);
  const spreadHistory = useProgressStore((s) => s.spreadHistory);
  const reset = useProgressStore((s) => s.reset);

  const cardsQuery = useQuery({ queryKey: ['cards-all'], queryFn: () => api.getCards() });
  const imageStatsQuery = useQuery({ queryKey: ['image-fallback-stats'], queryFn: api.getImageFallbackStats, refetchInterval: 30000 });
  const imageHealthQuery = useQuery({ queryKey: ['image-health-check'], queryFn: api.getImageHealthCheck, refetchInterval: 60000 });
  const imageAlertQuery = useQuery({
    queryKey: ['image-alerts'],
    queryFn: () => api.getImageAlerts({ failRateThreshold: 20, minChecks: 6 }),
    refetchInterval: 60000
  });

  const weakCards = useMemo(() => {
    const cards = cardsQuery.data ?? [];
    const set = new Set(weakCardIds);
    return cards.filter((card) => set.has(card.id)).slice(0, 12);
  }, [cardsQuery.data, weakCardIds]);
  const reviewedSpread = useMemo(
    () => spreadHistory.filter((item) => item.outcome),
    [spreadHistory]
  );
  const spreadAccuracy = useMemo(() => {
    if (!reviewedSpread.length) return 0;
    const score = reviewedSpread.reduce((acc, item) => {
      if (item.outcome === 'matched') return acc + 1;
      if (item.outcome === 'partial') return acc + 0.5;
      return acc;
    }, 0);
    return Math.round((score / reviewedSpread.length) * 100);
  }, [reviewedSpread]);
  const spreadByType = useMemo(() => {
    const bucket = new Map<string, { total: number; score: number }>();
    for (const item of reviewedSpread) {
      const prev = bucket.get(item.spreadName) || { total: 0, score: 0 };
      const nextScore = item.outcome === 'matched' ? 1 : item.outcome === 'partial' ? 0.5 : 0;
      bucket.set(item.spreadName, { total: prev.total + 1, score: prev.score + nextScore });
    }
    return Array.from(bucket.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      accuracy: Math.round((data.score / data.total) * 100)
    }));
  }, [reviewedSpread]);

  const avg = quizHistory.length
    ? Math.round(quizHistory.reduce((acc, item) => acc + item.percent, 0) / quizHistory.length)
    : 0;

  return (
    <section className="stack">
      {imageStatsQuery.data && imageHealthQuery.data && imageAlertQuery.data && (
        <article className={`panel ${imageAlertQuery.data.alert ? 'alert-panel' : ''}`}>
          <h3>운영 알림</h3>
          {imageAlertQuery.data.alert ? (
            <p>
              이미지 소스 실패율 경고:
              {' '}{imageAlertQuery.data.metrics.failRatePercent}% (임계치 {imageAlertQuery.data.threshold.failRateThreshold}%)
            </p>
          ) : (
            <p>현재 이미지 소스 상태가 안정적입니다.</p>
          )}
          <p>fallback 이벤트 누적: {imageStatsQuery.data.totalEvents}</p>
        </article>
      )}

      <article className="panel">
        <h2>학습 대시보드</h2>
        <p>완료 레슨: {completedLessons.length}</p>
        <p>퀴즈 평균 점수: {avg}%</p>
        <p>스프레드 복기 기록: {spreadHistory.length}건</p>
        <p>스프레드 복기 정확도: {spreadAccuracy}%</p>
        <button className="btn" onClick={reset}>로컬 진도 초기화</button>
      </article>

      <article className="panel">
        <h3>최근 퀴즈 기록</h3>
        <div className="stack">
          {quizHistory.length === 0 && <p>아직 기록이 없습니다.</p>}
          {quizHistory.map((item, idx) => (
            <p key={`${item.lessonId}-${idx}`}>{item.lessonId} · {item.percent}% · {new Date(item.date).toLocaleString()}</p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>약점 카드 추천 복습</h3>
        <div className="chip-wrap">
          {weakCards.map((card) => (
            <Link className="chip-link" to={`/cards/${card.id}`} key={card.id}>{card.nameKo}</Link>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>이미지 운영 통계</h3>
        {imageStatsQuery.isLoading && <p>통계 로딩 중...</p>}
        {imageStatsQuery.data && (
          <div className="stack">
            <p>총 fallback 이벤트: {imageStatsQuery.data.totalEvents}</p>
            <p>단계별: {Object.entries(imageStatsQuery.data.byStage).map(([k, v]) => `${k}:${v}`).join(' · ') || '없음'}</p>
          </div>
        )}
      </article>

      <article className="panel">
        <h3>미러/원본 헬스체크</h3>
        {imageHealthQuery.isLoading && <p>헬스체크 로딩 중...</p>}
        {imageHealthQuery.data && (
          <div className="stack">
            <p>
              {new Date(imageHealthQuery.data.checkedAt).toLocaleString()} ·
              {' '}성공 {imageHealthQuery.data.summary.ok}/{imageHealthQuery.data.summary.total}
            </p>
            {imageHealthQuery.data.checks.slice(0, 6).map((item) => (
              <p key={`${item.cardId}-${item.source}`}>
                {item.cardId} · {item.ok ? 'ok' : 'fail'} · {item.status} · {item.latencyMs}ms
              </p>
            ))}
          </div>
        )}
      </article>

      <article className="panel">
        <h3>스프레드 정확도 리포트</h3>
        {spreadByType.length === 0 && <p>복기 데이터가 아직 없습니다.</p>}
        <div className="stack">
          {spreadByType.map((item) => (
            <p key={item.name}>{item.name} · 정확도 {item.accuracy}% · 표본 {item.total}건</p>
          ))}
        </div>
      </article>
    </section>
  );
}
