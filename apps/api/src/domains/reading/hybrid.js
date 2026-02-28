import { generateReadingV3 } from './v3.js';

const POSITIVE_IDS = new Set([
  'm01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21',
  'w01', 'w02', 'w03', 'w04', 'w06',
  'c01', 'c02', 'c03', 'c09', 'c10',
  'p01', 'p03', 'p08', 'p09', 'p10'
]);

const NEGATIVE_IDS = new Set([
  'm09', 'm12', 'm13', 'm15', 'm16', 'm18',
  's03', 's05', 's08', 's09', 's10',
  'w09', 'w10', 'c05', 'c08', 'p05'
]);

const DEFAULT_MODEL = process.env.READING_MODEL || 'gpt-4.1-mini';

const getYesNoScore = (cardId) => {
  if (POSITIVE_IDS.has(cardId)) return 1;
  if (NEGATIVE_IDS.has(cardId)) return -1;
  return 0;
};

const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeVerdictLabel = (label) => {
  if (label === 'YES' || label === 'NO' || label === 'MAYBE') return label;
  return 'MAYBE';
};

const pickMeaningByCategory = (card, category) => {
  if (category === 'love') return card.meanings?.love || card.summary;
  if (category === 'career') return card.meanings?.career || card.summary;
  if (category === 'finance') return card.meanings?.finance || card.summary;
  return card.summary;
};

const buildCardFacts = (cards, category) => cards.map((card, idx) => ({
  index: idx,
  cardId: card.id,
  cardName: card.name,
  cardNameKo: card.nameKo,
  positionLabel: card.positionLabel || `단계 ${idx + 1}`,
  summary: card.summary,
  coreMeaning: pickMeaningByCategory(card, category),
  keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [],
  advice: card.meanings?.advice || ''
}));

const computeVerdict = (facts, binaryEntities) => {
  if (binaryEntities && facts.length === 2) {
    const scoreA = getYesNoScore(facts[0].cardId);
    const scoreB = getYesNoScore(facts[1].cardId);

    if (scoreA > scoreB) {
      return {
        label: 'YES',
        recommendedOption: 'A',
        rationale: `${binaryEntities[0]} 선택지가 상대적으로 더 안정적인 흐름을 보입니다.`
      };
    }

    if (scoreB > scoreA) {
      return {
        label: 'YES',
        recommendedOption: 'B',
        rationale: `${binaryEntities[1]} 선택지가 상대적으로 더 편안한 결과를 보입니다.`
      };
    }

    return {
      label: 'MAYBE',
      recommendedOption: 'EITHER',
      rationale: '두 선택지의 기운이 유사해 개인 컨디션과 우선순위가 결정 요인이 됩니다.'
    };
  }

  const score = facts.reduce((acc, fact) => acc + getYesNoScore(fact.cardId), 0);
  if (score > 0) return { label: 'YES', rationale: '긍정 카드 비중이 높아 실행 가능성이 큽니다.' };
  if (score < 0) return { label: 'NO', rationale: '주의 카드 비중이 높아 보수적 접근이 필요합니다.' };
  return { label: 'MAYBE', rationale: '상반된 신호가 섞여 있어 추가 정보 확인이 필요합니다.' };
};

const buildDeterministicReport = ({ question, facts, category, binaryEntities }) => {
  const verdict = computeVerdict(facts, binaryEntities);

  const evidence = facts.map((fact) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary).replace(/\.$/, '');
    return {
    cardId: fact.cardId,
    positionLabel: fact.positionLabel,
    claim: `${fact.cardNameKo}: ${coreMeaning}`,
    rationale: `핵심 키워드: ${fact.keywords.join(', ') || '일반 흐름'}`,
    caution: sanitizeText(fact.advice) || '급한 결정보다 우선순위 정리가 필요합니다.'
    };
  });

  const counterpoints = [
    '질문 문맥이 넓으면 카드 해석의 초점이 분산될 수 있습니다.',
    '현재 컨디션이나 외부 일정 변수에 따라 체감 결과가 달라질 수 있습니다.'
  ];

  const actions = [
    '결정 전에 오늘의 제약(시간, 체력, 비용)을 먼저 체크하세요.',
    '한 가지 선택을 10분 안에 실행 가능한 단위로 나눠 바로 시작하세요.'
  ];

  const summary = category === 'general'
    ? `질문 "${question}"에 대해 카드 근거를 종합하면 ${verdict.rationale}`
    : `질문 "${question}"의 ${category} 맥락에서 카드 근거를 종합하면 ${verdict.rationale}`;

  return { summary, verdict, evidence, counterpoints, actions };
};

const buildPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext }) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    sessionContext: sessionContext || null,
    facts
  };

  return [
    '당신은 타로 리딩 품질 검증이 가능한 분석가입니다.',
    '반드시 JSON만 출력하고, 카드 팩트에 없는 주장을 만들지 마세요.',
    '출력 스키마:',
    '{"summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    'evidence 길이는 facts 길이와 동일해야 하며, 각 evidence.cardId는 facts.cardId 중 하나여야 함.',
    '한국어로 작성하고 과장된 확신형 문장은 피하세요.',
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const extractJsonObject = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const callModel = async ({ prompt, temperature = 0.35 }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      messages: [
        {
          role: 'system',
          content: '카드 팩트 기반으로만 답하고 JSON만 반환하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return extractJsonObject(text);
};

const verifyReport = (report, facts, binaryEntities) => {
  const issues = [];
  let unsupportedClaimCount = 0;

  if (!report || typeof report !== 'object') {
    return { valid: false, issues: ['report_missing'], unsupportedClaimCount: 1, consistencyScore: 0 };
  }

  if (!Array.isArray(report.evidence) || report.evidence.length !== facts.length) {
    issues.push('evidence_length_mismatch');
  }

  const knownIds = new Set(facts.map((f) => f.cardId));
  if (Array.isArray(report.evidence)) {
    for (const item of report.evidence) {
      if (!knownIds.has(item?.cardId)) {
        unsupportedClaimCount += 1;
        issues.push('unknown_card_claim');
      }
      if (!sanitizeText(item?.claim) || !sanitizeText(item?.rationale)) {
        issues.push('empty_claim_or_rationale');
      }
    }
  }

  if (!report.verdict || !['YES', 'NO', 'MAYBE'].includes(report.verdict.label)) {
    issues.push('invalid_verdict');
  }

  const option = report?.verdict?.recommendedOption;
  if (binaryEntities && !['A', 'B', 'EITHER', 'NONE', undefined].includes(option)) {
    issues.push('invalid_recommended_option');
  }

  const issuePenalty = Math.min(issues.length * 8, 60);
  const unsupportedPenalty = Math.min(unsupportedClaimCount * 20, 40);
  const consistencyScore = Math.max(0, 100 - issuePenalty - unsupportedPenalty);

  return {
    valid: issues.length === 0 && unsupportedClaimCount === 0,
    issues,
    unsupportedClaimCount,
    consistencyScore
  };
};

const normalizeReport = (report, facts, fallback) => {

  const normalizedEvidence = (Array.isArray(report?.evidence) ? report.evidence : fallback.evidence).map((item, idx) => ({
    cardId: facts[idx]?.cardId || item?.cardId || '',
    positionLabel: sanitizeText(item?.positionLabel || facts[idx]?.positionLabel || `단계 ${idx + 1}`),
    claim: sanitizeText(item?.claim || ''),
    rationale: sanitizeText(item?.rationale || ''),
    caution: sanitizeText(item?.caution || facts[idx]?.advice || '과도한 단정은 피하세요.')
  }));

  return {
    summary: sanitizeText(report?.summary || fallback.summary),
    verdict: {
      label: normalizeVerdictLabel(report?.verdict?.label || fallback.verdict.label),
      rationale: sanitizeText(report?.verdict?.rationale || fallback.verdict.rationale),
      recommendedOption: report?.verdict?.recommendedOption || 'NONE'
    },
    evidence: normalizedEvidence,
    counterpoints: (Array.isArray(report?.counterpoints) ? report.counterpoints : fallback.counterpoints)
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 4),
    actions: (Array.isArray(report?.actions) ? report.actions : fallback.actions)
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 4)
  };
};

const toLegacyResponse = ({ report, question, facts }) => {
  const evidenceStrings = report.evidence.map((item) => (
    `[${item.positionLabel}: ${facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId}]\n\n` +
    `이 카드 근거의 핵심은 "${item.claim}" 입니다.\n\n` +
    `근거 설명: ${item.rationale}\n\n` +
    `주의점: ${item.caution}`
  ));

  const action = report.actions.map((item, idx) => `[실천 ${idx + 1}] ${item}`);

  const conclusion = [
    `[핵심 결론] ${report.summary}`,
    '',
    `[판정] ${report.verdict.label} - ${report.verdict.rationale}`,
    '',
    `[질문] ${question}`
  ].join('\n');

  return {
    conclusion,
    evidence: evidenceStrings,
    action,
    yesNoVerdict: normalizeVerdictLabel(report.verdict.label)
  };
};

const extractBinaryEntities = (question, cardCount) => {
  if (cardCount !== 2) return null;

  const splitRegex = /(.+?)\s*(?:아니면|vs|또는|혹은)\s*(.+?)(?:\?|$)/;
  const splitMatch = question.match(splitRegex);
  if (splitMatch) return [splitMatch[1].trim(), splitMatch[2].trim()];

  const verbs = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '될까'];
  const verbPattern = verbs.join('|');
  const binaryRegex = new RegExp(`(.+?)\\s*(?:${verbPattern})\\s*(.+?)(?:${verbPattern})(?:\\?|$)`);
  const match = question.match(binaryRegex);
  if (match) {
    const a = match[1].split(' ').pop().trim();
    const b = match[2].trim();
    return [a, b];
  }

  return null;
};

export const generateReadingHybrid = async ({
  cards,
  question,
  timeframe = 'daily',
  category = 'general',
  sessionContext = null,
  structure = 'evidence_report',
  debug = false
}) => {
  const safeQuestion = sanitizeText(question || '나의 현재 상황은?');
  const binaryEntities = extractBinaryEntities(safeQuestion, cards.length);
  const facts = buildCardFacts(cards, category);

  const deterministic = buildDeterministicReport({
    question: safeQuestion,
    facts,
    category,
    binaryEntities
  });

  const prompt = buildPrompt({
    question: safeQuestion,
    facts,
    category,
    timeframe,
    binaryEntities,
    sessionContext
  });

  let regenerationCount = 0;
  let fallbackUsed = false;
  let qualityIssues = [];

  let modelReport = await callModel({ prompt, temperature: 0.35 });
  if (!modelReport) fallbackUsed = true;
  let normalized = normalizeReport(modelReport, facts, deterministic);
  let quality = verifyReport(normalized, facts, binaryEntities);
  qualityIssues = quality.issues;

  if (!quality.valid) {
    regenerationCount += 1;
    modelReport = await callModel({ prompt: `${prompt}\n검증 실패 원인: ${quality.issues.join(', ') || 'unknown'}`, temperature: 0.2 });
    if (!modelReport) fallbackUsed = true;
    normalized = normalizeReport(modelReport, facts, deterministic);
    quality = verifyReport(normalized, facts, binaryEntities);
    qualityIssues = quality.issues;
  }

  if (!quality.valid) {
    fallbackUsed = true;
    normalized = deterministic;
    quality = verifyReport(normalized, facts, binaryEntities);
    qualityIssues = quality.issues;
  }

  const legacyFromV3 = generateReadingV3(cards, safeQuestion, timeframe, category);
  const legacy = legacyFromV3 || toLegacyResponse({ report: normalized, question: safeQuestion, facts });

  const result = {
    conclusion: legacy.conclusion,
    evidence: legacy.evidence,
    action: legacy.action,
    yesNoVerdict: legacy.yesNoVerdict || normalizeVerdictLabel(normalized.verdict.label),
    report: normalized,
    quality: {
      consistencyScore: quality.consistencyScore,
      unsupportedClaimCount: quality.unsupportedClaimCount,
      regenerationCount
    },
    fallbackUsed,
    mode: 'hybrid',
    structure
  };

  if (debug) {
    result.debug = {
      issues: qualityIssues,
      binaryEntities,
      cardFactsCount: facts.length
    };
  }

  return result;
};

export const generateReadingAB = async ({ cards, question, timeframe, category, sessionContext }) => {
  const legacy = generateReadingV3(cards, question, timeframe, category);
  const hybrid = await generateReadingHybrid({
    cards,
    question,
    timeframe,
    category,
    sessionContext
  });

  return {
    question,
    timeframe,
    category,
    legacy,
    hybrid
  };
};
