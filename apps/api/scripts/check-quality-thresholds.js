import {
  resolveMetricLogPath,
  readEventsFromFile,
  aggregateQualityFeedback,
  evaluateQualityThresholds
} from '../src/ops/metrics.js';

try {
  const inputPath = resolveMetricLogPath(process.argv[2] || process.env.TAROT_METRIC_LOG_PATH);
  const events = readEventsFromFile(inputPath);
  const report = aggregateQualityFeedback(events, inputPath);
  const status = evaluateQualityThresholds(report);

  console.log(JSON.stringify({ report, status }, null, 2));

  const hasCritical = status.issues.some((item) => item.level === 'critical');
  if (hasCritical) process.exit(1);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
