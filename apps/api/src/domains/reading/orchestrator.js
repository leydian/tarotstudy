import { inferQuestionProfile } from './questionType.js';
import {
  ANTHROPIC_REPAIR_TIMEOUT_MS,
  sanitizeText,
  normalizeVerdictLabel,
  isValidVerdictLabel,
  stripListPrefix,
  containsContamination,
  normalizeFortune,
  isHighOverlap,
  withCategorizedFlags,
  applyHealthGuardrail,
  postProcessReport,
  detectResponseMode,
  getAnthropicConfig,
  buildCardFacts,
  buildDeterministicReport,
  buildPrompt,
  buildRepairPrompt,
  shouldRetryAnthropic,
  callAnthropic
} from './engine-helpers.js';

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
  if (isHighOverlap(report.summary, report?.verdict?.rationale)) {
    issues.push('summary_verdict_overlap_high');
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
    hasCriticalIssue,
    issues,
    unsupportedClaimCount,
    consistencyScore
  };
};

const CRITICAL_QUALITY_ISSUES = new Set(['summary_missing', 'verdict_missing', 'evidence_length_mismatch']);
const hasCriticalQualityIssue = (issues = []) => (Array.isArray(issues) ? issues : [])
  .some((issue) => CRITICAL_QUALITY_ISSUES.has(issue));

const detectPartialSalvageApplied = (modelReport, normalizedReport, facts) => {
  if (!modelReport || typeof modelReport !== 'object') return false;
  if (!sanitizeText(modelReport?.summary) && sanitizeText(normalizedReport?.summary)) return true;
  if (!isValidVerdictLabel(modelReport?.verdict?.label) && isValidVerdictLabel(normalizedReport?.verdict?.label)) return true;
  if (!sanitizeText(modelReport?.verdict?.rationale) && sanitizeText(normalizedReport?.verdict?.rationale)) return true;
  const sourceEvidence = Array.isArray(modelReport?.evidence) ? modelReport.evidence : [];
  if (sourceEvidence.length !== facts.length) return true;
  const hasWeakEvidence = sourceEvidence.some((item) => !sanitizeText(item?.claim) || !sanitizeText(item?.rationale));
  if (hasWeakEvidence) return true;
  return false;
};

const normalizeReport = (report, facts, fallback) => {
  const sourceEvidence = Array.isArray(report?.evidence) ? report.evidence : [];
  const normalizedEvidence = facts.map((fact, idx) => {
    const byCardId = sourceEvidence.find((item) => item?.cardId === fact.cardId);
    const byIndex = sourceEvidence[idx];
    const fallbackItem = fallback.evidence[idx] || {};
    const item = byCardId || byIndex || fallbackItem;
    const rawClaim = sanitizeText(item?.claim || fallbackItem?.claim || '');
    const rawRationale = sanitizeText(item?.rationale || fallbackItem?.rationale || '');
    const defaultClaim = sanitizeText(fallbackItem?.claim || `${fact.positionLabel} 흐름을 기준으로 핵심 조건을 먼저 점검해 보세요.`);
    const defaultRationale = sanitizeText(fallbackItem?.rationale || `${fact.positionLabel} 신호를 바탕으로 우선순위를 좁혀 판단하세요.`);
    const claim = (!rawClaim || containsContamination(rawClaim)) ? defaultClaim : rawClaim;
    let rationale = (!rawRationale || containsContamination(rawRationale)) ? defaultRationale : rawRationale;
    const isReversedClaim = /\(역방향\)/.test(claim);
    const optimisticRationale = /좋은 시점|유리합니다|긍정|활성화되어/i.test(rationale);
    if (isReversedClaim && optimisticRationale) {
      rationale = defaultRationale;
    }
    const defaultCaution = sanitizeText(fallbackItem?.caution || fact.advice || '과도한 단정은 피하세요.');
    const cautionCandidate = stripListPrefix(item?.caution || defaultCaution);
    const caution = (!cautionCandidate || containsContamination(cautionCandidate))
      ? defaultCaution
      : cautionCandidate;

    return {
      cardId: fact.cardId,
      positionLabel: sanitizeText(item?.positionLabel || fact.positionLabel || `단계 ${idx + 1}`),
      claim,
      rationale,
      caution
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
    fortune: normalizeFortune(report?.fortune, fallback.fortune, report?.verdict?.label || fallback.verdict.label),
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

  const conclusion = [
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

const finalizeOutputReport = ({
  report,
  domainTag,
  riskLevel,
  facts,
  binaryEntities,
  baseFlags = []
}) => {
  let finalReport = report;
  let flags = [...baseFlags];

  if (domainTag === 'health') {
    finalReport = applyHealthGuardrail(finalReport, riskLevel);
    flags = [...flags, 'health_guardrail_applied'];
  }

  const finalQuality = verifyReport(finalReport, facts, binaryEntities);
  flags = [...flags, ...finalQuality.issues];

  return {
    report: finalReport,
    quality: finalQuality,
    qualityFlags: withCategorizedFlags([...new Set(flags)])
  };
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
  serverRevision = 'local',
  questionProfile = null
}) => {
  const safeQuestion = sanitizeText(question || '나의 현재 상황은?');
  const binaryEntities = extractBinaryEntities(safeQuestion, cards.length);
  const resolvedProfile = questionProfile || inferQuestionProfile({
    question: safeQuestion,
    category,
    binaryEntities
  });
  const questionType = resolvedProfile.questionType;
  const resolvedFortunePeriod = resolvedProfile.readingKind === 'overall_fortune'
    ? (resolvedProfile.fortunePeriod || 'week')
    : null;
  const responseMode = detectResponseMode(
    questionType,
    safeQuestion.length,
    resolvedProfile.domainTag,
    resolvedProfile.readingKind,
    resolvedFortunePeriod
  );
  const resolvedAnalysis = resolvedProfile?.analysis
    ? {
        ...resolvedProfile.analysis,
        readingDecision: {
          ...(resolvedProfile.analysis.readingDecision || {}),
          responseMode
        }
      }
    : null;
  const facts = buildCardFacts(cards, category);

  const deterministic = buildDeterministicReport({
    question: safeQuestion,
    facts,
    category,
    binaryEntities,
    questionType,
    responseMode,
    domainTag: resolvedProfile.domainTag,
    riskLevel: resolvedProfile.riskLevel,
    readingKind: resolvedProfile.readingKind,
    fortunePeriod: resolvedFortunePeriod
  });

  const prompt = buildPrompt({
    question: safeQuestion,
    facts,
    category,
    timeframe,
    binaryEntities,
    sessionContext,
    responseMode,
    questionType,
    domainTag: resolvedProfile.domainTag,
    riskLevel: resolvedProfile.riskLevel,
    readingKind: resolvedProfile.readingKind,
    fortunePeriod: resolvedFortunePeriod
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
  const processed = postProcessReport(normalized);
  normalized = processed.report;
  const modelQuality = verifyReport(normalized, facts, binaryEntities);
  const partialSalvageApplied = detectPartialSalvageApplied(modelReport, normalized, facts);
  const preFinalFlags = [
    ...processed.qualityFlags,
    ...modelQuality.issues,
    ...(partialSalvageApplied ? ['partial_salvage_applied'] : [])
  ];
  const modelQualityFlags = withCategorizedFlags([...new Set(preFinalFlags)]);
  const modelHasCriticalIssue = hasCriticalQualityIssue(modelQuality.issues);

  // 최종 폴백: API가 아예 실패했거나 치명적 검증 실패인 경우
  const fallbackUsed = !modelReport || modelHasCriticalIssue;
  let finalized = null;
  if (fallbackUsed) {
    finalized = finalizeOutputReport({
      report: deterministic,
      domainTag: resolvedProfile.domainTag,
      riskLevel: resolvedProfile.riskLevel,
      facts,
      binaryEntities,
      baseFlags: []
    });
    apiUsed = 'deterministic';
    path = 'fallback';
    if (!fallbackReason && modelHasCriticalIssue) fallbackReason = 'validation_failed';
    if (!fallbackReason) fallbackReason = 'model_unavailable';
    failureStage = mapFailureStage({
      fallbackReason,
      qualityValid: !modelHasCriticalIssue,
      modelReport: !!modelReport
    });
  } else {
    finalized = finalizeOutputReport({
      report: normalized,
      domainTag: resolvedProfile.domainTag,
      riskLevel: resolvedProfile.riskLevel,
      facts,
      binaryEntities,
      baseFlags: [...new Set(preFinalFlags)]
    });
  }

  const runtimeSafetyReasons = [];
  if (attempts.retry.attempted && attempts.retry.success && attempts.primary.reason === 'anthropic_timeout') {
    runtimeSafetyReasons.push('model_timeout_retry');
  }
  if (attempts.repair.attempted && attempts.repair.success) {
    runtimeSafetyReasons.push('parse_repair_used');
  }
  if (partialSalvageApplied) {
    runtimeSafetyReasons.push('partial_salvage_applied');
  }
  if (modelHasCriticalIssue) {
    runtimeSafetyReasons.push('critical_contract_fix');
  }
  const finalAnalysis = resolvedAnalysis
    ? {
        ...resolvedAnalysis,
        safety: {
          ...(resolvedAnalysis.safety || { downgraded: false, reasons: [] }),
          downgraded: Boolean((resolvedAnalysis.safety?.downgraded) || runtimeSafetyReasons.length > 0),
          reasons: [...new Set([...(resolvedAnalysis.safety?.reasons || []), ...runtimeSafetyReasons])]
        }
      }
    : null;

  const legacy = toLegacyResponse({ report: finalized.report, question: safeQuestion, facts });

  const isOverallFortune = resolvedProfile.readingKind === 'overall_fortune';
  const isCompactQuestion = isOverallFortune || questionType === 'light' || (questionType === 'binary' && safeQuestion.length <= 20);
  const finalConclusion = isCompactQuestion
    ? finalized.report.summary
    : legacy.conclusion;

  const compactEvidence = finalized.report.evidence.map((item) => {
    const cardName = facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId;
    return `[${item.positionLabel}: ${cardName}]\n${item.claim}`;
  });

  const compactActions = (finalized.report.actions.length > 0 ? finalized.report.actions : deterministic.actions)
    .slice(0, 2)
    .map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);
  const totalMs = Date.now() - startedAt;

  return {
    conclusion: finalConclusion,
    evidence: isCompactQuestion ? compactEvidence : legacy.evidence,
    action: isCompactQuestion ? compactActions : legacy.action,
    yesNoVerdict: normalizeVerdictLabel(finalized.report.verdict.label),
    report: finalized.report,
    quality: {
      consistencyScore: finalized.quality.consistencyScore,
      unsupportedClaimCount: finalized.quality.unsupportedClaimCount,
      regenerationCount: 0
    },
    fallbackUsed,
    fallbackReason,
    apiUsed,
    mode: fallbackUsed ? 'deterministic_fallback' : 'hybrid',
    structure,
    meta: {
      requestId,
      serverRevision,
      serverTimestamp: new Date().toISOString(),
      questionType,
      domainTag: resolvedProfile.domainTag,
      riskLevel: resolvedProfile.riskLevel,
      readingKind: resolvedProfile.readingKind,
      fortunePeriod: resolvedFortunePeriod,
      trendLabel: finalized.report?.fortune?.trendLabel || null,
      recommendedSpreadId: resolvedProfile.recommendedSpreadId,
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
      fallbackReason: fallbackReason || null,
      analysis: finalAnalysis,
      qualityFlags: finalized.qualityFlags,
      ...(debug ? { modelQualityFlags } : {})
    }
  };
};
