import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadingModel, deriveReadingV3FromModel, deriveTonePayloadFromModel } from '../src/reading-model-builder.js';

function buildMockItem() {
  return {
    position: { name: '현재', meaning: '현재 흐름' },
    orientation: 'upright',
    card: {
      nameKo: '완드 3',
      keywords: ['확장']
    },
    coreMessage: '오늘은 기준을 하나로 좁히는 편이 좋아요.',
    interpretation: '정방향 근거를 기준으로 실행 강도를 조절해보세요.',
    tarotPersonaMeta: {
      guardrailApplied: true,
      personaApplied: { group: 'user', id: 'beginner', source: 'inferred' }
    }
  };
}

test('reading model enforces quality profile and records quality meta', () => {
  const readingModel = buildReadingModel({
    spreadId: 'one-card',
    items: [buildMockItem()],
    context: '오늘 지원서 제출해도 될까?',
    summary: '두 갈래로 보시면 됩니다. 운영이 좋습니다.',
    readingV3: {
      bridge: '좋은 구간입니다.',
      verdict: { label: 'conditional', sentence: '두 갈래로 보시면 됩니다.' },
      evidence: [{ position: '현재', cardName: '완드 3', orientation: 'upright', keyword: '확장', narrativeLine: '운영이 좋습니다.' }],
      caution: '정비를 먼저 하세요.',
      action: { now: '두 갈래로 보시면 됩니다.', checkin: '오늘 기준을 1개 기록했는지 점검해보세요.' },
      closing: '흐름이 좋습니다.'
    }
  });

  assert.ok(readingModel.meta?.quality);
  assert.equal(readingModel.meta.quality.templateScore, 0);
  assert.equal(readingModel.meta.quality.rewriteApplied, true);
  assert.equal(readingModel.meta.quality.personaInjectionMode, 'style_profile');
  assert.equal(readingModel.meta.source, 'model-native');
  assert.ok(Array.isArray(readingModel.channel.card.blocks));
  assert.ok(readingModel.channel.card.blocks.length >= 3);
});

test('legacy payloads are derived from reading model consistently', () => {
  const readingModel = buildReadingModel({
    spreadId: 'three-card',
    items: [buildMockItem()],
    context: '이번 주 연락을 시도해도 될까?',
    summary: '이번 주에는 속도 조절이 필요합니다.',
    readingV3: {
      bridge: '지금은 속도를 낮추는 구간입니다.',
      verdict: { label: 'conditional', sentence: '조건부 가능 흐름입니다.' },
      evidence: [{ position: '현재', cardName: '완드 3', orientation: 'upright', keyword: '확장', narrativeLine: '현재 포지션에서 실행 기준이 보입니다.' }],
      caution: '감정 소모를 먼저 줄이세요.',
      action: { now: '오늘 메시지 초안을 1개만 정리하세요.', checkin: '대화 후 반응을 한 줄로 기록해보세요.' },
      closing: '작은 조정이 다음 흐름을 바꿉니다.'
    }
  });
  const readingV3 = deriveReadingV3FromModel(readingModel);
  const tonePayload = deriveTonePayloadFromModel(readingModel, 'fallback summary');

  assert.ok(readingV3);
  assert.equal(readingV3.verdict.sentence, readingModel.verdict.sentence);
  assert.equal(readingV3.action.now, readingModel.actions.now);
  assert.ok(tonePayload.v3Lines);
  assert.equal(tonePayload.meta.source, 'readingModel-derived');
  assert.equal(tonePayload.v3Lines.verdict, readingModel.verdict.sentence);
});
