import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getCardById } from '../src/data/cards.js';
import { getSpreadById } from '../src/data/spreads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.ANTHROPIC_API_KEY = '';

const hybridUrl = pathToFileURL(path.join(__dirname, '../src/domains/reading/hybrid.js')).href;
const { generateReadingHybrid } = await import(`${hybridUrl}?suite=reading_v2_contract`);

const spread = getSpreadById('weekly');
const cards = ['m01', 'c10', 's02'].map((id, idx) => ({
  ...getCardById(id),
  orientation: 'upright',
  positionLabel: spread.positions[idx].label
}));

const questionProfile = {
  questionType: 'deep',
  domainTag: 'career',
  riskLevel: 'low',
  readingKind: 'general_reading',
  fortunePeriod: null,
  recommendedSpreadId: 'weekly',
  targetCardCount: 3,
  confidence: 0.77,
  lowConfidence: false,
  contextUsed: true,
  analysis: {
    intentBreakdown: [
      { intent: 'career', score: 0.77, source: 'merged' },
      { intent: 'finance', score: 0.14, source: 'merged' },
      { intent: 'deep', score: 0.09, source: 'merged' }
    ],
    domainDecision: { domainTag: 'career', riskLevel: 'low', confidence: 0.77 },
    readingDecision: { readingKind: 'general_reading', recommendedSpreadId: 'weekly', responseMode: null },
    safety: { downgraded: false, reasons: [] }
  }
};

const response = await generateReadingHybrid({
  cards,
  question: '이번 주 커리어 흐름은?',
  timeframe: 'weekly',
  category: 'career',
  questionProfile
});

assert.ok(response.meta?.analysis, 'meta.analysis should be present when v2 profile is passed');
assert.equal(response.meta?.analysis?.readingDecision?.responseMode !== null, true, 'responseMode should be populated in analysis');

console.log('Reading v2 contract tests passed.');
