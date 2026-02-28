import assert from 'node:assert/strict';
import {
  aggregateMetrics,
  aggregateQualityFeedback,
  filterMetrics,
  filterMetricsByRange,
  evaluateThresholds,
  evaluateQualityThresholds,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_QUALITY_THRESHOLDS
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

const qualityEvents = [
  ...withTimestamp.map((item, idx) => ({
    ...item,
    requestId: `req-${idx + 1}`,
    qualityScore: [82, 68, 74][idx],
    qualityFlags: idx === 0 ? ['summary_verdict_overlap_high'] : []
  })),
  {
    type: 'feedback_metric',
    requestId: 'req-1',
    rating: 'up',
    reasonCode: 'none',
    questionType: 'binary',
    responseMode: 'concise'
  },
  {
    type: 'feedback_metric',
    requestId: 'req-2',
    rating: 'down',
    reasonCode: 'too_long',
    questionType: 'career',
    responseMode: 'balanced'
  },
  {
    type: 'feedback_metric',
    requestId: 'req-3',
    rating: 'down',
    reasonCode: 'not_relevant',
    questionType: 'career',
    responseMode: 'creative'
  }
];
const qualityReport = aggregateQualityFeedback(qualityEvents, '/tmp/metrics.log');
assert.equal(qualityReport.totalReadings, 3);
assert.equal(qualityReport.totalFeedback, 3);
assert.equal(qualityReport.avgQualityScore, 74.67);
assert.equal(qualityReport.feedbackDownRatePct, 66.67);
assert.equal(qualityReport.overlapFlagRatePct, 33.33);
assert.equal(qualityReport.feedbackByReasonCode.too_long, 1);
assert.equal(qualityReport.feedbackByReasonCode.not_relevant, 1);

const qualityStatus = evaluateQualityThresholds(qualityReport, DEFAULT_QUALITY_THRESHOLDS);
assert.equal(qualityStatus.ok, false);
assert.ok(qualityStatus.issues.some((it) => it.metric === 'feedbackDownRatePct'));
assert.ok(qualityStatus.issues.some((it) => it.metric === 'overlapFlagRatePct'));

console.log('Metrics aggregation tests passed.');
