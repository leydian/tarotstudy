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

test('policy prompt steering uses style adaptation without boilerplate append', () => {
  const reading = buildSpreadReading({
    card: cloneCard(cards[11]),
    spreadId: 'three-card',
    position: getPosition('three-card', 1),
    orientation: 'upright',
    level: 'intermediate',
    context: '불안해서 결정이 어려워',
    experimentVariant: 'A'
  });

  assert.match(reading.interpretation, /(확인|차분|보류|완충)/);
  assert.doesNotMatch(reading.interpretation, /불안을 키우는 단정은 내려놓고/);
  assert.doesNotMatch(reading.interpretation, /질문\(".*"\)\s*기준으로/);
});
