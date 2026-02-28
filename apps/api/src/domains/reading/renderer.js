import { normalizeVerdictLabel } from './report/verdict-policy.js';

const lineText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeCompare = (value) => lineText(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, '');

const LANGUAGE_FIXUPS = [
  [/명성의 실실/g, '명성의 실추'],
  [/도달했음\b/g, '도달했습니다'],
  [/최실/g, '손실'],
  [/실실/g, '실추'],
  [/은\(는\)/g, '는'],
  [/이\(가\)/g, '가']
];

const polishKorean = (value) => {
  let next = lineText(value);
  for (const [pattern, replacement] of LANGUAGE_FIXUPS) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

const shortenClaimForNarrative = (claim) => {
  const cleaned = polishKorean(claim)
    .replace(/^[^\-—:]+[\-—:]\s*/, '')
    .replace(/\s+(한 박자 늦춘 호흡처럼|잔잔한 새벽빛처럼|이른 아침의 고요한 공기처럼|열린 창으로 바람이 드는 장면처럼|밝아지는 수평선처럼|거울이 비추는 방향이 뒤집힌 듯해).*$/u, '')
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/u)[0] || cleaned;
  return firstSentence.length > 120 ? `${firstSentence.slice(0, 119).trimEnd()}…` : firstSentence;
};

const dedupeLines = (lines) => {
  const used = new Set();
  const deduped = [];
  for (const line of lines) {
    const normalized = normalizeCompare(line);
    if (!normalized || used.has(normalized)) continue;
    used.add(normalized);
    deduped.push(line);
  }
  return deduped;
};

const buildMasterReportConclusion = ({ report, question, facts, readingKind = 'general_reading' }) => {
  const lines = ['사서인 제가 읽어낸 이번 리딩의 결론입니다.'];
  const narrative = polishKorean(report?.fullNarrative || '');
  const summary = polishKorean(report?.summary || '');
  const verdictLabel = report?.verdict?.label || 'MAYBE';
  const verdictRationale = polishKorean(report?.verdict?.rationale || '');

  if (narrative) {
    lines.push(narrative);
  } else {
    lines.push(`질문 "${question}"에 대한 흐름을 정리하면, ${summary}`);
    const evidenceBridge = (Array.isArray(report?.evidence) ? report.evidence : [])
      .slice(0, 3)
      .map((item) => {
        const cardName = facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId;
        const claim = shortenClaimForNarrative(item?.claim || '');
        const cue = polishKorean(item?.rationale || '');
        const cueLine = cue ? ` 이 흐름은 ${cue}` : '';
        return `${item.positionLabel}의 ${cardName} 카드는 ${claim}을 보여줍니다.${cueLine}`;
      });
    if (evidenceBridge.length > 0) {
      lines.push(`[운명의 서사 분석]\n${evidenceBridge.join('\n')}`);
    }
  }

  if (readingKind === 'overall_fortune' && report?.fortune) {
    const focusLines = dedupeLines([
      `이번 기간의 핵심 리듬은 ${summary.split('\n')[0] || '우선순위 재정렬'}입니다.`,
      `실천 우선순위는 ${polishKorean(report?.actions?.[0] || '').replace(/^\[운명의 지침 \d+\]\s*/, '') || '중간 점검 루틴 고정'}에 두는 편이 안정적입니다.`,
      `변수 관리는 ${polishKorean(report?.counterpoints?.[0] || '') || '주차별 편차를 누적 신호로 확인'} 방식이 유리합니다.`
    ]);
    lines.push(
      [
        '[이번 기간 핵심 맥락]',
        ...focusLines
      ].join('\n')
    );
  }

  lines.push(`[운명의 판정] ${verdictLabel} - ${verdictRationale}`);
  return dedupeLines(lines).filter(Boolean).join('\n\n');
};

const toLegacyResponse = ({ report, question, facts }) => {
  const evidenceStrings = report.evidence.map((item) => (
    `[${item.positionLabel}: ${facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId}]\n\n` +
    `사서로서 이 카드의 의미를 읽어보니, "${item.claim}" 임을 알 수 있습니다.\n\n` +
    `깊은 통찰: ${item.rationale}\n\n` +
    `사서의 조언: ${item.caution}`
  ));

  const action = report.actions.map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);

  const conclusion = buildMasterReportConclusion({
    report,
    question,
    facts
  });

  return {
    conclusion,
    evidence: evidenceStrings,
    action,
    yesNoVerdict: normalizeVerdictLabel(report.verdict.label)
  };
};

const extractBinaryEntities = (question, cardCount) => {
  if (cardCount !== 2 && cardCount !== 5) return null;

  const splitRegex = /(.+?)\s*(?:아니면|vs|또는|혹은)\s*(.+?)(?:\?|$)/;
  const splitMatch = question.match(splitRegex);
  if (splitMatch) return [splitMatch[1].trim(), splitMatch[2].trim()];

  const verbs = ['할까', '갈까', '탈까', '먹을까', '마실까', '살까', '될까', '말까'];
  const verbPattern = verbs.join('|');
  const binaryRegex = new RegExp(`(.+?)\\s*(?:${verbPattern})\\s*(.+?)(?:${verbPattern})(?:\\?|$)`);
  const match = question.match(binaryRegex);
  if (match) {
    const a = match[1].split(' ').pop().trim();
    const b = match[2].trim();
    return [a, b];
  }

  return null;
};

const mapFailureStage = ({ fallbackReason, qualityValid, modelReport }) => {
  if (!qualityValid && modelReport) return 'validation';
  if (!fallbackReason) return null;
  if (fallbackReason === 'anthropic_timeout' || fallbackReason === 'anthropic_fetch_error') return 'network';
  if (fallbackReason === 'anthropic_parse_error') return 'parse';
  if (
    fallbackReason === 'model_not_found' ||
    fallbackReason === 'anthropic_provider_5xx' ||
    fallbackReason === 'anthropic_http_error' ||
    fallbackReason === 'anthropic_auth_error' ||
    fallbackReason === 'anthropic_rate_limited'
  ) return 'http';
  if (fallbackReason === 'model_unavailable') return 'model_unavailable';
  if (fallbackReason === 'engine_fatal_error') return 'engine';
  if (fallbackReason === 'validation_failed') return 'validation';
  return 'unknown';
};

export {
  buildMasterReportConclusion,
  toLegacyResponse,
  extractBinaryEntities,
  mapFailureStage
};
