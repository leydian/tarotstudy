import { Card, Spread, ReadingResponse } from '../types/tarot';

const API_BASE = '/api';
let cardsCache: Card[] | null = null;
let spreadsCache: Spread[] | null = null;

const shouldFallbackToV1 = (status: number) => status >= 500;

export const tarotApi = {
  // 모든 카드 목록 조회
  async getCards(): Promise<Card[]> {
    if (cardsCache) return cardsCache;
    const res = await fetch(`${API_BASE}/cards`);
    if (!res.ok) throw new Error('Failed to fetch cards');
    const data = await res.json();
    cardsCache = data;
    return data;
  },

  // 모든 스프레드 목록 조회
  async getSpreads(): Promise<Spread[]> {
    if (spreadsCache) return spreadsCache;
    const res = await fetch(`${API_BASE}/spreads`);
    if (!res.ok) throw new Error('Failed to fetch spreads');
    const data = await res.json();
    spreadsCache = data;
    return data;
  },

  async getQuestionProfile(question: string, category: string = 'general'): Promise<{
    questionType: 'binary' | 'relationship' | 'career' | 'emotional' | 'light' | 'deep';
    domainTag: 'health' | 'relationship' | 'career' | 'emotional' | 'lifestyle' | 'general' | 'finance' | 'family' | 'education' | 'spirituality' | 'legal';
    riskLevel: 'low' | 'medium' | 'high';
    readingKind: 'overall_fortune' | 'general_reading';
    fortunePeriod: 'today' | 'week' | 'month' | 'year' | null;
    recommendedSpreadId: string;
    targetCardCount: number;
    confidence?: number;
    lowConfidence?: boolean;
    contextUsed?: boolean;
    analysis?: ReadingResponse['analysis'];
  }> {
    const payload = { question, category, context: null };
    try {
      const v2 = await fetch(`${API_BASE}/v2/question-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (v2.ok) return v2.json();
      if (!shouldFallbackToV1(v2.status)) {
        throw new Error('Failed to infer question profile');
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }

    const v1 = await fetch(`${API_BASE}/question-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, category })
    });
    if (!v1.ok) throw new Error('Failed to infer question profile');
    return v1.json();
  },

  // AI 리딩 요청
  async getReading(
    cardIds: string[],
    question: string,
    options?: {
      mode?: 'legacy' | 'hybrid';
      structure?: 'evidence_report';
      cardDraws?: Array<{ id: string; orientation?: 'upright' | 'reversed' }>;
      sessionContext?: {
        recentQuestions?: string[];
        recentTurns?: Array<{ role: 'user' | 'assistant'; text: string; summary?: string }>;
        recentMood?: string;
        questionProfile?: {
          questionType?: string;
          domainTag?: string;
          riskLevel?: string;
          readingKind?: string;
          fortunePeriod?: string | null;
          recommendedSpreadId?: string;
        };
      };
      timeframe?: string;
      category?: string;
      spreadId?: string;
      debug?: boolean;
    }
  ): Promise<ReadingResponse> {
    const payload = { cardIds, question, ...options };
    try {
      const v2 = await fetch(`${API_BASE}/v2/reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (v2.ok) return v2.json();
      if (!shouldFallbackToV1(v2.status)) {
        throw new Error('Failed to get reading');
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }

    const v1 = await fetch(`${API_BASE}/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!v1.ok) throw new Error('Failed to get reading');
    return v1.json();
  },

  async sendReadingFeedback(payload: {
    requestId?: string | null;
    rating: 'up' | 'down';
    reason?: string;
    questionType?: string;
    responseMode?: 'concise' | 'balanced' | 'creative' | string;
  }): Promise<{ ok: boolean }> {
    const res = await fetch(`${API_BASE}/reading/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to send reading feedback');
    return res.json();
  }
};
