const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 12000);
const ANTHROPIC_RETRY_TIMEOUT_MS = Number(process.env.ANTHROPIC_RETRY_TIMEOUT_MS || 7000);
const ANTHROPIC_REPAIR_TIMEOUT_MS = Number(process.env.ANTHROPIC_REPAIR_TIMEOUT_MS || 5000);
const extractJsonObject = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const mapAnthropicReason = (status) => {
  if (status === 404) return 'model_not_found';
  if (status === 401 || status === 403) return 'anthropic_auth_error';
  if (status === 429) return 'anthropic_rate_limited';
  if (status >= 500) return 'anthropic_http_error';
  return 'anthropic_http_error';
};

const shouldRetryAnthropic = (reason, status) => {
  if (reason === 'anthropic_timeout') return true;
  if (reason === 'anthropic_fetch_error') return true;
  if (reason === 'anthropic_parse_error') return true;
  if (reason === 'anthropic_http_error' && status >= 500) return true;
  return false;
};

const callAnthropic = async (prompt, options = {}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { report: null, reason: 'model_unavailable', status: null };

  const {
    maxTokens = 1100,
    timeoutMs = ANTHROPIC_TIMEOUT_MS,
    temperature = 0.45
  } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: DEFAULT_ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
          system: '아르카나 도서관의 사서로서 따뜻하고 신비로운 분위기를 유지하며 JSON만 반환하세요.'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Anthropic API] Error status=${response.status} model=${DEFAULT_ANTHROPIC_MODEL} body=${errorText}`
        );
        return { report: null, reason: mapAnthropicReason(response.status), status: response.status };
      }

      const data = await response.json();
      const report = extractJsonObject(data?.content?.[0]?.text);
      return { report, reason: report ? null : 'anthropic_parse_error', status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    console.error(
      `[Anthropic API] Fetch Error model=${DEFAULT_ANTHROPIC_MODEL} timeout_ms=${timeoutMs} timed_out=${isTimeout} message=${error?.message || 'unknown'} cause=${error?.cause?.code || error?.cause?.message || 'none'}`
    );
    const reason = isTimeout ? 'anthropic_timeout' : 'anthropic_fetch_error';
    return { report: null, reason, status: null };
  }
};


export {
  ANTHROPIC_REPAIR_TIMEOUT_MS,
  shouldRetryAnthropic,
  callAnthropic
};
