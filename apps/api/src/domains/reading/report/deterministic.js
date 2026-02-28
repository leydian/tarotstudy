import {
  EVIDENCE_RATIONALE_TEMPLATES,
  EVIDENCE_CLAIM_TEMPLATES,
  CARD_STYLE_HINTS,
  selectTemplateWithDiversity,
  resolveEvidenceToneBucket,
  buildEvidenceClaim
} from './evidence-templates.js';
import {
  sanitizeText,
  joinSentencesKorean
} from './text-utils.js';
import {
  getSuitType,
  getEvidenceToneScore,
  verdictTone,
  computeVerdict,
  toTrendLabel
} from './verdict-policy.js';
import {
  buildCounterpointsByContext,
  buildDomainActions,
  buildConclusionStatement,
  buildConclusionBuffer,
  pickDominantFact,
  periodLabelKo,
  buildFortuneSummary
} from './domain-policy.js';
import { ensureFortuneDensity } from './fortune-policy.js';

const QUESTION_STOPWORDS = new Set([
  '이번',
  '오늘',
  '내일',
  '정말',
  '혹시',
  '지금',
  '저',
  '나',
  '우리',
  '할까',
  '말까',
  '가능',
  '운세'
]);

const extractQuestionKeywords = (question = '') => {
  const tokens = sanitizeText(question)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2)
    .filter((token) => !QUESTION_STOPWORDS.has(token))
    .slice(0, 3);
  return [...new Set(tokens)];
};

const buildQuestionFocusSentence = (question = '') => {
  const keywords = extractQuestionKeywords(question);
  if (keywords.length === 0) return '';
  const focus = keywords.slice(0, 2).join('·');
  return `질문 핵심어(${focus})를 중심으로, 선택 기준을 좁히면 해석 정확도가 높아집니다.`;
};

const compressForConciseMode = (report) => {
  const compactEvidence = (Array.isArray(report?.evidence) ? report.evidence : []).map((item) => {
    const claim = sanitizeText(item?.claim || '');
    const rationale = sanitizeText(item?.rationale || '');
    const preserveClaim = /균형|조율/.test(claim);
    return {
      ...item,
      claim: preserveClaim ? claim : (claim.length > 90 ? `${claim.slice(0, 89).trimEnd()}…` : claim),
      rationale: rationale.length > 85 ? `${rationale.slice(0, 84).trimEnd()}…` : rationale,
      caution: sanitizeText(item?.caution || '').slice(0, 70).trimEnd()
    };
  });
  return {
    ...report,
    evidence: compactEvidence,
    actions: (Array.isArray(report?.actions) ? report.actions : []).slice(0, 2),
    counterpoints: (Array.isArray(report?.counterpoints) ? report.counterpoints : []).slice(0, 2)
  };
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
  const usedImagerySet = new Set();
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
      claim: buildEvidenceClaim(fact, coreMeaning, toneBucket, selectedClaimTemplate, responseMode, {
        usedImagerySet
      }),
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

  const focusSentence = buildQuestionFocusSentence(question);
  const summary = isCompactBinaryQuestion
    ? `질문 "${question}"에 대해 보면, ${verdict.rationale} 오늘은 너무 무겁게 고민하지 않고 결정해도 괜찮습니다.`
    : (responseMode === 'balanced' || responseMode === 'creative')
      ? joinSentencesKorean(
        buildConclusionStatement({ question, verdict, binaryEntities }),
        buildConclusionBuffer({ verdictLabel: verdict.label, questionType, domainTag }),
        responseMode === 'creative' ? focusSentence : ''
      )
    : category === 'general'
      ? `질문 "${question}"에 대한 운명의 지도를 펼쳐보니, ${verdictTone(verdict.label, verdict.rationale)}`
      : `"${question}"의 ${category}적인 맥락에서 카드를 읽어보니, ${verdictTone(verdict.label, verdict.rationale)}`;

  const baseReport = {
    summary,
    verdict,
    evidence,
    counterpoints,
    actions,
    fullNarrative: null
  };
  const modeAdjustedReport = responseMode === 'concise'
    ? compressForConciseMode(baseReport)
    : baseReport;
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
    const explicitMindFact = facts.find((fact) => /내면의 빛|건강|마음/.test(String(fact.positionLabel || '')));
    const mindFact = explicitMindFact || pickDominantFact(
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
      ? joinSentencesKorean(
        `${claimCardLabel(mindFact, energyFact)} 경향에서, ${mindFrame}`,
        explicitMindFact
          ? '내면 포지션 신호를 기준으로 회복 루틴을 점검하면 체감 피로를 더 빠르게 줄일 수 있습니다.'
          : `이번 리딩에서는 ${mindFact.positionLabel} 카드가 컨디션 변동 신호를 가장 강하게 보여 해당 카드를 기준으로 건강·마음을 읽었습니다.`,
        '회복 루틴을 일정에 먼저 고정하면 변동 구간에서도 집중력을 지키기 쉽습니다.'
      )
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
      ...modeAdjustedReport,
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
    return modeAdjustedReport;
  }
  return modeAdjustedReport;
};

export { buildDeterministicReport };
