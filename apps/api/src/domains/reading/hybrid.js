import { generateReadingV3 } from './v3.js';

const POSITIVE_IDS = new Set([
  'm01', 'm03', 'm06', 'm07', 'm10', 'm11', 'm14', 'm17', 'm19', 'm21',
  'w01', 'w02', 'w03', 'w04', 'w06',
  'c01', 'c02', 'c03', 'c09', 'c10',
  'p01', 'p03', 'p08', 'p09', 'p10'
]);

const NEGATIVE_IDS = new Set([
  'm09', 'm12', 'm13', 'm15', 'm16', 'm18',
  's03', 's05', 's08', 's09', 's10',
  'w09', 'w10', 'c05', 'c08', 'p05'
]);

const DEFAULT_OPENAI_MODEL = process.env.READING_MODEL || 'gpt-4o-mini';
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

const getYesNoScore = (cardId) => {
  if (POSITIVE_IDS.has(cardId)) return 1;
  if (NEGATIVE_IDS.has(cardId)) return -1;
  return 0;
};

const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeVerdictLabel = (label) => {
  if (label === 'YES' || label === 'NO' || label === 'MAYBE') return label;
  return 'MAYBE';
};

const pickMeaningByCategory = (card, category) => {
  if (category === 'love') return card.meanings?.love || card.summary;
  if (category === 'career') return card.meanings?.career || card.summary;
  if (category === 'finance') return card.meanings?.finance || card.summary;
  return card.summary;
};

const buildCardFacts = (cards, category) => cards.map((card, idx) => ({
  index: idx,
  cardId: card.id,
  cardName: card.name,
  cardNameKo: card.nameKo,
  positionLabel: card.positionLabel || `단계 ${idx + 1}`,
  summary: card.summary,
  coreMeaning: pickMeaningByCategory(card, category),
  keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [],
  advice: card.meanings?.advice || '',
  description: card.description || ''
}));

const verdictTone = (label, rationale) => {
  if (label === 'YES') return `운명의 흐름이 매우 맑고 긍정적입니다. ${rationale} 망설임 없이 나아가셔도 좋을 것 같아요.`;
  if (label === 'NO') return `지금은 잠시 멈추어 서서 주변을 살필 때입니다. ${rationale} 무리한 전진보다는 안정을 선택하는 지혜가 필요합니다.`;
  return `안개 속에 가려진 것처럼 상황이 조금 더 무르익기를 기다려야 할 것 같네요. ${rationale} 조금 더 시간을 두고 지켜보는 것은 어떨까요?`;
};

const computeVerdict = (facts, binaryEntities) => {
  if (binaryEntities && facts.length === 2) {
    const scoreA = getYesNoScore(facts[0].cardId);
    const scoreB = getYesNoScore(facts[1].cardId);

    if (scoreA > scoreB) {
      return {
        label: 'YES',
        recommendedOption: 'A',
        rationale: `[${binaryEntities[0]}] 쪽의 기운이 상대적으로 더 안정적이고 조화로운 흐름을 보여주고 있습니다.`
      };
    }

    if (scoreB > scoreA) {
      return {
        label: 'YES',
        recommendedOption: 'B',
        rationale: `[${binaryEntities[1]}] 쪽의 길이 당신에게 더 편안한 결실과 긍정적인 변화를 가져다줄 것으로 보입니다.`
      };
    }

    return {
      label: 'MAYBE',
      recommendedOption: 'EITHER',
      rationale: '두 가지 선택지 모두 비슷한 무게의 기운을 담고 있어, 당신의 마음이 조금 더 깊게 끌리는 곳을 믿고 따라가도 좋을 것 같습니다.'
    };
  }

  const score = facts.reduce((acc, fact) => acc + getYesNoScore(fact.cardId), 0);
  if (score > 0) return { label: 'YES', rationale: '카드의 전반적인 기운이 당신의 질문에 대해 긍정적인 응답을 보내고 있습니다.' };
  if (score < 0) return { label: 'NO', rationale: '지금은 상황을 조금 더 신중하게 살피고 보수적으로 접근하는 것이 안전해 보입니다.' };
  return { label: 'MAYBE', rationale: '상반된 기운이 섞여 있어, 단정 짓기보다 상황의 변화를 조금 더 지켜볼 필요가 있습니다.' };
};

const buildDeterministicReport = ({ question, facts, category, binaryEntities }) => {
  const verdict = computeVerdict(facts, binaryEntities);

  const evidence = facts.map((fact) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary).replace(/\.$/, '');
    return {
      cardId: fact.cardId,
      positionLabel: fact.positionLabel,
      claim: `${fact.cardNameKo}의 상징인 '${coreMeaning}'`,
      rationale: `핵심 키워드인 ${fact.keywords.join(', ') || '조화로운 기운'}을(를) 통해 이번 질문의 실마리를 찾을 수 있습니다.`,
      caution: sanitizeText(fact.advice) || '급한 결정보다는 마음의 우선순위를 먼저 정리해 보세요.'
    };
  });

  const counterpoints = [
    '질문의 범위가 넓을 경우 카드가 가리키는 방향이 분산될 수 있으니 유의하세요.',
    '운명은 고정된 것이 아니므로 당신의 컨디션과 주변 환경에 따라 흐름은 언제든 바뀔 수 있습니다.'
  ];

  const actions = [
    '지금 당신의 직관이 들려주는 목소리에 조금 더 귀를 기울여 보세요.',
    '결정하기 전, 10분 정도 차분히 명상을 하며 마음의 소리를 들어보시는 건 어떨까요?'
  ];

  const summary = category === 'general'
    ? `질문 "${question}"에 대한 운명의 지도를 펼쳐보니, ${verdictTone(verdict.label, verdict.rationale)}`
    : `"${question}"의 ${category}적인 맥락에서 카드를 읽어보니, ${verdictTone(verdict.label, verdict.rationale)}`;

  return { summary, verdict, evidence, counterpoints, actions, fullNarrative: null };
};

const buildPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext, questionType }) => {
  const context = { question, category, timeframe, binaryEntities, sessionContext: sessionContext || null, facts };
  const isBinary = questionType === 'binary' && binaryEntities;
  const isLight = questionType === 'light';

  const fullNarrativeGuide = isBinary
    ? [
        `- fullNarrative: 3~4문단. 반드시 아래 순서로 작성:`,
        `  1문단: 카드가 펼쳐진 상황을 짧게 묘사하고, 질문("${question}")을 부드럽게 수용하는 오프닝.`,
        `  2문단: [${binaryEntities[0]}] 쪽 카드의 이미지(색상·인물·상징)를 1~2문장 묘사 후 이 선택지의 흐름을 설명.`,
        `  3문단: [${binaryEntities[1]}] 쪽 카드의 이미지를 1~2문장 묘사 후 이 선택지의 흐름을 설명.`,
        `  4문단: 두 선택지를 비교하여 하나를 명확하게 추천하는 결론. "~쪽이 더 좋아요!" 형태의 직접적 추천 필수.`,
      ].join('\n')
    : isLight
    ? [
        `- fullNarrative: 2~3문단. 가볍고 따뜻한 톤으로:`,
        `  1문단: 카드가 전하는 오늘의 분위기를 한 문장으로.`,
        `  2문단: 각 카드의 이미지를 짧게 묘사하며 질문에 바로 연결.`,
        `  3문단: 구체적이고 친근한 한 줄 결론 ("오늘은 ~하는 게 좋겠어요!" 형태).`,
      ].join('\n')
    : [
        `- fullNarrative: 3~4문단. 아래 순서로:`,
        `  1문단: 카드 배열 전체의 분위기를 시적으로 묘사하는 오프닝.`,
        `  2문단: 각 카드를 포지션별로(${facts.map(f => f.positionLabel).join(' → ')}) 순서대로, 카드 이미지 묘사 + 질문과의 연결 포함.`,
        `  3문단: 카드들이 함께 가리키는 핵심 메시지와 구체적 행동 제안.`,
        `  (선택) 4문단: 주의해야 할 반전 가능성이나 사서의 따뜻한 격려.`,
      ].join('\n');

  return [
    '당신은 아르카나 도서관의 지혜로운 사서이자 타로 전문가입니다.',
    '반드시 JSON만 출력하세요. 설명 텍스트 없음.',
    `이 질문은 "${question}" — ${isLight ? '일상적이고 가벼운' : isBinary ? '이진 선택을 고민하는' : '진중하고 깊이 있는'} 고민입니다.`,
    '',
    '출력 스키마:',
    '{"fullNarrative":string,"summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '',
    '필드 작성 지침:',
    fullNarrativeGuide,
    '- summary: 결론을 1문장으로 요약. verdict.rationale과 중복 금지.',
    '- evidence[].claim: 카드 이미지의 구체적 묘사 + 질문 상황과의 연결. "~의 상징인 ~" 형태가 아닌 서술형 문장.',
    '- evidence[].caution: 이 카드가 경고하는 함정이나 주의사항. 카드 고유의 내용 반영.',
    '- actions[]: 질문에 맞는 구체적 행동 제안 2개. "마음의 소리를 들어보세요" 같은 범용 표현 금지.',
    '',
    '한국어로 작성. 사서의 따뜻하고 우아한 말투 유지.',
    `입력 데이터: ${JSON.stringify(context)}`,
  ].join('\n');
};

const extractJsonObject = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const callAnthropic = async (prompt) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[Anthropic API] API Key missing in env.');
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
        system: '당신은 아르카나 도서관의 지혜로운 사서입니다. 따뜻하고 신비로우면서도 실용적인 조언을 아끼지 않습니다. 카드 한 장 한 장을 생생하게 묘사하고, 질문자의 상황에 직접 연결하는 것이 당신의 특기입니다. 반드시 순수한 JSON 객체만 반환하세요. 마크다운 코드 블록, 설명 텍스트, 주석 일절 금지.'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Anthropic API] Error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    return extractJsonObject(data?.content?.[0]?.text);
  } catch (error) {
    console.error('[Anthropic API] Fetch Error:', error.message);
    return null;
  }
};

const callOpenAI = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_OPENAI_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: '아르카나 도서관의 사서로서 따뜻하고 신비로운 분위기를 유지하며 JSON만 반환하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`[OpenAI API] HTTP Error ${response.status}`);
      return null;
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return extractJsonObject(text);
  } catch (error) {
    console.error('[OpenAI API] Error:', error.message);
    return null;
  }
};

const verifyReport = (report, facts, binaryEntities) => {
  const issues = [];
  let unsupportedClaimCount = 0;

  if (!report || typeof report !== 'object') {
    return { valid: false, issues: ['report_missing'], unsupportedClaimCount: 1, consistencyScore: 0 };
  }

  if (!Array.isArray(report.evidence) || report.evidence.length !== facts.length) {
    issues.push('evidence_length_mismatch');
  }

  const knownIds = new Set(facts.map((f) => f.cardId));
  if (Array.isArray(report.evidence)) {
    for (const item of report.evidence) {
      if (!knownIds.has(item?.cardId)) {
        unsupportedClaimCount += 1;
        issues.push('unknown_card_claim');
      }
    }
  }

  const issuePenalty = Math.min(issues.length * 8, 60);
  const unsupportedPenalty = Math.min(unsupportedClaimCount * 20, 40);
  const consistencyScore = Math.max(0, 100 - issuePenalty - unsupportedPenalty);

  return {
    valid: issues.length === 0 && unsupportedClaimCount === 0,
    issues,
    unsupportedClaimCount,
    consistencyScore
  };
};

const normalizeReport = (report, facts, fallback) => {
  const normalizedEvidence = (Array.isArray(report?.evidence) ? report.evidence : fallback.evidence).map((item, idx) => ({
    cardId: facts[idx]?.cardId || item?.cardId || '',
    positionLabel: sanitizeText(item?.positionLabel || facts[idx]?.positionLabel || `단계 ${idx + 1}`),
    claim: sanitizeText(item?.claim || ''),
    rationale: sanitizeText(item?.rationale || ''),
    caution: sanitizeText(item?.caution || facts[idx]?.advice || '과도한 단정은 피하세요.')
  }));

  return {
    fullNarrative: report?.fullNarrative || null,
    summary: sanitizeText(report?.summary || fallback.summary),
    verdict: {
      label: normalizeVerdictLabel(report?.verdict?.label || fallback.verdict.label),
      rationale: sanitizeText(report?.verdict?.rationale || fallback.verdict.rationale),
      recommendedOption: report?.verdict?.recommendedOption || 'NONE'
    },
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

  const conclusion = report.fullNarrative || [
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

const detectQuestionType = ({ question, category, cardCount, binaryEntities }) => {
  if (binaryEntities && (cardCount === 2 || cardCount === 5)) return 'binary';

  const relationshipKeywords = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸', '이별'];
  const careerKeywords = ['이직', '회사', '상사', '퇴사', '연봉', '업무', '커리어', '취업', '면접', '직장', '프로젝트'];
  const emotionalKeywords = ['힘들', '우울', '슬퍼', '지쳐', '죽겠', '눈물', '불안', '무서', '막막', '상처', '포기'];
  const lightKeywords = ['커피', '메뉴', '점심', '저녁', '야식', '걷기', '버스', '지하철', '옷', '신발', '살까', '말까', '먹을까', '마실까'];

  if (category === 'love' || relationshipKeywords.some((k) => question.includes(k))) return 'relationship';
  if (category === 'career' || careerKeywords.some((k) => question.includes(k))) return 'career';
  if (emotionalKeywords.some((k) => question.includes(k))) return 'emotional';
  if (question.length < 15 && lightKeywords.some((k) => question.includes(k))) return 'light';
  return 'deep';
};

export const generateReadingHybrid = async ({
  cards,
  question,
  timeframe = 'daily',
  category = 'general',
  sessionContext = null,
  structure = 'evidence_report',
  debug = false
}) => {
  const safeQuestion = sanitizeText(question || '나의 현재 상황은?');
  const binaryEntities = extractBinaryEntities(safeQuestion, cards.length);
  const questionType = detectQuestionType({
    question: safeQuestion,
    category,
    cardCount: cards.length,
    binaryEntities
  });
  const facts = buildCardFacts(cards, category);

  const deterministic = buildDeterministicReport({
    question: safeQuestion,
    facts,
    category,
    binaryEntities
  });

  const prompt = buildPrompt({
    question: safeQuestion,
    facts,
    category,
    timeframe,
    binaryEntities,
    sessionContext,
    questionType
  });

  let apiUsed = 'none';
  let modelReport = null;
  let fallbackReason = null;

  try {
    // 1. Anthropic 시도
    modelReport = await callAnthropic(prompt);
    if (modelReport) apiUsed = 'anthropic';

    // 2. OpenAI 시도 (Anthropic 실패 시)
    if (!modelReport) {
      modelReport = await callOpenAI(prompt);
      if (modelReport) apiUsed = 'openai';
    }
  } catch (err) {
    console.error('[Hybrid Engine] Engine fatal error:', err.message);
  }

  let normalized = normalizeReport(modelReport, facts, deterministic);
  let quality = verifyReport(normalized, facts, binaryEntities);

  // 최종 폴백: API가 아예 실패했거나 검증에 실패한 경우
  const fallbackUsed = !modelReport || !quality.valid;
  if (fallbackUsed) {
    normalized = deterministic;
    apiUsed = 'fallback';
    fallbackReason = !modelReport ? 'model_unavailable' : 'validation_failed';
  }

  const legacyFromV3 = generateReadingV3(cards, safeQuestion, timeframe, category);
  const legacy = toLegacyResponse({ report: normalized, question: safeQuestion, facts });

  // API 성공 시 fullNarrative 사용, 실패 시 v3의 conclusion 사용
  const finalConclusion = normalized.fullNarrative || legacyFromV3?.conclusion || legacy.conclusion;

  return {
    conclusion: finalConclusion,
    evidence: legacyFromV3?.evidence || legacy.evidence,
    action: legacyFromV3?.action || legacy.action,
    yesNoVerdict: legacy.yesNoVerdict,
    report: normalized,
    quality: {
      consistencyScore: quality.consistencyScore,
      unsupportedClaimCount: quality.unsupportedClaimCount,
      regenerationCount: 0
    },
    fallbackUsed,
    apiUsed,
    mode: 'hybrid',
    structure,
    meta: {
      questionType,
      fallbackReason
    }
  };
};
