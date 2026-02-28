const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const ensureTerminalPunctuation = (text) => {
  const safe = sanitizeText(text);
  if (!safe) return '';
  return /[.!?]$/.test(safe) ? safe : `${safe}.`;
};

const joinSentencesKorean = (...parts) => parts
  .map((part) => ensureTerminalPunctuation(part))
  .filter(Boolean)
  .join(' ');

const normalizeCompareText = (value) => sanitizeText(value)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const isHighOverlap = (a, b) => {
  const left = normalizeCompareText(a);
  const right = normalizeCompareText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 10 && right.length >= 10 && (left.includes(right) || right.includes(left))) return true;
  return false;
};

const dedupeStrings = (items) => {
  const deduped = [];
  for (const item of items) {
    const key = normalizeCompareText(item);
    if (!key) continue;
    if (deduped.some((picked) => isHighOverlap(picked, item))) continue;
    deduped.push(item);
  }
  return deduped;
};

const withTopicParticle = (label = '') => {
  const safe = sanitizeText(label);
  if (!safe) return safe;
  const lastChar = safe[safe.length - 1];
  const code = lastChar.charCodeAt(0);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && ((code - 0xac00) % 28) !== 0;
  return `${safe}${hasBatchim ? '은' : '는'}`;
};

export {
  sanitizeText,
  ensureTerminalPunctuation,
  joinSentencesKorean,
  normalizeCompareText,
  isHighOverlap,
  dedupeStrings,
  withTopicParticle
};
