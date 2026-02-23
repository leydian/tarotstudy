import test from 'node:test';
import assert from 'node:assert/strict';
import { toCanonicalDrawPayload } from '../src/domains/spreads/canonical-reading.js';

test('canonical draw payload maps legacy fields into stable reading contract', () => {
  const payload = toCanonicalDrawPayload({
    spreadId: 'one-card',
    spreadName: '원카드',
    variantId: null,
    variantName: null,
    level: 'beginner',
    context: '오늘의 흐름',
    readingExperiment: 'A',
    drawnAt: '2026-02-23T12:00:00.000Z',
    items: [],
    summary: '핵심 흐름을 먼저 점검하세요.',
    readingV3: {
      bridge: '먼저 마음을 가볍게 정리해보세요.',
      verdict: { label: 'conditional', sentence: '조건부로 진행 가능합니다.' },
      evidence: [{ cardName: 'The Star', narrativeLine: '희망 신호가 보입니다.' }],
      caution: '무리한 확장은 피하세요.',
      action: { now: '우선순위 1개를 정하세요.', checkin: '오늘 저녁 1회 복기하세요.' },
      closing: '작은 실행부터 시작하면 충분합니다.'
    },
    tonePayload: { source: 'readingModel-derived' },
    readingModel: { meta: { version: 'readingModel-v1' } },
    policyVersion: 'policy-v1',
    policySource: 'docs/persona-onepager.md'
  });

  assert.equal(payload.spreadId, 'one-card');
  assert.equal(payload.verdict.label, 'conditional');
  assert.equal(payload.actions.now, '우선순위 1개를 정하세요.');
  assert.ok(Array.isArray(payload.reading.summary));
  assert.ok(Array.isArray(payload.reading.detail));
  assert.ok(Array.isArray(payload.reading.checklist));
  assert.ok(Array.isArray(payload.reading.evidence));
  assert.equal(payload.meta.modelVersion, 'readingModel-v1');
  assert.equal(payload.compatibility.summary, '핵심 흐름을 먼저 점검하세요.');
});
