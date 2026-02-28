const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 12000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 7000);

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

const getAnthropicConfig = (responseMode, isRetry = false) => {
  const tokenBase = responseMode === 'concise' ? 500 : (responseMode === 'creative' ? 1300 : 1100);
  const maxTokens = isRetry ? Math.max(300, Math.floor(tokenBase * 0.8)) : tokenBase;
  const temperature = responseMode === 'concise' ? 0.25 : (responseMode === 'creative' ? 0.7 : 0.45);
  return {
    maxTokens,
    timeoutMs: isRetry ? ANTHROPIC_RETRY_TIMEOUT_MS : ANTHROPIC_TIMEOUT_MS,
    temperature
  };
};

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

const verdictTone = (label, rationale) => {
  if (label === 'YES') return `운명의 흐름이 매우 맑고 긍정적입니다. ${rationale} 망설임 없이 나아가셔도 좋을 것 같아요.`;
  if (label === 'NO') return `지금은 잠시 멈추어 서서 주변을 살필 때입니다. ${rationale} 무리한 전진보다는 안정을 선택하는 지혜가 필요합니다.`;
  return `안개 속에 가려진 것처럼 상황이 조금 더 무르익기를 기다려야 할 것 같네요. ${rationale} 조금 더 시간을 두고 지켜보는 것은 어떨까요?`;
};

const getSuitType = (cardId = '') => {
  return detectSuitByCardId(cardId);
};

const pickDominantFact = (facts, predicate, fallbackIndex = 0) => {
  const filtered = facts.filter(predicate);
  if (filtered.length === 0) return facts[fallbackIndex] || facts[0] || null;
  return filtered
    .map((fact) => ({ fact, magnitude: Math.abs(getYesNoScore(fact.cardId, fact.orientation)) }))
    .sort((a, b) => b.magnitude - a.magnitude)[0]?.fact || facts[fallbackIndex] || facts[0] || null;
};

const periodLabelKo = (period = 'week') => {
  if (period === 'today') return '오늘';
  if (period === 'month') return '이번 달';
  if (period === 'year') return '올해';
  return '이번 주';
};

const withTopicParticle = (label = '') => {
  const safe = sanitizeText(label);
  if (!safe) return safe;
  const lastChar = safe[safe.length - 1];
  const code = lastChar.charCodeAt(0);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && ((code - 0xac00) % 28) !== 0;
  return `${safe}${hasBatchim ? '은' : '는'}`;
};

const shouldUseImageryLine = (responseMode = 'balanced') =>
  responseMode === 'balanced' || responseMode === 'creative';

const pickImagerySentence = (toneBucket, seedSource) => pickTemplateBySeed(
  EVIDENCE_IMAGERY_SENTENCE_TEMPLATES[toneBucket] || EVIDENCE_IMAGERY_SENTENCE_TEMPLATES.neutral,
  seedSource
);

const buildConclusionStatement = ({ question, verdict, binaryEntities = null }) => {
  if (Array.isArray(binaryEntities) && binaryEntities.length >= 2) {
    const entityA = sanitizeText(binaryEntities[0]) || '선택 A';
    const entityB = sanitizeText(binaryEntities[1]) || '선택 B';
    if (verdict.recommendedOption === 'A') return `결론: "${question}"에서는 ${entityA} 쪽이 현재 흐름과 더 잘 맞습니다.`;
    if (verdict.recommendedOption === 'B') return `결론: "${question}"에서는 ${entityB} 쪽이 현재 흐름과 더 잘 맞습니다.`;
  }
  if (verdict.label === 'YES') return `결론: "${question}"은(는) 지금 추진해 볼 가치가 있는 흐름입니다.`;
  if (verdict.label === 'NO') return `결론: "${question}"은(는) 지금 속도를 낮추고 보완하는 편이 안전합니다.`;
  return `결론: "${question}"은(는) 아직 확정하기보다 조건 정리가 먼저입니다.`;
};

const buildConclusionBuffer = ({ verdictLabel, questionType, domainTag = 'general' }) => {
  if (domainTag === 'career') {
    if (verdictLabel === 'YES') return '참고: 실행 전에 일정·조건 체크리스트를 먼저 고정하면 성과 안정성이 높아집니다.';
    if (verdictLabel === 'NO') return '참고: 채용/협상 변수는 변동폭이 크므로 단계별 리스크를 먼저 닫고 움직이세요.';
    return '참고: 확정 전 우선순위와 의사결정 기준을 문서로 정리하면 흔들림을 줄일 수 있습니다.';
  }
  if (domainTag === 'relationship' || questionType === 'relationship') {
    if (verdictLabel === 'NO') return '참고: 감정이 과열된 대화는 시점을 늦추고, 핵심 메시지 한 가지에 집중하세요.';
    return '참고: 짧더라도 솔직한 대화를 정기적으로 확보하면 관계 흐름이 더 안정됩니다.';
  }
  if (verdictLabel === 'YES') return '참고: 작은 실행 단위를 먼저 완료해 흐름을 실제 성과로 연결해 보세요.';
  if (verdictLabel === 'NO') return '참고: 보류 기간에는 손실 요인을 먼저 줄이고 재진입 조건을 명확히 잡아 두세요.';
  return '참고: 단정 대신 관찰-조정 루프를 한 번 더 거치면 판단 정확도가 올라갑니다.';
};

const buildDomainActions = ({ questionType, domainTag = 'general', verdictLabel, question = '' }) => {
  const isLightLikeQuestion = questionType === 'light' || (questionType === 'binary' && String(question).length <= 20);
  if (isLightLikeQuestion || domainTag === 'lifestyle') {
    const base = [
      '지금 선택을 10~20분 단위의 작은 실험으로 먼저 실행해 체감 결과를 확인해 보세요.',
      '결정 뒤 만족도(기분·효율)를 짧게 기록해 다음 선택 기준으로 재사용하세요.'
    ];
    if (verdictLabel !== 'YES') {
      return [...base, '결론이 애매하면 즉시 확정하지 말고 물 한 컵/짧은 휴식 뒤 다시 선택하세요.'];
    }
    return base;
  }

  if (domainTag === 'career' || questionType === 'career') {
    const base = [
      '핵심 목표를 단계(준비-실행-점검)로 쪼개고 이번 주 완료 기준을 수치로 적어두세요.',
      '수/목 중간 점검 슬롯을 고정해 진행률과 변수 변화를 한 번에 확인하세요.'
    ];
    if (verdictLabel !== 'YES' || String(question).length >= 24) {
      return [...base, '이력서·포트폴리오·협상 조건 중 리스크가 큰 항목 하나를 골라 선제 보완하세요.'];
    }
    return base;
  }

  if (domainTag === 'relationship' || questionType === 'relationship') {
    const base = [
      '이번 주에 15분 이상 대화 시간을 한 번 확보하고, 핵심 주제를 한 가지로 제한하세요.',
      '감정 반응이 올라올 때 바로 결론내지 말고 상대 의도 확인 질문을 먼저 던져 보세요.'
    ];
    if (verdictLabel !== 'YES' || questionType === 'emotional') {
      return [...base, '대화 전 내가 원하는 결과와 허용 가능한 타협선을 메모로 정리해 두세요.'];
    }
    return base;
  }

  if (domainTag === 'finance') {
    const base = [
      '지출/투자 결정을 실행하기 전 상한선과 손절 기준을 숫자로 먼저 설정하세요.',
      '이번 주 현금흐름을 고정비·변동비로 나눠 점검하고 불필요 항목 하나를 즉시 줄이세요.'
    ];
    if (verdictLabel !== 'YES') {
      return [...base, '큰 금액 결제나 투자 실행은 하루 숙성 후 재검토해 충동 리스크를 낮추세요.'];
    }
    return base;
  }

  const base = [
    '이번 주 핵심 우선순위 1~2개를 고정하고, 나머지는 보류해 실행 밀도를 높이세요.',
    '중간 점검 시점(예: 수/목)을 미리 정해 진행률과 변수 변화를 한 번에 확인하세요.'
  ];
  if (questionType === 'deep' || questionType === 'emotional' || verdictLabel !== 'YES') {
    return [...base, '판단 근거를 사실/해석으로 분리해 메모하면 다음 결정의 정확도를 높일 수 있습니다.'];
  }
  return base;
};

const buildEvidenceClaim = (fact, coreMeaning, toneBucket, selectedTemplate, responseMode = 'balanced') => {
  const suit = getSuitType(fact.cardId);
  const template = selectedTemplate || pickTemplateBySeed(
    EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.[suit] || EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.major || [],
    `${fact.cardId}:${fact.positionLabel}:${toneBucket}`
  );
  const label = `${fact.cardNameKo}(${fact.orientationLabel})`;
  if (!template) return clampEvidenceClaim(`${label} — ${coreMeaning}.`, toneBucket);
  const intensity = getCardIntensity(fact.cardId);
  const styleHint = CARD_STYLE_HINTS[fact.cardId];
  let filled = template.replace('%s', label).replace('%s', coreMeaning);
  if (styleHint === 'balance' && toneBucket !== 'reversed') {
    filled = joinSentencesKorean(
      filled,
      '완급을 조절하며 균형을 지키면 결과를 더 안정적으로 만들 수 있습니다'
    );
  }
  if (intensity === 'high' && (toneBucket === 'caution' || toneBucket === 'reversed')) {
    filled = joinSentencesKorean(filled, '결론을 서두르지 말고 변동 관리 중심으로 접근하세요');
  } else if (intensity === 'medium' && toneBucket === 'caution') {
    filled = joinSentencesKorean(filled, '실행 강도를 한 단계 낮추면 안정성이 올라갑니다');
  }
  if (shouldUseImageryLine(responseMode)) {
    const imagery = pickImagerySentence(toneBucket, `${fact.cardId}:${fact.positionLabel}:${responseMode}:imagery`);
    if (imagery) {
      filled = joinSentencesKorean(filled, imagery);
    }
  }
  return clampEvidenceClaim(filled, toneBucket);
};

const computeVerdict = (facts, binaryEntities) => {
  if (binaryEntities && facts.length === 2) {
    const scoreA = getYesNoScore(facts[0].cardId, facts[0].orientation);
    const scoreB = getYesNoScore(facts[1].cardId, facts[1].orientation);
    const entityA = sanitizeText(binaryEntities[0]) || '선택 A';
    const entityB = sanitizeText(binaryEntities[1]) || '선택 B';

    if (scoreA - scoreB > 0.2) {
      return {
        label: 'YES',
        recommendedOption: 'A',
        rationale: `${entityA} 선택이 상대적으로 더 안정적이고 조화로운 흐름을 보여줍니다.`
      };
    }

    if (scoreB - scoreA > 0.2) {
      return {
        label: 'YES',
        recommendedOption: 'B',
        rationale: `${entityB} 선택이 지금의 흐름에 더 편안하고 긍정적인 방향으로 보입니다.`
      };
    }

    return {
      label: 'MAYBE',
      recommendedOption: 'EITHER',
      rationale: '두 선택의 기운이 비슷합니다. 오늘 컨디션과 우선순위를 기준으로 가볍게 정해도 괜찮습니다.'
    };
  }

  const score = facts.reduce((acc, fact) => acc + getYesNoScore(fact.cardId, fact.orientation), 0);
  const threshold = Math.max(0.8, facts.length * 0.2);
  if (score > threshold) return { label: 'YES', rationale: '카드의 전반적인 흐름이 상승 구간에 가까워 기회 포착에 유리합니다.' };
  if (score < -threshold) return { label: 'NO', rationale: '역방향·경고 신호가 섞여 있어 속도 조절과 리스크 관리가 우선입니다.' };
  return { label: 'MAYBE', rationale: '상반된 기운이 섞여 있어, 단정 짓기보다 상황의 변화를 조금 더 지켜볼 필요가 있습니다.' };
};

const toTrendLabel = (label) => {
  if (label === 'YES') return 'UP';
  if (label === 'NO') return 'CAUTION';
  return 'BALANCED';
};

const buildFortuneSummary = (fortunePeriod, trendLabel) => {
  const periodLabel = periodLabelKo(fortunePeriod || 'week');
  const periodWithTopic = withTopicParticle(periodLabel);
  if (trendLabel === 'UP') return `${periodLabel}의 흐름은 상승 기조입니다. 다만 리듬을 유지하며 컨디션 관리를 병행하세요.`;
  if (trendLabel === 'CAUTION') return `${periodLabel}에는 속도 조절이 필요합니다. 무리한 확장보다 점검과 정리가 유리합니다.`;
  return `${periodWithTopic} 균형 구간입니다. 조급한 결정보다 우선순위를 정리하는 접근이 안정적입니다.`;
};

const buildCounterpointsByContext = ({ questionType, readingKind = 'general_reading', domainTag = 'general' }) => {
  if (readingKind === 'overall_fortune') {
    return [
      '주간/월간 운세는 중간 점검 시점의 선택에 따라 체감 흐름이 달라질 수 있습니다.',
      '초반 신호가 후반까지 그대로 이어지지 않을 수 있으니 일정 완충 구간을 남겨두세요.'
    ];
  }
  if (domainTag === 'health') {
    return [
      '건강 관련 판단은 타로 해석보다 현재 증상 관찰과 의료 기준을 우선하세요.',
      '증상이 지속·악화되면 대기하지 말고 의료진 상담으로 확인하는 편이 안전합니다.'
    ];
  }
  if (questionType === 'binary' || questionType === 'light') {
    return [
      '가벼운 선택이라도 컨디션·일정 변수에 따라 결과 체감이 달라질 수 있습니다.',
      '오늘 결정을 내렸다면 짧은 사후 점검으로 선택의 만족도를 확인해 보세요.'
    ];
  }
  if (questionType === 'career') {
    return [
      '커리어 질문은 시장 일정과 채용 타이밍 변수의 영향이 크므로 중간 점검이 필요합니다.',
      '서류·면접·협상 단계별로 조건이 달라질 수 있으니 단계별 전략을 분리해 준비하세요.'
    ];
  }
  return [
    '질문의 범위가 넓을수록 카드가 가리키는 방향이 분산될 수 있어 조건을 좁히는 과정이 중요합니다.',
    '운명은 고정값이 아니므로 컨디션과 환경 변화에 맞춰 실행 계획을 유연하게 조정하세요.'
  ];
};

const buildDeterministicReport = ({
  question,
  facts,
  category,
  binaryEntities,
  questionType,
  responseMode = 'balanced',
  domainTag = 'general',
  riskLevel = 'low',
  readingKind = 'general_reading',
  fortunePeriod = null
}) => {
  const verdict = computeVerdict(facts, binaryEntities);
  const isCompactBinaryQuestion = questionType === 'binary' && String(question || '').length <= 20;
  const isHealthQuestion = domainTag === 'health';
  const isOverallFortune = readingKind === 'overall_fortune';
  const resolvedFortunePeriod = fortunePeriod || 'week';
  const usedRationaleIndices = {
    positive: new Set(),
    caution: new Set(),
    neutral: new Set(),
    reversed: new Set()
  };
  const usedRationaleNormalized = {
    positive: new Set(),
    caution: new Set(),
    neutral: new Set(),
    reversed: new Set()
  };
  const usedClaimIndicesByGroup = new Map();
  const usedClaimNormalizedByGroup = new Map();
  let prevSuit = null;

  const evidence = facts.map((fact, factIdx) => {
    const coreMeaning = sanitizeText(fact.coreMeaning || fact.summary)
      .replace(/\.$/, '')
      .replace(/[을를이가]?\s*상징합니다\.?$/, '');
    const keywordsStr = fact.keywords.slice(0, 2).join('·') || '균형';
    const suit = getSuitType(fact.cardId);
    const sameSuitAsPrev = prevSuit === suit;
    const toneScore = getEvidenceToneScore(fact.cardId, fact.orientation);
    const toneBucket = resolveEvidenceToneBucket(toneScore, fact.orientation);
    const baseTemplateGroup = EVIDENCE_RATIONALE_TEMPLATES[toneBucket] || EVIDENCE_RATIONALE_TEMPLATES.neutral;
    const styleHint = CARD_STYLE_HINTS[fact.cardId];
    let rationaleTemplates = sameSuitAsPrev && baseTemplateGroup.length > 1
      ? [...baseTemplateGroup.slice(1), baseTemplateGroup[0]]
      : baseTemplateGroup;
    if (styleHint === 'balance' && toneBucket === 'positive') {
      rationaleTemplates = [
        '%s 흐름은 속도보다 균형 조절에 강점이 있어, 템포를 일정하게 유지하면 안정적입니다.',
        '%s 기운은 조율 능력이 높아, 극단을 피하고 완급을 맞출 때 성과가 커집니다.',
        ...rationaleTemplates
      ];
    }
    const pickedTemplate = selectTemplateWithDiversity({
      templates: rationaleTemplates,
      seedSource: `${fact.cardId}:${fact.positionLabel}:${toneBucket}:rationale:${factIdx}`,
      usedIndices: usedRationaleIndices[toneBucket] || new Set(),
      usedNormalized: usedRationaleNormalized[toneBucket] || new Set()
    }) || rationaleTemplates[0];
    const orientationRationale = pickedTemplate.replace('%s', `'${keywordsStr}'`);
    const claimTemplates = EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.[suit]
      || EVIDENCE_CLAIM_TEMPLATES[toneBucket]?.major
      || [];
    const claimKey = `${toneBucket}:${suit}`;
    if (!usedClaimIndicesByGroup.has(claimKey)) usedClaimIndicesByGroup.set(claimKey, new Set());
    if (!usedClaimNormalizedByGroup.has(claimKey)) usedClaimNormalizedByGroup.set(claimKey, new Set());
    const selectedClaimTemplate = selectTemplateWithDiversity({
      templates: claimTemplates,
      seedSource: `${fact.cardId}:${fact.positionLabel}:${toneBucket}:claim:${factIdx}`,
      usedIndices: usedClaimIndicesByGroup.get(claimKey),
      usedNormalized: usedClaimNormalizedByGroup.get(claimKey)
    });
    prevSuit = suit;
    return {
      cardId: fact.cardId,
      positionLabel: fact.positionLabel,
      claim: buildEvidenceClaim(fact, coreMeaning, toneBucket, selectedClaimTemplate, responseMode),
      rationale: orientationRationale,
      caution: sanitizeText(fact.advice) || '급한 결정보다는 마음의 우선순위를 먼저 정리해 보세요.'
    };
  });

  const counterpoints = buildCounterpointsByContext({
    questionType,
    readingKind,
    domainTag
  });

  const actions = buildDomainActions({
    questionType,
    domainTag,
    verdictLabel: verdict.label,
    question
  });

  const summary = isCompactBinaryQuestion
    ? `질문 "${question}"에 대해 보면, ${verdict.rationale} 오늘은 너무 무겁게 고민하지 않고 결정해도 괜찮습니다.`
    : (responseMode === 'balanced' || responseMode === 'creative')
      ? joinSentencesKorean(
        buildConclusionStatement({ question, verdict, binaryEntities }),
        buildConclusionBuffer({ verdictLabel: verdict.label, questionType, domainTag })
      )
    : category === 'general'
      ? `질문 "${question}"에 대한 운명의 지도를 펼쳐보니, ${verdictTone(verdict.label, verdict.rationale)}`
      : `"${question}"의 ${category}적인 맥락에서 카드를 읽어보니, ${verdictTone(verdict.label, verdict.rationale)}`;

  const baseReport = { summary, verdict, evidence, counterpoints, actions, fullNarrative: null };
  if (isOverallFortune) {
    const trendLabel = toTrendLabel(verdict.label);
    const energyFact = pickDominantFact(facts, () => true, 0);
    const workFact = pickDominantFact(
      facts,
      (fact) => ['pentacles', 'wands'].includes(getSuitType(fact.cardId)),
      1
    );
    const loveFact = pickDominantFact(
      facts,
      (fact) => getSuitType(fact.cardId) === 'cups' || ['m06', 'm02', 'm03', 'm17'].includes(fact.cardId),
      2
    );
    const mindFact = pickDominantFact(
      facts,
      (fact) => getSuitType(fact.cardId) === 'swords' || ['m09', 'm12', 'm14'].includes(fact.cardId),
      facts.length - 1
    );
    const periodText = periodLabelKo(resolvedFortunePeriod);
    const periodExecutionHint = resolvedFortunePeriod === 'year'
      ? '분기 단위 점검으로 전략을 지속적으로 보정하세요.'
      : resolvedFortunePeriod === 'month'
        ? '주차별 점검으로 편차를 빠르게 흡수하는 운영이 유리합니다.'
        : resolvedFortunePeriod === 'week'
          ? '주중 중간 점검을 고정하면 변동 대응력이 크게 올라갑니다.'
          : '오늘은 한 번에 하나씩 완료하는 리듬이 안정적입니다.';
    const workFrame = resolvedFortunePeriod === 'year'
      ? '분기 단위로 목표와 자원 배분을 재정렬해 보세요.'
      : resolvedFortunePeriod === 'month'
        ? '주차별 우선순위를 쪼개서 실행하면 효율이 올라갑니다.'
        : resolvedFortunePeriod === 'week'
          ? '주중 중반에 체크포인트를 두면 변동 대응이 쉬워집니다.'
          : '오늘은 한 번에 한 가지 핵심 과제에 집중하는 편이 유리합니다.';
    const loveFrame = resolvedFortunePeriod === 'year'
      ? '관계의 패턴을 장기적으로 점검하고 기대치를 조율하세요.'
      : resolvedFortunePeriod === 'month'
        ? '감정 소모가 큰 대화는 시점을 조절해 부드럽게 풀어가세요.'
        : resolvedFortunePeriod === 'week'
          ? '이번 주는 짧더라도 솔직한 대화 빈도를 높이는 편이 좋습니다.'
          : '오늘은 감정 반응보다 진심을 천천히 전달해 보세요.';
    const mindFrame = resolvedFortunePeriod === 'year'
      ? '페이스를 연중 리듬으로 관리하고 휴식 캘린더를 미리 확보하세요.'
      : resolvedFortunePeriod === 'month'
        ? '과로 신호가 보이면 즉시 일정을 덜어내는 방식이 필요합니다.'
      : resolvedFortunePeriod === 'week'
        ? '수면과 회복 루틴을 고정하면 변동성을 줄일 수 있습니다.'
          : '짧은 휴식 루틴을 자주 넣는 것이 집중력 유지에 도움이 됩니다.';
    const energyFrame = resolvedFortunePeriod === 'year'
      ? '연간 흐름은 장거리 페이스가 중요하니, 분기마다 기준점을 재설정해 리듬을 유지하세요.'
      : resolvedFortunePeriod === 'month'
        ? '월간 흐름은 중간 조정의 유연성이 핵심이므로, 주차별 신호를 반영해 운영 강도를 조절하세요.'
        : resolvedFortunePeriod === 'week'
          ? '주간 흐름은 일정 충돌에 민감하므로, 완충 시간을 남겨두면 안정적으로 전개됩니다.'
          : '일일 흐름은 컨디션 영향을 크게 받으니, 무리한 확장보다 리듬 유지가 우선입니다.';
    const periodActions = resolvedFortunePeriod === 'year'
      ? [
          '올해 목표를 분기 단위로 쪼개고, 각 분기 종료 시점에 반드시 회고 시간을 확보하세요.',
          '성장/관계/건강 지표를 각각 하나씩 정해 연중 추이를 기록해 보세요.'
        ]
      : resolvedFortunePeriod === 'month'
        ? [
            '이번 달 목표를 주차별로 나누고, 매주 말 우선순위를 재조정하세요.',
            '한 달 동안 유지할 회복 루틴(수면/운동/휴식)을 하나 정해 꾸준히 실행해 보세요.'
          ]
      : resolvedFortunePeriod === 'week'
        ? [
            '이번 주 핵심 3가지를 정하고, 중간 점검(수/목) 시간을 미리 잡아 두세요.',
            '중요한 결정은 하루 숙성 후 확정해 감정 과속을 줄이세요.'
          ]
      : [
            '오늘 해야 할 한 가지 핵심 과제를 정하고 완료 기준을 먼저 적어두세요.',
            '오후 한 차례 10분 정리 시간을 확보해 리듬을 회복하세요.'
        ];
    const periodCounterpoints = resolvedFortunePeriod === 'year'
      ? [
          '연간 흐름은 외부 변수의 영향이 크므로 분기마다 방향을 재점검하세요.',
          '상반기와 하반기의 에너지 결이 다를 수 있으니 고정 전략보다 적응 전략이 유리합니다.'
        ]
      : resolvedFortunePeriod === 'month'
        ? [
            '월간 흐름은 주차별 편차가 크므로 중간 조정 여지를 남겨두세요.',
            '한 번의 변동으로 전체 추세를 단정하지 말고 누적 신호를 보세요.'
        ]
      : resolvedFortunePeriod === 'week'
        ? [
            '주간 흐름은 일정 충돌에 민감하므로 하루 단위 완충 시간을 남겨두세요.',
            '초반의 강한 신호가 주말까지 그대로 가지 않을 수 있으니 중간 점검이 필요합니다.'
        ]
      : [
            '일일 흐름은 컨디션 영향을 크게 받으니 무리한 계획 확대를 피하세요.',
            '오늘의 신호는 단기 참고값이므로 장기 결정은 추가 근거와 함께 판단하세요.'
        ];
    const claimCardLabel = (fact, refFact) =>
      refFact && fact.cardId === refFact.cardId
        ? '이 카드'
        : `${fact.cardNameKo}(${fact.orientationLabel})`;
    const energyClaim = energyFact
      ? joinSentencesKorean(
        `${energyFact.cardNameKo}(${energyFact.orientationLabel})의 흐름이 ${periodText} 전체 리듬의 기준점으로 작동합니다`,
        energyFrame
      )
      : joinSentencesKorean(`${periodText}의 에너지는 안정적으로 흐르고 있습니다`, energyFrame);
    const workClaim = workFact
      ? joinSentencesKorean(`${claimCardLabel(workFact, energyFact)} 관점에서, ${workFrame}`, periodExecutionHint)
      : joinSentencesKorean(workFrame, periodExecutionHint);
    const loveClaim = loveFact
      ? joinSentencesKorean(`${claimCardLabel(loveFact, energyFact)} 흐름상 ${loveFrame}`, '감정 반응보다 대화의 타이밍을 조율하면 관계 피로를 줄일 수 있습니다.')
      : joinSentencesKorean(loveFrame, '감정 반응보다 대화의 타이밍을 조율하면 관계 피로를 줄일 수 있습니다.');
    const mindClaim = mindFact
      ? joinSentencesKorean(`${claimCardLabel(mindFact, energyFact)} 경향에서, ${mindFrame}`, '회복 루틴을 일정에 먼저 고정하면 변동 구간에서도 집중력을 지키기 쉽습니다.')
      : joinSentencesKorean(mindFrame, '회복 루틴을 일정에 먼저 고정하면 변동 구간에서도 집중력을 지키기 쉽습니다.');
    const fortune = {
      period: resolvedFortunePeriod,
      trendLabel,
      energy: ensureFortuneDensity(energyClaim, 'energy', resolvedFortunePeriod),
      workFinance: ensureFortuneDensity(workClaim, 'workFinance', resolvedFortunePeriod),
      love: ensureFortuneDensity(loveClaim, 'love', resolvedFortunePeriod),
      healthMind: ensureFortuneDensity(mindClaim, 'healthMind', resolvedFortunePeriod),
      message: trendLabel === 'UP'
        ? '상승 흐름을 활용하되 과속 대신 리듬 기반 실행으로 안정성을 함께 확보하세요.'
        : trendLabel === 'CAUTION'
          ? '서두르지 말고 정리와 점검에 집중하면 변동 구간에서도 흐름을 다시 열 수 있습니다.'
          : '균형의 시간을 활용해 우선순위를 재정렬하고, 변화 신호에 맞춰 유연하게 조정하세요.'
    };
    fortune.message = ensureFortuneDensity(fortune.message, 'message', resolvedFortunePeriod);
    return {
      ...baseReport,
      summary: buildFortuneSummary(fortune.period, trendLabel),
      verdict: {
        label: 'MAYBE',
        rationale: `${periodText} 종합운세는 YES/NO보다 기조(상승·균형·주의)로 읽는 편이 더 정확합니다.`,
        recommendedOption: 'NONE'
      },
      actions: periodActions,
      counterpoints: periodCounterpoints,
      fortune
    };
  }
  if (isHealthQuestion) {
    return baseReport;
  }
  return baseReport;
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
          '길이 제한:',
          '- fullNarrative는 2문단 이내, 문단당 2문장 이내.',
          '- evidence는 핵심 주장만 간결하게 작성.',
          '- actions는 짧고 실행 가능한 문장으로 작성.',
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
