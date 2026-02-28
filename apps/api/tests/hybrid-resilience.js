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

const testDuplicateSummaryRationaleRewrite = async () => {
  const cards = buildCards(['m10', 'w05', 'w09', 'm04', 'm18']);
  const duplicatedText = '지금은 상황을 조금 더 신중하게 살피고 보수적으로 접근하는 것이 안전해 보입니다.';
  const duplicatedReport = {
    fullNarrative: '중복 문장을 포함한 테스트 서사입니다.',
    summary: duplicatedText,
    verdict: { label: 'NO', rationale: duplicatedText, recommendedOption: 'NONE' },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo}의 상징이 현재 결정 흐름에 중요한 힌트를 줍니다.`,
      rationale: '핵심 흐름을 확인할 수 있습니다.',
      caution: '속도를 조절하세요.'
    })),
    counterpoints: ['조건을 한 번 더 확인해 보세요.'],
    actions: ['이번 주에는 준비 항목을 정리해 보세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(duplicatedReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '3월 내에 이직할 수 있을까?',
      timeframe: 'monthly',
      category: 'career'
    });

    assert.equal(result.fallbackUsed, false);
    assert.notEqual(result.report?.summary, result.report?.verdict?.rationale, 'summary/rationale 중복은 재작성되어야 합니다.');
    assert.ok(Array.isArray(result.meta?.qualityFlags), 'qualityFlags가 메타에 포함되어야 합니다.');
  });
};

const testCounterpointContaminationFilter = async () => {
  const cards = buildCards(['m10', 'w05', 'w09', 'm04', 'm18']);
  const contaminatedReport = {
    fullNarrative: '오염 텍스트를 포함한 테스트 서사입니다.',
    summary: '요약은 정상입니다.',
    verdict: { label: 'MAYBE', rationale: '추가 검토가 필요합니다.', recommendedOption: 'NONE' },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo} 카드는 상황을 한 번 더 확인하라는 신호를 보냅니다.`,
      rationale: '증거는 충분합니다.',
      caution: '성급한 결정을 피하세요.'
    })),
    counterpoints: [
      '사서의 통찰: 질문에 대한 운명의 지도를 펼쳐보니...',
      '[운명의 판정] NO - 지금은 신중하게 접근하세요.',
      '실무 조건과 일정 가용성을 먼저 재검토해 보세요.'
    ],
    actions: ['[운명의 지침 1] 실행하세요.', '이력서 포인트를 업데이트하세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(contaminatedReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 분기에 이직하는 게 맞을까요?',
      timeframe: 'monthly',
      category: 'career'
    });

    assert.equal(result.fallbackUsed, false);
    const allCounterpoints = result.report?.counterpoints?.join(' ') || '';
    assert.equal(/사서의\s*통찰|운명의\s*판정/i.test(allCounterpoints), false, 'counterpoints 오염 문자열은 제거되어야 합니다.');
    const allActions = result.report?.actions?.join(' ') || '';
    assert.equal(/\[운명의\s*지침/i.test(allActions), false, 'actions 오염 접두어는 제거되어야 합니다.');
  });
};

const testHealthGuardrailOverridesUnsafeVerdict = async () => {
  const cards = buildCards(['c04', 'm05']);
  const unsafeHealthReport = {
    fullNarrative: '건강 질문임에도 과도하게 낙관적인 서사입니다.',
    summary: '문제 없습니다. 바로 진행하세요.',
    verdict: { label: 'YES', rationale: '바로 실행해도 괜찮습니다.', recommendedOption: 'A' },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo}의 흐름이 선택을 지지합니다.`,
      rationale: '좋은 카드입니다.',
      caution: '없음'
    })),
    counterpoints: ['사서의 통찰: 지금 즉시 실행하세요.'],
    actions: ['[운명의 지침 1] 그냥 진행하세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(unsafeHealthReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '저녁은 샐러드를 먹을까 아니면 굶는게 나을까? 내가 지금 배탈이 났어',
      timeframe: 'daily',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, false);
    assert.equal(result.meta?.domainTag, 'health');
    assert.equal(result.meta?.riskLevel, 'medium');
    assert.equal(result.report?.verdict?.label, 'MAYBE', 'health 질문은 강한 YES/NO를 피해야 합니다.');
    assert.equal(result.report?.verdict?.recommendedOption, 'NONE');
    assert.ok((result.report?.summary || '').includes('의료 조언'), 'health 요약에는 의료 조언 대체 불가 고지가 포함되어야 합니다.');
  });
};

const testHealthOverridesOverallFortuneIntent = async () => {
  const cards = buildCards(['c04', 'm05', 's02']);
  const report = {
    fullNarrative: '운세 질문처럼 보이지만 증상 질문이 포함된 케이스입니다.',
    summary: '오늘의 흐름은 매우 좋습니다.',
    verdict: { label: 'YES', rationale: '바로 진행하세요.', recommendedOption: 'A' },
    fortune: {
      period: 'today',
      trendLabel: 'UP',
      energy: '상승',
      workFinance: '상승',
      love: '상승',
      healthMind: '상승',
      message: '가속하세요.'
    },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo} 카드가 긍정 신호를 보냅니다.`,
      rationale: '좋은 흐름입니다.',
      caution: '없음'
    })),
    counterpoints: ['없음'],
    actions: ['바로 시작하세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(report))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '오늘의 종합 운세는? 근데 배탈이 나서 저녁을 굶을지 고민이야',
      timeframe: 'daily',
      category: 'general'
    });

    assert.equal(result.meta?.domainTag, 'health');
    assert.equal(result.meta?.readingKind, 'general_reading', 'health 질문은 overall_fortune보다 안전 모드를 우선해야 합니다.');
    assert.equal(result.meta?.fortunePeriod, null);
    assert.equal(result.report?.verdict?.label, 'MAYBE');
    assert.equal(result.report?.verdict?.recommendedOption, 'NONE');
  });
};

const testEvidenceQualityRewrite = async () => {
  const cards = buildCards(['m12', 'm15', 's08']);
  const lowQualityReport = {
    fullNarrative: '품질 저하 케이스 테스트',
    summary: '지금은 조건을 한 번 더 점검해야 합니다.',
    verdict: { label: 'MAYBE', rationale: '판단을 서두르지 마세요.', recommendedOption: 'NONE' },
    evidence: cards.map((card) => ({
      cardId: card.id,
      positionLabel: card.positionLabel,
      claim: `${card.nameKo}(역방향)`,
      rationale: '좋은 시점입니다.',
      caution: '[운명의 지침 1] 즉시 행동'
    })),
    counterpoints: ['조건 점검이 필요합니다.'],
    actions: ['속도를 늦춰 보세요.']
  };

  await withFetchSequence([anthResponse(JSON.stringify(lowQualityReport))], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이 선택을 바로 실행해도 될까요?',
      timeframe: 'daily',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, false);
    assert.ok(Array.isArray(result.report?.evidence));
    const evidence = result.report.evidence;
    assert.equal(evidence.length, cards.length);
    assert.equal(
      evidence.some((item) => /좋은 시점/.test(item.rationale)),
      false,
      '역방향 claim의 낙관적 rationale은 rewrite 되어야 합니다.'
    );
    assert.equal(
      evidence.some((item) => /\[운명의\s*지침/i.test(item.caution)),
      false,
      'evidence caution 오염 prefix는 제거되어야 합니다.'
    );
    assert.ok((result.meta?.qualityFlags || []).includes('evidence_quality_rewritten'));
    assert.ok((result.meta?.qualityFlags || []).includes('safety_evidence_quality_rewritten'));
  });
};

const testDeterministicReversedRationale = async () => {
  const cards = buildCards(['s06', 'm15', 'p08']).map((card, idx) => ({
    ...card,
    orientation: idx === 0 ? 'reversed' : 'upright'
  }));
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 달 종합 운세는?',
      timeframe: 'monthly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const firstEvidence = result.report?.evidence?.[0];
    assert.ok(firstEvidence, 'first evidence should exist');
    assert.match(firstEvidence.claim, /\(역방향\)/, 'reversed card should keep orientation label in claim');
    assert.match(firstEvidence.claim, /(점검|재정비|전환 구간)/, 'reversed claim should carry inspection-first tone');
    assert.equal(
      /나아가기 좋은 시점/.test(firstEvidence.rationale),
      false,
      'reversed rationale should not use optimistic fixed phrase'
    );
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testDeterministicSwordAceUprightTone = async () => {
  const cards = buildCards(['s01', 'm03', 'p08']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 주 종합 운세는?',
      timeframe: 'weekly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const swordEvidence = (result.report?.evidence || []).find((item) => item.cardId === 's01');
    assert.ok(swordEvidence, 's01 evidence should exist');
    assert.equal(
      /단정하기보다 핵심 변수부터 좁혀/.test(swordEvidence.claim),
      false,
      's01 upright claim should avoid neutral fallback sentence'
    );
    assert.equal(
      /중립에 가깝기 때문에/.test(swordEvidence.rationale),
      false,
      's01 upright rationale should avoid neutral fixed phrase'
    );
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testDeterministicPentaclesKingUprightTone = async () => {
  const cards = buildCards(['p14', 'm01', 'c10']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 달 종합 운세는?',
      timeframe: 'monthly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const p14Evidence = (result.report?.evidence || []).find((item) => item.cardId === 'p14');
    assert.ok(p14Evidence, 'p14 evidence should exist');
    assert.equal(
      /단정하기보다 핵심 변수부터 좁혀/.test(p14Evidence.claim),
      false,
      'p14 upright claim should avoid neutral fallback sentence'
    );
    assert.equal(
      /중립에 가깝기 때문에/.test(p14Evidence.rationale),
      false,
      'p14 upright rationale should avoid neutral fixed phrase'
    );
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testDeterministicEvidenceClaimVariation = async () => {
  const cards = buildCards(['p08', 'p09', 'p10', 'p11', 'p14']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 달 종합 운세는?',
      timeframe: 'monthly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const claimSecondSentences = (result.report?.evidence || [])
      .map((item) => String(item.claim || '').split('. ').slice(1).join('. ').trim())
      .filter(Boolean);
    const uniqueSecondSentences = new Set(claimSecondSentences.map((item) => item.replace(/\.$/, '')));
    assert.ok(uniqueSecondSentences.size >= 2, 'evidence claim second sentence should show at least two distinct patterns');
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testDeterministicEvidenceRationaleVariation = async () => {
  const cards = buildCards(['p08', 'p09', 'p10', 'p11', 'p14']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 달 종합 운세는?',
      timeframe: 'monthly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const rationales = (result.report?.evidence || []).map((item) => String(item.rationale || '').trim()).filter(Boolean);
    const uniqueRationales = new Set(rationales.map((item) => item.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').trim()));
    assert.ok(uniqueRationales.size >= 3, 'evidence rationale should contain at least 3 distinct patterns');
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testTowerToneModeration = async () => {
  const cards = buildCards(['m16', 's07', 's01']).map((card, idx) => ({
    ...card,
    orientation: idx === 0 ? 'upright' : card.orientation
  }));
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 주 종합 운세는?',
      timeframe: 'weekly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const towerEvidence = (result.report?.evidence || []).find((item) => item.cardId === 'm16');
    assert.ok(towerEvidence, 'tower evidence should exist');
    assert.equal(
      /(리스크 점검|안전장치|변동 관리)/.test(String(towerEvidence.claim || '')),
      true,
      'tower claim should include moderation/management guidance'
    );
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testEvidenceClaimLengthCap = async () => {
  const cards = buildCards(['m16', 'm15', 'm13', 's10', 's03']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '올해 종합 운세는?',
      timeframe: 'yearly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const tooLong = (result.report?.evidence || []).some((item) => String(item.claim || '').length > 150);
    assert.equal(tooLong, false, 'evidence claim should respect max length cap');
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testFallbackPostProcessIsMinimal = async () => {
  const cards = buildCards(['m01', 'c09', 'w02']).map((card, idx) => ({
    ...card,
    orientation: idx === 1 ? 'reversed' : 'upright'
  }));
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 주 종합 운세는?',
      timeframe: 'weekly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    const flags = result.meta?.qualityFlags || [];
    assert.equal(
      flags.includes('phrase_repetition_rewritten'),
      false,
      'fallback deterministic path should not require repetitive style rewrites'
    );
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

const testFallbackQualityMatchesFinalReport = async () => {
  const cards = buildCards(['m01', 'c09', 'w02']);
  process.env.ANTHROPIC_API_KEY = '';

  await withFetchSequence([], async () => {
    const result = await generateReadingHybrid({
      cards,
      question: '이번 주 종합 운세는?',
      timeframe: 'weekly',
      category: 'general'
    });

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.meta?.fallbackReason, 'model_unavailable');
    assert.equal(
      (result.meta?.qualityFlags || []).includes('report_missing'),
      false,
      'final quality flags should reflect final fallback report instead of model-stage missing report issue'
    );
    assert.equal(
      (result.meta?.qualityFlags || []).includes('contract_report_missing'),
      false,
      'categorized final quality flags should also reflect final fallback report'
    );
    assert.ok(result.quality?.consistencyScore >= 60, 'final quality should be recomputed from fallback report');
    assert.ok(result.report?.summary, 'final fallback report should include non-empty summary');
  });

  process.env.ANTHROPIC_API_KEY = originalKey;
};

try {
  await testParseRepairPath();
  await testEvidenceNormalization();
  await testNoApiKeyFallbackReason();
  await testDuplicateSummaryRationaleRewrite();
  await testCounterpointContaminationFilter();
  await testHealthGuardrailOverridesUnsafeVerdict();
  await testHealthOverridesOverallFortuneIntent();
  await testEvidenceQualityRewrite();
  await testDeterministicReversedRationale();
  await testDeterministicSwordAceUprightTone();
  await testDeterministicPentaclesKingUprightTone();
  await testDeterministicEvidenceClaimVariation();
  await testDeterministicEvidenceRationaleVariation();
  await testTowerToneModeration();
  await testEvidenceClaimLengthCap();
  await testFallbackPostProcessIsMinimal();
  await testFallbackQualityMatchesFinalReport();
  console.log('Hybrid resilience tests passed.');
} finally {
  global.fetch = originalFetch;
  process.env.ANTHROPIC_API_KEY = originalKey;
}
