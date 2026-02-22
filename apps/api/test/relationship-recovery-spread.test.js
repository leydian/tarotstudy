import test from 'node:test';
import assert from 'node:assert/strict';
import { spreads } from '../src/data/spreads.js';
import { getCardById } from '../src/data/cards.js';
import { buildSpreadReading } from '../src/content.js';

test('relationship-recovery spread is defined with 5 positions', () => {
  const spread = spreads.find((item) => item.id === 'relationship-recovery');
  assert.ok(spread, 'relationship-recovery spread should exist');
  assert.equal(spread.cardCount, 5);
  assert.equal(spread.positions.length, 5);
  assert.equal(spread.layout.rows, 3);
  assert.equal(spread.layout.cols, 3);

  const requiredPositions = [
    '현재 관계 상태',
    '거리/갈등의 핵심',
    '상대 관점 신호',
    '회복 행동',
    '다음 7일 흐름'
  ];
  for (const position of requiredPositions) {
    assert.ok(spread.positions.some((item) => item.name === position), `missing position: ${position}`);
    assert.ok(spread.layout.slots.some((slot) => slot.position === position), `missing slot: ${position}`);
  }
});

test('relationship-recovery reading template produces separated tarot/learning outputs', () => {
  const card = getCardById('minor-cups-two');
  assert.ok(card, 'card should exist');

  const reading = buildSpreadReading({
    card,
    spreadId: 'relationship-recovery',
    position: { name: '회복 행동' },
    orientation: 'upright',
    level: 'beginner',
    context: '재회 연락 타이밍',
    experimentVariant: 'A'
  });

  assert.ok(reading.coreMessage.length > 0);
  assert.ok(reading.interpretation.length > 0);
  assert.ok(reading.learningPoint.includes('[학습 리더]'));
  assert.doesNotMatch(reading.coreMessage, /\[학습 리더\]/);
  assert.doesNotMatch(reading.interpretation, /\[학습 리더\]/);
});
