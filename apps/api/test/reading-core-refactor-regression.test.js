import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { spreads } from '../src/data/spreads.js';

process.env.START_API_SERVER = 'false';

const { buildSpreadReading } = await import('../src/content.js');
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

function getPosition(spreadId, index) {
  const spread = spreads.find((item) => item.id === spreadId);
  assert.ok(spread, `missing spread ${spreadId}`);
  return spread.positions[index] || spread.positions[0];
}

test('symbol mapping uses card suit and avoids pentacles fallback on cups', () => {
  const cupSix = cards.find((card) => card.nameKo === '컵 6');
  assert.ok(cupSix, 'cup 6 card must exist');

  const reading = buildSpreadReading({
    card: cloneCard(cupSix),
    spreadId: 'three-card',
    position: getPosition('three-card', 2),
    orientation: 'upright',
    level: 'beginner',
    context: '이번 주 관계 흐름을 보고 싶어',
    experimentVariant: 'A'
  });

  const merged = `${reading.coreMessage} ${reading.interpretation}`;
  assert.ok(/물결|감정의 수면/.test(merged), 'cups symbolic cue should mention cup metaphor');
  assert.ok(!/토대\(현실의 바닥\)/.test(merged), 'cups card must not fallback to pentacles cue');
});

test('persona adaptation does not append policy boilerplate lines directly', () => {
  const moon = cards.find((card) => card.nameKo === '달');
  assert.ok(moon, 'moon card must exist');

  const reading = buildSpreadReading({
    card: cloneCard(moon),
    spreadId: 'three-card',
    position: getPosition('three-card', 0),
    orientation: 'upright',
    level: 'beginner',
    context: '이번 주 관계 흐름을 보고 싶어',
    experimentVariant: 'A'
  });

  const merged = `${reading.coreMessage} ${reading.interpretation}`;
  assert.ok(!/질문\(".*"\)\s*기준으로/.test(merged), 'question quote boilerplate should not be appended');
  assert.ok(!/사실 1개, 감정 1개, 요청 1개 순서로 전달하면 오해를 줄일 수 있습니다/.test(merged), 'persona guidance boilerplate should not be appended');
});

test('high-risk relationship action avoids immediate push action', () => {
  const relationshipSpread = spreads.find((item) => item.id === 'three-card');
  assert.ok(relationshipSpread, 'three-card spread must exist');
  const moon = cards.find((card) => card.nameKo === '달') || cards[0];
  const swordsEight = cards.find((card) => card.nameKo === '소드 8') || cards[1];
  const cupsSeven = cards.find((card) => card.nameKo === '컵 7') || cards[2];
  const items = [
    { position: relationshipSpread.positions[0], orientation: 'upright', card: cloneCard(moon) },
    { position: relationshipSpread.positions[1], orientation: 'reversed', card: cloneCard(swordsEight) },
    { position: relationshipSpread.positions[2], orientation: 'upright', card: cloneCard(cupsSeven) }
  ];

  const reading = buildReadingV3ForQa({
    spreadId: 'three-card',
    spreadName: relationshipSpread.name,
    items,
    context: '이번 주 관계 흐름을 보고 싶어',
    level: 'beginner'
  });
  const action = String(reading?.action?.now || '');
  assert.ok(/서두르지|확인 질문|10분|보류/.test(action), `action should be cautious on high-risk relation context, got: ${action}`);
});
