import {
  inferSummaryContextTone,
  inferYearlyIntent,
  normalizeContextText,
  pickTopKeywords,
  scoreCardRisk,
  pickByNumber,
  polishActionVoice,
  buildSummaryAction
} from '../common/utils.js';

// Note: buildSummaryAction and polishActionVoice are used by generic summarizers too.
// If they are not in utils.js yet, we need to add them or copy them.
// Let's check index.js for buildSummaryAction and polishActionVoice.
// They seem to be generic helpers. We should move them to utils.js or a separate `summary-common.js`.
// For now, let's assume we will move them to utils.js.

export function summarizeMonthlyFortune({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const theme = pick('월간 테마');
  const week1 = pick('1주차');
  const week2 = pick('2주차');
  const week3 = pick('3주차');
  const week4 = pick('4주차·정리');
  const intent = inferYearlyIntent(context); // Uses inferYearlyIntent for general intent detection
  const tone = inferSummaryContextTone(context);
  const uprightCount = items.filter((item) => item.orientation === 'upright').length;
  const topKeyword = pickTopKeywords(items, 1)[0] || theme?.card?.keywords?.[0] || '월간 흐름';
  const unstable = [week3, week4].some((item) => item?.orientation === 'reversed' || scoreCardRisk(item) >= 2);
  const monthLabel = intent === 'relationship'
    ? (uprightCount >= 3 ? '관계 진전 여지가 있으나 중반 리스크 관리가 필요한 달' : '속도 조절과 오해 관리가 우선인 달')
    : uprightCount >= 3
      ? '해볼 만한 기회는 있지만, 중반에는 속도 조절이 중요한 달'
      : '정비 우선 운영이 필요한 달';
  const cardLabel = (item) => item?.card?.nameKo
    ? `${item.card.nameKo} ${item.orientation === 'reversed' ? '역방향' : '정방향'}`
    : '신호 확인 필요';
  const weekHint = (item, role) => {
    if (!item) return `${role}는 카드 신호 확인이 필요합니다.`;
    const keyword = item.card?.keywords?.[0] || '흐름';
    const open = item.orientation !== 'reversed' && scoreCardRisk(item) < 2;
    const openLineByRole = {
      '1주차': `"${keyword}" 분위기가 강해서 시작하기 좋은 때입니다.`,
      '2주차': `"${keyword}" 분위기가 이어져서 무리 없이 꾸준히 가기 좋습니다.`,
      '3주차': `"${keyword}" 기운이 살아 있어 판단과 우선순위 정리가 쉬워집니다.`,
      '4주차·정리': `"${keyword}" 흐름이 맞아 균형을 잡고 마무리하기 좋습니다.`
    };
    const adjustLineByRole = {
      '1주차': `"${keyword}" 분위기가 흔들릴 수 있어, 서두르기보다 먼저 기준을 정리하는 편이 좋습니다.`,
      '2주차': `"${keyword}" 분위기가 흔들릴 수 있어, 크게 벌리기보다 유지 가능한 속도를 먼저 맞추는 편이 좋습니다.`,
      '3주차': `"${keyword}" 쪽으로 예민해질 수 있어, 빠른 결론보다 확인과 점검을 먼저 두는 편이 좋습니다.`,
      '4주차·정리': `"${keyword}" 흐름이 흔들릴 수 있어, 마무리 범위를 줄이고 핵심만 정리하는 편이 좋습니다.`
    };
    const line = open
      ? (openLineByRole[role] || `"${keyword}" 분위기가 맞아 움직이기 좋은 때입니다.`)
      : (adjustLineByRole[role] || `"${keyword}" 쪽이 흔들릴 수 있어, 속도를 낮추고 정비를 먼저 두는 편이 좋습니다.`);
    return `${role}(${cardLabel(item)})는 ${line}`;
  };
  const bridge = (() => {
    if (unstable) {
      return '주별 운세와 연결할 때는 3주차 성격으로 보고, 주중에는 결론보다 확인 질문을 먼저 두는 운영이 맞습니다.';
    }
    return '주별 운세와 연결할 때는 1~2주차 성격으로 보고, 힘이 실리는 요일에 짧고 일관된 실행을 붙이면 체감이 좋아집니다.';
  })();
  
  // Need to import or implement buildSummaryAction/polishActionVoice
  const action = buildSummaryAction({
    spreadName: '월별 운세',
    level,
    context,
    firstItem: theme,
    contextTone: tone
  });
  const polishedAction = polishActionVoice({
    line: action,
    spreadName: '월별 운세',
    context
  });
  const overall = [
    `월간 테마 카드는 ${cardLabel(theme)}이고, 핵심 키워드는 "${topKeyword}"입니다.`,
    `전체적으로는 ${monthLabel}으로 읽힙니다.`
  ].join(' ');

  return [
    `총평: ${overall}`,
    `주차 흐름: ${weekHint(week1, '1주차')} ${weekHint(week2, '2주차')} ${weekHint(week3, '3주차')} ${weekHint(week4, '4주차·정리')}`,
    `월-주 연결: ${bridge}`,
    `실행 가이드: ${polishedAction}`,
    `한 줄 테마: 이번 달은 '${topKeyword}'을 기준으로 초반에 시작하고, 중반에 속도를 조절하고, 후반에 정리하면 안정적입니다.`
  ].join('\n\n');
}
