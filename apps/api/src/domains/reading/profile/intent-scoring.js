import {
  INTENT_KEYWORDS,
  BINARY_CONNECTOR_KEYWORDS,
  BINARY_DECISION_KEYWORDS,
  includesKeyword
} from './keywords.js';

export const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const maskPII = (text = '') => {
  const value = String(text || '');
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?:\+?82[-\s]?)?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, '[PHONE]')
    .replace(/\b\d{6}[- ]?\d{7}\b/g, '[ID]')
    .replace(/\b\d{2,4}[- ]?\d{2,4}[- ]?\d{2,4}\b/g, '[NUM]');
};

const isBinaryIntent = (question = '') => {
  const safeQuestion = String(question || '');
  const hasConnector = includesKeyword(safeQuestion, BINARY_CONNECTOR_KEYWORDS);
  const hasDecisionMarker = includesKeyword(safeQuestion, BINARY_DECISION_KEYWORDS);
  const syllableCount = (safeQuestion.match(/까/g) || []).length;
  const hasDualCandidatePattern = syllableCount >= 2;
  return hasConnector || hasDecisionMarker || hasDualCandidatePattern;
};

const normalizeRecentTurns = (context) => {
  if (!context || !Array.isArray(context.recentTurns)) return [];
  return context.recentTurns
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      text: sanitizeText(maskPII(turn?.text || '')),
      summary: sanitizeText(maskPII(turn?.summary || ''))
    }))
    .filter((turn) => !!turn.text || !!turn.summary)
    .slice(-5);
};

export const buildContextSignalText = (context) => {
  const turns = normalizeRecentTurns(context);
  if (turns.length === 0) return '';
  return turns
    .map((turn) => {
      const base = turn.summary || turn.text;
      const weightMark = turn.role === 'assistant' ? '[AUX]' : '[USR]';
      return `${weightMark} ${base}`;
    })
    .join(' ');
};

export const inferIntentScores = ({ question = '', contextSignal = '' } = {}) => {
  const q = String(question || '');
  const c = String(contextSignal || '');
  const scores = Object.entries(INTENT_KEYWORDS).map(([intent, keywords]) => {
    let score = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword)) score += 1.0;
      if (c.includes(keyword)) score += 0.35;
    }
    return { intent, score };
  });

  if (q.length >= 35) {
    const deep = scores.find((item) => item.intent === 'deep');
    if (deep) deep.score += 0.25;
  }
  if (isBinaryIntent(q)) {
    const binary = scores.find((item) => item.intent === 'binary');
    if (binary) binary.score += 0.5;
  }

  return scores.sort((a, b) => b.score - a.score);
};
