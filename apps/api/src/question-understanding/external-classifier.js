function parseJsonSafe(raw = '') {
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = String(raw || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced?.[1]) return null;
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }
}

export async function classifyQuestionExternal(context = '', options = {}) {
  const endpoint = String(options.endpoint || process.env.EXTERNAL_QUESTION_UNDERSTANDING_URL || '').trim();
  const apiKey = String(options.apiKey || process.env.EXTERNAL_QUESTION_UNDERSTANDING_KEY || '').trim();
  const timeoutMs = Number(options.timeoutMs || process.env.QUESTION_UNDERSTANDING_EXTERNAL_TIMEOUT_MS || 1400);
  if (!endpoint || !apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: context,
        task: 'question-understanding',
        format: 'json'
      })
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const parsed = typeof payload?.text === 'string' ? parseJsonSafe(payload.text) : payload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.intent || !parsed.questionType) return null;
    return {
      intent: parsed.intent,
      questionType: parsed.questionType,
      confidence: Number(parsed.confidence || 0.5),
      subIntent: parsed.subIntent || null,
      domain: parsed.domain || null,
      timeHorizon: parsed.timeHorizon || null,
      riskClass: parsed.riskClass || null,
      choice: parsed.choice || null,
      source: 'external_model'
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
