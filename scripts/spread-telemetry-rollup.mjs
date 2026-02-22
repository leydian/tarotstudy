import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { withApiRuntime } from './lib/api-runtime.mjs';

const root = process.cwd();
const outDir = path.join(root, 'tmp');
const outJsonPath = path.join(outDir, 'spread-telemetry-report.json');
const outMdPath = path.join(outDir, 'spread-telemetry-report.md');
const minDrawForAlert = Number(process.env.SPREAD_TELEMETRY_MIN_DRAWS || 5);
const minReviewRate = Number(process.env.SPREAD_TELEMETRY_MIN_REVIEW_RATE || 20);

function toRate(draws, reviews) {
  if (!draws) return 0;
  return Number(((reviews / draws) * 100).toFixed(1));
}

function countBySpreadFromRecent(recent = []) {
  const bySpreadType = {};
  for (const row of recent) {
    const spreadId = String(row?.spreadId || 'unknown');
    const type = String(row?.type || 'unknown');
    if (!bySpreadType[spreadId]) bySpreadType[spreadId] = {};
    bySpreadType[spreadId][type] = (bySpreadType[spreadId][type] || 0) + 1;
  }
  return bySpreadType;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# 스프레드 텔레메트리 집계 리포트');
  lines.push('');
  lines.push(`- 생성 시각: ${report.generatedAt}`);
  lines.push(`- API: ${report.apiBase}`);
  lines.push(`- 전체 draw: ${report.summary.draws}`);
  lines.push(`- 전체 review: ${report.summary.reviews}`);
  lines.push(`- 전체 review 전환율: ${report.summary.reviewRate}%`);
  lines.push('');
  lines.push('## 스프레드별 전환율');
  lines.push('| spreadId | draws | reviews | reviewRate | status |');
  lines.push('|---|---:|---:|---:|---|');
  for (const row of report.bySpread) {
    lines.push(`| ${row.spreadId} | ${row.draws} | ${row.reviews} | ${row.reviewRate}% | ${row.status} |`);
  }
  lines.push('');
  lines.push('## 기준');
  lines.push(`- 최소 draw 수: ${report.thresholds.minDrawForAlert}`);
  lines.push(`- 최소 review 전환율: ${report.thresholds.minReviewRate}%`);
  if (report.usedRecentFallback) {
    lines.push('- 참고: bySpreadType 누락으로 recent 이벤트(최대 80건) 기준으로 집계했습니다.');
  }
  return `${lines.join('\n')}\n`;
}

try {
  const report = await withApiRuntime({ label: 'spread-telemetry' }, async ({ apiBase }) => {
    const res = await fetch(`${apiBase}/api/telemetry/spread-events`);
    if (!res.ok) {
      throw new Error(`telemetry fetch failed: ${res.status}`);
    }
    const payload = await res.json();
    const byType = payload?.byType || {};
    const bySpread = payload?.bySpread || {};
    let bySpreadType = payload?.bySpreadType || {};
    let usedRecentFallback = false;

    if (!Object.keys(bySpreadType).length) {
      bySpreadType = countBySpreadFromRecent(payload?.recent || []);
      usedRecentFallback = true;
    }

    const spreadIds = new Set([
      ...Object.keys(bySpread),
      ...Object.keys(bySpreadType)
    ]);

    const rows = [...spreadIds].map((spreadId) => {
      const spreadTypeBucket = bySpreadType[spreadId] || {};
      const draws = Number(spreadTypeBucket.spread_drawn || 0);
      const reviews = Number(spreadTypeBucket.spread_review_saved || 0);
      const reviewRate = toRate(draws, reviews);
      const status = draws >= minDrawForAlert && reviewRate < minReviewRate ? 'warn' : 'ok';
      return {
        spreadId,
        draws,
        reviews,
        reviewRate,
        status
      };
    }).sort((a, b) => b.draws - a.draws || b.reviews - a.reviews || a.spreadId.localeCompare(b.spreadId));

    const summary = {
      draws: Number(byType.spread_drawn || 0),
      reviews: Number(byType.spread_review_saved || 0),
      reviewRate: toRate(Number(byType.spread_drawn || 0), Number(byType.spread_review_saved || 0))
    };

    return {
      generatedAt: new Date().toISOString(),
      apiBase,
      thresholds: {
        minDrawForAlert,
        minReviewRate
      },
      usedRecentFallback,
      summary,
      bySpread: rows
    };
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outJsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(outMdPath, buildMarkdown(report), 'utf-8');

  console.log('[spread-telemetry] summary');
  console.log(JSON.stringify({
    summary: report.summary,
    spreadCount: report.bySpread.length,
    usedRecentFallback: report.usedRecentFallback,
    outJsonPath,
    outMdPath
  }, null, 2));

} catch (err) {
  console.error('[spread-telemetry] failed', err);
  process.exit(1);
}
