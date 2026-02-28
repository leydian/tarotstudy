import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_METRIC_THRESHOLDS = {
  fallbackRateWarnPct: 15,
  fallbackRateCriticalPct: 25,
  p95WarnMs: 3500,
  p95CriticalMs: 5000
};

export const DEFAULT_QUALITY_THRESHOLDS = {
  avgQualityScoreWarn: 72,
  avgQualityScoreCritical: 65,
  feedbackDownRateWarnPct: 30,
  feedbackDownRateCriticalPct: 40,
  overlapFlagRateWarnPct: 15,
  overlapFlagRateCriticalPct: 25
};

export const DEFAULT_METRIC_STORAGE_POLICY = {
  maxBytes: Number(process.env.TAROT_METRIC_MAX_BYTES || 5 * 1024 * 1024),
  rotateSuffix: '.1',
  retentionDays: Number(process.env.TAROT_METRIC_RETENTION_DAYS || 14)
};

const METRIC_PREFIX_PATTERN = /^\[[^\]]+\]\s*/;

const safeParse = (line) => {
  const payload = line.replace(METRIC_PREFIX_PATTERN, '');
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

const formatDateStamp = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildDailyLogPath = (safePath, date = new Date()) => {
  const dirPath = path.dirname(safePath);
  const parsed = path.parse(safePath);
  const ext = parsed.ext || '.log';
  const stem = parsed.name;
  return path.join(dirPath, `${stem}-${formatDateStamp(date)}${ext}`);
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const collectMetricFiles = (safePath) => {
  const dirPath = path.dirname(safePath);
  const parsed = path.parse(safePath);
  const ext = parsed.ext || '.log';
  const stem = parsed.name;
  const stemPattern = `${escapeRegex(stem)}(?:-\\d{4}-\\d{2}-\\d{2})?`;
  const extPattern = `${escapeRegex(ext)}(?:${escapeRegex(DEFAULT_METRIC_STORAGE_POLICY.rotateSuffix)})?`;
  const pattern = new RegExp(`^${stemPattern}${extPattern}$`);

  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(dirPath, name))
    .sort((a, b) => a.localeCompare(b));
};

const cleanupExpiredLogs = (safePath, retentionDays = DEFAULT_METRIC_STORAGE_POLICY.retentionDays) => {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  const files = collectMetricFiles(safePath);
  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if ((now - stat.mtimeMs) > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore retention cleanup failures
    }
  }
};

export const resolveMetricLogPath = (inputPath) => {
  if (!inputPath) return path.resolve('tmp/metrics.log');
  return path.resolve(inputPath);
};

export const appendMetricLine = (inputPath, metric, policy = DEFAULT_METRIC_STORAGE_POLICY) => {
  const basePath = path.resolve(inputPath);
  const dirPath = path.dirname(basePath);
  const maxBytes = Number(policy?.maxBytes || DEFAULT_METRIC_STORAGE_POLICY.maxBytes);
  const rotateSuffix = String(policy?.rotateSuffix || DEFAULT_METRIC_STORAGE_POLICY.rotateSuffix);
  const retentionDays = Number(policy?.retentionDays || DEFAULT_METRIC_STORAGE_POLICY.retentionDays);
  const dailyPath = buildDailyLogPath(basePath);

  fs.mkdirSync(dirPath, { recursive: true });

  if (fs.existsSync(dailyPath)) {
    const stat = fs.statSync(dailyPath);
    if (Number.isFinite(maxBytes) && maxBytes > 0 && stat.size >= maxBytes) {
      const rotatedPath = `${dailyPath}${rotateSuffix}`;
      try {
        if (fs.existsSync(rotatedPath)) fs.unlinkSync(rotatedPath);
      } catch {
        // ignore rotation cleanup failure
      }
      fs.renameSync(dailyPath, rotatedPath);
    }
  }

  fs.appendFileSync(dailyPath, `${JSON.stringify(metric)}\n`, 'utf8');
  cleanupExpiredLogs(basePath, retentionDays);
};

export const readEventsFromFile = (inputPath) => {
  const safePath = path.resolve(inputPath);
  const files = collectMetricFiles(safePath);
  if (files.length === 0) {
    throw new Error(`Metric log file not found: ${safePath}`);
  }

  const lines = files.flatMap((filePath) => fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean));

  const events = lines
    .map(safeParse)
    .filter((m) => m && (m.type === 'reading_metric' || m.type === 'feedback_metric'));

  if (events.length === 0) {
    throw new Error('No metric entries found.');
  }

  return events;
};

export const readMetricsFromFile = (inputPath) => {
  const events = readEventsFromFile(inputPath);
  const metrics = events.filter((m) => m.type === 'reading_metric');
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
  const qualityScores = metrics
    .map((m) => Number(m.qualityScore))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  const fallbackRatePct = total > 0 ? Number(((fallbackCount / total) * 100).toFixed(2)) : 0;
  const avgQualityScore = qualityScores.length > 0
    ? Number((qualityScores.reduce((acc, value) => acc + value, 0) / qualityScores.length).toFixed(2))
    : null;

  return {
    inputPath,
    totalReadings: total,
    fallbackRatePct,
    latency: {
      sampleSize: totalMsValues.length,
      p50: percentile(totalMsValues, 50),
      p95: percentile(totalMsValues, 95)
    },
    quality: {
      sampleSize: qualityScores.length,
      avgQualityScore
    },
    byFailureStage: countBy(metrics, (m) => m.failureStage || 'none'),
    byFallbackReason: countBy(metrics, (m) => m.fallbackReason || 'none'),
    byQuestionType: countBy(metrics, (m) => m.questionType || 'unknown'),
    byDomainTag: countBy(metrics, (m) => m.domainTag || 'unknown'),
    byReadingKind: countBy(metrics, (m) => m.readingKind || 'unknown'),
    byFortunePeriod: countBy(metrics, (m) => m.fortunePeriod || 'none')
  };
};

export const aggregateQualityFeedback = (events, inputPath = null) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const reading = safeEvents.filter((event) => event?.type === 'reading_metric');
  const feedback = safeEvents.filter((event) => event?.type === 'feedback_metric');

  const qualityScores = reading
    .map((item) => Number(item.qualityScore))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);

  const downCount = feedback.filter((item) => item?.rating === 'down').length;
  const feedbackDownRatePct = feedback.length > 0
    ? Number(((downCount / feedback.length) * 100).toFixed(2))
    : 0;

  const overlapCount = reading.filter((item) => {
    const flags = Array.isArray(item?.qualityFlags) ? item.qualityFlags : [];
    return flags.includes('summary_verdict_overlap_high') || flags.includes('style_summary_verdict_overlap_high');
  }).length;
  const overlapFlagRatePct = reading.length > 0
    ? Number(((overlapCount / reading.length) * 100).toFixed(2))
    : 0;

  const avgQualityScore = qualityScores.length > 0
    ? Number((qualityScores.reduce((acc, value) => acc + value, 0) / qualityScores.length).toFixed(2))
    : null;

  return {
    inputPath,
    totalReadings: reading.length,
    totalFeedback: feedback.length,
    avgQualityScore,
    feedbackDownRatePct,
    overlapFlagRatePct,
    feedbackByRating: countBy(feedback, (item) => item.rating || 'unknown'),
    feedbackByReasonCode: countBy(feedback, (item) => item.reasonCode || 'none'),
    feedbackByQuestionType: countBy(feedback, (item) => item.questionType || 'unknown'),
    feedbackByResponseMode: countBy(feedback, (item) => item.responseMode || 'unknown')
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

export const evaluateQualityThresholds = (report, thresholds = DEFAULT_QUALITY_THRESHOLDS) => {
  const issues = [];
  const avgQualityScore = Number(report?.avgQualityScore);
  const feedbackDownRatePct = Number(report?.feedbackDownRatePct);
  const overlapFlagRatePct = Number(report?.overlapFlagRatePct);

  if (Number.isFinite(avgQualityScore)) {
    if (avgQualityScore <= thresholds.avgQualityScoreCritical) {
      issues.push({ level: 'critical', metric: 'avgQualityScore', value: avgQualityScore, threshold: thresholds.avgQualityScoreCritical });
    } else if (avgQualityScore <= thresholds.avgQualityScoreWarn) {
      issues.push({ level: 'warn', metric: 'avgQualityScore', value: avgQualityScore, threshold: thresholds.avgQualityScoreWarn });
    }
  }

  if (Number.isFinite(feedbackDownRatePct)) {
    if (feedbackDownRatePct >= thresholds.feedbackDownRateCriticalPct) {
      issues.push({ level: 'critical', metric: 'feedbackDownRatePct', value: feedbackDownRatePct, threshold: thresholds.feedbackDownRateCriticalPct });
    } else if (feedbackDownRatePct >= thresholds.feedbackDownRateWarnPct) {
      issues.push({ level: 'warn', metric: 'feedbackDownRatePct', value: feedbackDownRatePct, threshold: thresholds.feedbackDownRateWarnPct });
    }
  }

  if (Number.isFinite(overlapFlagRatePct)) {
    if (overlapFlagRatePct >= thresholds.overlapFlagRateCriticalPct) {
      issues.push({ level: 'critical', metric: 'overlapFlagRatePct', value: overlapFlagRatePct, threshold: thresholds.overlapFlagRateCriticalPct });
    } else if (overlapFlagRatePct >= thresholds.overlapFlagRateWarnPct) {
      issues.push({ level: 'warn', metric: 'overlapFlagRatePct', value: overlapFlagRatePct, threshold: thresholds.overlapFlagRateWarnPct });
    }
  }

  return {
    ok: issues.filter((it) => it.level === 'critical').length === 0,
    issues,
    thresholds
  };
};
