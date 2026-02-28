import { normalizeVerdictLabel } from './report/verdict-policy.js';

const toLegacyResponse = ({ report, question, facts }) => {
  const evidenceStrings = report.evidence.map((item) => (
    `[${item.positionLabel}: ${facts.find((f) => f.cardId === item.cardId)?.cardNameKo || item.cardId}]\n\n` +
    `사서로서 이 카드의 의미를 읽어보니, "${item.claim}" 임을 알 수 있습니다.\n\n` +
    `깊은 통찰: ${item.rationale}\n\n` +
    `사서의 조언: ${item.caution}`
  ));

  const action = report.actions.map((item, idx) => `[운명의 지침 ${idx + 1}] ${item}`);

  const conclusion = [
    '사서인 제가 읽어낸 이번 리딩의 결론입니다.',
    `질문하신 "${question}"에 대하여, ${report.summary}`,
    '',
    `[운명의 판정] ${report.verdict.label} - ${report.verdict.rationale}`
  ].join('\n');

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
  toLegacyResponse,
  extractBinaryEntities,
  mapFailureStage
};
