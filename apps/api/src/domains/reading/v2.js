import { analyzeQuestionContextSync } from '../../question-understanding/index.js';
import { analyzeSpreadSignal } from '../common/signal-analyzer.js';

export function buildReadingV2({
  spreadId = '',
  spreadName = '',
  items = [],
  summary = '',
  context = '',
  level = 'beginner',
  renderingMode = 'neutral'
}) {
  const questionAnalysis = analyzeQuestionContextSync(context, { mode: 'hybrid', flag: true });
  const signal = analyzeSpreadSignal(items, questionAnalysis.intent);
  const verdictLead = signal.label === '우세'
    ? '핵심 신호가 비교적 선명합니다.'
    : signal.label === '박빙'
      ? '신호가 팽팽해 작은 운영 차이가 결과를 가릅니다.'
      : '마찰 신호가 있어 속도 조절이 필요합니다.';

  const narrative = buildNarrativeBlock({
    spreadName,
    context,
    items,
    verdict: signal.label,
    renderingMode
  });

  return {
    verdict: {
      label: signal.label,
      confidenceBand: questionAnalysis.confidenceBand,
      cautionLevel: signal.label === '조건부' ? 'high' : signal.label === '박빙' ? 'medium' : 'low',
      reason: verdictLead
    },
    narrative,
    evidence: signal.topEvidence.slice(0, 3).map((entry) => ({
      position: entry.position,
      card: entry.card,
      orientation: entry.orientation,
      keyword: entry.keyword,
      reason: entry.reason
    })),
    actionPlan: {
      now: buildImmediateAction({ spreadId, context, verdict: signal.label }),
      today: buildTodayAction({ spreadId, context, level }),
      thisWeek: buildWeekAction({ spreadId, context })
    },
    reviewPlan: {
      metric: buildReviewMetric({ spreadId, questionType: questionAnalysis.questionType }),
      checkIn: questionAnalysis.timeHorizon === 'immediate' ? '오늘 밤/내일 아침 체감 변화를 1줄 기록하세요.' : '다음 체크 시점에 실제 반응/결과를 1줄로 기록하세요.',
      failSafe: signal.label === '조건부' ? '과열/과속 신호가 보이면 강도를 즉시 1단계 낮추세요.' : '리듬이 흔들리면 핵심 행동 1개만 남기고 나머지는 보류하세요.'
    },
    safety: {
      disallowedToneTriggered: false,
      downtoned: renderingMode !== 'immersive_safe' ? false : true
    },
    meta: {
      spreadId,
      spreadName,
      intent: questionAnalysis.intent,
      subIntent: questionAnalysis.subIntent,
      questionType: questionAnalysis.questionType,
      source: questionAnalysis.source,
      templateVersion: 'reading-v2.0'
    },
    summary
  };
}

function buildNarrativeBlock({ spreadName = '', context = '', items = [], verdict = '조건부', renderingMode = 'immersive_safe' }) {
  const primary = items[0];
  const cardName = primary?.card?.nameKo || '첫 카드';
  const keyword = primary?.card?.keywords?.[0] || '핵심 신호';
  const contextLine = context?.trim() ? `"${context.trim()}"` : '현재 질문';
  const opening = `${contextLine}를 두고 망설이는 지점이 분명합니다.`;
  const scene = `${cardName}의 "${keyword}" 신호가 지금 흐름의 중심에 놓여 있습니다.`;
  const bridge = verdict === '우세'
    ? '흐름을 살리되 과신하지 않고 유지 조건을 먼저 고정하는 편이 좋습니다.'
    : verdict === '박빙'
      ? '같은 카드라도 운영 속도에 따라 결과가 달라질 수 있어 작은 조정이 핵심입니다.'
      : '지금은 결론을 밀어붙이기보다 강도를 낮추고 관찰값을 먼저 확보하는 쪽이 안전합니다.';
  const closing = renderingMode === 'immersive_safe'
    ? `${spreadName} 리딩의 핵심은 감정 몰입보다 근거-실행-복기의 리듬을 지키는 것입니다.`
    : `${spreadName} 리딩은 근거 중심으로 짧게 운영하는 것이 유리합니다.`;
  return { mode: renderingMode, opening, scene, bridge, closing };
}

function buildImmediateAction({ spreadId = '', context = '', verdict = '조건부' }) {
  if (spreadId === 'choice-a-b') return '각 선택지의 단기 비용 1개와 장기 이득 1개를 2줄로 적어 비교하세요.';
  if (/(잠|수면|sleep)/i.test(context)) return verdict === '우세' ? '지금 바로 휴식 루틴 1개를 실행하고 화면 노출을 줄이세요.' : '지금은 10분 정리 루틴 후 수면 여부를 다시 판단하세요.';
  if (/(시험|합격|공부|학습|기출|모의고사|오답|회독|자격증)/i.test(context)) {
    return verdict === '우세'
      ? '기출 10문항 1세트와 오답 10분 복기를 바로 실행하고, 오늘 종료 시간을 고정하세요.'
      : verdict === '박빙'
        ? '취약유형 1개만 골라 기출 10문항을 풀고, 틀린 이유를 1줄씩 적어 강도를 낮춰 점검하세요.'
        : '오늘은 범위를 줄여 취약유형 1개만 정리하고, 기출 5문항으로 감각만 확인하세요.';
  }
  return '지금 10분 안에 끝낼 수 있는 행동 1개만 실행하세요.';
}

function buildTodayAction({ spreadId = '', context = '', level = 'beginner' }) {
  if (spreadId === 'yearly-fortune' || spreadId === 'monthly-fortune') return '오늘 해야 할 핵심 1개와 미룰 것 1개를 분리해 운영하세요.';
  if (/관계|재회|연락|연애/.test(context)) return '대화에서는 사실 1문장 + 요청 1문장 순서로 전달하세요.';
  return level === 'intermediate'
    ? '가설 1개와 반례 1개를 같이 적고 실행 결과를 비교하세요.'
    : '핵심 키워드 1개를 오늘 행동 1개로 바꿔 실행하세요.';
}

function buildWeekAction({ spreadId = '', context = '' }) {
  if (spreadId === 'weekly-fortune') return '요일별 강도 차이를 반영해 고강도 일정은 2일 이내로 제한하세요.';
  if (/이직|면접|career|job/.test(context)) return '이번 주에는 준비(근거 정리)와 실행(지원/면접)을 분리해 운영하세요.';
  return '이번 주 말에 실행 결과와 체감 변화를 3줄 이내로 복기하세요.';
}

function buildReviewMetric({ spreadId = '', questionType = 'open' }) {
  if (spreadId === 'choice-a-b') return '선택 후 만족도(1~5) + 피로도(1~5)';
  if (questionType === 'yes_no') return '실행 여부 + 결과 체감(좋아짐/유지/악화)';
  return '핵심 행동 수행률 + 결과 일치도';
}
