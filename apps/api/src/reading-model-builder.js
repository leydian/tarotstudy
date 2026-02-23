import { analyzeQuestionContextV2Sync } from './question-understanding/index.js';

export function splitSummaryLines(summary = '') {
  return String(summary || '')
    .split(/\n{2,}/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function buildReadingModel({
  spreadId = '',
  items = [],
  context = '',
  summary = '',
  readingV3 = null
}) {
  const analysis = analyzeQuestionContextV2Sync(context, { mode: 'hybrid', flag: true });
  const hasV3 = readingV3 && typeof readingV3 === 'object';
  const summaryLines = splitSummaryLines(summary);
  const v3Evidence = Array.isArray(readingV3?.evidence) ? readingV3.evidence : [];
  const evidence = v3Evidence.slice(0, 3).map((entry) => ({
    position: String(entry?.position || ''),
    cardName: String(entry?.cardName || ''),
    orientation: entry?.orientation === 'reversed' ? 'reversed' : 'upright',
    keyword: String(entry?.keyword || ''),
    line: String(entry?.narrativeLine || '').trim()
  }));
  const cardBlocks = hasV3
    ? [
      String(readingV3.bridge || '').trim(),
      String(readingV3.verdict?.sentence || '').trim(),
      ...evidence.map((item) => item.line).filter(Boolean),
      String(readingV3.caution || '').trim(),
      String(readingV3.action?.now || '').trim(),
      String(readingV3.closing || '').trim()
    ].filter(Boolean)
    : summaryLines;

  const quickTurns = hasV3
    ? [
      { speaker: 'tarot', purpose: 'bridge', text: String(readingV3.bridge || '').trim() },
      { speaker: 'tarot', purpose: 'verdict', text: String(readingV3.verdict?.sentence || '').trim() },
      ...(evidence[0]?.line ? [{ speaker: 'tarot', purpose: 'evidence', text: evidence[0].line }] : []),
      { speaker: 'tarot', purpose: 'caution', text: String(readingV3.caution || '').trim() },
      { speaker: 'tarot', purpose: 'action', text: String(readingV3.action?.now || '').trim() },
      { speaker: 'learning', purpose: 'coach', text: String(readingV3.action?.checkin || '').trim() }
    ].filter((item) => item.text)
    : summaryLines.slice(0, 6).map((line, idx) => ({
      speaker: 'tarot',
      purpose: idx === 0 ? 'verdict' : 'detail',
      text: line
    }));

  const detailTurns = [];
  for (const item of items.slice(0, 6)) {
    const orientation = item?.orientation === 'reversed' ? '역방향' : '정방향';
    const keyword = item?.card?.keywords?.[0] || '핵심 신호';
    const position = item?.position?.name || '포지션';
    const cardName = item?.card?.nameKo || '카드';
    detailTurns.push({
      speaker: 'tarot',
      purpose: 'detail',
      text: `${position}에서는 ${cardName} ${orientation} 카드(${keyword})가 기준으로 작동합니다.`
    });
    if (item?.coreMessage) {
      detailTurns.push({
        speaker: 'tarot',
        purpose: 'detail',
        text: String(item.coreMessage).trim()
      });
    }
    if (item?.interpretation) {
      detailTurns.push({
        speaker: 'tarot',
        purpose: 'detail',
        text: String(item.interpretation).trim()
      });
    }
  }
  if (!detailTurns.length) {
    for (const line of summaryLines.slice(0, 10)) {
      detailTurns.push({ speaker: 'tarot', purpose: 'detail', text: line });
    }
  }
  if (hasV3 && readingV3?.action?.checkin) {
    detailTurns.push({
      speaker: 'learning',
      purpose: 'coach',
      text: String(readingV3.action.checkin).trim()
    });
  }

  const checklist = hasV3
    ? [
      String(readingV3.action?.now || '').trim(),
      String(readingV3.caution || '').trim(),
      String(readingV3.action?.checkin || '').trim()
    ].filter(Boolean)
    : summaryLines.slice(0, 3);

  const guardrailApplied = items.some((item) => Boolean(item?.tarotPersonaMeta?.guardrailApplied));
  const personaApplied = items.some((item) => Boolean(item?.tarotPersonaMeta?.personaApplied));

  return {
    version: 'reading-model-v1',
    spreadId,
    verdict: {
      label: hasV3 ? readingV3.verdict?.label || 'conditional' : 'conditional',
      sentence: hasV3 ? String(readingV3.verdict?.sentence || '').trim() : (summaryLines[0] || '')
    },
    actions: {
      now: hasV3 ? String(readingV3.action?.now || '').trim() : (checklist[0] || ''),
      checkin: hasV3 ? String(readingV3.action?.checkin || '').trim() : (checklist[2] || ''),
      caution: hasV3 ? String(readingV3.caution || '').trim() : (checklist[1] || '')
    },
    evidence,
    channel: {
      card: {
        blocks: cardBlocks
      },
      chatQuick: {
        turns: quickTurns
      },
      chatDetail: {
        turns: detailTurns
      },
      export: {
        summaryLines: hasV3 ? cardBlocks : summaryLines,
        checklist
      }
    },
    meta: {
      source: hasV3 ? 'readingV3' : 'summary',
      version: 'reading-model-v1',
      timeHorizon: String(analysis?.timeHorizon || 'unspecified'),
      guardrailApplied,
      personaApplied
    }
  };
}
