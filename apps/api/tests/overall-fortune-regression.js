import assert from 'node:assert/strict';
import { getCardById } from '../src/data/cards.js';
import { getSpreadById } from '../src/data/spreads.js';
import { generateReadingHybrid } from '../src/domains/reading/hybrid.js';

const previousAnthropic = process.env.ANTHROPIC_API_KEY;
const previousOpenAI = process.env.OPENAI_API_KEY;

process.env.ANTHROPIC_API_KEY = '';
process.env.OPENAI_API_KEY = '';

const buildCards = (cardIds, spreadId) => {
  const spread = getSpreadById(spreadId);
  if (!spread) throw new Error(`spread not found: ${spreadId}`);
  return cardIds.map((id, idx) => {
    const card = getCardById(id);
    if (!card) throw new Error(`card not found: ${id}`);
    return {
      ...card,
      positionLabel: spread.positions[idx]?.label || `포지션 ${idx + 1}`
    };
  });
};

const cases = [
  {
    name: 'today',
    question: '오늘의 종합 운세는?',
    spreadId: 'weekly',
    cardIds: ['m01', 'c10', 's02'],
    expectedPeriod: 'today'
  },
  {
    name: 'week',
    question: '이번주 종합 운세는?',
    spreadId: 'weekly',
    cardIds: ['s07', 's01', 'm16'],
    expectedPeriod: 'week'
  },
  {
    name: 'month',
    question: '이번달 종합 운세는?',
    spreadId: 'monthly',
    cardIds: ['p08', 'm06', 'p14', 'c01', 's06'],
    expectedPeriod: 'month'
  },
  {
    name: 'year',
    question: '올해 종합 운세는?',
    spreadId: 'yearly',
    cardIds: ['m15', 'w08', 'm13', 'c06', 's14', 'p02', 's07', 'm16', 'p09', 'w06', 'w01', 'w03'],
    expectedPeriod: 'year'
  }
];

const failures = [];

for (const sample of cases) {
  try {
    const cards = buildCards(sample.cardIds, sample.spreadId);
    const response = await generateReadingHybrid({
      cards,
      question: sample.question,
      timeframe: 'daily',
      category: 'general',
      structure: 'evidence_report'
    });

    assert.equal(response.meta?.readingKind, 'overall_fortune');
    assert.equal(response.meta?.fortunePeriod, sample.expectedPeriod);
    assert.equal(response.report?.fortune?.period, sample.expectedPeriod);
    assert.ok(response.report?.summary, 'summary should not be empty');
    assert.ok(response.report?.fortune?.message, 'fortune message should not be empty');
    assert.ok(response.report?.actions?.length > 0, 'actions should not be empty');
    assert.ok(response.report?.counterpoints?.length > 0, 'counterpoints should not be empty');
  } catch (error) {
    failures.push(`[${sample.name}] ${error.message}`);
  }
}

if (previousAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
else process.env.ANTHROPIC_API_KEY = previousAnthropic;

if (previousOpenAI === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = previousOpenAI;

if (failures.length > 0) {
  console.error('Overall fortune regression failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Overall fortune regression passed (${cases.length} scenarios).`);
