import type { SpreadDrawResult } from '../types';

export type ReviewChecklist = {
  routine: boolean;
  time: boolean;
  mistakes: boolean;
  condition: boolean;
};

export function toParagraphBlocks(text: string) {
  const rawBlocks = String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawBlocks.length === 0) return [];
  return rawBlocks.flatMap((block) => splitLongParagraph(block));
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
    return [
      '오늘 할 일 1개: 아직 기록이 없어요. 카드 1장만 골라 오늘 해볼 행동 1개를 적어보세요.',
      '복기 메모: 오늘 끝나고 맞았던 점 1개와 달랐던 점 1개만 남겨보세요.',
      '다음 리딩 질문: 이 카드 해석이 내 상황과 맞았는지 한 줄로 확인해보세요.'
    ];
  }
  const positionCount = items.length;
  const coreItem = pickCoreItem(items);
  const actionItem = pickActionItem(items);
  const cautionItem = pickCautionItem(items);
  const coreKeyword = actionItem?.card?.keywords?.[0] || coreItem?.card?.keywords?.[0] || '흐름';
  const coreCardLabel = cardLabel(coreItem);
  const actionLabel = actionItem ? `${actionItem.position.name}(${cardLabel(actionItem)})` : '핵심 카드';
  const cautionLabel = cautionItem ? `${cautionItem.position.name}(${cardLabel(cautionItem)})` : '';
  const cautionKeyword = cautionItem?.card?.keywords?.[0] || '속도';

  const digest = [
    `이번 리딩 한 줄: ${coreItem?.position?.name || '핵심'} 카드 ${coreCardLabel} 기준으로 보면, 지금은 "${coreKeyword}"을 먼저 챙길 때입니다.`,
    `오늘 할 일 1개: ${positionCount}개 자리 중 ${actionLabel}를 기준으로, 바로 할 행동 1가지만 정해 실행해보세요.`,
    cautionItem
      ? `복기 메모: ${cautionLabel}는 "${cautionKeyword}" 쪽에서 흔들리기 쉬우니, 저녁에 맞았던 점 1개와 아쉬운 점 1개만 짧게 적어보세요.`
      : '복기 메모: 저녁에 맞았던 점 1개와 아쉬운 점 1개만 짧게 적어보세요.',
    `다음 리딩 질문: 오늘 정한 행동 1개가 실제로 도움이 됐는지, 내일 한 줄로 다시 확인해보세요.`
  ];
  return digest.map((line) => toShortEverydayLine(line, line));
}

export function splitDigestLine(line: string) {
  const text = String(line || '').trim();
  if (!text) return { title: '', body: '' };
  const idx = text.indexOf(':');
  if (idx < 0) return { title: '', body: text };
  return {
    title: text.slice(0, idx).trim(),
    body: text.slice(idx + 1).trim()
  };
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

export function parseMonthlySummary(text: string) {
  const raw = String(text || '').trim();
  if (!raw.includes('총평:') || !raw.includes('주차 흐름:') || !raw.includes('월-주 연결:') || !raw.includes('실행 가이드:')) return null;

  const overall = extractSection(raw, '총평:', '주차 흐름:');
  const weeklyBlock = extractSection(raw, '주차 흐름:', '월-주 연결:');
  const bridge = extractSection(raw, '월-주 연결:', '실행 가이드:');
  const actionAndTheme = extractSection(raw, '실행 가이드:', null);
  if (!overall || !weeklyBlock || !bridge || !actionAndTheme) return null;

  const weeklyAll = weeklyBlock
    .split(/(?=(?:1주차|2주차|3주차|4주차·정리)\([^)]*\)는)/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const weekly = weeklyAll.filter((line) => /^(?:1주차|2주차|3주차|4주차·정리)\([^)]*\)는/.test(line));

  const themeIndex = actionAndTheme.indexOf('한 줄 테마:');
  const actionGuide = (themeIndex >= 0 ? actionAndTheme.slice(0, themeIndex) : actionAndTheme).trim();
  const theme = (themeIndex >= 0 ? actionAndTheme.slice(themeIndex + '한 줄 테마:'.length) : '').trim();

  return {
    overall,
    weekly: weekly.length > 0 ? weekly : [weeklyBlock],
    bridge,
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

function splitLongParagraph(block: string) {
  const compact = String(block || '').replace(/\s+/g, ' ').trim();
  if (!compact) return [];
  if (compact.length <= 120) return [compact];

  const sentences = compact
    .split(/(?<=[.!?])\s+/)
    .flatMap((line) => splitLongSentence(line.trim()))
    .filter(Boolean);
  if (sentences.length <= 1) return [compact];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > 120 && current) {
      chunks.push(current);
      current = sentence;
      continue;
    }
    current = next;
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitLongSentence(sentence: string) {
  const text = String(sentence || '').trim();
  if (!text) return [];
  if (text.length <= 90) return [text];

  const clauses = text
    .split(/,\s+| 그리고 | 하지만 | 다만 | 또한 /g)
    .map((part) => part.trim())
    .filter(Boolean);
  return clauses.length > 1 ? clauses : [text];
}

function toShortEverydayLine(text: string, fallback: string) {
  const cleaned = cleanCoachPrefix(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  const first = cleaned.split(/(?<=[.!?])\s+| 그리고 | 다만 | 또한 | 이어서 | 먼저 /g)[0]?.trim() || cleaned;
  const plain = first
    .replace(/포지션/g, '자리')
    .replace(/근거/g, '이유')
    .replace(/검증/g, '확인')
    .replace(/프레임/g, '기준')
    .replace(/체감/g, '느낌')
    .replace(/정역방향/g, '정방향/역방향')
    .replace(/monthly-fortune/gi, '월간 리딩')
    .replace(/weekly-fortune/gi, '주간 리딩')
    .replace(/daily/gi, '오늘')
    .replace(/1차 이유/gi, '첫 번째 이유')
    .replace(/질문 맥락/gi, '질문 내용');
  if (plain.length <= 92) return plain;
  return `${plain.slice(0, 91).trim()}…`;
}

function cardLabel(item: SpreadDrawResult['items'][number] | undefined) {
  if (!item?.card?.nameKo) return '카드';
  return `${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'}`;
}

function pickCoreItem(items: SpreadDrawResult['items']) {
  return items.find((item) => /월간 테마|주간 테마|현재 상황|현재 관계 상태|현재/.test(item.position?.name || ''))
    || items[0];
}

function pickActionItem(items: SpreadDrawResult['items']) {
  return items.find((item) => item.orientation === 'upright' && scoreItemRisk(item) <= 1)
    || items.find((item) => item.orientation === 'upright')
    || items[0];
}

function pickCautionItem(items: SpreadDrawResult['items']) {
  return items.find((item) => item.orientation === 'reversed' || scoreItemRisk(item) >= 2) || null;
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
  if (/(불안|갈등|소모|막힘|병목|손실|지연|권태|혼란|압박)/.test(text)) score += 1;
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
    if (verdict === 'conditional') return '가능성은 있으나 막히는 지점 신호가 있어 실행 조건을 좁혀야 결과가 안정됩니다.';
    return '지금은 확장보다 정비가 우선입니다. 막히는 지점을 먼저 줄인 뒤 재시도하는 편이 안전합니다.';
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
