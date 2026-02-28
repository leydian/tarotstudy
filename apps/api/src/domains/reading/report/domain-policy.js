import {
  sanitizeText,
  withTopicParticle
} from './text-utils.js';
import {
  getYesNoScore
} from './verdict-policy.js';

const periodLabelKo = (period = 'week') => {
  if (period === 'today') return '오늘';
  if (period === 'month') return '이번 달';
  if (period === 'year') return '올해';
  return '이번 주';
};

const pickDominantFact = (facts, predicate, fallbackIndex = 0) => {
  const filtered = facts.filter(predicate);
  if (filtered.length === 0) return facts[fallbackIndex] || facts[0] || null;
  return filtered
    .map((fact) => ({ fact, magnitude: Math.abs(getYesNoScore(fact.cardId, fact.orientation)) }))
    .sort((a, b) => b.magnitude - a.magnitude)[0]?.fact || facts[fallbackIndex] || facts[0] || null;
};

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
    return [
      '지금 선택을 10~20분 단위의 작은 실험으로 먼저 실행해 체감 결과를 확인해 보세요.',
      '결정 뒤 만족도(기분·효율)를 짧게 기록해 다음 선택 기준으로 재사용하세요.'
    ];
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

const buildFortuneSummary = (fortunePeriod, trendLabel) => {
  const periodLabel = periodLabelKo(fortunePeriod || 'week');
  const periodWithTopic = withTopicParticle(periodLabel);
  if (trendLabel === 'UP') return `${periodLabel}의 흐름은 상승 기조입니다. 다만 리듬을 유지하며 컨디션 관리를 병행하세요.`;
  if (trendLabel === 'CAUTION') return `${periodLabel}에는 속도 조절이 필요합니다. 무리한 확장보다 점검과 정리가 유리합니다.`;
  return `${periodWithTopic} 균형 구간입니다. 조급한 결정보다 우선순위를 정리하는 접근이 안정적입니다.`;
};

export {
  periodLabelKo,
  pickDominantFact,
  buildConclusionStatement,
  buildConclusionBuffer,
  buildDomainActions,
  buildCounterpointsByContext,
  buildFortuneSummary
};
