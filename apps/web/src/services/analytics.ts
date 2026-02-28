type AnalyticsEvent =
  | 'question_submitted'
  | 'reading_result_shown'
  | 'result_tab_switched'
  | 'new_question_clicked';

type AnalyticsPayload = {
  questionType?: string;
  domainTag?: string;
  riskLevel?: string;
  readingKind?: string;
  fortunePeriod?: string | null;
  personaTone?: string;
  mode?: string;
  fallbackUsed?: boolean;
  spreadId?: string;
  tab?: 'report' | 'study';
  latencyMs?: number;
  errorCode?: string;
};

const STORAGE_KEY = 'arcana_analytics_session_id';
const API_BASE = '/api';

const makeSessionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const next = makeSessionId();
  window.sessionStorage.setItem(STORAGE_KEY, next);
  return next;
};

export const getAnalyticsSessionId = () => getSessionId();

export const trackEvent = (event: AnalyticsEvent, payload: AnalyticsPayload = {}) => {
  const body = {
    eventName: event,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    context: payload
  };

  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(
      `${API_BASE}/analytics`,
      new Blob([JSON.stringify(body)], { type: 'application/json' })
    );
    if (ok) return;
  }

  // Fall back to non-blocking fetch when sendBeacon is unavailable or rejected.
  void fetch(`${API_BASE}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true
  }).catch(() => undefined);

  const record = {
    event,
    payload,
    timestamp: new Date().toISOString()
  };

  // Local console trace remains useful during feature development.
  if (typeof window !== 'undefined') {
    console.debug('[analytics]', record);
  }
};
