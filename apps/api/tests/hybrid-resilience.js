import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getCardById } from '../src/data/cards.js';
import { getSpreadById, spreads } from '../src/data/spreads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
process.env.ANTHROPIC_TIMEOUT_MS = process.env.ANTHROPIC_TIMEOUT_MS || '60000';
process.env.ANTHROPIC_RETRY_TIMEOUT_MS = process.env.ANTHROPIC_RETRY_TIMEOUT_MS || '25000';
process.env.ANTHROPIC_REPAIR_TIMEOUT_MS = process.env.ANTHROPIC_REPAIR_TIMEOUT_MS || '12000';

const hybridUrl = pathToFileURL(path.join(__dirname, '../src/domains/reading/hybrid.js')).href;
const { generateReadingHybrid } = await import(`${hybridUrl}?suite=hybrid_resilience`);

const originalFetch = global.fetch;
const originalKey = process.env.ANTHROPIC_API_KEY;

const buildCards = (cardIds) => {
  const spread = getSpreadById('three_card') || spreads.find((item) => item.positions.length === cardIds.length);
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
    return await fn(() => cursor);
  } finally {
    global.fetch = originalFetch;
  }
};

const testParseRepairPath = async () => {
  const cards = buildCards(['m01', 'c09', 'w02']);
  const validReport = {
    fullNarrative: '사서가 펼친 서사입니다.',
    summary: '흐름은 대체로 긍정적입니다.',
    verdict: { label: 'YES', rationale: '핵심 카드의 조화가 좋습니다.', recommendedOption: 'NONE' },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo}의 상징이 지금의 선택을 지지합니다.`,
      rationale: '상징이 질문과 연결됩니다.',
      caution: '과신은 피하세요.'
    })),
    counterpoints: ['상황 변화 가능성을 열어두세요.'],
    actions: ['작은 실행을 먼저 시작하세요.']
  };

  await withFetchSequence(
    [
      anthResponse('```json\n{invalid json}\n```'),
      anthResponse('{"summary":"still broken"'),
      anthResponse(JSON.stringify(validReport))
    ],
    async (getCount) => {
      const result = await generateReadingHybrid({
        cards,
        question: '이번 프로젝트를 시작해도 될까요?',
        timeframe: 'weekly',
        category: 'career'
      });

      assert.equal(result.fallbackUsed, false, 'repair 성공 시 fallback으로 내려가면 안 됩니다.');
      assert.equal(result.apiUsed, 'anthropic');
      assert.equal(result.meta?.attempts?.repair?.attempted, true);
      assert.equal(result.meta?.attempts?.repair?.success, true);
      assert.equal(getCount(), 3, 'primary/retry/repair 총 3회 호출이어야 합니다.');
    }
  );
};

const testEvidenceNormalization = async () => {
  const cards = buildCards(['m01', 'c09', 'w02']);
  const noisyReport = {
    fullNarrative: '짧은 서사',
    summary: '요약은 존재합니다.',
    verdict: { label: 'MAYBE', rationale: '추가 확인이 필요합니다.', recommendedOption: 'NONE' },
    evidence: [
      {
        cardId: 'unknown-card',
        positionLabel: '잘못된 위치',
        claim: '',
        rationale: '',
        caution: ''
      }
    ],
    counterpoints: ['관점을 넓혀보세요.'],
    actions: ['하루 뒤 다시 판단하세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(noisyReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '지금 이동하는 것이 좋을까요?',
      timeframe: 'daily',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, false, 'evidence 보정 가능한 케이스는 fallback 없이 유지해야 합니다.');
    assert.equal(result.report?.evidence?.length, cards.length);
    assert.deepEqual(result.report.evidence.map((item) => item.cardId), cards.map((card) => card.id));
  });
};

const testNoApiKeyFallbackReason = async () => {
  const cards = buildCards(['m01', 'c09', 'w02']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '나의 현재 상황은?',
      timeframe: 'daily',
      category: 'general'
    });
    assert.equal(result.fallbackUsed, true);
    assert.equal(result.meta?.fallbackReason, 'model_unavailable');
    assert.equal(result.meta?.attempts?.primary?.attempted, true);
    assert.equal(result.meta?.attempts?.retry?.attempted, false);
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

try {
  await testParseRepairPath();
  await testEvidenceNormalization();
  await testNoApiKeyFallbackReason();
  console.log('Hybrid resilience tests passed.');
} finally {
  global.fetch = originalFetch;
  process.env.ANTHROPIC_API_KEY = originalKey;
}
