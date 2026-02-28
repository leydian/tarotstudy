import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_METRIC_THRESHOLDS = {
  fallbackRateWarnPct: 15,
  fallbackRateCriticalPct: 25,
  p95WarnMs: 3500,
  p95CriticalMs: 5000
};

export const DEFAULT_METRIC_STORAGE_POLICY = {
  maxBytes: Number(process.env.TAROT_METRIC_MAX_BYTES || 5 * 1024 * 1024), // 5MB
  rotateSuffix: '.1'
};

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

export const resolveMetricLogPath = (inputPath) => {
  if (!inputPath) return path.resolve('tmp/metrics.log');
  return path.resolve(inputPath);
};

export const appendMetricLine = (inputPath, metric, policy = DEFAULT_METRIC_STORAGE_POLICY) => {
  const safePath = path.resolve(inputPath);
  const dirPath = path.dirname(safePath);
  const maxBytes = Number(policy?.maxBytes || DEFAULT_METRIC_STORAGE_POLICY.maxBytes);
  const rotateSuffix = String(policy?.rotateSuffix || DEFAULT_METRIC_STORAGE_POLICY.rotateSuffix);

  fs.mkdirSync(dirPath, { recursive: true });
  if (fs.existsSync(safePath)) {
    const stat = fs.statSync(safePath);
    if (Number.isFinite(maxBytes) && maxBytes > 0 && stat.size >= maxBytes) {
      const rotatedPath = `${safePath}${rotateSuffix}`;
      try {
        if (fs.existsSync(rotatedPath)) fs.unlinkSync(rotatedPath);
      } catch {
        // ignore rotation cleanup failure
      }
      fs.renameSync(safePath, rotatedPath);
    }
  }
  fs.appendFileSync(safePath, `${JSON.stringify(metric)}\n`, 'utf8');
};

export const readMetricsFromFile = (inputPath) => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Metric log file not found: ${inputPath}`);
  }

  const lines = fs.readFileSync(inputPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const metrics = lines
    .map(safeParse)
    .filter((m) => m && m.type === 'reading_metric');

  if (metrics.length === 0) {
    throw new Error('No reading_metric entries found.');
  }
  return metrics;
};

export const filterMetrics = (metrics, options = {}) => {
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const windowMs = Number(options.windowMs || 0);
  const limit = Number(options.limit || 0);
  const nowMs = Number(options.nowMs || Date.now());

  let next = safeMetrics;
  if (windowMs > 0) {
    const fromMs = nowMs - windowMs;
    next = next.filter((item) => {
      const ts = Date.parse(item?.timestamp || '');
      return Number.isFinite(ts) && ts >= fromMs && ts <= nowMs;
    });
  }

  const sorted = [...next].sort((a, b) => Date.parse(b?.timestamp || '') - Date.parse(a?.timestamp || ''));
  if (limit > 0) return sorted.slice(0, limit);
  return sorted;
};

export const filterMetricsByRange = (metrics, fromMs, toMs) => {
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  return safeMetrics.filter((item) => {
    const ts = Date.parse(item?.timestamp || '');
    return Number.isFinite(ts) && ts >= fromMs && ts < toMs;
  });
};

export const aggregateMetrics = (metrics, inputPath = null) => {
  const total = metrics.length;
  const fallbackCount = metrics.filter((m) => m.fallbackUsed).length;
  const totalMsValues = metrics.map((m) => Number(m.totalMs)).filter((n) => Number.isFinite(n) && n >= 0);
  const fallbackRatePct = total > 0 ? Number(((fallbackCount / total) * 100).toFixed(2)) : 0;

  return {
    inputPath,
    totalReadings: total,
    fallbackRatePct,
    latency: {
      sampleSize: totalMsValues.length,
      p50: percentile(totalMsValues, 50),
      p95: percentile(totalMsValues, 95)
    },
    byFailureStage: countBy(metrics, (m) => m.failureStage || 'none'),
    byFallbackReason: countBy(metrics, (m) => m.fallbackReason || 'none'),
    byQuestionType: countBy(metrics, (m) => m.questionType || 'unknown'),
    byDomainTag: countBy(metrics, (m) => m.domainTag || 'unknown'),
    byReadingKind: countBy(metrics, (m) => m.readingKind || 'unknown'),
    byFortunePeriod: countBy(metrics, (m) => m.fortunePeriod || 'none')
  };
};

export const evaluateThresholds = (report, thresholds = DEFAULT_METRIC_THRESHOLDS) => {
  const issues = [];
  const fallback = report?.fallbackRatePct;
  const p95 = report?.latency?.p95;

  if (Number.isFinite(fallback) && fallback >= thresholds.fallbackRateCriticalPct) {
    issues.push({ level: 'critical', metric: 'fallbackRatePct', value: fallback, threshold: thresholds.fallbackRateCriticalPct });
  } else if (Number.isFinite(fallback) && fallback >= thresholds.fallbackRateWarnPct) {
    issues.push({ level: 'warn', metric: 'fallbackRatePct', value: fallback, threshold: thresholds.fallbackRateWarnPct });
  }

  if (Number.isFinite(p95) && p95 >= thresholds.p95CriticalMs) {
    issues.push({ level: 'critical', metric: 'latency.p95', value: p95, threshold: thresholds.p95CriticalMs });
  } else if (Number.isFinite(p95) && p95 >= thresholds.p95WarnMs) {
    issues.push({ level: 'warn', metric: 'latency.p95', value: p95, threshold: thresholds.p95WarnMs });
  }

  return {
    ok: issues.filter((it) => it.level === 'critical').length === 0,
    issues,
    thresholds
  };
};
