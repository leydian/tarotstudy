import { inferQuestionProfile } from './questionType.js';
import {
  sanitizeText
} from './report/text-utils.js';
import { normalizeVerdictLabel } from './report/verdict-policy.js';
import {
  withCategorizedFlags,
  postProcessReport,
  buildCardFacts
} from './report/fact-builder.js';
import { buildDeterministicReport } from './report/deterministic.js';
import {
  detectResponseMode,
  getAnthropicConfig,
  buildPrompt,
  buildRepairPrompt
} from './prompt-builder.js';
import {
  ANTHROPIC_REPAIR_TIMEOUT_MS,
  shouldRetryAnthropic,
  callAnthropic
} from './model-client.js';
import {
  verifyReport,
  hasCriticalQualityIssue,
  detectPartialSalvageApplied,
  normalizeReport,
  finalizeOutputReport
} from './quality-guard.js';
import {
  toLegacyResponse,
  extractBinaryEntities,
  mapFailureStage
} from './renderer.js';

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
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        finalized.quality.consistencyScore
        - (finalized.quality.unsupportedClaimCount * 5)
        - (fallbackUsed ? 10 : 0)
      )
    )
  );

  return {
    conclusion: finalConclusion,
    evidence: isCompactQuestion ? compactEvidence : legacy.evidence,
    action: isCompactQuestion ? compactActions : legacy.action,
    yesNoVerdict: normalizeVerdictLabel(finalized.report.verdict.label),
    report: finalized.report,
    quality: {
      qualityScore,
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
      qualityScore,
      ...(debug ? { modelQualityFlags } : {})
    }
  };
};
