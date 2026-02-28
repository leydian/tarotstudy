import fs from 'node:fs';
import path from 'node:path';

const defaultPath = path.resolve('tmp/metrics.log');
const inputPath = path.resolve(process.argv[2] || process.env.TAROT_METRIC_LOG_PATH || defaultPath);

if (!fs.existsSync(inputPath)) {
  console.error(`Metric log file not found: ${inputPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(inputPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const safeParse = (line) => {
  const payload = line.startsWith('[Tarot Metric] ')
    ? line.replace('[Tarot Metric] ', '')
    : line;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const metrics = lines
  .map(safeParse)
  .filter((m) => m && m.type === 'reading_metric');

if (metrics.length === 0) {
  console.error('No reading_metric entries found.');
  process.exit(1);
}

const percentile = (values, p) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const countBy = (arr, keyFn) => arr.reduce((acc, item) => {
  const key = keyFn(item) || 'unknown';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const total = metrics.length;
const fallbackCount = metrics.filter((m) => m.fallbackUsed).length;
const totalMsValues = metrics.map((m) => Number(m.totalMs)).filter((n) => Number.isFinite(n) && n >= 0);

const report = {
  inputPath,
  totalReadings: total,
  fallbackRatePct: Number(((fallbackCount / total) * 100).toFixed(2)),
  latency: {
    sampleSize: totalMsValues.length,
    p50: percentile(totalMsValues, 50),
    p95: percentile(totalMsValues, 95)
  },
  byFailureStage: countBy(metrics, (m) => m.failureStage || 'none'),
  byFallbackReason: countBy(metrics, (m) => m.fallbackReason || 'none'),
  byQuestionType: countBy(metrics, (m) => m.questionType || 'unknown'),
  byReadingKind: countBy(metrics, (m) => m.readingKind || 'unknown'),
  byFortunePeriod: countBy(metrics, (m) => m.fortunePeriod || 'none')
};

console.log(JSON.stringify(report, null, 2));
