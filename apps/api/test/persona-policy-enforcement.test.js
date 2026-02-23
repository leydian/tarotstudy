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

test('unsupported explicit persona is rejected by onepager policy', () => {
  assert.throws(() => {
    buildSpreadReading({
      card: cloneCard(cards[0]),
      spreadId: 'three-card',
      position: getPosition('three-card', 0),
      orientation: 'upright',
      level: 'beginner',
      context: '오늘 흐름이 궁금해',
      experimentVariant: 'A',
      personaGroup: 'user',
      personaId: 'nonexistent'
    });
  }, /unsupported explicit persona/);
});

test('policy prompt steering is reflected in tarot interpretation', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[11]),
    spreadId: 'three-card',
    position: getPosition('three-card', 1),
    orientation: 'upright',
    level: 'intermediate',
    context: '불안해서 결정이 어려워',
    experimentVariant: 'A'
  });

  assert.match(reading.interpretation, /(흐름을 강조|안정을 주는 방향|불안을 키우는 단정은 내려놓고)/);
});
