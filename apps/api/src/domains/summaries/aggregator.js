import { analyzeQuestionContextSync, parseChoiceOptions as parseChoiceOptionsEnhanced } from '../../question-understanding/index.js';
import {
  normalizeContextForSpread,
  inferSummaryContextTone,
  pickTopKeywords,
  buildSummaryLead,
  buildSummaryFocus,
  buildSummaryAction,
  polishActionVoice,
  buildSummaryTheme,
  polishSummary,
  inferYearlyIntent,
  applyNarrativeSummaryTone,
  applySectionedSummaryTone,
  renderSummaryFromSemantic
} from '../common/utils.js';
import {
  analyzeSpreadSignal,
  prioritizeChoiceEvidence,
  pickSpreadLexicon,
  buildSpreadEvidenceReason
} from '../common/signal-analyzer.js';
import { summarizeYearlyFortune } from './yearly-fortune.js';
import { summarizeMonthlyFortune } from './monthly-fortune.js';
import { summarizeWeeklyFortune } from './weekly-fortune.js';
import { summarizeThreeCard } from './three-card.js';
import { summarizeCelticCross } from './celtic-cross.js';
import { summarizeRelationshipRecovery } from './relationship-recovery.js';
import { summarizeOneCard } from './one-card.js';

export { summarizeYearlyFortune, summarizeMonthlyFortune, summarizeWeeklyFortune, summarizeThreeCard, summarizeCelticCross, summarizeRelationshipRecovery, summarizeOneCard };

export function summarizeSpread({ spreadId = '', spreadName, items, context = '', level = 'beginner', userHistory = null }) {
  const normalizedContext = normalizeContextForSpread({ spreadName, context });
  if (spreadId === 'one-card') {
    return summarizeOneCard({ items, context: normalizedContext, userHistory });
  }
  let rawSummary = '';
  if (spreadId === 'yearly-fortune') {
    rawSummary = summarizeYearlyFortune({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  if (spreadId === 'weekly-fortune') {
    rawSummary = summarizeWeeklyFortune({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  if (spreadId === 'monthly-fortune') {
    rawSummary = summarizeMonthlyFortune({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  if (spreadId === 'three-card') {
    rawSummary = summarizeThreeCard({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  if (spreadId === 'relationship-recovery') {
    rawSummary = summarizeRelationshipRecovery({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  if (spreadId === 'celtic-cross') {
    rawSummary = summarizeCelticCross({ items, context: normalizedContext, level, userHistory });
    return finalizeSpreadSummary({ spreadId, spreadName, items, context: normalizedContext, rawSummary, userHistory });
  }
  const contextTone = inferSummaryContextTone(normalizedContext);
  const topKeywords = pickTopKeywords(items, 3);
  // items array check
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return '';
  
  const uprightCount = safeItems.filter((item) => item.orientation === 'upright').length;
  const reversedCount = safeItems.length - uprightCount;
  const leadLine = buildSummaryLead({
    spreadName,
    context: normalizedContext,
    firstItem: safeItems[0],
    topKeywords,
    uprightCount,
    reversedCount,
    userHistory
  });
  const focusLine = buildSummaryFocus({
    spreadName,
    firstItem: safeItems[0],
    lastItem: safeItems[safeItems.length - 1],
    items: safeItems,
    context: normalizedContext,
    contextTone
  });
  const actionLine = buildSummaryAction({
    spreadName,
    level,
    context: normalizedContext,
    firstItem: safeItems[0],
    contextTone
  });
  const polishedActionLine = polishActionVoice({
    line: actionLine,
    spreadName,
    context: normalizedContext
  });
  const themeLine = buildSummaryTheme({ spreadName, context: normalizedContext, items: safeItems, topKeywords });
  rawSummary = polishSummary([leadLine, focusLine, polishedActionLine, themeLine].filter(Boolean).join(' '));
  return finalizeSpreadSummary({ spreadId, spreadName, items: safeItems, context: normalizedContext, rawSummary });
}

export function summarizeSpreadForQa(payload = {}) {
  return summarizeSpread(payload);
}

function finalizeSpreadSummary({ spreadId = '', spreadName = '', items = [], context = '', rawSummary = '', userHistory = null }) {
  const decisionBlock = buildSpreadDecisionBlock({ spreadName, items, context, userHistory });
  const intent = inferYearlyIntent(context);
  const shouldLeadWithNarrative = intent === 'relationship' || intent === 'relationship-repair';
  const normalizedRaw = String(rawSummary || '').trim();
  const alreadyHasVerdictBlock = /(1차 판정|판정 근거|결론:|조건부 예|아니오|결론은)/.test(normalizedRaw);
  const merged = alreadyHasVerdictBlock
    ? normalizedRaw
    : (shouldLeadWithNarrative
      ? [normalizedRaw, decisionBlock].filter(Boolean).join('\n\n')
      : [decisionBlock, normalizedRaw].filter(Boolean).join('\n\n'));
  const polished = renderSummaryFromSemantic(merged);
  if (spreadId === 'weekly-fortune' || spreadId === 'monthly-fortune' || spreadId === 'yearly-fortune') {
    return applySectionedSummaryTone({ spreadId, summary: polished });
  }
  return applyNarrativeSummaryTone({ spreadId, summary: polished });
}

function buildSpreadDecisionBlock({ spreadName = '', items = [], context = '' }) {
  if (!Array.isArray(items) || !items.length) return '';
  const intent = inferYearlyIntent(context);
  const analysis = analyzeSpreadSignal(items, intent);
  const evidenceSource = spreadName === '양자택일 (A/B)'
    ? prioritizeChoiceEvidence(items, analysis.topEvidence, intent)
    : analysis.topEvidence;
  const lexicon = pickSpreadLexicon(spreadName, intent);
  const choiceMeta = spreadName === '양자택일 (A/B)' ? parseChoiceOptionsEnhanced(context) : null;
  const lead = buildDecisionLead({
    spreadName,
    analysisLabel: analysis.label,
    lexiconMain: lexicon.main,
    choiceMeta
  });
  const contextHint = buildDecisionContextHint({ spreadName, intent, context, choiceMeta });
  const evidence = evidenceSource.slice(0, 3).map((entry) => {
    const prefix = buildEvidencePrefix({ position: entry.position, spreadName, choiceMeta });
    const reason = buildEvidenceDetail({
      position: entry.position,
      keyword: entry.keyword,
      orientation: entry.orientation,
      score: /역방향/.test(entry.orientation) ? -0.1 : 0.1,
      intent,
      spreadName,
      context
    });
    return `${prefix} ${entry.card} ${entry.orientation} 카드가 나왔고, ${reason}`;
  });
  return [
    `이번 리딩의 1차 판정은 ${analysis.label}이며, ${lead} ${contextHint}`.trim(),
    '판정 근거는 아래 카드 흐름에서 확인됩니다.',
    ...evidence
  ].join(' ');
}

function buildDecisionLead({ spreadName = '', analysisLabel = '조건부', lexiconMain = '핵심 흐름', choiceMeta = null }) {
  if (spreadName === '양자택일 (A/B)' && choiceMeta) {
    const a = choiceMeta.optionA || 'A안';
    const b = choiceMeta.optionB || 'B안';
    if (analysisLabel === '우세') return `${a}와 ${b}를 비교하면 한쪽 우세가 비교적 또렷합니다.`;
    if (analysisLabel === '박빙') return `${a}와 ${b}의 장단이 비슷해서, 작은 조건 차이가 결과를 가를 가능성이 큽니다.`;
    return `${a}와 ${b} 모두 걸리는 지점이 있어, 조건을 붙여 좁혀 가는 접근이 맞습니다.`;
  }
  if (analysisLabel === '우세') return `${lexiconMain} 기준으로 앞으로 어떻게 풀릴지 비교적 또렷합니다.`;
  if (analysisLabel === '박빙') return `${lexiconMain} 기준이 비슷해서 작은 조정이 결과를 가를 가능성이 큽니다.`;
  return `${lexiconMain}에서 걸리는 부분이 있어 조건을 붙여 접근하는 편이 맞습니다.`;
}

function buildDecisionContextHint({ spreadName = '', intent = 'general', context = '', choiceMeta = null }) {
  if (spreadName === '양자택일 (A/B)' && choiceMeta) {
    const a = choiceMeta.optionA || 'A안';
    const b = choiceMeta.optionB || 'B안';
    if (intent === 'career' || /(이직|취업|면접|직장|커리어|회사)/.test(String(context || ''))) {
      return `이번 선택은 '${a} vs ${b}' 중 당장 좋아 보이는 쪽보다, 3개월 유지 가능성을 먼저 보는 게 핵심입니다.`;
    }
    if (intent === 'finance') {
      return '이번 선택은 단기 이익보다 3개월 고정비·변동비를 함께 버틸 수 있는지 확인하는 게 핵심입니다.';
    }
    return '이번 선택은 당장 반응보다 실제로 오래 유지될 조건을 먼저 확인하는 게 핵심입니다.';
  }
  if (intent === 'career') return '지금은 속도보다 완성도와 지속 가능성을 같이 보는 쪽이 정확합니다.';
  if (intent === 'relationship' || intent === 'relationship-repair') return '지금은 결론보다 대화 순서와 속도 조절이 더 크게 작동합니다.';
  if (intent === 'finance') return '지금은 수익 확대보다 손실 관리와 현금흐름 안정이 먼저입니다.';
  return '지금은 감보다 기준을 먼저 세우고 움직일 때 체감 오차가 줄어듭니다.';
}

function buildEvidencePrefix({ position = '', spreadName = '', choiceMeta = null }) {
  if (spreadName === '양자택일 (A/B)' && choiceMeta) {
    const a = choiceMeta.optionA || 'A안';
    const b = choiceMeta.optionB || 'B안';
    if (/현재 상황/.test(position)) return '현재 상황에서는';
    if (/A 선택 시 결과/.test(position)) return `${a}를 고르면`;
    if (/B 선택 시 결과/.test(position)) return `${b}를 고르면`;
    if (/A 선택 시 가까운 미래/.test(position)) return `${a}를 고른 직후 흐름에서는`;
    if (/B 선택 시 가까운 미래/.test(position)) return `${b}를 고른 직후 흐름에서는`;
  }
  return `${position}에서는`;
}

function buildEvidenceDetail({
  position = '',
  keyword = '핵심',
  orientation = '정방향',
  score = 0,
  intent = 'general',
  spreadName = '',
  context = ''
}) {
  const open = !/역방향/.test(orientation) && score >= 0;
  if (spreadName === '양자택일 (A/B)') {
    if (/현재 상황/.test(position)) {
      return open
        ? `"${keyword}"을 먼저 기준으로 잡으면 선택이 덜 흔들립니다.`
        : `"${keyword}"에서 머뭇거리기 쉬운 구간이라, 기준부터 좁혀 가는 판단이 선명해집니다.`;
    }
    if (/선택 시 결과/.test(position)) {
      if (intent === 'career' || /(이직|취업|면접|직장|커리어|회사)/.test(String(context || ''))) {
        return open
          ? `"${keyword}" 흐름이 살아 있어 초반 적응 뒤에는 역할 확장 여지가 보입니다.`
          : `"${keyword}" 쪽 피로가 쌓이기 쉬워, 통근·생활비·업무강도를 같이 보며 속도를 조절해야 합니다.`;
      }
      return open
        ? `"${keyword}" 흐름이 살아 있어 실행 후 체감이 비교적 안정적으로 붙을 가능성이 큽니다.`
        : `"${keyword}" 쪽에서 소모가 쌓이기 쉬워, 실행 강도를 낮추고 점검을 먼저 두는 편이 좋습니다.`;
    }
  }
  if (intent === 'relationship' || intent === 'relationship-repair') {
    return open
      ? `"${keyword}" 흐름이 살아 있어 대화를 열 여지가 남아 있습니다.`
      : `"${keyword}"에서 오해가 커지기 쉬워, 결론보다 확인 대화를 먼저 두는 편이 좋습니다.`;
  }
  if (intent === 'finance') {
    return open
      ? `"${keyword}" 흐름이 살아 있어 계획형 집행이 잘 맞을 가능성이 큽니다.`
      : `"${keyword}" 쪽에서 지출 누수가 생기기 쉬워, 신규 집행보다 손실 점검이 먼저입니다.`;
  }
  if (intent === 'career') {
    return open
      ? `"${keyword}" 흐름이 살아 있어 실행을 이어갈 힘이 남아 있습니다.`
      : `"${keyword}" 쪽에서 과부하가 생기기 쉬워, 속도를 낮추고 완성도를 먼저 챙겨야 합니다.`;
  }
  return open
    ? `"${keyword}" 흐름이 살아 있어 해볼 만한 힘이 남아 있습니다.`
    : `"${keyword}" 쪽에서 소모가 쌓이기 쉬워, 속도 조절과 정비를 먼저 두는 편이 좋습니다.`;
}
