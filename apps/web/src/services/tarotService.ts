import { Card, Spread, ReadingResponse } from '../types/tarot';

const API_BASE = '/api';

export const tarotApi = {
  // 모든 카드 목록 조회
  async getCards(): Promise<Card[]> {
    const res = await fetch(`${API_BASE}/cards`);
    if (!res.ok) throw new Error('Failed to fetch cards');
    return res.json();
  },

  // 모든 스프레드 목록 조회
  async getSpreads(): Promise<Spread[]> {
    const res = await fetch(`${API_BASE}/spreads`);
    if (!res.ok) throw new Error('Failed to fetch spreads');
    return res.json();
  },

  async getQuestionProfile(question: string, category: string = 'general'): Promise<{
    questionType: 'binary' | 'relationship' | 'career' | 'emotional' | 'light' | 'deep';
    domainTag: 'health' | 'relationship' | 'career' | 'emotional' | 'lifestyle' | 'general';
    riskLevel: 'low' | 'medium' | 'high';
    readingKind: 'overall_fortune' | 'general_reading';
    fortunePeriod: 'today' | 'week' | 'month' | 'year' | null;
    recommendedSpreadId: string;
    targetCardCount: number;
  }> {
    const res = await fetch(`${API_BASE}/question-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, category })
    });
    if (!res.ok) throw new Error('Failed to infer question profile');
    return res.json();
  },

  // AI 리딩 요청
  async getReading(
    cardIds: string[],
    question: string,
    options?: {
      mode?: 'legacy' | 'hybrid';
      structure?: 'evidence_report';
      cardDraws?: Array<{ id: string; orientation?: 'upright' | 'reversed' }>;
      personaTone?: 'calm' | 'warm' | 'mystic';
      sessionContext?: {
        recentQuestions?: string[];
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
    const res = await fetch(`${API_BASE}/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds, question, ...options }),
    });
    if (!res.ok) throw new Error('Failed to get reading');
    return res.json();
  }
};
