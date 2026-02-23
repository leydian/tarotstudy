import { analyzeQuestionContextSync } from '../../question-understanding/index.js';
import {
  inferSummaryContextTone,
  normalizeContextText,
  hashText,
  pickTopKeywords,
  scoreCardRisk,
  pickByNumber
} from '../common/utils.js';

export function summarizeThreeCard({ items, context = '', level = 'beginner' }) {
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const intent = inferThreeCardIntent(context);
  const contextLabel = normalizeContextText(context) || '현재 질문';
  const seed = hashText([
    context,
    ...items.map((item) => `${item?.position?.name || ''}:${item?.card?.id || ''}:${item?.orientation || ''}`)
  ].join(':'));
  const topKeywords = pickTopKeywords(items, 3);

  const positionOf = (name) => items.find((item) => item.position?.name === name) || null;
  const first = positionOf('상황') || positionOf('과거') || positionOf('문제') || items[0] || null;
  const second = positionOf('행동') || positionOf('현재') || positionOf('해결방법') || items[1] || null;
  const third = positionOf('결과') || positionOf('미래') || positionOf('조언') || items[2] || null;

  const cardLabel = (item) => item?.card?.nameKo
    ? `${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'}`
    : '신호 확인 필요';
  const cardKeyword = (item) => item?.card?.keywords?.[0] || '흐름';
  const positionRole = (item, fallback) => item?.position?.name || fallback;
  const risk = (item) => scoreCardRisk(item);
  const isOpen = (item) => item?.orientation === 'upright' && risk(item) < 2;

  const outcomeScore = (isOpen(third) ? 2 : 0) + (isOpen(second) ? 1 : 0) - (first?.orientation === 'reversed' ? 1 : 0);
  const verdict = outcomeScore >= 2
    ? '진행 권장'
    : outcomeScore >= 1
      ? '조건부 진행'
      : '보류 후 정비';

  const verdictLine = (() => {
    if (verdict === '진행 권장') {
      return pickByNumber([
        `질문 "${contextLabel}"의 현재 흐름은 실행 쪽이 우세합니다. 다만 속도보다 루틴 유지가 결과 안정성을 만듭니다.`,
        `지금 카드 조합은 "${contextLabel}"에서 전진 가능성이 열려 있습니다. 무리한 확장보다 기준 고정이 성과를 지켜줍니다.`
      ], seed);
    }
    if (verdict === '조건부 진행') {
      return pickByNumber([
        `질문 "${contextLabel}"은 가능성은 있으나 조건이 붙는 흐름입니다. 병목을 줄이는 운영을 먼저 두면 결과가 따라옵니다.`,
        `현재 조합은 "${contextLabel}"에서 무리한 가속보다 정비형 실행이 맞습니다. 속도 조절이 성패를 가릅니다.`
      ], seed);
    }
    return pickByNumber([
      `질문 "${contextLabel}"은 지금 당장 밀어붙이기보다 정비가 우선인 구간입니다. 기준을 재정렬한 뒤 다시 실행하는 편이 안전합니다.`,
      `현재 흐름에서는 "${contextLabel}"의 결과를 서두를수록 변동성이 커질 수 있습니다. 우선 병목 1개를 정리하세요.`
    ], seed);
  })();

  const situationLine = `${positionRole(first, '첫 카드')}(${cardLabel(first)})에서는 "${cardKeyword(first)}" 신호가 핵심 변수입니다.`;
  const actionLine = `${positionRole(second, '두 번째 카드')}(${cardLabel(second)})는 실행 강도를 정하는 자리라, 과속보다 반복 가능한 단위로 줄이는 편이 효과적입니다.`;
  const outcomeLine = `${positionRole(third, '세 번째 카드')}(${cardLabel(third)})는 결과를 확정하는 카드가 아니라, 지금 실행 품질이 좋아질 때 체감이 커지는 구간으로 읽는 편이 정확합니다.`;

  const contradictionAlert = first?.orientation === 'reversed' && verdict === '진행 권장'
    ? '주의: 초반 경고 카드가 있어도 후반 카드가 열려 있습니다. 즉시 확장보다 리스크 관리형 실행이 우선입니다.'
    : first?.orientation === 'upright' && verdict === '보류 후 정비'
      ? '주의: 시작 신호가 나쁘지 않아도 결과 카드 마찰이 큽니다. 중간 실행 품질을 먼저 점검하세요.'
      : '';

  const studyAction = buildThreeCardStudyActionGuide({
    first,
    second,
    third,
    verdict,
    seed: seed + 7
  });

  const genericAction = pickByNumber([
    `실행 기준: 오늘은 카드 흐름에서 가장 마찰이 큰 지점 1개만 줄이고, 내일 같은 기준으로 재점검하세요.`,
    `실행 기준: 실행 항목을 1개로 줄인 뒤 결과를 사실/해석으로 분리해 기록하면 카드 해석 정확도가 올라갑니다.`
  ], seed + 8);

  const actionGuide = intent === 'study' ? studyAction : genericAction;
  const themeLine = `한 줄 테마: ${topKeywords.length ? topKeywords.join(' · ') : '흐름 점검'}을 중심으로, ${verdict === '진행 권장' ? '밀되 과속은 줄이는' : verdict === '조건부 진행' ? '조건을 확인하며 움직이는' : '정비를 먼저 두는'} 흐름이 맞습니다.`;

  return [
    `결론: ${verdict} · ${verdictLine}`,
    `근거: ${situationLine} ${actionLine} ${outcomeLine}`,
    contradictionAlert ? `충돌 점검: ${contradictionAlert}` : '',
    `실행 가이드: ${actionGuide} ${levelHint}`,
    themeLine
  ].filter(Boolean).join('\n\n');
}

function inferThreeCardIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (inferred === 'study') return 'study';
  if (inferred === 'relationship' || inferred === 'relationship-repair') return 'relationship';
  if (inferred === 'career') return 'career';
  if (inferred === 'finance') return 'finance';
  return 'general';
}

function buildThreeCardStudyActionGuide({ first, second, third, verdict = '조건부 진행', seed = 0 }) {
  const firstLabel = first?.card?.nameKo || '상황 카드';
  const secondLabel = second?.card?.nameKo || '행동 카드';
  const thirdLabel = third?.card?.nameKo || '결과 카드';
  const isHeavyOutcome = third?.orientation === 'reversed' || scoreCardRisk(third) >= 2;
  const opening = verdict === '진행 권장'
    ? `학습 질문에서는 ${secondLabel}의 실행 흐름을 지키면 ${thirdLabel}의 결과 흐름이 따라올 가능성이 큽니다.`
    : verdict === '조건부 진행'
      ? `학습 질문은 ${firstLabel}에서 막히는 지점을 먼저 줄일 때 ${thirdLabel} 결과 흐름이 살아납니다.`
      : `학습 질문은 지금 ${firstLabel} 정비가 우선이며, 정비 없는 확장은 ${thirdLabel} 구간 마찰을 키울 수 있습니다.`;
  const today = pickByNumber([
    '오늘 할 일: 취약 파트 1개 + 기출 1세트 + 오답 20분만 고정하고 분량 확장은 금지하세요.',
    '오늘 할 일: 40~60분 집중 블록 2회만 수행하고, 끝난 뒤 오답 유형 3개를 기록하세요.',
    '오늘 할 일: 암기보다 기출 회독 우선으로 전환하고, 틀린 문항의 근거 문장만 짧게 복기하세요.'
  ], seed + 1);
  const week = pickByNumber([
    '이번 주 할 일: 점수보다 반복률을 지표로 두고, 3일 연속 같은 시간대 학습 리듬을 먼저 고정하세요.',
    '이번 주 할 일: 과목 확장보다 취약 영역 1개를 3회전 복습해 체감 안정도를 올리세요.',
    '이번 주 할 일: 시험 시간표와 같은 조건으로 1회 리허설을 넣어 시간 배분 오차를 줄이세요.'
  ], seed + 2);
  const avoid = isHeavyOutcome
    ? '피할 것: 막판에 새 교재/새 범위를 늘리는 확장 전략은 피하고, 기존 틀린 유형 정리에 집중하세요.'
    : '피할 것: 컨디션 좋은 날 분량을 과도하게 늘려 다음날 루틴이 무너지는 패턴은 피하세요.';
  return `${opening} ${today} ${week} ${avoid}`;
}
