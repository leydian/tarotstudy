type AnalyticsEvent =
  | 'question_submitted'
  | 'reading_result_shown'
  | 'result_tab_switched'
  | 'new_question_clicked';

type AnalyticsPayload = {
  questionType?: string;
  mode?: string;
  fallbackUsed?: boolean;
  spreadId?: string;
  tab?: 'report' | 'study';
};

export const trackEvent = (event: AnalyticsEvent, payload: AnalyticsPayload = {}) => {
  const record = {
    event,
    payload,
    timestamp: new Date().toISOString()
  };

  // Lightweight placeholder logger. Keep schema stable until external analytics is connected.
  if (typeof window !== 'undefined') {
    console.debug('[analytics]', record);
  }
};
