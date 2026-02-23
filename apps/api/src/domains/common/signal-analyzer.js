import { scoreCardRisk } from './utils.js';

export function analyzeSpreadSignal(items = [], intent = 'general') {
  const scored = items.map((item) => {
    const risk = scoreCardRisk(item);
    const orientationBase = item?.orientation === 'upright' ? 1.1 : -1.0;
    const score = orientationBase - (risk * 0.35);
    return { item, score, risk };
  });
  const total = scored.reduce((acc, row) => acc + row.score, 0);
  const uprightRatio = scored.filter((row) => row.item?.orientation === 'upright').length / scored.length;
  const avgRisk = scored.reduce((acc, row) => acc + row.risk, 0) / scored.length;
  let label = Math.abs(total) < 0.7
    ? '박빙'
    : (total > 1.2 && uprightRatio >= 0.52 && avgRisk < 2.1)
      ? '우세'
      : '조건부';
  const hasHighRiskReversed = scored.some((row) => row.item?.orientation === 'reversed' && row.risk >= 2);
  const severeRiskCount = scored.filter((row) => row.risk >= 3).length;
  if (label === '우세' && (hasHighRiskReversed || severeRiskCount >= 2 || avgRisk >= 1.6)) {
    label = '조건부';
  }

  const sorted = [...scored].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const positive = sorted.filter((row) => row.score >= 0);
  const negative = sorted.filter((row) => row.score < 0);
  const picks = [];
  if (positive[0]) picks.push(positive[0]);
  if (negative[0]) picks.push(negative[0]);
  for (const row of sorted) {
    if (picks.length >= 3) break;
    if (picks.includes(row)) continue;
    const hasSamePosition = picks.some((picked) => picked.item?.position?.name === row.item?.position?.name);
    if (hasSamePosition) continue;
    picks.push(row);
  }
  while (picks.length < 3 && sorted[picks.length]) {
    picks.push(sorted[picks.length]);
  }

  const topEvidence = picks.slice(0, 3).map((row) => {
    const position = row.item?.position?.name || '포지션';
    const card = row.item?.card?.nameKo || '카드';
    const cardId = row.item?.card?.id || '';
    const keyword = row.item?.card?.keywords?.[0] || '핵심';
    const orientation = row.item?.orientation === 'upright' ? '정방향' : '역방향';
    const reason = buildSpreadEvidenceReason({ position, keyword, score: row.score, intent });
    return { position, card, cardId, keyword, orientation, reason };
  });

  return { label, topEvidence };
}

export function buildSpreadEvidenceReason({ position = '', keyword = '핵심', score = 0, intent = 'general' }) {
  if (intent === 'relationship' || intent === 'relationship-repair') {
    if (score >= 0) {
      if (/현재 관계 상태|현재 상황|상대 관점 신호|현재/.test(position)) {
        return `"${keyword}" 흐름이 살아 있어 대화 여지를 남겨줍니다`;
      }
      return `"${keyword}" 흐름이 있어 관계를 풀 실마리를 잡기 좋은 구간입니다`;
    }
    if (/거리\/갈등|교차\/장애|결과|3주차|다음 7일/.test(position)) {
      return `"${keyword}" 구간에서 오해가 커지기 쉬워 속도 조절이 필요합니다`;
    }
    return `"${keyword}" 구간에서 감정 피로가 누적될 수 있어 톤 조율이 필요합니다`;
  }
  if (score >= 0) {
    if (/월간 테마|현재 상황|현재 관계 상태|현재/.test(position)) {
      return `${keyword} 기준을 잡아주어 흐름이 안정됩니다`;
    }
    if (/1주차|2주차|가까운 미래|행동/.test(position)) {
      return `${keyword} 쪽으로 움직일 힘이 붙는 흐름입니다`;
    }
    return `${keyword} 쪽으로 해볼 만한 힘이 남아 있습니다`;
  }
  if (/3주차|결과|교차\/장애|거리\/갈등/.test(position)) {
    return `${keyword} 쪽 피로가 쌓이기 쉬워 속도 조절이 필요합니다`;
  }
  return `${keyword} 쪽에서 소모나 지연이 생길 가능성이 큽니다`;
}

export function prioritizeChoiceEvidence(items = [], fallbackEvidence = [], intent = 'general') {
  const priorityPositions = ['현재 상황', 'A 선택 시 결과', 'B 선택 시 결과', 'A 선택 시 가까운 미래', 'B 선택 시 가까운 미래'];
  const itemByPosition = new Map(items.map((item) => [item?.position?.name || '', item]));
  const prioritized = [];
  for (const position of priorityPositions) {
    const item = itemByPosition.get(position);
    if (!item) continue;
    const keyword = item?.card?.keywords?.[0] || '핵심';
    const score = (item?.orientation === 'upright' ? 1.1 : -1.0) - (scoreCardRisk(item) * 0.35);
    prioritized.push({
      position,
      card: item?.card?.nameKo || '카드',
      keyword,
      orientation: item?.orientation === 'upright' ? '정방향' : '역방향',
      reason: buildSpreadEvidenceReason({ position, keyword, score, intent })
    });
    if (prioritized.length >= 3) break;
  }
  if (prioritized.length >= 3) return prioritized;
  return [...prioritized, ...fallbackEvidence].slice(0, 3);
}

export function pickSpreadLexicon(spreadName = '', intent = 'general') {
  const base = {
    main: '핵심 흐름'
  };
  if (spreadName === '양자택일 (A/B)') return { main: '선택 유지성' };
  if (spreadName === '3카드 스프레드') return { main: '상황-행동-결과 연결' };
  if (spreadName === '일별 운세') return { main: '하루 운영 리듬' };
  if (spreadName === '주별 운세') return { main: '요일별 완급' };
  if (spreadName === '월별 운세') return { main: '월간 흐름' };
  if (spreadName === '연간 운세 (12개월)') return { main: '분기별 흐름' };
  if (spreadName === '켈틱 크로스') return { main: '이야기 중심 흐름' };
  if (spreadName === '관계 회복 5카드') return { main: '회복 대화 구조' };
  if (intent === 'finance') return { main: '손실 방어와 지속성' };
  if (intent === 'relationship' || intent === 'relationship-repair') return { main: '대화 지속성' };
  return base;
}
