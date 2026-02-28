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

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 25000);
const ANTHROPIC_REPAIR_TIMEOUT_MS = Number(process.env.ANTHROPIC_REPAIR_TIMEOUT_MS || 12000);

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
const isValidVerdictLabel = (label) => label === 'YES' || label === 'NO' || label === 'MAYBE';

const detectResponseMode = (questionType, questionLength) => {
  if (questionType === 'light' || (questionType === 'binary' && questionLength <= 20)) return 'concise';
  if ((questionType === 'emotional' || questionType === 'relationship') && questionLength >= 25) return 'creative';
  return 'balanced';
};

const getAnthropicConfig = (responseMode, isRetry = false) => {
  const tokenBase = responseMode === 'concise' ? 500 : (responseMode === 'creative' ? 1300 : 1100);
  const maxTokens = isRetry ? Math.max(300, Math.floor(tokenBase * 0.8)) : tokenBase;
  const temperature = responseMode === 'concise' ? 0.25 : (responseMode === 'creative' ? 0.7 : 0.45);
  return {
    maxTokens,
    timeoutMs: isRetry ? ANTHROPIC_RETRY_TIMEOUT_MS : ANTHROPIC_TIMEOUT_MS,
    temperature
  };
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
  advice: card.meanings?.advice || '',
  description: card.description || ''
}));

const verdictTone = (label, rationale) => {
  if (label === 'YES') return `운명의 흐름이 매우 맑고 긍정적입니다. ${rationale} 망설임 없이 나아가셔도 좋을 것 같아요.`;
  if (label === 'NO') return `지금은 잠시 멈추어 서서 주변을 살필 때입니다. ${rationale} 무리한 전진보다는 안정을 선택하는 지혜가 필요합니다.`;
  return `안개 속에 가려진 것처럼 상황이 조금 더 무르익기를 기다려야 할 것 같네요. ${rationale} 조금 더 시간을 두고 지켜보는 것은 어떨까요?`;
};

const computeVerdict = (facts, binaryEntities) => {
  if (binaryEntities && facts.length === 2) {
    const scoreA = getYesNoScore(facts[0].cardId);
    const scoreB = getYesNoScore(facts[1].cardId);

    if (scoreA > scoreB) {
      return {
        label: 'YES',
        recommendedOption: 'A',
        rationale: `[${binaryEntities[0]}] 쪽의 기운이 상대적으로 더 안정적이고 조화로운 흐름을 보여주고 있습니다.`
      };
    }

    if (scoreB > scoreA) {
      return {
        label: 'YES',
        recommendedOption: 'B',
        rationale: `[${binaryEntities[1]}] 쪽의 길이 당신에게 더 편안한 결실과 긍정적인 변화를 가져다줄 것으로 보입니다.`
      };
    }

    return {
      label: 'MAYBE',
      recommendedOption: 'EITHER',
      rationale: '두 가지 선택지 모두 비슷한 무게의 기운을 담고 있어, 당신의 마음이 조금 더 깊게 끌리는 곳을 믿고 따라가도 좋을 것 같습니다.'
    };
  }

  const score = facts.reduce((acc, fact) => acc + getYesNoScore(fact.cardId), 0);
  if (score > 0) return { label: 'YES', rationale: '카드의 전반적인 기운이 당신의 질문에 대해 긍정적인 응답을 보내고 있습니다.' };
  if (score < 0) return { label: 'NO', rationale: '지금은 상황을 조금 더 신중하게 살피고 보수적으로 접근하는 것이 안전해 보입니다.' };
  return { label: 'MAYBE', rationale: '상반된 기운이 섞여 있어, 단정 짓기보다 상황의 변화를 조금 더 지켜볼 필요가 있습니다.' };
};

const buildDeterministicReport = ({ question, facts, category, binaryEntities }) => {
  const verdict = computeVerdict(facts, binaryEntities);

  const evidence = facts.map((fact) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary).replace(/\.$/, '');
    return {
      cardId: fact.cardId,
      positionLabel: fact.positionLabel,
      claim: `${fact.cardNameKo}의 상징인 '${coreMeaning}'`,
      rationale: `핵심 키워드인 ${fact.keywords.join(', ') || '조화로운 기운'}을(를) 통해 이번 질문의 실마리를 찾을 수 있습니다.`,
      caution: sanitizeText(fact.advice) || '급한 결정보다는 마음의 우선순위를 먼저 정리해 보세요.'
    };
  });

  const counterpoints = [
    '질문의 범위가 넓을 경우 카드가 가리키는 방향이 분산될 수 있으니 유의하세요.',
    '운명은 고정된 것이 아니므로 당신의 컨디션과 주변 환경에 따라 흐름은 언제든 바뀔 수 있습니다.'
  ];

  const actions = [
    '지금 당신의 직관이 들려주는 목소리에 조금 더 귀를 기울여 보세요.',
    '결정하기 전, 10분 정도 차분히 명상을 하며 마음의 소리를 들어보시는 건 어떨까요?'
  ];

  const summary = category === 'general'
    ? `질문 "${question}"에 대한 운명의 지도를 펼쳐보니, ${verdictTone(verdict.label, verdict.rationale)}`
    : `"${question}"의 ${category}적인 맥락에서 카드를 읽어보니, ${verdictTone(verdict.label, verdict.rationale)}`;

  return { summary, verdict, evidence, counterpoints, actions, fullNarrative: null };
};

const buildPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext, responseMode }) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    sessionContext: sessionContext || null,
    facts
  };

  const styleGuide = responseMode === 'concise'
    ? [
        '응답 모드: concise',
        '길이 제한:',
        '- fullNarrative는 2문단 이내, 문단당 2문장 이내.',
        '- evidence는 핵심 주장만 간결하게 작성.',
        '- actions는 짧고 실행 가능한 문장으로 작성.',
        '- 과장된 비유/장황한 세계관 설명 금지.',
        '- 질문에 대한 직접 결론 1문장을 반드시 포함.',
      ].join('\n')
    : responseMode === 'creative'
      ? [
          '응답 모드: creative',
          '- 이미지감 있는 표현과 어휘 변주를 사용하세요.',
          '- 같은 어구 반복을 피하고 카드별 표현을 다르게 구성하세요.',
          '- 결론은 질문에 대한 실천 방향이 분명해야 합니다.'
        ].join('\n')
      : [
          '응답 모드: balanced',
          '- 명확하고 안정적인 어조로 카드 근거를 구조적으로 설명하세요.',
          '- 감성적 표현과 실천 지침의 균형을 유지하세요.'
        ].join('\n');

  return [
    '당신은 아르카나 도서관의 지혜로운 사서이자 타로 전문가입니다.',
    '반드시 JSON만 출력하고, 카드의 상징에 기반한 따뜻하고 통찰력 있는 분석을 제공하세요.',
    `이 질문은 ${responseMode === 'concise' ? '일상적이고 가벼운' : '진중하고 깊이 있는'} 고민입니다. 그에 맞춰 어휘의 무게를 조절하세요.`,
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '- fullNarrative: 사서의 말투로 작성된 3~4문단의 전체 리딩 서사. 카드 개별 해석과 종합 결론을 자연스럽게 연결하세요. 문법과 조사를 완벽하게 처리하세요.',
    '- evidence.claim: 카드의 상징과 현재 상황을 연결하는 문장.',
    '한국어로 작성하고 사서의 우아한 말투를 유지하세요.',
    styleGuide,
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const buildRepairPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext }) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    sessionContext: sessionContext || null,
    facts
  };

  return [
    '당신은 JSON 정규화 도우미입니다.',
    '반드시 JSON 객체 하나만 출력하세요. 설명, 마크다운, 코드펜스는 금지합니다.',
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '요구사항:',
    '- evidence 길이는 facts 길이와 반드시 같아야 합니다.',
    '- evidence.cardId는 반드시 facts 안의 cardId만 사용하세요.',
    '- summary와 verdict.rationale은 빈 문자열이면 안 됩니다.',
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const extractJsonObject = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const mapAnthropicReason = (status) => {
  if (status === 404) return 'model_not_found';
  if (status === 401 || status === 403) return 'anthropic_auth_error';
  if (status === 429) return 'anthropic_rate_limited';
  if (status >= 500) return 'anthropic_http_error';
  return 'anthropic_http_error';
};

const shouldRetryAnthropic = (reason, status) => {
  if (reason === 'anthropic_timeout') return true;
  if (reason === 'anthropic_fetch_error') return true;
  if (reason === 'anthropic_parse_error') return true;
  if (reason === 'anthropic_http_error' && status >= 500) return true;
  return false;
};

const callAnthropic = async (prompt, options = {}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { report: null, reason: 'model_unavailable', status: null };

  const {
    maxTokens = 1100,
    timeoutMs = ANTHROPIC_TIMEOUT_MS,
    temperature = 0.45
  } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: DEFAULT_ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
          system: '아르카나 도서관의 사서로서 따뜻하고 신비로운 분위기를 유지하며 JSON만 반환하세요.'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Anthropic API] Error status=${response.status} model=${DEFAULT_ANTHROPIC_MODEL} body=${errorText}`
        );
        return { report: null, reason: mapAnthropicReason(response.status), status: response.status };
      }

      const data = await response.json();
      const report = extractJsonObject(data?.content?.[0]?.text);
      return { report, reason: report ? null : 'anthropic_parse_error', status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    console.error(
      `[Anthropic API] Fetch Error model=${DEFAULT_ANTHROPIC_MODEL} timeout_ms=${timeoutMs} timed_out=${isTimeout} message=${error?.message || 'unknown'} cause=${error?.cause?.code || error?.cause?.message || 'none'}`
    );
    const reason = isTimeout ? 'anthropic_timeout' : 'anthropic_fetch_error';
    return { report: null, reason, status: null };
  }
};

const verifyReport = (report, facts, binaryEntities) => {
  const issues = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, issues: ['report_missing'], unsupportedClaimCount: 1, consistencyScore: 0 };
  }

  if (!sanitizeText(report.summary)) {
    issues.push('summary_missing');
  }

  if (!report.verdict || !isValidVerdictLabel(report.verdict.label)) {
    issues.push('verdict_missing');
  }

  if (!Array.isArray(report.evidence) || report.evidence.length !== facts.length) {
    issues.push('evidence_length_mismatch');
  }

  let unsupportedClaimCount = 0;
  let hasLowQualityEvidence = false;
  if (Array.isArray(report.evidence)) {
    for (const item of report.evidence) {
      if (!sanitizeText(item?.claim) || !sanitizeText(item?.rationale)) {
        unsupportedClaimCount += 1;
        hasLowQualityEvidence = true;
      }
    }
  }
  if (hasLowQualityEvidence) issues.push('evidence_quality_low');

  const issuePenalty = Math.min(issues.length * 8, 60);
  const unsupportedPenalty = Math.min(unsupportedClaimCount * 20, 40);
  const consistencyScore = Math.max(0, 100 - issuePenalty - unsupportedPenalty);
  const criticalIssueSet = new Set(['summary_missing', 'verdict_missing', 'evidence_length_mismatch']);
  const hasCriticalIssue = issues.some((issue) => criticalIssueSet.has(issue));

  return {
    valid: !hasCriticalIssue,
    issues,
    unsupportedClaimCount,
    consistencyScore
  };
};

const normalizeReport = (report, facts, fallback) => {
  const sourceEvidence = Array.isArray(report?.evidence) ? report.evidence : [];
  const normalizedEvidence = facts.map((fact, idx) => {
    const byCardId = sourceEvidence.find((item) => item?.cardId === fact.cardId);
    const byIndex = sourceEvidence[idx];
    const fallbackItem = fallback.evidence[idx] || {};
    const item = byCardId || byIndex || fallbackItem;
    const claim = sanitizeText(item?.claim || fallbackItem?.claim || '');
    const rationale = sanitizeText(item?.rationale || fallbackItem?.rationale || '');

    return {
      cardId: fact.cardId,
      positionLabel: sanitizeText(item?.positionLabel || fact.positionLabel || `단계 ${idx + 1}`),
      claim,
      rationale,
      caution: sanitizeText(item?.caution || fact.advice || fallbackItem?.caution || '과도한 단정은 피하세요.')
    };
  });

  return {
    fullNarrative: report?.fullNarrative || null,
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
    `사서로서 이 카드의 의미를 읽어보니, "${item.claim}" 임을 알 수 있습니다.\n\n` +
    `깊은 통찰: ${item.rationale}\n\n` +
    `사서의 조언: ${item.caution}`
  ));

  const action = report.actions.map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);

  const conclusion = report.fullNarrative || [
    `사서인 제가 읽어낸 이번 리딩의 결론입니다.`,
    `질문하신 "${question}"에 대하여, ${report.summary}`,
    '',
    `[운명의 판정] ${report.verdict.label} - ${report.verdict.rationale}`,
  ].join('\n');

  return {
    conclusion,
    evidence: evidenceStrings,
    action,
    yesNoVerdict: normalizeVerdictLabel(report.verdict.label)
  };
};

const extractBinaryEntities = (question, cardCount) => {
  if (cardCount !== 2 && cardCount !== 5) return null;

  const splitRegex = /(.+?)\s*(?:아니면|vs|또는|혹은)\s*(.+?)(?:\?|$)/;
  const splitMatch = question.match(splitRegex);
  if (splitMatch) return [splitMatch[1].trim(), splitMatch[2].trim()];

  const verbs = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '될까', '말까'];
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

const detectQuestionType = ({ question, category, cardCount, binaryEntities }) => {
  if (binaryEntities && (cardCount === 2 || cardCount === 5)) return 'binary';
  const relationshipKeywords = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
  const careerKeywords = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
  const emotionalKeywords = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
  const lightKeywords = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];

  if (category === 'love' || relationshipKeywords.some((k) => question.includes(k))) return 'relationship';
  if (category === 'career' || careerKeywords.some((k) => question.includes(k))) return 'career';
  if (emotionalKeywords.some((k) => question.includes(k))) return 'emotional';
  if (question.length < 15 && lightKeywords.some((k) => question.includes(k))) return 'light';
  return 'deep';
};

const mapFailureStage = ({ fallbackReason, qualityValid, modelReport }) => {
  if (!qualityValid && modelReport) return 'validation';
  if (!fallbackReason) return null;
  if (fallbackReason === 'anthropic_timeout' || fallbackReason === 'anthropic_fetch_error') return 'network';
  if (fallbackReason === 'anthropic_parse_error') return 'parse';
  if (
    fallbackReason === 'model_not_found' ||
    fallbackReason === 'anthropic_http_error' ||
    fallbackReason === 'anthropic_auth_error' ||
    fallbackReason === 'anthropic_rate_limited'
  ) return 'http';
  if (fallbackReason === 'model_unavailable') return 'model_unavailable';
  if (fallbackReason === 'engine_fatal_error') return 'engine';
  if (fallbackReason === 'validation_failed') return 'validation';
  return 'unknown';
};

export const generateReadingHybrid = async ({
  cards,
  question,
  timeframe = 'daily',
  category = 'general',
  sessionContext = null,
  structure = 'evidence_report',
  debug = false,
  requestId = null,
  serverRevision = 'local'
}) => {
  const safeQuestion = sanitizeText(question || '나의 현재 상황은?');
  const binaryEntities = extractBinaryEntities(safeQuestion, cards.length);
  const questionType = detectQuestionType({
    question: safeQuestion,
    category,
    cardCount: cards.length,
    binaryEntities
  });
  const responseMode = detectResponseMode(questionType, safeQuestion.length);
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
    sessionContext,
    responseMode
  });

  let apiUsed = 'none';
  let modelReport = null;
  let fallbackReason = null;
  let path = 'fallback';
  let failureStage = null;
  const startedAt = Date.now();
  let anthropicPrimaryMs = null;
  let anthropicRetryMs = null;
  let anthropicRepairMs = null;
  const attempts = {
    primary: { attempted: false, success: false, reason: null, status: null, durationMs: null },
    retry: { attempted: false, success: false, reason: null, status: null, durationMs: null },
    repair: { attempted: false, success: false, reason: null, status: null, durationMs: null }
  };
  let parseFailureSeen = false;

  try {
    const primaryConfig = getAnthropicConfig(responseMode, false);
    attempts.primary.attempted = true;
    const primaryStartedAt = Date.now();
    const antResult = await callAnthropic(prompt, primaryConfig);
    anthropicPrimaryMs = Date.now() - primaryStartedAt;
    attempts.primary.durationMs = anthropicPrimaryMs;
    attempts.primary.success = !!antResult.report;
    attempts.primary.reason = antResult.reason || null;
    attempts.primary.status = antResult.status ?? null;
    modelReport = antResult.report;
    if (modelReport) {
      apiUsed = 'anthropic';
      path = 'anthropic_primary';
    } else {
      fallbackReason = antResult.reason;
      parseFailureSeen = parseFailureSeen || fallbackReason === 'anthropic_parse_error';
      if (shouldRetryAnthropic(antResult.reason, antResult.status)) {
        const retryConfig = getAnthropicConfig(responseMode, true);
        attempts.retry.attempted = true;
        const retryStartedAt = Date.now();
        const antRetryResult = await callAnthropic(prompt, retryConfig);
        anthropicRetryMs = Date.now() - retryStartedAt;
        attempts.retry.durationMs = anthropicRetryMs;
        attempts.retry.success = !!antRetryResult.report;
        attempts.retry.reason = antRetryResult.reason || null;
        attempts.retry.status = antRetryResult.status ?? null;
        modelReport = antRetryResult.report;
        if (modelReport) {
          apiUsed = 'anthropic';
          fallbackReason = null;
          path = 'anthropic_retry';
        } else {
          fallbackReason = antRetryResult.reason || fallbackReason;
          parseFailureSeen = parseFailureSeen || fallbackReason === 'anthropic_parse_error';
        }
      }

      if (!modelReport && parseFailureSeen) {
        const repairPrompt = buildRepairPrompt({
          question: safeQuestion,
          facts,
          category,
          timeframe,
          binaryEntities,
          sessionContext
        });
        attempts.repair.attempted = true;
        const repairStartedAt = Date.now();
        const repairResult = await callAnthropic(repairPrompt, {
          maxTokens: 520,
          timeoutMs: ANTHROPIC_REPAIR_TIMEOUT_MS,
          temperature: 0.2
        });
        anthropicRepairMs = Date.now() - repairStartedAt;
        attempts.repair.durationMs = anthropicRepairMs;
        attempts.repair.success = !!repairResult.report;
        attempts.repair.reason = repairResult.reason || null;
        attempts.repair.status = repairResult.status ?? null;
        modelReport = repairResult.report;
        if (modelReport) {
          apiUsed = 'anthropic';
          fallbackReason = null;
          path = 'anthropic_retry';
        } else {
          fallbackReason = repairResult.reason || fallbackReason;
        }
      }
    }
  } catch (err) {
    console.error('[Hybrid Engine] Engine fatal error:', err.message);
    fallbackReason = 'engine_fatal_error';
  }

  let normalized = normalizeReport(modelReport, facts, deterministic);
  let quality = verifyReport(normalized, facts, binaryEntities);

  // 최종 폴백: API가 아예 실패했거나 검증에 실패한 경우
  const fallbackUsed = !modelReport || !quality.valid;
  if (fallbackUsed) {
    normalized = deterministic;
    apiUsed = 'fallback';
    path = 'fallback';
    if (!fallbackReason && !quality.valid) fallbackReason = 'validation_failed';
    if (!fallbackReason) fallbackReason = 'model_unavailable';
    failureStage = mapFailureStage({
      fallbackReason,
      qualityValid: quality.valid,
      modelReport: !!modelReport
    });
  }

  const legacyFromV3 = generateReadingV3(cards, safeQuestion, timeframe, category);
  const legacy = toLegacyResponse({ report: normalized, question: safeQuestion, facts });

  const isCompactQuestion = questionType === 'light' || (questionType === 'binary' && safeQuestion.length <= 20);
  const finalConclusion = isCompactQuestion
    ? `${normalized.summary}\n\n[운명의 판정] ${normalized.verdict.label} - ${normalized.verdict.rationale}`
    : (normalized.fullNarrative || legacyFromV3?.conclusion || legacy.conclusion);

  const compactEvidence = normalized.evidence.map((item) => {
    const cardName = facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId;
    return `[${item.positionLabel}: ${cardName}]\n${item.claim}`;
  });

  const compactActions = (normalized.actions.length > 0 ? normalized.actions : deterministic.actions)
    .slice(0, 2)
    .map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);
  const totalMs = Date.now() - startedAt;

  return {
    conclusion: finalConclusion,
    evidence: isCompactQuestion ? compactEvidence : (legacyFromV3?.evidence || legacy.evidence),
    action: isCompactQuestion ? compactActions : (legacyFromV3?.action || legacy.action),
    yesNoVerdict: normalizeVerdictLabel(normalized.verdict.label),
    report: normalized,
    quality: {
      consistencyScore: quality.consistencyScore,
      unsupportedClaimCount: quality.unsupportedClaimCount,
      regenerationCount: 0
    },
    fallbackUsed,
    fallbackReason,
    apiUsed,
    mode: 'hybrid',
    structure,
    meta: {
      requestId,
      serverRevision,
      serverTimestamp: new Date().toISOString(),
      questionType,
      responseMode,
      path,
      timings: {
        totalMs,
        anthropicPrimaryMs,
        anthropicRetryMs,
        anthropicRepairMs
      },
      attempts,
      failureStage,
      fallbackReason: fallbackReason || null
    }
  };
};
