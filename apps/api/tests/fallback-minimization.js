import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getCardById } from '../src/data/cards.js';
import { getSpreadById, spreads } from '../src/data/spreads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
const hybridUrl = pathToFileURL(path.join(__dirname, '../src/domains/reading/hybrid.js')).href;
const { generateReadingHybrid } = await import(`${hybridUrl}?suite=fallback_minimization`);

const originalFetch = global.fetch;

const buildCards = (cardIds) => {
  const spread = getSpreadById('weekly') || spreads.find((item) => item.positions.length === cardIds.length);
  return cardIds.map((id, idx) => {
    const card = getCardById(id);
    if (!card) throw new Error(`Card not found: ${id}`);
    return {
      ...card,
      positionLabel: spread?.positions?.[idx]?.label || `단계 ${idx + 1}`
    };
  });
};

const anthResponse = (text, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ content: [{ text }] }),
  text: async () => text
});

const withFetchSequence = async (responses, fn) => {
  let cursor = 0;
  global.fetch = async () => {
    const next = responses[cursor];
    cursor += 1;
    if (!next) throw new Error('Unexpected extra fetch call');
    return next;
  };
  try {
    return await fn();
  } finally {
    global.fetch = originalFetch;
  }
};

const testNonCriticalIssueDoesNotFallback = async () => {
  const cards = buildCards(['m01', 'c10', 's02']);
  const report = {
    summary: '이번 주는 전반적으로 안정적인 흐름입니다. 변수 점검이 필요합니다.',
    verdict: {
      label: 'MAYBE',
      rationale: '안정적인 흐름입니다. 변수 점검이 필요합니다.',
      recommendedOption: 'NONE'
    },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo}의 신호가 현재 판단의 단서를 제공합니다.`,
      rationale: '핵심 변수와 연결됩니다.',
      caution: '과속을 피하세요.'
    })),
    counterpoints: ['중간 점검을 잊지 마세요.'],
    actions: ['핵심 우선순위 1개를 먼저 실행하세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(report))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 주 종합 운세는?',
      timeframe: 'weekly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, false, 'non-critical quality issue should not force fallback');
    const flags = result.meta?.qualityFlags || [];
    assert.ok(flags.includes('summary_verdict_overlap_high'), 'non-critical overlap flag should remain visible');
  });
};

const testPartialSalvageFlag = async () => {
  const cards = buildCards(['m01', 'c10', 's02']);
  const brokenReport = {
    summary: '',
    verdict: { label: 'MAYBE', rationale: '', recommendedOption: 'NONE' },
    evidence: [
      {
        cardId: cards[0].id,
        positionLabel: cards[0].positionLabel,
        claim: '',
        rationale: '',
        caution: ''
      }
    ],
    counterpoints: [],
    actions: []
  };

  await withFetchSequence([anthResponse(JSON.stringify(brokenReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 달 흐름을 점검하고 싶어.',
      timeframe: 'monthly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, false, 'partial salvage path should keep hybrid output without full fallback');
    const flags = result.meta?.qualityFlags || [];
    assert.ok(flags.includes('partial_salvage_applied'), 'partial salvage should be flagged in qualityFlags');
    assert.ok(result.report?.summary, 'summary should be recovered via normalization');
  });
};

try {
  await testNonCriticalIssueDoesNotFallback();
  await testPartialSalvageFlag();
  console.log('Fallback minimization tests passed.');
} finally {
  global.fetch = originalFetch;
}
