import {
  sanitizeText,
  normalizeCompareText
} from './text-utils.js';
import {
  stripListPrefix,
  containsContamination,
  sanitizeListItems
} from './contamination-policy.js';
import {
  normalizeFortune,
  hasFortuneContamination,
  isFortuneStructurallyInvalid,
  enforceFortuneSectionDiversity
} from './fortune-policy.js';
import { isHighOverlap } from './text-utils.js';

const getOrientationLabel = (orientation = 'upright') => (orientation === 'reversed' ? '역방향' : '정방향');

const pickMeaningByCategory = (card, category) => {
  const isReversed = card.orientation === 'reversed';
  const uprightValue = category === 'love'
    ? (card.meanings?.love || card.summary)
    : category === 'career'
      ? (card.meanings?.career || card.summary)
      : category === 'finance'
        ? (card.meanings?.finance || card.summary)
        : card.summary;
  const reversedValue = category === 'love'
    ? (card.reversed?.love || card.reversed?.summary || uprightValue)
    : category === 'career'
      ? (card.reversed?.career || card.reversed?.summary || uprightValue)
      : category === 'finance'
        ? (card.reversed?.finance || card.reversed?.summary || uprightValue)
        : (card.reversed?.summary || uprightValue);
  return isReversed ? reversedValue : uprightValue;
};

const buildCardFacts = (cards, category) => cards.map((card, idx) => ({
  index: idx,
  cardId: card.id,
  cardName: card.name,
  cardNameKo: card.nameKo,
  orientation: card.orientation === 'reversed' ? 'reversed' : 'upright',
  orientationLabel: getOrientationLabel(card.orientation),
  positionLabel: card.positionLabel || `단계 ${idx + 1}`,
  summary: card.summary,
  coreMeaning: pickMeaningByCategory(card, category),
  keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [],
  advice: card.meanings?.advice || '',
  description: card.description || ''
}));

const buildDistinctRationale = (report) => {
  const firstClaim = sanitizeText(report?.evidence?.[0]?.claim || '').replace(/\.$/, '');
  if (firstClaim) return `핵심 카드 흐름으로 보면, ${firstClaim} 쪽에 무게가 실립니다.`;
  if (report?.verdict?.label === 'YES') return '전반 흐름은 긍정 쪽이 우세하므로 준비된 선택부터 실행해 보세요.';
  if (report?.verdict?.label === 'NO') return '지금은 속도를 낮추고 조건을 정교하게 점검하는 편이 더 안전합니다.';
  return '판단을 서두르기보다 추가 신호를 확인한 뒤 결정을 내리는 편이 좋습니다.';
};

const classifyQualityFlag = (flag) => {
  if (!flag) return null;
  const safetyFlags = new Set([
    'summary_contamination_detected',
    'verdict_contamination_detected',
    'counterpoint_contamination_detected',
    'health_guardrail_applied',
    'evidence_quality_rewritten'
  ]);
  const styleFlags = new Set([
    'summary_verdict_overlap_high',
    'auto_rewritten',
    'fortune_section_rewritten'
  ]);
  if (safetyFlags.has(flag)) return `safety_${flag}`;
  if (styleFlags.has(flag)) return `style_${flag}`;
  return `contract_${flag}`;
};

const withCategorizedFlags = (flags = []) => {
  const next = [...flags];
  for (const flag of flags) {
    const categorized = classifyQualityFlag(flag);
    if (categorized) next.push(categorized);
  }
  return [...new Set(next)];
};

const postProcessReport = (report) => {
  const qualityFlags = [];
  const next = {
    ...report,
    verdict: { ...report.verdict }
  };

  if (containsContamination(next.summary)) {
    qualityFlags.push('summary_contamination_detected');
    next.summary = '카드 흐름을 요약하면, 지금은 핵심 조건을 좁히고 단계적으로 판단하는 편이 안정적입니다.';
  }
  if (containsContamination(next.verdict?.rationale)) {
    qualityFlags.push('verdict_contamination_detected');
    next.verdict.rationale = buildDistinctRationale(next);
  }

  if (isHighOverlap(next.summary, next.verdict.rationale)) {
    const sameText = normalizeCompareText(next.summary) === normalizeCompareText(next.verdict.rationale);
    const rationaleMissing = !sanitizeText(next.verdict.rationale);
    if (sameText || rationaleMissing) {
      next.verdict.rationale = buildDistinctRationale(next);
      qualityFlags.push('auto_rewritten');
    }
  }

  next.counterpoints = sanitizeListItems(next.counterpoints, 'counterpoints');
  next.actions = sanitizeListItems(next.actions, 'actions');
  next.actions = next.actions.filter((item) => !next.counterpoints.some((cp) => isHighOverlap(cp, item)));

  if (next.fortune) {
    const before = JSON.stringify(next.fortune);
    const needsStructuralFix = isFortuneStructurallyInvalid(next.fortune) || hasFortuneContamination(next.fortune);
    if (needsStructuralFix) {
      next.fortune = normalizeFortune(next.fortune, null, next.verdict?.label);
      next.fortune = enforceFortuneSectionDiversity(next).fortune;
      if (JSON.stringify(next.fortune) !== before) {
        qualityFlags.push('fortune_section_rewritten');
      }
    }
  }

  if (next.counterpoints.some((item) => containsContamination(item))) {
    qualityFlags.push('counterpoint_contamination_detected');
  }

  return { report: next, qualityFlags: [...new Set(qualityFlags)] };
};

export {
  buildCardFacts,
  buildDistinctRationale,
  classifyQualityFlag,
  withCategorizedFlags,
  postProcessReport
};
