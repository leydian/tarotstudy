import {
  inferSummaryContextTone,
  inferYearlyIntent,
  isCareerTimingContext,
  normalizeContextText,
  hashText,
  pickByNumber,
  pickTopKeywords,
  normalizeLine,
  withKoreanParticle
} from '../common/utils.js';

export function summarizeYearlyFortune({ items, context = '', level = 'beginner' }) {
  const contextLabel = normalizeContextText(context);
  const yearlyIntent = inferYearlyIntent(contextLabel);
  const monthly = items
    .map((item) => {
      const match = String(item.position?.name || '').match(/^([1-9]|1[0-2])월$/);
      if (!match) return null;
      return {
        month: Number(match[1]),
        cardName: item.card.nameKo,
        orientation: item.orientation,
        keywords: item.card.keywords || []
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.month - b.month);

  const q1 = monthly.filter((m) => m.month >= 1 && m.month <= 3);
  const q2 = monthly.filter((m) => m.month >= 4 && m.month <= 6);
  const q3 = monthly.filter((m) => m.month >= 7 && m.month <= 9);
  const q4 = monthly.filter((m) => m.month >= 10 && m.month <= 12);
  const quarters = [
    { label: '1분기(1~3월)', months: q1 },
    { label: '2분기(4~6월)', months: q2 },
    { label: '3분기(7~9월)', months: q3 },
    { label: '4분기(10~12월)', months: q4 }
  ];

  const scoreQuarter = (months) =>
    months.reduce((acc, m) => acc + (m.orientation === 'upright' ? 1 : -1), 0);
  const quarterScores = quarters.map((q) => ({ ...q, score: scoreQuarter(q.months) }));
  const strongest = [...quarterScores].sort((a, b) => b.score - a.score)[0];
  let weakest = [...quarterScores].sort((a, b) => a.score - b.score)[0];
  if (weakest.label === strongest.label) {
    weakest = [...quarterScores].sort((a, b) => a.score - b.score)
      .find((q) => q.label !== strongest.label) ?? weakest;
  }
  const topKeywords = pickTopKeywords(items, 3);
  const keywordText = topKeywords.length ? topKeywords.join(', ') : '핵심 테마';
  const isJobTimingQuestion = isCareerTimingContext(contextLabel);
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;

  const overall = buildYearlyOverallLine({
    contextLabel,
    keywordText,
    strongestLabel: strongest.label,
    weakestLabel: weakest.label
  });

  const quarterLines = buildQuarterNarratives({
    quarterScores,
    intent: yearlyIntent,
    isJobTimingQuestion
  }).join(' ');

  const monthlyLines = buildYearlyMonthlyNarratives({
    monthly,
    intent: yearlyIntent,
    isJobTimingQuestion
  }).join(' ');

  const timingClose = isJobTimingQuestion
    ? `취직 시기 관점으로 최종 정리하면, ${strongest.label}에는 지원 채널을 본격적으로 열어 면접과 최종 합격 가능성을 높이는 데 집중하세요. 반면 ${weakest.label}에는 이력서·포트폴리오 보완과 직무 분석 등 내실을 기하며 다음 기회를 준비하는 것이 좋습니다. ${levelHint}`
    : yearlyIntent === 'finance'
      ? `재물운 관점에서는 분기별 역할을 나눠 운영하시면 정확도가 올라갑니다. 탄력이 붙는 ${strongest.label}에는 계획형 집행 1~2개만 기준 안에서 실행하고, 조정이 필요한 ${weakest.label}에는 신규 지출을 줄이며 누수 점검과 현금 보존을 우선해 주세요. ${levelHint}`
      : `마지막으로 ${strongest.label}은 확장 구간, ${weakest.label}은 정비 구간으로 나눠 운영하시면 올해 리딩을 실제 행동으로 옮기기가 훨씬 수월해집니다. ${levelHint}`;
  const yearlyThemeKeyword = monthly.map((m) => m.keywords?.[0]).find(Boolean) || '연간 리듬';
  const yearlyThemeLine = `한 줄 테마: 올해는 '${yearlyThemeKeyword}'을 기준으로 분기마다 속도를 나누면 흔들림을 줄이기 좋습니다.`;

  return [
    `총평: ${overall}`,
    `분기별 운세: ${quarterLines}`,
    `월별 운세: ${monthlyLines}`,
    yearlyThemeLine,
    timingClose
  ].join('\n\n');
}

function buildNonCareerMonthlyAction({ intent, orientation }) {
  if (intent === 'social') {
    return orientation === 'upright'
      ? '주변과의 접점을 늘리되 짧고 일관된 태도를 유지하면 평판 안정에 도움이 됩니다.'
      : '해명보다 말투와 반응 템포를 정리해 인상 피로를 먼저 줄이는 편이 좋습니다.';
  }
  if (intent === 'relationship') {
    return orientation === 'upright'
      ? '관계를 조금 더 가까이 가져갈 대화나 제안을 해보기에 좋은 달입니다.'
      : '감정 해석을 서두르기보다 오해를 줄이는 대화가 더 중요한 달입니다.';
  }
  if (intent === 'finance') {
    return orientation === 'upright'
      ? '예산 범위 안에서 계획적으로 운영하면 안정적인 성과를 만들기 좋은 달입니다.'
      : '확장보다 지출 통제와 위험 점검을 먼저 두는 편이 좋은 달입니다.';
  }
  return orientation === 'upright'
    ? '실행 반경을 넓혀도 흐름이 받쳐주는 달입니다.'
    : '속도를 낮추고 정리부터 해야 흔들림이 줄어드는 달입니다.';
}

function buildYearlyOverallLine({ contextLabel, keywordText, strongestLabel, weakestLabel }) {
  const base = contextLabel
    ? `"${contextLabel}"를 기준으로 보면`
    : '올해 전체 흐름을 보면';
  const templates = [
    `${base} 초반부터 끝까지 같은 템포로 밀기보다 분기마다 강약을 조절해 가는 편이 더 안정적입니다. 올해를 관통하는 키워드는 ${keywordText}이며, 특히 ${strongestLabel} 쪽에서 흐름이 가장 잘 살아날 가능성이 큽니다. 다만 ${weakestLabel}은 무리한 확장보다 점검과 보완을 우선하는 편이 좋겠습니다.`,
    `${base} 한 번에 크게 확장하기보다 분기별로 전략을 나눠 운영하는 방식이 더 정확합니다. 핵심 키워드는 ${keywordText}로 읽히고, 실행 탄력은 ${strongestLabel}에서 상대적으로 높게 나타납니다. 반대로 ${weakestLabel}은 속도를 낮춰 리듬을 정리하는 구간으로 보입니다.`,
    `${base} 올해는 직선형 추진보다 분기별 조정형 운영이 더 잘 맞습니다. 키워드 축은 ${keywordText}이고, 실제 반응이 붙기 쉬운 구간은 ${strongestLabel}입니다. ${weakestLabel}은 준비 밀도와 점검 품질을 먼저 끌어올리면 전체 안정성이 좋아집니다.`,
    `${base} 같은 강도로 계속 달리기보다 분기마다 역할을 달리 가져가는 편이 결과적으로 유리합니다. 올해 핵심 키워드는 ${keywordText}이며, ${strongestLabel}은 실행을 조금 넓혀보기 좋은 구간입니다. ${weakestLabel}은 정비 중심으로 운영할 때 흐름이 덜 흔들립니다.`
  ];
  const seed = `${contextLabel}:${keywordText}:${strongestLabel}:${weakestLabel}`;
  let score = 0;
  for (let i = 0; i < seed.length; i += 1) score += seed.charCodeAt(i);
  return templates[score % templates.length];
}

function buildQuarterNarratives({ quarterScores, intent, isJobTimingQuestion }) {
  const quartersWithRole = quarterScores.map((q, idx) => ({
    ...q,
    role: quarterRoleByIndex(idx)
  }));
  return quartersWithRole.map((q, idx) => {
    const mode = q.score >= 1 ? 'open' : q.score <= -1 ? 'adjust' : 'balanced';
    const evidence = buildQuarterEvidence(q.months);
    const focus = buildQuarterFocus({
      index: idx,
      role: q.role,
      intent,
      mode,
      isJobTimingQuestion,
      evidence
    });
    const action = buildQuarterAction({
      index: idx,
      role: q.role,
      intent,
      mode,
      isJobTimingQuestion,
      evidence
    });
    return `${q.label}은 ${focus} ${action}`;
  });
}

function quarterRoleByIndex(index) {
  const roles = ['기반 다지기', '실행 점검', '확장 조율', '연말 정리'];
  return roles[index] ?? '운영';
}

function buildQuarterEvidence(months = []) {
  const list = Array.isArray(months) ? months : [];
  const uprightCount = list.filter((m) => m.orientation === 'upright').length;
  const reversedCount = list.length - uprightCount;
  const keywords = list.flatMap((m) => Array.isArray(m.keywords) ? m.keywords : []).filter(Boolean);
  const topKeyword = keywords[0] || '리듬';
  const cards = list.map((m) => m.cardName).filter(Boolean);
  const cardEvidence = cards.slice(0, 2).join(', ');
  return {
    uprightCount,
    reversedCount,
    topKeyword,
    cardEvidence
  };
}

const MONTH_ROLE_GUIDE = {
  '1월': '출발 전에 기준과 방향을 세우는 자리',
  '2월': '초기 적응 리듬을 맞추는 자리',
  '3월': '초기 실행의 반응을 확인하는 자리',
  '4월': '실행 범위를 조절해 확장 여부를 판단하는 자리',
  '5월': '변수와 마찰을 조정하는 자리',
  '6월': '상반기 성과와 보완점을 정리하는 자리',
  '7월': '하반기 시작 전에 리듬을 재정비하는 자리',
  '8월': '중반 추진력을 회복해 실행을 늘리는 자리',
  '9월': '성과와 피로를 함께 조율하는 자리',
  '10월': '리스크를 점검해 마무리 계획을 세우는 자리',
  '11월': '수확 구간의 완성도를 높이는 자리',
  '12월': '연말 정리와 다음 해 전환을 준비하는 자리'
};

function buildQuarterFocus({ index, role, intent, mode, isJobTimingQuestion, evidence }) {
  const evidenceLine = evidence?.cardEvidence
    ? `(${evidence.cardEvidence} 기준)`
    : '';
  const roleObject = withKoreanParticle(role, '을', '를');
  if (role === '연말 정리') {
    if (intent === 'career' || isJobTimingQuestion) {
      return `연말 분기인 만큼 ${evidenceLine} 새로 넓히기보다 올해 지원/면접 결과를 정리하고 최종 방향을 확정하는 데 무게를 두는 편이 좋습니다.`;
    }
    if (intent === 'relationship') {
      return `연말 분기에서는 ${evidenceLine} 관계의 속도를 올리기보다 올해 대화 패턴을 정리하고 다음 해 기준을 세우는 편이 좋겠습니다.`;
    }
    if (intent === 'finance') {
      return `연말 분기에서는 ${evidenceLine} 확장보다 결산과 위험 점검을 우선해 재정 리듬을 정리하는 편이 좋겠습니다.`;
    }
    if (intent === 'social') {
      return `연말 분기에서는 ${evidenceLine} 관계를 무리하게 넓히기보다 한 해 동안 쌓인 인상과 대화 패턴을 정리해 다음 해 기준을 세우는 편이 좋겠습니다.`;
    }
    return `연말 분기에서는 ${evidenceLine} 새로운 확장보다 올해 흐름을 정리하고 다음 해 운영 기준을 세우는 쪽이 맞겠습니다.`;
  }

  if (intent === 'career' || isJobTimingQuestion) {
    if (mode === 'open') {
      return pickByNumber([
        `정방향 ${evidence.uprightCount}장 신호가 살아 있어 ${roleObject} 진행하기에 부담이 크지 않은 구간입니다.`,
        `${evidenceLine} 흐름이 부드럽게 열려 있어 ${role} 단계 실행을 이어가기 수월해 보입니다.`,
        `카드 키워드 '${evidence.topKeyword}'이 받쳐줘 ${role} 과정의 시도가 반응으로 이어질 가능성이 있습니다.`
      ], index);
    }
    if (mode === 'adjust') {
      return pickByNumber([
        `역방향 ${evidence.reversedCount}장 신호가 걸려 ${role}에서는 속도보다 정비에 무게를 두는 편이 좋습니다.`,
        `${evidenceLine} 과속을 경계하는 결이라 ${role} 과정에서는 보완과 점검을 먼저 두는 편이 안정적입니다.`,
        `카드 키워드 '${evidence.topKeyword}'이 경고로 들어와 ${role} 단계에서는 실행 폭을 줄이는 편이 맞습니다.`
      ], index);
    }
    return pickByNumber([
      `정방향/역방향이 비슷해 ${role} 단계에서 확장과 정비를 균형 있게 가져가는 편이 좋습니다.`,
      `${evidenceLine} 강약이 크지 않아 ${role} 과정에서는 준비와 실행 비중을 반반으로 두는 방식이 맞겠습니다.`,
      `한쪽으로 치우치기보다 ${role} 단계에서는 작은 실행과 보완을 함께 가져가기 좋은 구간입니다.`
    ], index);
  }

  if (intent === 'relationship') {
    if (mode === 'open') return `${evidenceLine} 관계 흐름이 열려 있어 대화 접점을 늘리기 좋은 구간입니다.`;
    if (mode === 'adjust') return `${evidenceLine} 감정 해석이 엇갈릴 수 있어 속도를 늦추는 편이 좋은 구간입니다.`;
    return `${evidenceLine} 대화와 거리 조절을 균형 있게 가져가기 좋은 구간입니다.`;
  }

  if (intent === 'finance') {
    if (mode === 'open') return `${evidenceLine} 재정 카드가 정방향 ${evidence.uprightCount}장으로 우세해 계획 집행을 늘리기 좋은 구간입니다.`;
    if (mode === 'adjust') return `${evidenceLine} 역방향 ${evidence.reversedCount}장 신호가 보여 지출 변동성 점검을 먼저 둬야 하는 구간입니다.`;
    return `${evidenceLine} 확장보다 계획 유지와 현금흐름 확인에 초점을 두기 좋은 구간입니다.`;
  }

  if (intent === 'social') {
    if (mode === 'open') return `${evidenceLine} 주변 인식 흐름이 열려 있어 협업 접점을 넓히기 좋은 구간입니다.`;
    if (mode === 'adjust') return `${evidenceLine} 피로감이 인상에 반영될 수 있어 말투와 반응 속도를 정리하는 편이 좋은 구간입니다.`;
    return `${evidenceLine} 신뢰 확장과 거리 조절을 균형 있게 가져가기 좋은 구간입니다.`;
  }

  if (mode === 'open') return `${evidenceLine} 흐름이 열려 있어 계획한 일을 무리 없이 이어가기 좋은 구간입니다.`;
  if (mode === 'adjust') return `${evidenceLine} 흐름 조정이 필요한 구간이라 정비를 먼저 두는 편이 좋겠습니다.`;
  return `${evidenceLine} 강약이 크지 않아 균형 운영이 잘 맞는 구간입니다.`;
}

function buildQuarterAction({ index, role, intent, mode, isJobTimingQuestion, evidence }) {
  if (role === '연말 정리') {
    if (intent === 'career' || isJobTimingQuestion) {
      return pickByNumber([
        '올해 지원/면접 결과를 한 번 정리하고, 최종 선택 기준을 확정해 다음 해 계획으로 넘겨두시면 좋겠습니다.',
        '진행한 건의 결과를 결산한 뒤, 유지할 전략과 바꿀 전략을 구분해 다음 해 시작점을 정해보세요.',
        '연말에는 성과를 확인하고 남은 과제를 목록화해 내년 1분기 실행 항목으로 연결해두시면 좋겠습니다.'
      ], index);
    }
    if (intent === 'relationship') {
      return '올해 관계에서 효과가 있었던 대화 방식과 부담이 컸던 방식을 구분해 다음 해 기준으로 정리해보세요.';
    }
    if (intent === 'finance') {
      return '연간 지출·저축 흐름을 결산하고, 내년 고정비/변동비 기준을 숫자로 다시 세워두시면 안정적입니다.';
    }
    if (intent === 'social') {
      return '올해 관계에서 반응이 좋았던 말투와 부담이 컸던 반응을 나눠 정리해 다음 해 대화 기준으로 고정해보세요.';
    }
    return '올해 실행과 결과를 짧게 결산해 다음 해의 우선순위를 미리 정리해두시면 흐름이 훨씬 편해집니다.';
  }

  if (intent === 'career' || isJobTimingQuestion) {
    if (mode === 'open') {
      return pickByNumber([
        `${role} 단계에서는 지원 채널을 조금 넓히고 면접 경험을 꾸준히 쌓아두시면 좋겠습니다.`,
        `${role} 구간에서는 작은 지원을 이어가면서 동시에 면접 감각을 유지하는 전략이 잘 맞겠습니다.`,
        `${role} 흐름에서는 접점 확보를 우선해 탐색 범위를 늘려보시면 다음 분기가 편해집니다.`
      ], index);
    }
    if (mode === 'adjust') {
      return pickByNumber([
        `${role} 단계에서는 지원 수를 늘리기보다 서류 완성도와 답변 구조를 정리해두시면 좋겠습니다.`,
        `${role} 구간에서는 결과를 서두르기보다 포트폴리오와 경력 서사 정비를 먼저 두시는 편이 안정적입니다.`,
        `${role} 흐름에서는 실행은 작게 유지하고 보완 루틴을 먼저 확보해두시면 부담이 줄어듭니다.`
      ], index);
    }
    return pickByNumber([
      `${role} 단계에서는 지원과 보완을 함께 가져가며 분기 말에 한 번 점검하는 방식이 잘 맞겠습니다.`,
      `${role} 구간에서는 움직임은 유지하되 제출 전 점검 루틴을 고정해두시면 좋겠습니다.`,
      `${role} 흐름에서는 작은 실행과 품질 보완을 병행하면 안정적으로 이어갈 수 있습니다.`
    ], index);
  }

  if (intent === 'relationship') {
    if (mode === 'open') return '감정 표현과 요청을 짧고 분명하게 전달해보시면 좋겠습니다.';
    if (mode === 'adjust') return '확인 대화를 먼저 두고 해석은 한 템포 늦추는 방식을 권합니다.';
    return '대화 빈도와 감정 강도를 중간값으로 맞춰 보시면 안정적입니다.';
  }

  if (intent === 'finance') {
    const quarterChecklist = [
      '예산 상한과 자동결제 목록을 1회 정리해 기준선을 먼저 고정해보세요.',
      '변동비 상한을 주 단위로 재설정하고, 비필수 지출 1개를 고정 감축해보세요.',
      '현금흐름표를 기준으로 투자/소비 비중을 다시 나눠 리스크를 줄여보세요.',
      '결산표에서 누수 항목 1개를 정리하고 내년 기준표로 이관해보세요.'
    ];
    const checklist = quarterChecklist[index] || quarterChecklist[0];
    if (mode === 'open') return `${checklist} 카드 키워드 '${evidence.topKeyword}' 신호가 살아 있을 때 실행 정확도가 올라갑니다.`;
    if (mode === 'adjust') return `${checklist} 역방향 신호가 있는 분기라 신규 집행은 보수적으로 두세요.`;
    return `${checklist} 과속보다 유지 중심으로 운영하면 분기 흔들림을 줄일 수 있습니다.`;
  }

  if (intent === 'social') {
    if (mode === 'open') return '짧은 확인 인사와 명확한 피드백을 유지해 신뢰 접점을 꾸준히 늘려보시면 좋겠습니다.';
    if (mode === 'adjust') return '설명은 짧게 줄이고 반응을 천천히 확인해 오해와 피로를 먼저 낮춰보세요.';
    return '관계 확장과 거리 조절을 반반으로 두고 태도 일관성을 유지해보시면 안정적입니다.';
  }

  if (mode === 'open') return '계획한 실행을 작게라도 이어가며 리듬을 유지해보시면 좋겠습니다.';
  if (mode === 'adjust') return '속도를 조금 낮추고 정리할 부분부터 하나씩 점검해보시면 좋겠습니다.';
  return '확장보다 균형 운영을 우선해 흐름을 안정적으로 가져가시면 좋겠습니다.';
}

function buildYearlyMonthlyNarratives({ monthly, intent, isJobTimingQuestion }) {
  const lines = [];
  let prevSignature = '';

  for (const item of monthly) {
    const keyword = item.keywords?.[0] ?? '흐름';
    const monthLabel = `${item.month}월`;
    const monthRole = MONTH_ROLE_GUIDE[monthLabel] ?? '해당 달 역할';
    const mode = selectMonthlyMode({ intent, orientation: item.orientation, isJobTimingQuestion });
    const toneLine = buildMonthlyToneLine({
      intent,
      mode,
      keyword,
      cardName: item.cardName,
      month: item.month,
      monthRole
    });
    const actionLine = buildMonthlyActionLine({
      intent,
      mode,
      month: item.month,
      cardName: item.cardName,
      monthRole
    });

    const signature = `${mode}:${item.cardName}:${toneLine.slice(0, 18)}:${actionLine.slice(0, 18)}`;
    const adjustedAction = signature === prevSignature
      ? buildMonthlyFallbackAction({ intent, mode, month: item.month, cardName: item.cardName })
      : actionLine;

    lines.push(`${item.month}월(${item.cardName})은 ${toneLine} ${adjustedAction}`);
    prevSignature = signature;
  }

  return lines;
}

function selectMonthlyMode({ intent, orientation, isJobTimingQuestion }) {
  if (intent === 'career' || isJobTimingQuestion) {
    return orientation === 'upright' ? 'advance' : 'prepare';
  }
  if (intent === 'relationship') {
    return orientation === 'upright' ? 'open' : 'care';
  }
  if (intent === 'finance') {
    return orientation === 'upright' ? 'stabilize' : 'guard';
  }
  if (intent === 'social') {
    return orientation === 'upright' ? 'connect' : 'calibrate';
  }
  return orientation === 'upright' ? 'advance' : 'prepare';
}

function buildMonthlyToneLine({ intent, mode, keyword, cardName, month, monthRole }) {
  const role = normalizeYearlyMonthRole(monthRole);
  const baseSeed = hashText(`${intent}:${mode}:${month}:${cardName}:${keyword}`);

  if (intent === 'career') {
    if (mode === 'advance') {
      return pickByNumber([
        `${cardName}의 ${keyword} 신호가 살아 있어 ${role}에서 외부 접점을 넓히기 좋은 결입니다.`,
        `${cardName} 기준으로 보면 ${keyword} 흐름이 열려 있어 ${role}의 실행 탄력이 붙기 쉽습니다.`,
        `${cardName} 카드가 ${keyword} 축을 밀어주고 있어 ${role}에서 행동 반경을 조금 넓혀도 무리가 적습니다.`
      ], baseSeed);
    }
    if (mode === 'balanced') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 중간값이라 ${role}에서는 준비와 실행의 비중을 균형 있게 두는 편이 좋겠습니다.`,
        `${cardName} 신호가 강하게 치우치지 않아 ${role}에서는 확장과 점검을 함께 가져가는 구성이 맞습니다.`,
        `${cardName} 흐름상 ${role}에서 속도를 크게 올리기보다 품질 점검을 병행하는 방식이 안정적입니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 조정 구간이라 ${role}에서는 결과를 서두르기보다 준비 밀도를 높이는 편이 맞겠습니다.`,
      `${cardName} 신호는 ${role}에서 병목 점검이 우선임을 보여주며, 실행 폭을 잠시 줄이는 편이 안전합니다.`,
      `${cardName} 카드가 ${keyword} 변동성을 시사하므로 ${role}에서는 보완 중심 운영이 더 유리합니다.`
    ], baseSeed);
  }

  if (intent === 'relationship') {
    if (mode === 'open') {
      return pickByNumber([
        `${cardName}의 ${keyword} 결이 열려 있어 ${role}에서 대화 접점을 늘리기 좋은 분위기입니다.`,
        `${cardName} 흐름에서는 ${keyword} 신호가 비교적 부드러워 ${role}의 관계 회복 시도가 유리합니다.`,
        `${cardName} 카드 기준으로 ${role}에서는 감정 교류를 먼저 열어도 무리가 적겠습니다.`
      ], baseSeed);
    }
    return pickByNumber([
        `${cardName}의 ${keyword} 결이 예민해 ${role}에서는 감정 속도를 낮추는 편이 관계에 도움이 됩니다.`,
        `${cardName} 흐름상 ${role}에서 해석 충돌이 생기기 쉬워 확인 대화를 먼저 두는 편이 좋겠습니다.`,
        `${cardName} 카드가 ${keyword} 변동을 시사하므로 ${role}에서는 단정 대신 반응 확인이 우선입니다.`
      ], baseSeed);
  }

  if (intent === 'finance') {
    if (mode === 'stabilize') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 안정 쪽이라 ${role}에서 계획형 운영이 잘 맞는 달입니다.`,
        `${cardName} 신호를 보면 ${role}에서는 수입·지출 기준을 유지할수록 체감 안정성이 올라갑니다.`,
        `${cardName} 카드가 ${keyword} 축을 받쳐줘 ${role}에서 예산 운영을 확장해도 무리가 적습니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 흔들릴 수 있어 ${role}에서는 지출 통제와 점검을 먼저 두는 편이 좋겠습니다.`,
      `${cardName} 신호는 ${role}에서 손실 방어를 우선하라는 메시지에 가깝습니다.`,
      `${cardName} 카드상 ${keyword} 변동성이 있어 ${role}에서는 보수적 운영이 더 안전합니다.`
    ], baseSeed);
  }

  if (intent === 'social') {
    if (mode === 'connect') {
      return pickByNumber([
        `${cardName}의 ${keyword} 흐름이 열려 있어 ${role}에서 주변 신뢰를 쌓기 좋은 구간입니다.`,
        `${cardName} 신호를 보면 ${role}에서는 말투와 반응이 긍정 인상으로 이어지기 쉬운 결입니다.`,
        `${cardName} 카드 기준으로 ${role}에서 협업 접점을 넓혀도 무리가 적은 흐름입니다.`
      ], baseSeed);
    }
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 예민해 ${role}에서는 해명보다 태도 일관성을 먼저 회복하는 편이 좋겠습니다.`,
      `${cardName} 신호는 ${role}에서 피로감 관리와 거리 조절이 우선임을 보여줍니다.`,
      `${cardName} 카드상 ${keyword} 변동이 있어 ${role}에서는 반응 속도를 낮춰 운영하는 편이 안정적입니다.`
    ], baseSeed);
  }

  if (mode === 'advance') {
    return pickByNumber([
      `${cardName}의 ${keyword} 흐름이 열려 있어 ${role}에서 계획한 일을 진행하기 좋은 달입니다.`,
      `${cardName} 기준으로 ${keyword} 신호가 살아 있어 ${role}의 실행을 이어가기 수월합니다.`,
      `${cardName} 카드가 ${role} 단계의 추진력을 받쳐줘 작은 확장을 시도해보기 좋겠습니다.`
    ], baseSeed);
  }

  return pickByNumber([
    `${cardName}의 ${keyword} 흐름이 고르지 않아 ${role}에서는 속도를 조금 늦추는 편이 좋겠습니다.`,
    `${cardName} 신호는 ${role}에서 정비가 우선이라는 의미에 가깝습니다.`,
    `${cardName} 카드 기준으로 ${keyword} 변동이 있어 ${role}에서는 실행 폭을 줄여 운영하는 편이 안정적입니다.`
  ], baseSeed);
}

function buildMonthlyActionLine({ intent, mode, month, cardName, monthRole }) {
  const role = normalizeYearlyMonthRole(monthRole);
  const seed = hashText(`${intent}:${mode}:${month}:${cardName}`);

  if (intent === 'career') {
    if (mode === 'advance') {
      return pickByNumber([
        `${role}에서는 지원서 제출 수를 늘리고 면접 일정을 본격적으로 확장해 제출 가능한 상태로 고정하세요.`,
        `${role}에는 이력서와 포트폴리오 탐색을 넓히고 채용 채널 한두 개를 더 열어 실제 지원으로 연결해 보세요.`,
        `${role} 구간에서는 지원서 1건 또는 면접 답변 1개를 완성해 제출 가능한 상태로 고정하는 실행이 잘 맞겠습니다.`
      ], seed);
    }
    if (mode === 'balanced') {
      return pickByNumber([
        `${role}에서는 지원과 서류 보완을 1:1로 두고, 면접 답변 항목 1개를 오늘 완성 가능한 상태로 만드세요.`,
        `${role} 구간에서는 지원 활동은 유지하되, 이력서 성과 수치나 경험 문장 1개를 더 구체적으로 보완해 보세요.`,
        `${role}에서는 바깥 움직임을 작게 유지하면서 직무 적합성 1건을 점검해 지원 품질을 안정시키세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 이력서 핵심 문장과 포트폴리오 흐름을 먼저 정리해 다음 달 지원을 위한 준비를 끝내 두세요.`,
      `${role} 구간에서는 지원 수 확대보다 면접 답변 구조 보강과 직무 분석에 집중해 준비 품질을 높이는 편이 좋겠습니다.`,
      `${role}에서는 결정 확장을 잠시 멈추고 지원서 품질 항목 1개(경력 서사/역량 증명)만 선별해 보완하세요.`
    ], seed);
  }

  if (intent === 'relationship') {
    if (mode === 'open') {
      return pickByNumber([
        `${role}에서는 짧고 솔직한 대화를 먼저 열어보시면 관계 흐름이 자연스럽게 이어질 수 있습니다.`,
        `${role} 구간에서는 요청과 감정을 간단히 나눠 말해보는 시도가 도움이 되겠습니다.`,
        `${role}에서는 상대 반응을 확인하는 가벼운 대화 제안을 해보기에 좋습니다.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 결론을 급히 내리기보다 오해를 줄이는 확인 대화를 먼저 가져가시면 좋겠습니다.`,
      `${role} 구간에서는 감정 표현 강도를 한 단계 낮추고 경계와 요청을 분리해서 전해보세요.`,
      `${role}에서는 거리 조절과 대화 템포 조정을 우선하면 관계 피로가 줄어듭니다.`
    ], seed);
  }

  if (intent === 'finance') {
    if (mode === 'stabilize') {
      return pickByNumber([
        `${role}에서는 예산 범위 안에서 계획한 지출을 유지하면 안정적인 결과를 만들기 좋습니다.`,
        `${role} 구간에서는 고정비와 변동비를 나눠 관리해보면 체감 통제력이 올라갑니다.`,
        `${role}에서는 작은 절약 습관을 유지하면서 필요한 지출만 선별해보세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 새로운 지출 확장보다 지출 항목 점검을 먼저 두는 편이 좋겠습니다.`,
      `${role} 구간에서는 손실 가능성이 있는 선택을 한 템포 늦추고 현금흐름부터 확인해보세요.`,
      `${role}에서는 고정비 정리와 소비 우선순위 재배치를 먼저 하시면 안정적입니다.`
    ], seed);
  }

  if (intent === 'social') {
    if (mode === 'connect') {
      return pickByNumber([
        `${role}에서는 먼저 인사/확인/감사 중 1가지를 분명히 표현해 신뢰를 쌓아보세요.`,
        `${role} 구간에서는 말투를 짧고 명확하게 유지해 주변의 오해 가능성을 낮춰보시면 좋겠습니다.`,
        `${role}에서는 협업 접점을 한 번 더 만들되 반응 확인을 꼭 함께 가져가보세요.`
      ], seed);
    }
    return pickByNumber([
      `${role}에서는 설명을 길게 하기보다 핵심 한 문장으로 반응을 확인하는 편이 좋겠습니다.`,
      `${role} 구간에서는 대화 강도를 낮추고 거리 조절을 먼저 두면 피로가 줄어듭니다.`,
      `${role}에서는 경계와 요청을 분리해 말하는 방식으로 오해를 줄여보세요.`
    ], seed);
  }

  return mode === 'advance'
    ? `${role}에서는 계획한 일을 한두 가지라도 꾸준히 진행해보시면 좋겠습니다.`
    : `${role}에서는 속도를 늦추고 정비를 먼저 해두시면 다음 흐름이 훨씬 편안합니다.`;
}

function buildMonthlyFallbackAction({ intent, mode, month, cardName }) {
  const seed = hashText(`fallback:${intent}:${mode}:${month}:${cardName}`);
  if (intent === 'social') {
    return pickByNumber([
      '이번 달은 관계를 넓히기보다 일관된 말투와 반응을 유지해 인상 안정에 집중해보세요.',
      '해명보다 확인 대화 1개를 먼저 두고 주변 반응을 천천히 점검해보시는 편이 좋겠습니다.'
    ], seed);
  }
  if (intent === 'relationship') {
    return pickByNumber([
      '이번 달은 해석보다 반응 확인을 우선해 대화 온도를 안정시키는 데 집중해보세요.',
      '한 번에 많이 풀기보다 짧은 대화를 나눠 관계 리듬을 천천히 회복해보세요.'
    ], seed);
  }
  if (intent === 'finance') {
    return pickByNumber([
      '이번 달은 지출 로그를 짧게 기록해 새는 비용을 먼저 잡아보세요.',
      '확장 판단은 잠시 보류하고 고정비 구조를 먼저 정리해두는 편이 좋겠습니다.'
    ], seed);
  }
  if (intent === 'career') {
    return pickByNumber([
      '이번 달은 외부 실행 1개와 보완 1개를 짝으로 고정해 리듬을 유지해보세요.',
      '우선순위 1개를 명확히 정하고, 나머지는 다음 달로 넘기는 방식이 안정적입니다.'
    ], seed);
  }
  return pickByNumber([
    '이번 달은 실행 항목을 하나로 좁혀 결과를 확인하는 방식이 무리가 적습니다.',
    '이번 달은 과속보다 유지 가능한 리듬을 만드는 데 집중해보세요.'
  ], seed);
}

function normalizeYearlyMonthRole(monthRole = '') {
  const text = String(monthRole || '').trim();
  if (!text) return '해당 달 운영';
  if (text.endsWith('하는 자리')) return text.replace(/하는 자리$/, '하는 단계');
  if (text.endsWith('는 자리')) return text.replace(/는 자리$/, '는 구간');
  if (text.endsWith('자리')) return text.replace(/자리$/, '구간');
  return text;
}
