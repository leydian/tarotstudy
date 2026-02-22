import test from 'node:test';
import assert from 'node:assert/strict';
import { getCardById } from '../src/data/cards.js';
import { buildSpreadReading } from '../src/content.js';

const context = '강남에서 일하는 게 좋을까 용인에서 일하는 게 좋을까?';

test('choice-a-b reading reflects work-location decision axes and avoids repetitive boilerplate', () => {
  const moon = getCardById('major-18');
  const wandNine = getCardById('minor-wands-nine');
  const wandSix = getCardById('minor-wands-six');
  assert.ok(moon && wandNine && wandSix, 'cards should exist');

  const current = buildSpreadReading({
    card: moon,
    spreadId: 'choice-a-b',
    position: { name: '현재 상황' },
    orientation: 'upright',
    level: 'beginner',
    context,
    experimentVariant: 'A'
  });

  const aNear = buildSpreadReading({
    card: wandNine,
    spreadId: 'choice-a-b',
    position: { name: 'A 선택 시 가까운 미래' },
    orientation: 'upright',
    level: 'beginner',
    context,
    experimentVariant: 'A'
  });

  const aResult = buildSpreadReading({
    card: wandSix,
    spreadId: 'choice-a-b',
    position: { name: 'A 선택 시 결과' },
    orientation: 'upright',
    level: 'beginner',
    context,
    experimentVariant: 'A'
  });

  assert.match(aNear.interpretation, /(통근|교통|생활비|지속 가능성)/);
  assert.match(aResult.interpretation, /(성장 기회|지속 가능성|생활비)/);

  const legacyPhrases = /(오늘은 가볍게 한 걸음만 보태보세요|유지 가능성 기준으로 두고, '.*' 신호를 리스크 항목으로 비교해보세요)/;
  assert.doesNotMatch(current.interpretation, legacyPhrases);
  assert.doesNotMatch(aNear.interpretation, legacyPhrases);

  assert.notEqual(aNear.interpretation, aResult.interpretation, 'position readings should be differentiated');
  assert.doesNotMatch(current.coreMessage, /불안이 열려 있어서 .*힘을 실어주기 좋은 타이밍/);
});

test('choice-a-b reading maps purchase context to budget/usability axes and avoids particle errors', () => {
  const devil = getCardById('major-15');
  const moon = getCardById('major-18');
  assert.ok(devil && moon, 'cards should exist');

  const purchaseContext = '샤넬을 살까 버버리를 살까?';
  const bNear = buildSpreadReading({
    card: devil,
    spreadId: 'choice-a-b',
    position: { name: 'B 선택 시 가까운 미래' },
    orientation: 'upright',
    level: 'beginner',
    context: purchaseContext,
    experimentVariant: 'A'
  });
  const aResult = buildSpreadReading({
    card: moon,
    spreadId: 'choice-a-b',
    position: { name: 'A 선택 시 결과' },
    orientation: 'upright',
    level: 'beginner',
    context: purchaseContext,
    experimentVariant: 'A'
  });

  assert.match(bNear.interpretation, /(예산 압박|활용도|스타일 적합성|3개월 후 만족도)/);
  assert.match(aResult.interpretation, /(예산 압박|활용도|스타일 적합성|3개월 후 만족도)/);
  assert.match(bNear.interpretation, /(유혹|과열|경계|통제)/);
  assert.doesNotMatch(aResult.interpretation, /'[^']+'는/);
});
