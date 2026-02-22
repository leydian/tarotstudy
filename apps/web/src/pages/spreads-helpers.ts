import type { SpreadDrawResult } from '../types';

export type ReviewChecklist = {
  routine: boolean;
  time: boolean;
  mistakes: boolean;
  condition: boolean;
};

export function toParagraphBlocks(text: string) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toCoachBlocks(text: string) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return [];
  const tagged = cleaned
    .split(/\s*(?=\[학습 리더\])/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (tagged.length > 0) return tagged;
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildLearningDigest(items: SpreadDrawResult['items']) {
  if (!items.length) {
    return ['학습 포인트가 아직 없습니다. 카드 근거-행동-검증 1줄씩 먼저 남겨보세요.'];
  }
  const positionCount = items.length;
  const coachLines = items
    .flatMap((item) => toCoachBlocks(item.learningPoint || ''))
    .map((line) => cleanCoachPrefix(line))
    .filter(Boolean);

  const frameLine = coachLines.find((line) => /학습 기준|훈련 프레임|학습 프레임|학습 루틴|복기 기준/.test(line))
    || '카드/포지션/정역방향을 먼저 분리해 근거 해석 순서를 고정하세요.';
  const questionLine = coachLines.find((line) => /복기 질문|체크 질문|점검 질문|검증 질문|질문/.test(line))
    || '각 포지션에서 카드 근거가 질문 의도와 실제로 맞는지 1문장으로 확인하세요.';
  const verifyLine = coachLines.find((line) => /리딩 검증|실행 후 검증|검증 단계|검증/.test(line))
    || '24시간 뒤 맞음/부분맞음/다름으로 점검하고 이유를 1줄로 남겨 다음 리딩 기준으로 사용하세요.';

  return [
    `오늘 할 일: ${positionCount}개 포지션 중 핵심 1개만 골라 카드 근거 1문장과 바로 할 행동 1문장을 적어보세요.`,
    `복기 기준: ${verifyLine}`,
    `다음 리딩에서 바꿀 점 1개: ${questionLine || frameLine}`
  ];
}

export function cleanCoachPrefix(text: string) {
  return text
    .replace(/^\[학습 리더\]\s*/g, '')
    .replace(/^(복기 질문|점검 질문|체크 질문|검증 질문):\s*/g, '')
    .replace(/^리딩 검증:\s*/g, '');
}

export function lineTagLabel(text: string) {
  if (/복기 질문|체크 질문|점검 질문|검증 질문|질문:/.test(text)) return '질문';
  if (/리딩 검증|실행 후 검증|검증 단계|검증:/.test(text)) return '검증';
  if (/학습 기준|훈련 프레임|학습 프레임|학습 루틴|복기 기준/.test(text)) return '프레임';
  return '코칭';
}

export function lineTagClass(text: string) {
  if (/복기 질문|체크 질문|점검 질문|검증 질문|질문:/.test(text)) return 'line-tag-question';
  if (/리딩 검증|실행 후 검증|검증 단계|검증:/.test(text)) return 'line-tag-check';
  return 'line-tag-coach';
}

export function mergeTarotMessage(coreMessage: string, interpretation: string) {
  const core = (coreMessage || '').trim();
  const detail = (interpretation || '').trim();
  if (!core) return detail;
  if (!detail) return core;
  if (detail.includes(core)) return detail;
  return `${core} ${detail}`.trim();
}

export function parseYearlySummary(text: string) {
  const raw = String(text || '').trim();
  if (!raw.includes('총평:') || !raw.includes('분기별 운세:') || !raw.includes('월별 운세:')) return null;

  const overall = extractSection(raw, '총평:', '분기별 운세:');
  const quarterly = extractSection(raw, '분기별 운세:', '월별 운세:');
  const monthlyAndClose = extractSection(raw, '월별 운세:', null);
  if (!overall || !quarterly || !monthlyAndClose) return null;

  const monthlyLines = splitMonthlyLines(monthlyAndClose);
  const closeStart = monthlyLines.length > 0
    ? monthlyAndClose.indexOf(monthlyLines[monthlyLines.length - 1]) + monthlyLines[monthlyLines.length - 1].length
    : 0;
  const closing = monthlyAndClose.slice(closeStart).trim();

  return {
    overall,
    quarterly,
    monthly: monthlyLines.length > 0 ? monthlyLines : [monthlyAndClose],
    closing
  };
}

export function parseWeeklySummary(text: string) {
  const raw = String(text || '').trim();
  if (!raw.includes('총평:') || !raw.includes('일별 흐름:') || !raw.includes('실행 가이드:')) return null;

  const overall = extractSection(raw, '총평:', '일별 흐름:');
  const dailyBlock = extractSection(raw, '일별 흐름:', '실행 가이드:');
  const actionAndTheme = extractSection(raw, '실행 가이드:', null);
  if (!overall || !dailyBlock || !actionAndTheme) return null;

  const daily = dailyBlock
    .split(/(?=(?:월요일|화요일|수요일|목요일|금요일|토요일|일요일)\()/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const themeIndex = actionAndTheme.indexOf('한 줄 테마:');
  const actionGuide = (themeIndex >= 0 ? actionAndTheme.slice(0, themeIndex) : actionAndTheme).trim();
  const theme = (themeIndex >= 0 ? actionAndTheme.slice(themeIndex + '한 줄 테마:'.length) : '').trim();

  return {
    overall,
    daily: daily.length > 0 ? daily : [dailyBlock],
    actionGuide,
    theme
  };
}

function extractSection(text: string, startLabel: string, endLabel: string | null) {
  const start = text.indexOf(startLabel);
  if (start < 0) return '';
  const from = start + startLabel.length;
  const to = endLabel ? text.indexOf(endLabel, from) : text.length;
  return text.slice(from, to < 0 ? text.length : to).trim();
}

function splitMonthlyLines(monthlyText: string) {
  const segments = monthlyText
    .split(/(?=(?:[1-9]|1[0-2])월\([^)]*\)은)/g)
    .map((seg) => seg.trim())
    .filter(Boolean);

  return segments.filter((seg) => /^(?:[1-9]|1[0-2])월\([^)]*\)은/.test(seg));
}

export function buildChoiceComparison(result: SpreadDrawResult) {
  const get = (name: string) => result.items.find((item) => item.position.name === name);
  const current = get('현재 상황');
  const aNear = get('A 선택 시 가까운 미래');
  const aResult = get('A 선택 시 결과');
  const bNear = get('B 선택 시 가까운 미래');
  const bResult = get('B 선택 시 결과');

  const score = (
    item: SpreadDrawResult['items'][number] | undefined,
    weight: number
  ) => (!item ? 0 : (item.orientation === 'upright' ? 1 : -1) * weight);
  const currentWeight = 1.2;
  const nearWeight = 1.6;
  const resultWeight = 2.2;
  const baseFromCurrent = score(current, currentWeight);
  const aScore = baseFromCurrent + score(aNear, nearWeight) + score(aResult, resultWeight);
  const bScore = baseFromCurrent + score(bNear, nearWeight) + score(bResult, resultWeight);
  const gap = Math.abs(aScore - bScore);
  const confidenceLabel = gap >= 2.6 ? '높음' : gap >= 1.2 ? '중간' : '낮음';
  const recommendation = aScore === bScore
    ? 'A/B 흐름이 비슷하므로 현재 상황 카드 기준으로 현실 조건(시간/비용)을 먼저 고정하세요.'
    : aScore > bScore
      ? '현재 리딩 기준으로는 A 시나리오가 단기-결과 흐름이 더 안정적입니다.'
      : '현재 리딩 기준으로는 B 시나리오가 단기-결과 흐름이 더 안정적입니다.';

  return { current, aNear, aResult, bNear, bResult, recommendation, confidenceLabel };
}

function inferQuestionDomain(context: string) {
  const text = String(context || '').toLowerCase();
  if (/(한능검|시험|공부|학습|자격증|합격|준비|기출)/.test(text)) return 'study';
  if (/(이직|취업|면접|업무|프로젝트|커리어)/.test(text)) return 'career';
  if (/(연애|관계|재회|갈등|화해|상대)/.test(text)) return 'relationship';
  if (/(돈|재정|지출|저축|투자|수입)/.test(text)) return 'finance';
  return 'general';
}

export function scoreItemRisk(item: SpreadDrawResult['items'][number] | undefined) {
  if (!item) return 0;
  const text = `${item.card.nameKo} ${(item.card.keywords || []).join(' ')}`.toLowerCase();
  let score = item.orientation === 'reversed' ? 1 : 0;
  if (/(불안|갈등|소모|병목|손실|지연|권태|혼란|압박)/.test(text)) score += 1;
  return score;
}

export function buildReadingInsights({
  spreadId,
  context,
  items
}: {
  spreadId: string;
  context: string;
  items: SpreadDrawResult['items'];
}) {
  const first = items[0];
  const middle = items[1];
  const last = items[items.length - 1];
  const domain = inferQuestionDomain(context);
  const openCount = items.filter((item) => item.orientation === 'upright').length;
  const riskTotal = items.reduce((acc, item) => acc + scoreItemRisk(item), 0);
  const isOneCard = spreadId === 'one-card' || items.length <= 1;
  const verdict: 'go' | 'conditional' | 'hold' = isOneCard
    ? (openCount >= 1 && riskTotal <= 1 ? 'go' : openCount >= 1 ? 'conditional' : 'hold')
    : (openCount >= 2 && riskTotal <= 2 ? 'go' : openCount >= 1 ? 'conditional' : 'hold');
  const verdictLabel = verdict === 'go' ? '진행 권장' : verdict === 'conditional' ? '조건부 진행' : '보류 후 정비';
  const verdictReason = (() => {
    if (domain === 'study' && isOneCard) {
      if (verdict === 'go') return '합격 가능성은 열려 있습니다. 분량 확대보다 루틴 고정(기출+오답 복기)을 지키면 결과 안정성이 높아집니다.';
      if (verdict === 'conditional') return '가능성은 있으나 조건이 필요합니다. 취약 유형 1개를 고정해 반복률을 올릴 때 합격 신호가 선명해집니다.';
      return '지금은 확장보다 정비가 우선입니다. 막히는 유형 1개를 정리한 뒤 같은 기준으로 재도전하는 편이 안전합니다.';
    }
    if (verdict === 'go') return '결과 카드가 열려 있어 실행 가능성이 있습니다. 다만 과속보다 루틴 유지가 핵심입니다.';
    if (verdict === 'conditional') return '가능성은 있으나 병목 신호가 있어 실행 조건을 좁혀야 결과가 안정됩니다.';
    return '지금은 확장보다 정비가 우선입니다. 병목을 먼저 줄인 뒤 재시도하는 편이 안전합니다.';
  })();
  const conflictWarning = first?.orientation === 'reversed' && verdict === 'go'
    ? '초반 카드 경고와 결론이 충돌할 수 있습니다. 즉시 확장 대신 리스크 관리형 실행으로 조정하세요.'
    : '';
  const actions = domain === 'study'
    ? [
      { title: '오늘 할 일 1개', body: '취약 파트 1개 + 기출 1세트 + 오답 20분만 고정하고 분량 확장은 멈추세요.' },
      { title: '이번 주 운영', body: '동일 시간대 학습 루틴을 3일 이상 유지하고, 주 1회 시간 배분 리허설을 넣으세요.' },
      { title: '지금 피할 것', body: '새 교재/새 범위 확장보다 기존 오답 유형 재정리에 집중하세요.' }
    ]
    : [
      { title: '오늘 실행', body: `${middle?.position.name || '중앙'} 카드 기준으로 실행 항목 1개만 고정하세요.` },
      { title: '중간 점검', body: `${last?.position.name || '결과'} 카드 기준으로 검증 지표 1개를 정해 오늘 기록하세요.` },
      { title: '주의점', body: `${first?.position.name || '시작'} 카드의 경고 신호를 무시하지 말고 속도를 조절하세요.` }
    ];

  if (spreadId !== 'three-card') {
    actions[0].title = '핵심 실행';
  }

  return { verdict, verdictLabel, verdictReason, conflictWarning, actions };
}

export function parseChecklistFromNote(note: string): ReviewChecklist {
  const text = String(note || '');
  return {
    routine: text.includes('[루틴준수]'),
    time: text.includes('[시간관리]'),
    mistakes: text.includes('[오답관리]'),
    condition: text.includes('[컨디션관리]')
  };
}

export function stripChecklistTags(note: string) {
  return String(note || '')
    .replace(/\s*\[(루틴준수|시간관리|오답관리|컨디션관리)\]/g, '')
    .trim();
}

export function mergeReviewNoteAndChecklist(note: string, checklist: ReviewChecklist) {
  const tags = [
    checklist.routine ? '[루틴준수]' : '',
    checklist.time ? '[시간관리]' : '',
    checklist.mistakes ? '[오답관리]' : '',
    checklist.condition ? '[컨디션관리]' : ''
  ].filter(Boolean).join(' ');
  const cleanNote = stripChecklistTags(note);
  return `${cleanNote}${tags ? ` ${tags}` : ''}`.trim();
}
