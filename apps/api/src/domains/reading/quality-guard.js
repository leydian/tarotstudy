import {
  sanitizeText,
  isHighOverlap
} from './report/text-utils.js';
import {
  normalizeVerdictLabel,
  isValidVerdictLabel
} from './report/verdict-policy.js';
import {
  stripListPrefix,
  containsContamination
} from './report/contamination-policy.js';
import { normalizeFortune } from './report/fortune-policy.js';
import { withCategorizedFlags } from './report/fact-builder.js';
import { applyHealthGuardrail } from './report/health-guardrail.js';

const verifyReport = (report, facts) => {
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
    const optimisticRationale = /좋은 시점|유리합니다|긍정|활성화되어|지금이 기회|곧 성과/i.test(rationale);
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

export {
  verifyReport,
  hasCriticalQualityIssue,
  detectPartialSalvageApplied,
  normalizeReport,
  finalizeOutputReport
};
