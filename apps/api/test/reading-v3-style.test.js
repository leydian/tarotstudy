import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { spreads } from '../src/data/spreads.js';

process.env.START_API_SERVER = 'false';

const { buildReadingV3ForQa } = await import('../src/index.js');

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

function buildItems(spreadId, offset = 0) {
  const spread = spreads.find((item) => item.id === spreadId);
  assert.ok(spread, `missing spread ${spreadId}`);
  return spread.positions.map((position, idx) => ({
    position: { name: position.name, meaning: position.meaning || '' },
    orientation: (idx + offset) % 3 === 0 ? 'reversed' : 'upright',
    card: cloneCard(cards[(offset + idx) % cards.length])
  }));
}

test('reading v3 generates immersive structure with guardrails', () => {
  const result = buildReadingV3ForQa({
    spreadId: 'three-card',
    spreadName: '과거-현재-미래',
    items: buildItems('three-card', 3),
    context: '시험 합격할 수 있을까?',
    level: 'beginner'
  });

  assert.equal(result.style, 'immersive');
  assert.ok(result.bridge.length > 0);
  assert.ok(['yes', 'conditional', 'hold'].includes(result.verdict.label));
  assert.ok(result.verdict.sentence.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.evidence.length >= 1);
  assert.ok(result.evidence.length <= 3);
  assert.equal(result.guardrails.bannedAbsolute, true);
  assert.ok(result.action.now.length > 0);
  assert.ok(result.action.checkin.length > 0);
});

test('reading v3 avoids absolute expressions in core lines', () => {
  const result = buildReadingV3ForQa({
    spreadId: 'one-card',
    spreadName: '원카드',
    items: buildItems('one-card', 11),
    context: '이번 시험 망하는 거 아니야?',
    level: 'intermediate'
  });

  const merged = [
    result.bridge,
    result.verdict.sentence,
    result.caution,
    result.action.now,
    result.action.checkin,
    result.closing
  ].join(' ');
  assert.equal(/(불가능|반드시|틀림없)/.test(merged), false);
});

