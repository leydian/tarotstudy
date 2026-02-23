import { analyzeQuestionContextSync } from '../../question-understanding/index.js';

export function pickTopKeywords(items, count = 3) {
  const counter = new Map();
  for (const item of items) {
    for (const keyword of item.card.keywords || []) {
      const k = keyword.trim();
      if (!k) continue;
      counter.set(k, (counter.get(k) || 0) + 1);
    }
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map((entry) => entry[0]);
}

export function pickByNumber(options = [], n = 0) {
  if (!options.length) return '';
  return options[n % options.length];
}

export function hashText(text = '') {
  let score = 0;
  const input = String(text);
  for (let i = 0; i < input.length; i += 1) score += input.charCodeAt(i);
  return score;
}

export function withKoreanParticle(word = '', consonantParticle = '이', vowelParticle = '가') {
  const text = String(word || '').trim();
  if (!text) return word;
  const ch = text.charCodeAt(text.length - 1);
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  if (ch < HANGUL_START || ch > HANGUL_END) return `${text}${vowelParticle}`;
  const hasFinalConsonant = (ch - HANGUL_START) % 28 !== 0;
  return `${text}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
}

export function softenAbsolutes(text = '') {
  return String(text || '')
    .replace(/불가능(에 가깝습니다|합니다|하다)/g, '어려움이 큰 편입니다')
    .replace(/반드시/g, '가능하면')
    .replace(/틀림없(습니다|다)/g, '가능성이 큽니다')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeLine(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function splitSentences(text = '') {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

export function scoreCardRisk(item) {
  if (!item?.card) return 1;
  let score = item.orientation === 'reversed' ? 2 : 0;
  const riskyCardIds = new Set([
    'major-15', 'major-16', 'major-18', 'minor-swords-nine', 'minor-swords-ten',
    'minor-wands-ten', 'minor-cups-five', 'minor-swords-five'
  ]);
  if (riskyCardIds.has(item.card.id)) score += 2;
  const text = `${item.card.nameKo} ${(item.card.keywords || []).join(' ')}`.toLowerCase();
  if (/(붕괴|집착|혼란|불안|갈등|소모|손실|과부하|두려움|속박)/.test(text)) score += 1;
  return score;
}

export function normalizeContextForSpread({ spreadName, context }) {
  let normalized = String(context || '').trim();
  if (!normalized && spreadName) {
    normalized = `${spreadName} 리딩`;
  }
  return normalized;
}

export function normalizeContextText(context = '') {
  return String(context || '').trim();
}

export function inferSummaryContextTone(context = '') {
  const analysis = analyzeQuestionContextSync(context);
  const intent = analysis.intent;
  const beginnerHint = intent === 'relationship'
    ? '팁: 관계 질문은 논리보다 감정 상태를 먼저 읽어주면 정확도가 올라갑니다.'
    : intent === 'career'
      ? '팁: 커리어 질문은 구체적인 실행 계획을 중심으로 읽어주면 좋습니다.'
      : intent === 'finance'
        ? '팁: 금전 질문은 현실적인 숫자와 기간을 짚어주면 도움이 됩니다.'
        : '팁: 질문자의 상황에 맞춰 카드 키워드를 유연하게 적용해보세요.';
  const intermediateHint = intent === 'relationship'
    ? '심화: 상대방의 숨겨진 의도나 무의식적 패턴까지 함께 읽어주세요.'
    : intent === 'career'
      ? '심화: 장기적인 커리어 로드맵과 잠재적 리스크까지 분석해주세요.'
      : intent === 'finance'
        ? '심화: 투자 성향과 잠재적 손실 가능성까지 함께 고려해주세요.'
        : '심화: 카드의 상징적 의미와 주변 카드의 상호작용을 깊이 있게 해석해보세요.';

  return { intent, beginnerHint, intermediateHint };
}

export function isCareerTimingContext(context = '') {
  const text = String(context || '').toLowerCase();
  const hardCareerSignals = [
    '취업',
    '이직',
    '전직',
    '면접',
    '지원',
    '지원서',
    '이력서',
    '포트폴리오',
    '오퍼',
    '협상',
    '직무',
    '입사',
    '퇴사',
    '채용',
    '커리어',
    '회사에 남',
    '옮기',
    '남는 게',
    '남을까',
    '시기',
    '타이밍',
    '추천',
    '언제가 좋아'
  ];
  return hardCareerSignals.some((keyword) => text.includes(keyword));
}

export function inferYearlyIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (isCareerTimingContext(context)) {
    return 'career';
  }
  if (inferred === 'health') return 'daily';
  return inferred;
}

// Summary Tone Scoring & Polishing
const summaryNaturalMinScore = Number(process.env.SUMMARY_NATURAL_MIN_SCORE || 74);
const summarySpecificityMinScore = Number(process.env.SUMMARY_SPECIFICITY_MIN_SCORE || 66);
const summaryRepetitionMaxScore = Number(process.env.SUMMARY_REPETITION_MAX_SCORE || 34);
const summaryTemplateMaxScore = Number(process.env.SUMMARY_TEMPLATE_MAX_SCORE || 36);
const useConversationalTone = String(process.env.READING_TONE_MODE || 'conversational').toLowerCase().trim() !== 'template';

export function normalizeEverydaySummaryTone(raw = '') {
  let text = String(raw || '');
  const replacements = [
    [/실행축/g, '실행 흐름'],
    [/결과축/g, '결과 흐름'],
    [/중심축/g, '중심 흐름'],
    [/장애축/g, '걸림 흐름'],
    [/([AB])축/g, '$1쪽'],
    [/신호가 보였고/g, '기운이 보였고'],
    [/로 해석됩니다\./g, '로 봅니다.'],
    [/핵심 변수/g, '핵심 포인트'],
    [/운영이 맞습니다\./g, '흐름이 맞습니다.'],
    [/입니다\./g, '이에요.'],
    [/보실 기준/g, '보면 좋은 기준'],
    [/실행해보신 뒤에는/g, '실행해본 뒤에는'],
    [/남겨 주세요\./g, '남겨 주세요.']
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  if (!useConversationalTone) return text;
  return text
    .replace(/필요합니다\./g, '필요해요.')
    .replace(/좋습니다\./g, '좋아요.')
    .replace(/권장됩니다\./g, '권장돼요.')
    .replace(/하시기 바랍니다\./g, '해보세요.')
    .replace(/하시고/g, '해보시고')
    .replace(/하시는 편이/g, '하는 편이')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function scoreSummaryNaturalTone(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 100;
  let score = 100;
  const penaltyPatterns = [
    /결론 기준:/g,
    /실행 문장:/g,
    /복기 질문:/g,
    /요약하면/g,
    /핵심 포인트/g,
    /운영 기준/g
  ];
  for (const pattern of penaltyPatterns) {
    const count = (raw.match(pattern) || []).length;
    if (count) score -= Math.min(30, count * 5);
  }
  const colonCount = (raw.match(/:/g) || []).length;
  if (colonCount >= 3) score -= Math.min(16, (colonCount - 2) * 2);
  return Math.max(0, Math.min(100, score));
}

export function scoreSummarySpecificity(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 100;
  let score = 28;
  const evidenceHits = (raw.match(/(정방향|역방향|카드|키워드|근거|분기|월|리스크|지출|고정비|변동비|현금흐름|대화|실행)/g) || []).length;
  score += Math.min(42, evidenceHits * 3);
  const concreteHits = (raw.match(/(1개|2개|3개월|주 1회|오늘|이번 주|이번 달|연말|상반기|하반기|10분|20분)/g) || []).length;
  score += Math.min(26, concreteHits * 4);
  const genericPenalty = (raw.match(/(비교적 안정적|두 갈래로|운영이 좋습니다|좋은 구간입니다|정비가 우선|기준을 세우면)/g) || []).length;
  score -= Math.min(30, genericPenalty * 6);
  return Math.max(0, Math.min(100, score));
}

export function scoreSummaryRepetition(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 0;
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = lines.map((line) => line.replace(/[^0-9a-zA-Z가-힣]+/g, '').toLowerCase());
  const duplicateLineCount = normalized.length - new Set(normalized).size;

  const windows = [];
  for (const line of normalized) {
    for (let i = 0; i < line.length - 11; i += 1) {
      windows.push(line.slice(i, i + 12));
    }
  }
  const repeatedWindows = windows.length - new Set(windows).size;
  const linePenalty = duplicateLineCount * 18;
  const windowPenalty = Math.min(32, Math.floor(repeatedWindows / 40));
  const phrasePenalty = (raw.match(/(재정 흐름이 비교적 안정적이라 계획 실행이 수월한 구간입니다|두 갈래로 보시면 됩니다|두 갈래로 정리됩니다)/g) || []).length * 18;
  return Math.max(0, Math.min(100, linePenalty + windowPenalty + phrasePenalty));
}

export function scoreSummaryTemplateDensity(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 0;
  const templateHits = (raw.match(/(두 갈래|비교적 안정적이라 계획 실행이 수월|운영이 좋습니다|좋은 구간입니다|정비가 우선|확장보다|한 줄 테마:)/g) || []).length;
  const guidelineHits = (raw.match(/(1개|2개|3개월|오늘|이번 주|이번 달|고정비|변동비|현금흐름|리스크|정방향|역방향|카드)/g) || []).length;
  const density = templateHits * 10 - Math.min(36, guidelineHits * 3);
  return Math.max(0, Math.min(100, density));
}

export function evaluateNarrativeQuality(text = '') {
  const naturalScore = scoreSummaryNaturalTone(text);
  const specificityScore = scoreSummarySpecificity(text);
  const repetitionScore = scoreSummaryRepetition(text);
  const templateScore = scoreSummaryTemplateDensity(text);
  const passes = naturalScore >= summaryNaturalMinScore
    && specificityScore >= summarySpecificityMinScore
    && repetitionScore <= summaryRepetitionMaxScore
    && templateScore <= summaryTemplateMaxScore;
  return {
    naturalScore,
    specificityScore,
    repetitionScore,
    templateScore,
    passes
  };
}

export function softenSummaryMechanics(text = '') {
  return String(text || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => line
      .replace(/^(결론 기준|실행 문장|복기 질문)\s*:\s*/g, '')
      .replace(/^요약하면\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean)
    .join('\n');
}

export function rewriteNarrativeWithConstraints(text = '') {
  const lines = String(text || '')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  const seen = new Set();
  const rewritten = [];
  for (const line of lines) {
    let next = line
      .replace(/두 갈래로 보시면 됩니다/g, '실행 방향은 이렇게 나누면 됩니다')
      .replace(/두 갈래로 정리됩니다/g, '실행 기준은 이렇게 정리됩니다')
      .replace(/두 갈래입니다/g, '실행 기준은 이렇게 나눠보면 됩니다')
      .replace(/비교적 안정적이라 계획 실행이 수월한 구간입니다/g, '카드 신호가 받쳐주는 구간이라 지출 통제 기준을 지키면 실행 정확도가 올라갑니다')
      .replace(/좋은 구간입니다/g, '실행 우선순위를 선명히 두기 좋은 구간입니다')
      .replace(/운영이 좋습니다/g, '운영이 잘 맞습니다');

    if (!/(오늘|이번 주|이번 달|연말|1개|3개월|주 1회|고정비|변동비|현금흐름|대화|리스크|키워드|카드)/.test(next)) {
      next = `${next} 오늘 바로 확인할 항목 1개를 붙여 실행하면 정확도가 올라갑니다.`;
    }
    const key = next.replace(/[^0-9a-zA-Z가-힣]+/g, '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rewritten.push(next);
  }
  return rewritten.join('\n');
}

export function polishSummaryRhythm(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return text;
  const paragraphs = text.split('\n\n').map((p) => p.trim()).filter(Boolean);
  const seen = new Set();
  const normalized = (s) => String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”"'`]/g, '')
    .replace(/[!?.,]+$/g, '')
    .trim();

  const refined = paragraphs.map((paragraph) => {
    const sentences = splitSentences(paragraph);
    const uniqueSentences = [];
    for (const sentence of sentences) {
      const key = normalized(sentence);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueSentences.push(sentence.trim());
    }
    return uniqueSentences.join(' ').trim();
  }).filter(Boolean);
  return refined.join('\n\n');
}

export function renderSummaryFromSemantic(raw = '') {
  const semantic = String(raw || '');
  let rendered = normalizeEverydaySummaryTone(polishSummaryRhythm(semantic));
  if (!useConversationalTone) return rendered;

  let quality = evaluateNarrativeQuality(rendered);
  let pass = 0;
  while (!quality.passes && pass < 2) {
    rendered = normalizeEverydaySummaryTone(polishSummaryRhythm(rewriteNarrativeWithConstraints(softenSummaryMechanics(rendered))));
    quality = evaluateNarrativeQuality(rendered);
    pass += 1;
  }
  return rendered;
}

export function buildSummaryLead({ spreadName, context, firstItem, topKeywords, uprightCount, reversedCount, userHistory = null }) {
  const keyword = topKeywords.length ? topKeywords[0] : '흐름';
  const mood = uprightCount > reversedCount ? '긍정적' : '신중함';
  const cardName = firstItem?.card?.nameKo || '첫 카드';
  
  let personalNote = '';
  if (userHistory && firstItem?.card?.id) {
    // Check 'reviews' or 'reviewHistory' depending on progress-store schema. 
    // Assuming 'reviews' array in userHistory object based on typical patterns.
    // If progress-store returns an object where reviews are stored, check that structure.
    // Let's assume userHistory has a 'reviews' array or we check items directly if it's a flat list.
    // Actually progressStore.getUserProgress returns { userId, completedLessons, quizScores, reviews: [...] }
    const reviews = Array.isArray(userHistory.reviews) ? userHistory.reviews : [];
    const pastReview = reviews.find(r => r.cardId === firstItem.card.id);
    if (pastReview) {
      personalNote = ` (참고: 지난번 이 카드가 나왔을 때는 '${pastReview.sentiment || '기록'}'으로 남기셨네요.)`;
    }
  }

  return `${spreadName} 리딩입니다. 첫 카드는 ${cardName}이며, 전반적인 분위기는 ${mood}으로, "${keyword}" 키워드가 중심에 있습니다.${personalNote}`;
}

export function buildSummaryFocus({ spreadName, firstItem, lastItem, items, context, contextTone }) {
  return `흐름을 보면 시작은 ${firstItem?.orientation === 'upright' ? '순조롭지만' : '조정이 필요하지만'}, 결과적으로는 ${lastItem?.orientation === 'upright' ? '안정적으로 마무리될' : '주의가 필요한'} 가능성이 큽니다.`;
}

export function buildSummaryAction({ spreadName, level, context, firstItem, contextTone }) {
  if (level === 'intermediate') {
    return '실행 가이드: 카드의 상징을 현실 상황에 대입해 구체적인 행동 계획을 세워보세요.';
  }
  return '실행 가이드: 오늘 당장 할 수 있는 작은 행동 하나를 정해 실천해보세요.';
}

export function polishActionVoice({ line, spreadName, context }) {
  return String(line || '').replace('실행 가이드:', '권장 행동:');
}

export function buildSummaryTheme({ spreadName, context, items, topKeywords }) {
  const keywords = topKeywords.join(', ');
  return `한 줄 테마: ${keywords} 흐름을 타는 것이 중요합니다.`;
}

export function polishSummary(text) {
  return normalizeEverydaySummaryTone(text);
}

export function applyNarrativeSummaryTone({ spreadId = '', summary = '' }) {
  const text = String(summary || '').trim();
  if (!text) return text;

  // Weekly/Monthly/Yearly summaries are parsed by section labels in UI.
  if (spreadId === 'weekly-fortune' || spreadId === 'monthly-fortune' || spreadId === 'yearly-fortune') {
    return text;
  }

  const labelMap = new Map([
    ['의미:', '의미'],
    ['한줄 결론:', '결론'],
    ['한 줄 결론:', '결론'],
    ['결론:', '결론'],
    ['권장 행동:', '실행'],
    ['실행 가이드:', '실행'],
    ['복기:', '복기'],
    ['한 줄 테마:', '테마'],
    ['판정:', '판정']
  ]);

  const buckets = {
    meaning: [],
    conclusion: [],
    action: [],
    review: [],
    theme: [],
    verdict: [],
    other: []
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const label = [...labelMap.keys()].find((key) => line.startsWith(key));
    if (!label) {
      buckets.other.push(line);
      continue;
    }
    const payload = line.slice(label.length).trim();
    const kind = labelMap.get(label);
    if (kind === '의미' && payload) buckets.meaning.push(payload);
    else if (kind === '결론' && payload) buckets.conclusion.push(payload);
    else if (kind === '실행' && payload) buckets.action.push(payload);
    else if (kind === '복기' && payload) buckets.review.push(payload);
    else if (kind === '테마' && payload) buckets.theme.push(payload);
    else if (kind === '판정' && payload) buckets.verdict.push(payload);
  }

  const paragraphs = [];
  const openingParts = [...buckets.verdict, ...buckets.meaning];
  if (openingParts.length) {
    paragraphs.push(`이번 흐름에서는 ${openingParts.join(' ')}`);
  }
  if (buckets.conclusion.length) {
    paragraphs.push(`정리하면 결론은 ${buckets.conclusion.join(' ')}`);
  }
  if (buckets.action.length || buckets.review.length) {
    const actionText = buckets.action.length ? `지금은 ${buckets.action.join(' ')}` : '';
    const reviewText = buckets.review.length ? `실행 후에는 ${buckets.review.join(' ')}` : '';
    paragraphs.push([actionText, reviewText].filter(Boolean).join(' '));
  }
  if (buckets.theme.length) {
    paragraphs.push(`오늘의 테마는 ${buckets.theme.join(' ')}`);
  }
  if (buckets.other.length) {
    paragraphs.push(buckets.other.join(' '));
  }

  const narrative = paragraphs.filter(Boolean).join('\n\n').trim();
  return narrative || text;
}

export function applySectionedSummaryTone({ spreadId = '', summary = '' }) {
  const text = String(summary || '').trim();
  if (!text) return text;

  const lines = text.split('\n\n').map((line) => line.trim()).filter(Boolean);
  const sectionLeadByLabel = {
    '총평:': spreadId === 'yearly-fortune'
      ? '올해 전체 흐름을 먼저 편하게 정리해드리면,'
      : spreadId === 'monthly-fortune'
        ? '이번 달 흐름을 먼저 한 장면으로 묶어보면,'
        : '이번 주 흐름을 먼저 한눈에 보면,',
    '일별 흐름:': '하루씩 이어서 보면 이런 리듬입니다.',
    '주차 흐름:': '주차별로 나눠 보면 흐름이 이렇게 이어집니다.',
    '분기별 운세:': '분기 단위로는 흐름이 이렇게 갈립니다.',
    '월별 운세:': '월별 장면으로 풀어보면 이렇게 읽힙니다.',
    '월-주 연결:': '그래서 월간 흐름을 주간 운영으로 옮기실 때는,',
    '실행 가이드:': '실제로 적용하실 때는 이렇게 가져가시면 좋겠습니다.',
    '한 줄 테마:': '마지막으로 테마를 한 문장으로 묶어보면,'
  };

  const softened = lines.map((line) => {
    if (line.startsWith('이번 리딩의 1차 판정은')) {
      return line.replace(/^이번 리딩의 1차 판정은/, '먼저 이번 리딩의 1차 판정은');
    }
    const label = Object.keys(sectionLeadByLabel).find((key) => line.startsWith(key));
    if (!label) return line;
    const body = line.slice(label.length).trim();
    if (!body) return line;
    return `${label} ${sectionLeadByLabel[label]} ${body}`;
  });

  return softened.join('\n\n');
}
