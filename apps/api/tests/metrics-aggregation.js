import assert from 'node:assert/strict';
import {
  aggregateMetrics,
  filterMetrics,
  filterMetricsByRange,
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
assert.equal(report.byDomainTag.unknown, 3);

const status = evaluateThresholds(report, DEFAULT_METRIC_THRESHOLDS);
assert.equal(status.ok, false);
assert.ok(status.issues.some((it) => it.metric === 'fallbackRatePct'));
assert.ok(status.issues.some((it) => it.metric === 'latency.p95'));

const nowMs = Date.parse('2026-02-28T12:00:00.000Z');
const withTimestamp = [
  { ...sample[0], timestamp: '2026-02-28T11:45:00.000Z' },
  { ...sample[1], timestamp: '2026-02-28T10:30:00.000Z' },
  { ...sample[2], timestamp: '2026-02-27T10:30:00.000Z' }
];
const recent = filterMetrics(withTimestamp, { windowMs: 60 * 60 * 1000, limit: 5, nowMs });
assert.equal(recent.length, 1);
assert.equal(recent[0].questionType, 'binary');

const ranged = filterMetricsByRange(withTimestamp, Date.parse('2026-02-28T10:00:00.000Z'), Date.parse('2026-02-28T12:00:00.000Z'));
assert.equal(ranged.length, 2);

console.log('Metrics aggregation tests passed.');
