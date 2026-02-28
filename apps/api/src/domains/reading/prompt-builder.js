const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 12000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 9000);
const ANTHROPIC_TIMEOUT_OVERALL_MS = Number(process.env.ANTHROPIC_TIMEOUT_OVERALL_MS || 15000);
const ANTHROPIC_RETRY_TIMEOUT_OVERALL_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_OVERALL_MS || 12000);

const clampTimeout = (value, minValue) => Math.max(minValue, Number.isFinite(value) ? value : minValue);

const detectResponseMode = (questionType, questionLength, domainTag = 'general', readingKind = 'general_reading', fortunePeriod = null) => {
  if (readingKind === 'overall_fortune') {
    if (fortunePeriod === 'today') return 'concise';
    if (fortunePeriod === 'year') return 'creative';
    return 'balanced';
  }
  if (domainTag === 'health') return 'concise';
  if (questionType === 'light' || (questionType === 'binary' && questionLength <= 20)) return 'concise';
  if ((questionType === 'emotional' || questionType === 'relationship') && questionLength >= 25) return 'creative';
  return 'balanced';
};

const getAnthropicConfig = (
  responseMode,
  {
    isRetry = false,
    readingKind = 'general_reading'
  } = {}
) => {
  const tokenBase = responseMode === 'concise' ? 500 : (responseMode === 'creative' ? 1300 : 1100);
  const maxTokens = isRetry ? Math.max(300, Math.floor(tokenBase * 0.8)) : tokenBase;
  const temperature = responseMode === 'concise' ? 0.25 : (responseMode === 'creative' ? 0.7 : 0.45);
  const isOverallFortune = readingKind === 'overall_fortune';
  const resolvedTimeoutMs = isRetry
    ? (isOverallFortune ? ANTHROPIC_RETRY_TIMEOUT_OVERALL_MS : ANTHROPIC_RETRY_TIMEOUT_MS)
    : (isOverallFortune ? ANTHROPIC_TIMEOUT_OVERALL_MS : ANTHROPIC_TIMEOUT_MS);
  const minTimeoutMs = isRetry
    ? (isOverallFortune ? 10000 : 8000)
    : (isOverallFortune ? 12000 : 10000);
  return {
    maxTokens,
    timeoutMs: clampTimeout(resolvedTimeoutMs, minTimeoutMs),
    temperature
  };
};

const buildPrompt = ({
  question,
  facts,
  category,
  timeframe,
  binaryEntities,
  sessionContext,
  responseMode,
  questionType,
  domainTag = 'general',
  riskLevel = 'low',
  readingKind = 'general_reading',
  fortunePeriod = null
}) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    domainTag,
    riskLevel,
    readingKind,
    fortunePeriod,
    sessionContext: sessionContext || null,
    facts
  };

  const isCompactBinaryQuestion = questionType === 'binary' && String(question || '').length <= 20;
  const styleGuide = readingKind === 'overall_fortune'
    ? [
        '응답 모드: overall_fortune',
        '- fortune 객체를 반드시 채우세요.',
        '- fortune.period는 today|week|month|year 중 하나입니다.',
        '- fortune.trendLabel은 UP|BALANCED|CAUTION 중 하나를 사용하세요.',
        '- overall_fortune에서는 verdict를 단정형 YES/NO로 몰아가지 말고 균형 있게 작성하세요.',
        '- energy/workFinance/love/healthMind/message는 각각 1~2문장으로 작성하세요.',
        '- fortune 섹션 문장은 필드명 접두 반복("전체 에너지 흐름을 보면", "일·재물운은" 등)을 붙이지 마세요.',
        '- evidence.rationale은 카드마다 같은 문장 패턴을 반복하지 마세요.',
        '- 역방향 카드 근거는 과속/확정 어조보다 점검/완충 어조를 우선하세요.'
      ].join('\n')
    : domainTag === 'health'
    ? [
        '응답 모드: health-safety',
        '- 의료 진단/처방처럼 들리는 단정적 문장을 금지합니다.',
        '- verdict.label은 반드시 MAYBE를 사용하세요.',
        '- verdict.rationale에는 안전 우선 원칙과 의료 상담 필요 조건을 포함하세요.',
        '- actions는 즉시 실행 가능한 안전 수칙 2개로 작성하세요.',
        '- summary에는 "의료 조언을 대체하지 않는다"는 취지를 반드시 반영하세요.'
      ].join('\n')
    : isCompactBinaryQuestion
    ? [
        '응답 모드: concise-binary-light',
        '- 결론은 2~3문장으로 짧고 명확하게 작성하세요.',
        '- 과장된 수사(운명/신비/장대한 은유) 사용 금지.',
        '- verdict.rationale은 자연스러운 일상어로 작성하세요.',
        '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
        '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.',
        '- actions는 즉시 실행 가능한 문장 2개만 작성하세요.',
        '- evidence는 카드별 핵심 주장(claim) 중심으로 간결하게 작성하세요.',
        '- 역방향 카드에서는 확정형 낙관 문장을 피하고 점검형 문장으로 작성하세요.'
      ].join('\n')
    : responseMode === 'concise'
      ? [
          '응답 모드: concise',
          '- fullNarrative는 2문단 이내, 문단당 2문장 이내.',
          '- evidence는 핵심 주장만 간결하게 작성.',
          '- actions는 2개를 넘기지 마세요.',
          '- 과장된 비유/장황한 세계관 설명 금지.',
          '- 질문에 대한 직접 결론 1문장을 반드시 포함.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.',
          '- 역방향 카드에서는 과속/확정형 어조보다 점검/완충 어조를 우선하세요.'
        ].join('\n')
      : responseMode === 'creative'
      ? [
          '응답 모드: creative',
          '- 이미지감 있는 표현과 어휘 변주를 사용하세요.',
          '- 같은 어구 반복을 피하고 카드별 표현을 다르게 구성하세요.',
          '- 결론은 질문에 대한 실천 방향이 분명해야 합니다.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.',
          '- 역방향 카드에서는 감속·점검 관점을 반드시 반영하세요.'
        ].join('\n')
      : [
          '응답 모드: balanced',
          '- 명확하고 안정적인 어조로 카드 근거를 구조적으로 설명하세요.',
          '- 감성적 표현과 실천 지침의 균형을 유지하세요.',
          '- summary와 verdict.rationale은 같은 의미로 반복하지 마세요.',
          '- counterpoints에는 다른 섹션 문장을 복사하지 마세요.',
          '- 역방향 카드에서는 확정형 낙관 문장보다 점검/완충 어조를 우선하세요.'
        ].join('\n');

  return [
    '당신은 아르카나 도서관의 지혜로운 사서이자 타로 전문가입니다.',
    '반드시 JSON만 출력하고, 카드의 상징에 기반한 따뜻하고 통찰력 있는 분석을 제공하세요.',
    `이 질문은 ${responseMode === 'concise' ? '일상적이고 가벼운' : '진중하고 깊이 있는'} 고민입니다. 그에 맞춰 어휘의 무게를 조절하세요.`,
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"fortune":{"period":"today|week|month|year","trendLabel":"UP|BALANCED|CAUTION","energy":string,"workFinance":string,"love":string,"healthMind":string,"message":string},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '- fullNarrative: 사서의 말투로 작성된 3~4문단의 전체 리딩 서사. 카드 개별 해석과 종합 결론을 자연스럽게 연결하세요. 문법과 조사를 완벽하게 처리하세요.',
    '- evidence[].claim: "~의 상징인 ~" 패턴 금지. 카드 이름(방향)을 주어로, 카드가 현재 상황에 어떻게 작용하는지를 서술형 문장으로 작성.',
    '한국어로 작성하고 사서의 우아한 말투를 유지하세요.',
    styleGuide,
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

const buildRepairPrompt = ({ question, facts, category, timeframe, binaryEntities, sessionContext }) => {
  const context = {
    question,
    category,
    timeframe,
    binaryEntities,
    sessionContext: sessionContext || null,
    facts
  };

  return [
    '당신은 JSON 정규화 도우미입니다.',
    '반드시 JSON 객체 하나만 출력하세요. 설명, 마크다운, 코드펜스는 금지합니다.',
    '출력 스키마:',
    '{"fullNarrative":string, "summary":string,"verdict":{"label":"YES|NO|MAYBE","rationale":string,"recommendedOption":"A|B|EITHER|NONE"},"fortune":{"period":"today|week|month|year","trendLabel":"UP|BALANCED|CAUTION","energy":string,"workFinance":string,"love":string,"healthMind":string,"message":string},"evidence":[{"cardId":string,"positionLabel":string,"claim":string,"rationale":string,"caution":string}],"counterpoints":[string],"actions":[string]}',
    '요구사항:',
    '- evidence 길이는 facts 길이와 반드시 같아야 합니다.',
    '- evidence.cardId는 반드시 facts 안의 cardId만 사용하세요.',
    '- summary와 verdict.rationale은 빈 문자열이면 안 됩니다.',
    `입력 데이터: ${JSON.stringify(context)}`
  ].join('\n');
};

export {
  detectResponseMode,
  getAnthropicConfig,
  buildPrompt,
  buildRepairPrompt
};
