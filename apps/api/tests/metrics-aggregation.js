import assert from 'node:assert/strict';
import {
  aggregateMetrics,
  evaluateThresholds,
  DEFAULT_METRIC_THRESHOLDS
} from '../src/ops/metrics.js';

const sample = [
  {
    type: 'reading_metric',
    fallbackUsed: true,
    fallbackReason: 'model_unavailable',
    failureStage: 'model_unavailable',
    questionType: 'binary',
    readingKind: 'overall_fortune',
    fortunePeriod: 'today',
    totalMs: 4200
  },
  {
    type: 'reading_metric',
    fallbackUsed: false,
    fallbackReason: null,
    failureStage: null,
    questionType: 'career',
    readingKind: 'general_reading',
    fortunePeriod: null,
    totalMs: 3100
  },
  {
    type: 'reading_metric',
    fallbackUsed: false,
    fallbackReason: null,
    failureStage: null,
    questionType: 'career',
    readingKind: 'general_reading',
    fortunePeriod: null,
    totalMs: 1800
  }
];

const report = aggregateMetrics(sample, '/tmp/metrics.log');
assert.equal(report.totalReadings, 3);
assert.equal(report.fallbackRatePct, 33.33);
assert.equal(report.latency.p95, 4200);
assert.equal(report.byQuestionType.career, 2);

const status = evaluateThresholds(report, DEFAULT_METRIC_THRESHOLDS);
assert.equal(status.ok, false);
assert.ok(status.issues.some((it) => it.metric === 'fallbackRatePct'));
assert.ok(status.issues.some((it) => it.metric === 'latency.p95'));

console.log('Metrics aggregation tests passed.');
