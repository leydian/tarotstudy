import { sanitizeListItems } from './contamination-policy.js';

const HEALTH_GUARDRAIL_ACTIONS = {
  medium: [
    '자극적인 음식과 카페인은 잠시 줄이고, 미지근한 물을 조금씩 자주 드셔 보세요.',
    '통증이나 설사/구토가 계속되거나 악화되면 오늘 안에 의료진 상담을 받는 편이 안전합니다.'
  ],
  high: [
    '강한 통증, 호흡 곤란, 출혈, 고열처럼 급한 증상이 있으면 즉시 응급 진료를 우선하세요.',
    '타로 해석보다 현재 증상 관찰과 의료진 판단을 기준으로 결정을 내리세요.'
  ]
};

const applyHealthGuardrail = (report, riskLevel = 'medium') => {
  const guidanceLevel = riskLevel === 'high' ? 'high' : 'medium';
  const actions = HEALTH_GUARDRAIL_ACTIONS[guidanceLevel];

  return {
    ...report,
    verdict: {
      ...report.verdict,
      label: 'MAYBE',
      recommendedOption: 'NONE',
      rationale: '건강 증상 관련 선택은 타로로 단정하기보다 현재 증상과 의료 기준을 우선해 판단하는 편이 안전합니다.'
    },
    summary: '현재 질문에는 신체 증상이 포함되어 있어, 카드 해석보다 몸 상태 확인과 안전한 관리가 우선입니다. 이 리딩은 의료 조언을 대체하지 않습니다.',
    counterpoints: sanitizeListItems([
      ...(report.counterpoints || []),
      '증상이 지속되거나 악화되면 진료를 미루지 마세요.',
      '탈수나 고열, 심한 통증 같은 위험 신호가 있으면 즉시 의료기관을 이용하세요.'
    ], 'counterpoints'),
    actions: sanitizeListItems(actions, 'actions')
  };
};

export {
  HEALTH_GUARDRAIL_ACTIONS,
  applyHealthGuardrail
};
