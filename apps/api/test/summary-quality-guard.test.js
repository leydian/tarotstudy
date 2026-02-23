import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { spreads } from '../src/data/spreads.js';

process.env.START_API_SERVER = 'false';

const { summarizeSpreadForQa } = await import('../src/index.js');
const { buildSpreadInterpretation } = await import('../src/content.js');

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

function makeItem({ positionName, cardIndex, orientation = 'upright' }) {
  const card = cloneCard(cards[cardIndex % cards.length]);
  return {
    position: { name: positionName, meaning: '' },
    card,
    orientation
  };
}

function buildSpreadItems(spreadId, offset = 0) {
  const spread = spreads.find((item) => item.id === spreadId);
  assert.ok(spread, `missing spread for ${spreadId}`);

  if (spreadId === 'yearly-fortune') {
    return Array.from({ length: 12 }, (_, i) => makeItem({
      positionName: `${i + 1}월`,
      cardIndex: offset + i,
      orientation: i % 4 === 1 ? 'reversed' : 'upright'
    }));
  }

  return spread.positions.map((position, index) => makeItem({
    positionName: position.name,
    cardIndex: offset + index,
    orientation: (index + offset) % 3 === 0 ? 'reversed' : 'upright'
  }));
}

function normalize(text = '') {
  return String(text || '').toLowerCase().replace(/[^0-9a-zA-Z가-힣]/g, '');
}

test('yearly finance summary avoids duplicated quarter templates', () => {
  const spread = spreads.find((item) => item.id === 'yearly-fortune');
  const summary = summarizeSpreadForQa({
    spreadId: 'yearly-fortune',
    spreadName: spread?.name || '연간 운세 (12개월)',
    items: buildSpreadItems('yearly-fortune', 7),
    context: '올해 재물운과 분기별 예산 운영 포인트가 궁금해',
    level: 'intermediate'
  });

  const quarterSection = String(summary)
    .split('분기별 운세:')[1]
    ?.split('월별 운세:')[0]
    ?.trim() || '';
  assert.ok(quarterSection.length > 0, 'quarter section must exist');

  const clauses = quarterSection
    .split(/(?=[1-4]분기\([^)]+\)은)/g)
    .map((line) => line.trim())
    .filter((line) => /^[1-4]분기\([^)]+\)은/.test(line));

  assert.equal(clauses.length, 4, 'must render 4 quarter clauses');
  const normalizedClauses = clauses.map((line) => normalize(line));
  assert.equal(new Set(normalizedClauses).size, 4, 'quarter clauses must be distinct');
  assert.equal((summary.match(/재정 흐름이 비교적 안정적이라 계획 실행이 수월한 구간입니다/g) || []).length, 0);
});

test('summary quality gate reduces generic templates across key spreads', () => {
  const scenarios = [
    { spreadId: 'daily-fortune', context: '오늘 재물운 흐름이 궁금해' },
    { spreadId: 'three-card', context: '이번 주 관계를 이어갈지 고민이야' },
    { spreadId: 'relationship-recovery', context: '헤어진 사람과 다시 대화할 수 있을까?' },
    { spreadId: 'monthly-fortune', context: '다음 달 재정 계획을 어떻게 세워야 할까?' },
    { spreadId: 'yearly-fortune', context: '올해 연간 재물운을 분기별로 알고 싶어' }
  ];

  for (const [idx, scenario] of scenarios.entries()) {
    const spread = spreads.find((item) => item.id === scenario.spreadId);
    const summary = summarizeSpreadForQa({
      spreadId: scenario.spreadId,
      spreadName: spread?.name || scenario.spreadId,
      items: buildSpreadItems(scenario.spreadId, idx * 9),
      context: scenario.context,
      level: 'beginner'
    });

    const templateHits = (summary.match(/(두 갈래|운영이 좋습니다|좋은 구간입니다)/g) || []).length;
    const concreteHits = (summary.match(/(오늘|이번 주|이번 달|연말|1개|카드|정방향|역방향|고정비|변동비|현금흐름)/g) || []).length;
    assert.ok(templateHits <= 0, `${scenario.spreadId} has too many template phrases`);
    assert.ok(concreteHits >= 2, `${scenario.spreadId} must include concrete cues`);
  }
});

test('item interpretation also passes anti-template rewrite', () => {
  const spread = spreads.find((item) => item.id === 'three-card');
  const position = spread?.positions?.[1] || { name: '현재', meaning: '' };
  const card = cloneCard(cards[13]);
  const interpretation = buildSpreadInterpretation({
    spreadId: 'three-card',
    card,
    position,
    orientation: 'reversed',
    level: 'beginner',
    context: '지금 관계에서 내가 무엇을 조정해야 할까?'
  });

  assert.ok(typeof interpretation === 'string' && interpretation.length > 50);
  assert.equal((interpretation.match(/두 갈래/g) || []).length, 0);
  assert.ok(/(오늘|한 문장|카드|정방향|역방향|점검|복기)/.test(interpretation), 'interpretation must include concrete cue');
});
