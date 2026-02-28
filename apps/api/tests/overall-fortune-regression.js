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
const normalizeCompare = (text) => String(text || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

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

    const summaryNorm = normalizeCompare(response.report?.summary);
    const rationaleNorm = normalizeCompare(response.report?.verdict?.rationale);
    assert.notEqual(summaryNorm, rationaleNorm, 'summary and verdict.rationale should not be duplicated');

    const contaminatedCounterpoints = (response.report?.counterpoints || []).some((item) =>
      /사서의\s*통찰|\[운명의\s*판정\]/i.test(item)
    );
    assert.equal(contaminatedCounterpoints, false, 'counterpoints should not contain contaminated labels');

    const contaminatedActions = (response.report?.actions || []).some((item) =>
      /\[운명의\s*지침\s*\d+\]/i.test(item)
    );
    assert.equal(contaminatedActions, false, 'report.actions should be clean without legacy prefixes');

    const fortuneSegments = [
      normalizeCompare(response.report?.fortune?.energy),
      normalizeCompare(response.report?.fortune?.workFinance),
      normalizeCompare(response.report?.fortune?.love),
      normalizeCompare(response.report?.fortune?.healthMind)
    ].filter(Boolean);
    const uniqueSegments = new Set(fortuneSegments);
    assert.ok(uniqueSegments.size >= 2, 'fortune sections should not all collapse into identical copy');

    const redundantFortunePrefixDetected = [
      response.report?.fortune?.energy,
      response.report?.fortune?.workFinance,
      response.report?.fortune?.love,
      response.report?.fortune?.healthMind
    ].some((value) => /^(전체\s*에너지\s*흐름을\s*보면|일·재물운은|애정운은|건강·마음\s*영역은)/.test(String(value || '').trim()));
    assert.equal(redundantFortunePrefixDetected, false, 'fortune sections should avoid redundant field prefixes');
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
