import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCardById } from '../src/data/cards.js';
import { getSpreadById, spreads } from '../src/data/spreads.js';
import { generateReadingHybrid } from '../src/domains/reading/hybrid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'reading-persona-regression.json');
const scenarios = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const previousOpenAI = process.env.OPENAI_API_KEY;
const previousAnthropic = process.env.ANTHROPIC_API_KEY;

process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';

const failures = [];

const isValidVerdict = (value) => ['YES', 'NO', 'MAYBE'].includes(value);
const isValidRecommended = (value) => ['A', 'B', 'EITHER', 'NONE'].includes(value);

for (const scenario of scenarios) {
  try {
    const spread = getSpreadById(scenario.spreadId) || spreads.find((item) => item.positions.length === scenario.cardIds.length);
    if (!spread) {
      failures.push(`[${scenario.name}] spread not found`);
      continue;
    }

    const cards = scenario.cardIds
      .map((id, idx) => {
        const card = getCardById(id);
        if (!card) return null;
        return {
          ...card,
          positionLabel: spread.positions[idx]?.label || `단계 ${idx + 1}`
        };
      })
      .filter(Boolean);

    if (cards.length !== scenario.cardIds.length) {
      failures.push(`[${scenario.name}] invalid card ids`);
      continue;
    }

    const response = await generateReadingHybrid({
      cards,
      question: scenario.question,
      timeframe: scenario.timeframe,
      category: scenario.category,
      structure: 'evidence_report'
    });

    if (!response.conclusion || !Array.isArray(response.evidence) || !Array.isArray(response.action) || !isValidVerdict(response.yesNoVerdict)) {
      failures.push(`[${scenario.name}] required legacy-compatible fields are invalid`);
    }

    if (!response.report || !response.report.verdict || !Array.isArray(response.report.evidence)) {
      failures.push(`[${scenario.name}] structured report is missing`);
    }

    if (response.report && !isValidVerdict(response.report.verdict.label)) {
      failures.push(`[${scenario.name}] invalid report verdict label: ${response.report.verdict.label}`);
    }

    if (scenario.expectRecommendedOption && !isValidRecommended(response.report?.verdict?.recommendedOption)) {
      failures.push(`[${scenario.name}] invalid recommendedOption: ${response.report?.verdict?.recommendedOption}`);
    }

    if (!response.meta?.questionType) {
      failures.push(`[${scenario.name}] missing meta.questionType`);
    } else if (response.meta.questionType !== scenario.expectedQuestionType) {
      failures.push(`[${scenario.name}] expected questionType=${scenario.expectedQuestionType}, actual=${response.meta.questionType}`);
    }

    if (!response.fallbackUsed) {
      failures.push(`[${scenario.name}] expected fallbackUsed=true when API keys are empty`);
    }

    if (response.fallbackUsed && response.meta?.fallbackReason !== 'model_unavailable') {
      failures.push(`[${scenario.name}] expected fallbackReason=model_unavailable, actual=${response.meta?.fallbackReason}`);
    }

    if (response.report?.evidence?.length !== cards.length) {
      failures.push(`[${scenario.name}] report evidence length mismatch`);
    }
  } catch (error) {
    failures.push(`[${scenario.name}] runtime error: ${error.message}`);
  }
}

if (previousOpenAI === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = previousOpenAI;

if (previousAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
else process.env.ANTHROPIC_API_KEY = previousAnthropic;

if (failures.length > 0) {
  console.error('Persona regression validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Persona regression validation passed (${scenarios.length} scenarios).`);
