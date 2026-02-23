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

test('tarot persona metadata includes explicit persona application', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[17]),
    spreadId: 'three-card',
    position: getPosition('three-card', 0),
    orientation: 'upright',
    level: 'intermediate',
    context: '신규 기능 가설을 이번 달에 어떻게 실험해야 할까?',
    experimentVariant: 'A',
    personaGroup: 'planner',
    personaId: 'pm'
  });

  assert.ok(reading.tarotPersonaMeta?.personaApplied);
  assert.equal(reading.tarotPersonaMeta.personaApplied.group, 'planner');
  assert.equal(reading.tarotPersonaMeta.personaApplied.id, 'pm');
  assert.equal(reading.tarotPersonaMeta.personaApplied.source, 'explicit');
  assert.ok(typeof reading.tarotPersonaMeta.personaFitScore === 'number');
  assert.ok(typeof reading.tarotPersonaMeta.evidenceStructureScore === 'number');
  assert.ok(typeof reading.tarotPersonaMeta.actionClarityScore === 'number');
});

test('tarot persona metadata infers persona from context when not explicit', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[7]),
    spreadId: 'choice-a-b',
    position: getPosition('choice-a-b', 0),
    orientation: 'reversed',
    level: 'intermediate',
    context: '장애율을 줄이려면 SLO 관점에서 어떤 구조가 나을까?',
    experimentVariant: 'B'
  });

  assert.ok(reading.tarotPersonaMeta?.personaApplied);
  assert.equal(reading.tarotPersonaMeta.personaApplied.group, 'developer');
  assert.equal(reading.tarotPersonaMeta.personaApplied.id, 'backend');
  assert.equal(reading.tarotPersonaMeta.personaApplied.source, 'inferred');
});
