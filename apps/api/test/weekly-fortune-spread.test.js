import test from 'node:test';
import assert from 'node:assert/strict';
import { spreads } from '../src/data/spreads.js';

test('weekly-fortune spread uses monday-to-sunday positions', () => {
  const spread = spreads.find((item) => item.id === 'weekly-fortune');
  assert.ok(spread, 'weekly-fortune spread should exist');
  assert.equal(spread.cardCount, 7);
  assert.equal(spread.positions.length, 7);

  const expected = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  assert.deepEqual(
    spread.positions.map((position) => position.name),
    expected
  );

  for (const name of expected) {
    assert.ok(spread.layout.slots.some((slot) => slot.position === name), `missing slot for ${name}`);
  }

  const legacy = ['주간 테마', '월-화', '수-목', '주간 조언'];
  for (const oldName of legacy) {
    assert.ok(!spread.positions.some((position) => position.name === oldName), `legacy position should not exist: ${oldName}`);
  }
});
