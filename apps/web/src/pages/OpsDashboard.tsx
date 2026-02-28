import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import styles from './OpsDashboard.module.css';

type MetricIssue = {
  level: 'warn' | 'critical';
  metric: string;
  value: number;
  threshold: number;
};

type MetricsPayload = {
  ok: boolean;
  generatedAt?: string;
  error?: string;
  filters?: {
    window: string;
    limit: number;
  };
  previous?: {
    window: string;
    totalReadings: number;
    fallbackRatePct: number;
    latencyP95: number | null;
  } | null;
  report?: {
    inputPath: string;
    totalReadings: number;
    fallbackRatePct: number;
    latency: {
      sampleSize: number;
      p50: number | null;
      p95: number | null;
    };
    byFailureStage: Record<string, number>;
    byFallbackReason: Record<string, number>;
    byQuestionType: Record<string, number>;
    byDomainTag: Record<string, number>;
    byReadingKind: Record<string, number>;
    byFortunePeriod: Record<string, number>;
  };
  status?: {
    ok: boolean;
    issues: MetricIssue[];
    thresholds: {
      fallbackRateWarnPct: number;
      fallbackRateCriticalPct: number;
      p95WarnMs: number;
      p95CriticalMs: number;
    };
  };
};

const KeyValueList: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className={styles.empty}>데이터 없음</p>;
  return (
    <ul className={styles.list}>
      {rows.map(([key, value]) => (
        <li key={key} className={styles.listItem}>
          <span>{key}</span>
          <strong>{value}</strong>
        </li>
      ))}
    </ul>
  );
};

export function OpsDashboard() {
  const [payload, setPayload] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowFilter, setWindowFilter] = useState<'1h' | '24h' | '7d' | 'all'>('24h');
  const [limit, setLimit] = useState<number>(300);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (windowFilter !== 'all') params.set('window', windowFilter);
        params.set('limit', String(limit));
        const res = await fetch(`/api/admin/metrics?${params.toString()}`);
        const data = await res.json();
        setPayload(data);
      } catch (error) {
        setPayload({ ok: false, error: error instanceof Error ? error.message : 'Failed to fetch metrics' });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [windowFilter, limit]);

  if (loading) return <div className={styles.page}>운영 지표를 불러오는 중입니다...</div>;
  if (!payload?.ok || !payload.report || !payload.status) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <AlertTriangle size={18} />
          <p>운영 지표를 불러오지 못했습니다: {payload?.error || 'unknown'}</p>
        </div>
      </div>
    );
  }

  const { report, status } = payload;
  const criticalCount = status.issues.filter((it) => it.level === 'critical').length;
  const topReasons = Object.entries(report.byFallbackReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const sortedIssues = [...status.issues].sort((a, b) => {
    if (a.level === b.level) return b.value - a.value;
    return a.level === 'critical' ? -1 : 1;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2><Activity size={18} /> 운영 지표 대시보드</h2>
        <p>생성 시각: {payload.generatedAt ? new Date(payload.generatedAt).toLocaleString() : 'unknown'}</p>
        <div className={styles.filters}>
          <label>
            기간
            <select value={windowFilter} onChange={(e) => setWindowFilter(e.target.value as '1h' | '24h' | '7d' | 'all')}>
              <option value="1h">최근 1시간</option>
              <option value="24h">최근 24시간</option>
              <option value="7d">최근 7일</option>
              <option value="all">전체</option>
            </select>
          </label>
          <label>
            최대 건수
            <input
              type="number"
              min={50}
              max={5000}
              step={50}
              value={limit}
              onChange={(e) => setLimit(Math.min(5000, Math.max(50, Number(e.target.value || 300))))}
            />
          </label>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.card}>
          <h3>전체 요청</h3>
          <strong>{report.totalReadings}</strong>
        </div>
        <div className={styles.card}>
          <h3>Fallback Rate</h3>
          <strong>{report.fallbackRatePct}%</strong>
        </div>
        <div className={styles.card}>
          <h3>P95 지연</h3>
          <strong>{report.latency.p95 ?? 'N/A'} ms</strong>
        </div>
        <div className={`${styles.card} ${criticalCount > 0 ? styles.cardDanger : styles.cardOk}`}>
          <h3>임계치 상태</h3>
          <strong>{criticalCount > 0 ? 'CRITICAL' : status.ok ? 'OK' : 'WARN'}</strong>
        </div>
      </div>

      <div className={styles.statusBox}>
        <h3>{status.ok ? <><CheckCircle2 size={16} /> 상태 정상</> : <><Clock3 size={16} /> 임계치 경고</>}</h3>
        {sortedIssues.length === 0 ? (
          <p>현재 임계치 초과 항목이 없습니다.</p>
        ) : (
          <ul className={styles.issueList}>
            {sortedIssues.map((issue, idx) => (
              <li key={`${issue.metric}-${idx}`}>
                [{issue.level}] {issue.metric}: {issue.value} (threshold {issue.threshold})
              </li>
            ))}
          </ul>
        )}
        {payload.previous && (
          <p className={styles.compareText}>
            이전 동일 구간({payload.previous.window}) 대비:
            fallback {payload.previous.fallbackRatePct}% / p95 {payload.previous.latencyP95 ?? 'N/A'}ms
          </p>
        )}
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h4>Top Fallback Reasons</h4>
          <ul className={styles.list}>
            {topReasons.map(([reason, count]) => (
              <li key={reason} className={styles.listItem}>
                <span>{reason}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.panel}>
          <h4>Failure Stage</h4>
          <KeyValueList data={report.byFailureStage} />
        </section>
        <section className={styles.panel}>
          <h4>Fallback Reason</h4>
          <KeyValueList data={report.byFallbackReason} />
        </section>
        <section className={styles.panel}>
          <h4>Question Type</h4>
          <KeyValueList data={report.byQuestionType} />
        </section>
        <section className={styles.panel}>
          <h4>Domain Tag</h4>
          <KeyValueList data={report.byDomainTag} />
        </section>
        <section className={styles.panel}>
          <h4>Reading Kind</h4>
          <KeyValueList data={report.byReadingKind} />
        </section>
      </div>
    </div>
  );
}
