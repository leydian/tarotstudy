import type {
  CardExplanation,
  Course,
  ImageAlertResult,
  ImageFallbackStats,
  ImageHealthCheckResult,
  Lesson,
  QuizPayload,
  QuizResult,
  Spread,
  SpreadDrawResult,
  TarotCard
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
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
  getCard(cardId: string) {
    return request<TarotCard>(`/api/cards/${cardId}`);
  },
  explainCard(cardId: string, level: 'beginner' | 'intermediate', context = '') {
    return request<CardExplanation>(`/api/cards/${cardId}/explain`, {
      method: 'POST',
      body: JSON.stringify({ level, context })
    });
  },
  generateQuiz(input: { lessonId: string; level: 'beginner' | 'intermediate'; count: number }) {
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
