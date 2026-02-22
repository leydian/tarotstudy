import type {
  CardExplanation,
  Course,
  ImageAlertResult,
  ImageFallbackStats,
  ImageHealthCheckResult,
  LearningKpi,
  LearningFunnelResponse,
  Lesson,
  NextActionsResponse,
  QuestionUnderstandingV2,
  QuizPayload,
  QuizResult,
  ReviewInboxResponse,
  Spread,
  SpreadDrawResult,
  SpreadDrawResultV2,
  TarotCard,
  UserProgressSnapshot
} from '../types';

const ENV_API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').trim();

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function buildApiBaseCandidates() {
  if (typeof window === 'undefined') {
    const bases = ['http://127.0.0.1:8787', 'http://localhost:8787'];
    if (ENV_API_BASE) bases.unshift(trimSlash(ENV_API_BASE));
    return Array.from(new Set(bases));
  }

  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const envBase = ENV_API_BASE ? trimSlash(ENV_API_BASE) : '';
  return Array.from(new Set([
    envBase,
    '',
    trimSlash(`${protocol}//${host}:8787`),
    trimSlash(`${protocol}//localhost:8787`),
    trimSlash(`${protocol}//127.0.0.1:8787`),
  ]));
}

let resolvedApiBase: string | null = ENV_API_BASE ? trimSlash(ENV_API_BASE) : null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const headers = {
    ...(hasBody ? { 'content-type': 'application/json' } : {}),
    ...(init?.headers ?? {})
  };
  const bases = resolvedApiBase ? [resolvedApiBase] : buildApiBaseCandidates();
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed: ${res.status}`);
      }

      resolvedApiBase = base;
      return res.json() as Promise<T>;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith('Request failed:')) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Network request failed: ${lastError.message}`);
  }
  throw new Error('Network request failed');
}

export const api = {
  getCourses() {
    return request<Course[]>('/api/courses');
  },
  getSpreads() {
    return request<Spread[]>('/api/spreads');
  },
  drawSpread(input: {
    spreadId: string;
    variantId?: string | null;
    level: 'beginner' | 'intermediate';
    context?: string;
  }) {
    return request<SpreadDrawResult>(`/api/spreads/${input.spreadId}/draw`, {
      method: 'POST',
      body: JSON.stringify({
        variantId: input.variantId ?? '',
        level: input.level,
        context: input.context ?? ''
      })
    });
  },
  drawSpreadV2(input: {
    spreadId: string;
    variantId?: string | null;
    level: 'beginner' | 'intermediate';
    context?: string;
    styleMode?: 'neutral' | 'immersive_safe';
  }) {
    return request<SpreadDrawResultV2>(`/api/v2/spreads/${input.spreadId}/draw`, {
      method: 'POST',
      body: JSON.stringify({
        variantId: input.variantId ?? '',
        level: input.level,
        context: input.context ?? '',
        styleMode: input.styleMode ?? 'immersive_safe'
      })
    });
  },
  analyzeQuestionV2(input: { text: string; mode?: 'legacy' | 'hybrid' | 'shadow' }) {
    return request<{ ok: boolean; analysis: QuestionUnderstandingV2 }>('/api/v2/question-understanding', {
      method: 'POST',
      body: JSON.stringify({
        text: input.text,
        mode: input.mode ?? 'hybrid'
      })
    });
  },
  reportImageFallback(input: { stage: string; cardId?: string; source?: string }) {
    return request<{ ok: boolean }>('/api/telemetry/image-fallback', {
      method: 'POST',
      body: JSON.stringify({
        stage: input.stage,
        cardId: input.cardId ?? 'unknown',
        source: input.source ?? ''
      })
    });
  },
  reportSpreadEvent(input: {
    type: 'spread_drawn' | 'spread_review_saved';
    spreadId: string;
    level?: 'beginner' | 'intermediate';
    context?: string;
  }) {
    return request<{ ok: boolean }>('/api/telemetry/spread-events', {
      method: 'POST',
      body: JSON.stringify({
        type: input.type,
        spreadId: input.spreadId,
        level: input.level ?? 'beginner',
        context: input.context ?? ''
      })
    });
  },
  getImageFallbackStats() {
    return request<ImageFallbackStats>('/api/telemetry/image-fallback');
  },
  getImageHealthCheck() {
    return request<ImageHealthCheckResult>('/api/images/health-check');
  },
  getImageAlerts(params?: { failRateThreshold?: number; minChecks?: number }) {
    const search = new URLSearchParams();
    if (params?.failRateThreshold != null) search.set('failRateThreshold', String(params.failRateThreshold));
    if (params?.minChecks != null) search.set('minChecks', String(params.minChecks));
    const qs = search.toString();
    return request<ImageAlertResult>(`/api/images/alerts${qs ? `?${qs}` : ''}`);
  },
  getLearningKpi() {
    return request<LearningKpi>('/api/analytics/learning-kpi');
  },
  getLearningFunnel(window: '7d' | '30d' = '7d') {
    return request<LearningFunnelResponse>(`/api/analytics/funnel?window=${window}`);
  },
  getNextActions(userId: string) {
    return request<NextActionsResponse>(`/api/learning/next-actions?userId=${encodeURIComponent(userId)}`);
  },
  getReviewInbox(userId: string, params?: { spreadId?: string; limit?: number }) {
    const search = new URLSearchParams();
    search.set('userId', userId);
    if (params?.spreadId) search.set('spreadId', params.spreadId);
    if (params?.limit != null) search.set('limit', String(params.limit));
    return request<ReviewInboxResponse>(`/api/reviews/inbox?${search.toString()}`);
  },
  reportEventsBatch(events: Array<Record<string, unknown>>) {
    return request<{ ok: boolean; accepted: number; rejected: number }>('/api/events/batch', {
      method: 'POST',
      body: JSON.stringify({ events })
    });
  },
  getUserProgress(userId: string) {
    return request<UserProgressSnapshot>(`/api/progress/${encodeURIComponent(userId)}`);
  },
  syncUserProgress(userId: string, snapshot: UserProgressSnapshot) {
    return request<{ ok: boolean; userId: string; snapshot: UserProgressSnapshot }>(
      `/api/progress/${encodeURIComponent(userId)}/sync`,
      {
        method: 'POST',
        body: JSON.stringify(snapshot)
      }
    );
  },
  getLessons(courseId: string) {
    return request<Lesson[]>(`/api/courses/${courseId}/lessons`);
  },
  getCards(params?: { arcana?: string; suit?: string; difficulty?: string; q?: string }) {
    const search = new URLSearchParams();
    if (params?.arcana) search.set('arcana', params.arcana);
    if (params?.suit) search.set('suit', params.suit);
    if (params?.difficulty) search.set('difficulty', params.difficulty);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return request<TarotCard[]>(`/api/cards${qs ? `?${qs}` : ''}`);
  },
  getCard(cardId: string, context = '') {
    const search = new URLSearchParams();
    if (context.trim()) search.set('context', context.trim());
    const qs = search.toString();
    return request<TarotCard>(`/api/cards/${cardId}${qs ? `?${qs}` : ''}`);
  },
  explainCard(cardId: string, level: 'beginner' | 'intermediate', context = '') {
    return request<CardExplanation>(`/api/cards/${cardId}/explain`, {
      method: 'POST',
      body: JSON.stringify({ level, context })
    });
  },
  generateQuiz(input: {
    lessonId: string;
    level: 'beginner' | 'intermediate';
    count: number;
    quizMode?: 'guided' | 'exam' | 'auto';
    recentAccuracy?: number | null;
  }) {
    return request<QuizPayload>('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  gradeQuiz(input: { questions: QuizPayload['questions']; answers: Record<string, string> }) {
    return request<QuizResult>('/api/quiz/grade', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};
