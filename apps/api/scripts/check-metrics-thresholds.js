import {
  resolveMetricLogPath,
  readMetricsFromFile,
  aggregateMetrics,
  evaluateThresholds
} from '../src/ops/metrics.js';

try {
  const inputPath = resolveMetricLogPath(process.argv[2] || process.env.TAROT_METRIC_LOG_PATH);
  const metrics = readMetricsFromFile(inputPath);
  const report = aggregateMetrics(metrics, inputPath);
  const status = evaluateThresholds(report);

  console.log(JSON.stringify({ report, status }, null, 2));

  const hasCritical = status.issues.some((item) => item.level === 'critical');
  if (hasCritical) {
    process.exit(1);
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
