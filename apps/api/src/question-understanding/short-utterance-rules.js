function normalize(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const SHORT_HINTS = [
  {
    pattern: /^(지금\s*)?(잘까|잘지\s*말지|자도\s*될까|sleep\s*now\??)$/i,
    intent: 'daily',
    questionType: 'yes_no',
    subIntent: 'sleep',
    riskClass: 'medium'
  },
  {
    pattern: /^(연락\??|연락해도\s*돼\??|message\??|text\??)$/i,
    intent: 'relationship',
    questionType: 'yes_no',
    subIntent: 'pace',
    riskClass: 'medium'
  },
  {
    pattern: /^(사도\s*돼\??|사도\s*될까\??|buy\s*it\??)$/i,
    intent: 'finance',
    questionType: 'yes_no',
    subIntent: 'purchase',
    riskClass: 'medium'
  },
  {
    pattern: /^(가도\s*돼\??|갈까\??|move\??)$/i,
    intent: 'general',
    questionType: 'yes_no',
    subIntent: 'pace',
    riskClass: 'low'
  },
  {
    pattern: /^(today\??|today\s*luck\??|오늘\s*운세\??)$/i,
    intent: 'daily',
    questionType: 'forecast',
    subIntent: 'energy',
    riskClass: 'low'
  }
];

export function inferShortUtterance(context = '') {
  const normalized = normalize(context);
  if (!normalized) return null;
  const tokenCount = normalized.split(' ').filter(Boolean).length;
  const isShort = normalized.length <= 20 || tokenCount <= 4;
  if (!isShort) return null;

  for (const hint of SHORT_HINTS) {
    if (hint.pattern.test(normalized)) {
      return {
        ...hint,
        confidence: 0.84,
        source: 'short_utterance_rules'
      };
    }
  }

  if (/\?$|\?$/.test(normalized) && tokenCount <= 2) {
    return {
      intent: 'general',
      questionType: 'yes_no',
      subIntent: 'pace',
      riskClass: 'low',
      confidence: 0.61,
      source: 'short_utterance_rules'
    };
  }

  return null;
}
