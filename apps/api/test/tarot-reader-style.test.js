import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { spreads } from '../src/data/spreads.js';

const { buildSpreadReading } = await import('../src/content.js');

function cloneCard(base) {
  return {
    id: base.id,
    name: base.name,
    nameKo: base.nameKo,
    arcana: base.arcana,
    suit: base.suit,
    suitKo: base.suitKo,
    rank: base.rank,
    rankKo: base.rankKo,
    keywords: Array.isArray(base.keywords) ? [...base.keywords] : []
  };
}

function getPosition(spreadId, index = 0) {
  const spread = spreads.find((item) => item.id === spreadId);
  assert.ok(spread, `missing spread ${spreadId}`);
  return spread.positions[index] || spread.positions[0] || { name: '핵심', meaning: '' };
}

test('tarot reader keeps learning-leader lexicon out of tarot text', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[9]),
    spreadId: 'three-card',
    position: getPosition('three-card', 1),
    orientation: 'reversed',
    level: 'intermediate',
    context: '지금 이직을 준비해도 괜찮을까?',
    experimentVariant: 'A'
  });

  assert.doesNotMatch(reading.coreMessage, /\[학습 리더\]|학습 코칭|복기 질문|리딩 검증/);
  assert.doesNotMatch(reading.interpretation, /\[학습 리더\]|학습 코칭|복기 질문|리딩 검증/);
});

test('tarot narrative metadata is attached and guardrails stay conditional', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[5]),
    spreadId: 'monthly-fortune',
    position: getPosition('monthly-fortune', 0),
    orientation: 'upright',
    level: 'beginner',
    context: '다음 달 관계 흐름이 궁금해',
    experimentVariant: 'B'
  });

  assert.ok(reading.tarotPersonaMeta);
  assert.ok(['short', 'linked', 'timeline'].includes(reading.tarotPersonaMeta.narrativePreset));
  assert.ok(typeof reading.tarotPersonaMeta.evidenceCount === 'number');
  assert.ok(reading.tarotPersonaMeta.tarotPurityScore >= 90);
  assert.equal(reading.tarotPersonaMeta.voiceProfile, 'calm-oracle');
  assert.ok(['high', 'mid', 'low'].includes(reading.tarotPersonaMeta.storyDensity));
  assert.ok(typeof reading.tarotPersonaMeta.symbolHits === 'number');
  assert.ok(['scene-symbol-flow-action', 'partial'].includes(reading.tarotPersonaMeta.arcProgression));
  assert.ok(reading.tarotPersonaMeta.symbolHits >= 1);
  assert.equal(reading.tarotPersonaMeta.arcProgression, 'scene-symbol-flow-action');
  assert.match(reading.interpretation, /(가능성|이 흐름이라면|조건이 맞으면|지금은|우선)/);
  assert.match(reading.interpretation, /(상징|문|빛|그림자|경계|전환|불꽃|물결|칼날|토대|왕관|등불|거울)/);
});

test('learning persona metadata is attached and keeps compact sentence count', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[30]),
    spreadId: 'weekly-fortune',
    position: getPosition('weekly-fortune', 2),
    orientation: 'upright',
    level: 'intermediate',
    context: '이번 주 시험 준비 방향이 맞을까?',
    experimentVariant: 'A'
  });

  assert.ok(reading.learningPersonaMeta);
  assert.ok(reading.learningPersonaMeta.sentenceCount >= 3);
  assert.ok(reading.learningPersonaMeta.sentenceCount <= 5);
  assert.ok(['low', 'mid', 'high'].includes(reading.learningPersonaMeta.repetitionRisk));
});

test('quality metadata is attached for core and interpretation natural tone checks', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[42]),
    spreadId: 'three-card',
    position: getPosition('three-card', 0),
    orientation: 'upright',
    level: 'beginner',
    context: '이번 주 관계 흐름을 보고 싶어',
    experimentVariant: 'A'
  });

  assert.ok(reading.qualityMeta);
  assert.ok(reading.qualityMeta.coreMessage);
  assert.ok(reading.qualityMeta.interpretation);
  assert.equal(typeof reading.qualityMeta.rewriteApplied, 'boolean');
  assert.equal(typeof reading.qualityMeta.passCount, 'number');
  assert.equal(typeof reading.qualityMeta.passes, 'boolean');
});
