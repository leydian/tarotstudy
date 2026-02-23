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

  const model = {
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
      source: hasV3 ? 'model-native' : 'summary',
      version: 'reading-model-v1',
      timeHorizon: String(analysis?.timeHorizon || 'unspecified'),
      guardrailApplied,
      personaApplied,
      quality: {
        naturalnessScore: 0,
        specificityScore: 0,
        repetitionScore: 0,
        templateScore: 0,
        rewriteApplied: false
      }
    }
  };

  const quality = enforceModelQualityProfileB(model);
  model.meta.quality = quality;
  return model;
}

function normalizeLine(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text = '') {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

function scoreNaturalness(text = '') {
  const raw = normalizeLine(text);
  if (!raw) return 100;
  let score = 100;
  const awkward = (raw.match(/(리더 과제|실전 과제|복기 체크|점검 체크|핵심:|상징 요약:)/g) || []).length;
  score -= Math.min(35, awkward * 7);
  const shortFragments = splitSentences(raw).filter((line) => line.length < 10).length;
  score -= Math.min(20, shortFragments * 4);
  return Math.max(0, Math.min(100, score));
}

function scoreSpecificity(text = '') {
  const raw = normalizeLine(text);
  if (!raw) return 0;
  let score = 16;
  const evidenceHits = (raw.match(/(카드|정방향|역방향|키워드|근거|포지션|질문|점검)/g) || []).length;
  score += Math.min(38, evidenceHits * 3);
  const concreteHits = (raw.match(/(오늘|이번 주|이번 달|내일|3개월|1개|2개|10분|월|분기)/g) || []).length;
  score += Math.min(38, concreteHits * 4);
  const domainHits = (raw.match(/(지원|면접|연락|대화|지출|예산|수면|운동|학습|시험|오답|투자|복기)/g) || []).length;
  score += Math.min(18, domainHits * 3);
  return Math.max(0, Math.min(100, score));
}

function scoreRepetition(text = '') {
  const lines = splitSentences(text).map((line) => line.toLowerCase().replace(/[^0-9a-zA-Z가-힣]/g, ''));
  if (!lines.length) return 0;
  const duplicateCount = lines.length - new Set(lines).size;
  return Math.max(0, Math.min(100, duplicateCount * 24));
}

function scoreTemplate(text = '') {
  const raw = normalizeLine(text);
  if (!raw) return 0;
  const templateHits = (raw.match(/(두 갈래|좋은 구간입니다|운영이 좋습니다|흐름이 좋습니다|정비를 먼저)/g) || []).length;
  return Math.max(0, Math.min(100, templateHits * 20));
}

function rewriteModelLines(lines = [], context = '') {
  const normalizedContext = normalizeLine(context);
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    let next = normalizeLine(line)
      .replace(/두 갈래(로 보시면 됩니다|로 정리됩니다|입니다)?/g, '실행 기준은 두 단계로 나눠보면 좋습니다')
      .replace(/좋은 구간입니다/g, '우선순위를 정리하기 좋은 흐름입니다')
      .replace(/운영이 좋습니다/g, '운영이 안정됩니다')
      .replace(/흐름이 좋습니다/g, '흐름이 안정적입니다')
      .replace(/정비를 먼저/g, '우선 정리부터');
    if (!/(오늘|이번 주|이번 달|내일|10분|1개|카드|정방향|역방향|근거)/.test(next)) {
      if (normalizedContext) {
        next = `${next} 지금 질문 맥락에서 오늘 할 행동 1개를 먼저 고정해보세요.`;
      } else {
        next = `${next} 오늘 할 행동 1개를 먼저 고정해보세요.`;
      }
    }
    const key = next.toLowerCase().replace(/[^0-9a-zA-Z가-힣]/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

function enforceModelQualityProfileB(model) {
  const sourceLines = Array.isArray(model?.channel?.card?.blocks)
    ? model.channel.card.blocks.map((line) => normalizeLine(line)).filter(Boolean)
    : [];
  const context = sourceLines.join(' ');
  let workingLines = sourceLines;
  let naturalnessScore = scoreNaturalness(context);
  let specificityScore = scoreSpecificity(context);
  let repetitionScore = scoreRepetition(context);
  let templateScore = scoreTemplate(context);
  let rewriteApplied = false;

  if (naturalnessScore < 80 || specificityScore < 72 || repetitionScore > 30 || templateScore > 0) {
    workingLines = rewriteModelLines(sourceLines, context);
    const rewritten = workingLines.join(' ');
    naturalnessScore = scoreNaturalness(rewritten);
    specificityScore = scoreSpecificity(rewritten);
    repetitionScore = scoreRepetition(rewritten);
    templateScore = scoreTemplate(rewritten);
    rewriteApplied = true;
  }

  model.channel.card.blocks = workingLines;
  model.channel.export.summaryLines = workingLines;

  return {
    naturalnessScore,
    specificityScore,
    repetitionScore,
    templateScore,
    rewriteApplied
  };
}

export function deriveReadingV3FromModel(readingModel = null) {
  if (!readingModel || typeof readingModel !== 'object') return null;
  const blocks = Array.isArray(readingModel?.channel?.card?.blocks)
    ? readingModel.channel.card.blocks.map((line) => normalizeLine(line)).filter(Boolean)
    : [];
  const evidence = Array.isArray(readingModel?.evidence) ? readingModel.evidence : [];
  const bridge = blocks[0] || '';
  const verdictSentence = normalizeLine(readingModel?.verdict?.sentence || blocks[1] || '');
  const caution = normalizeLine(readingModel?.actions?.caution || blocks[blocks.length - 2] || '');
  const actionNow = normalizeLine(readingModel?.actions?.now || blocks[blocks.length - 1] || '');
  const checkin = normalizeLine(readingModel?.actions?.checkin || '');
  const usedEvidence = evidence.length
    ? evidence.slice(0, 3).map((entry) => ({
      position: String(entry?.position || ''),
      cardName: String(entry?.cardName || ''),
      orientation: entry?.orientation === 'reversed' ? 'reversed' : 'upright',
      keyword: String(entry?.keyword || ''),
      narrativeLine: normalizeLine(entry?.line || '')
    })).filter((entry) => entry.narrativeLine)
    : blocks.slice(2, 5).map((line) => ({
      position: '',
      cardName: '',
      orientation: 'upright',
      keyword: '',
      narrativeLine: normalizeLine(line)
    }));

  return {
    style: 'immersive',
    bridge,
    verdict: {
      label: readingModel?.verdict?.label || 'conditional',
      sentence: verdictSentence
    },
    evidence: usedEvidence,
    caution,
    action: {
      now: actionNow,
      checkin
    },
    closing: blocks[blocks.length - 1] || '',
    guardrails: {
      bannedAbsolute: true,
      duplicateRateMax: 0.34
    }
  };
}

export function deriveTonePayloadFromModel(readingModel = null, summary = '') {
  const summaryLines = splitSummaryLines(summary);
  const readingV3 = deriveReadingV3FromModel(readingModel);
  const v3Lines = readingV3
    ? {
      bridge: normalizeLine(readingV3.bridge),
      verdict: normalizeLine(readingV3.verdict?.sentence),
      evidence: Array.isArray(readingV3.evidence)
        ? readingV3.evidence.map((item) => normalizeLine(item?.narrativeLine)).filter(Boolean).slice(0, 3)
        : [],
      caution: normalizeLine(readingV3.caution),
      actionNow: normalizeLine(readingV3.action?.now),
      checkin: normalizeLine(readingV3.action?.checkin),
      closing: normalizeLine(readingV3.closing)
    }
    : null;
  return {
    v3Lines,
    summaryLines: Array.isArray(readingModel?.channel?.export?.summaryLines) && readingModel.channel.export.summaryLines.length
      ? readingModel.channel.export.summaryLines.map((line) => normalizeLine(line)).filter(Boolean)
      : summaryLines,
    meta: {
      source: readingV3 ? 'readingModel-derived' : 'summary',
      version: 'tone-v1'
    }
  };
}
