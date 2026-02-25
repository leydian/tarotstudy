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

  // AI 리딩 요청
  async getReading(cardIds: string[], question: string): Promise<ReadingResponse> {
    const res = await fetch(`${API_BASE}/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds, question }),
    });
    if (!res.ok) throw new Error('Failed to get reading');
    return res.json();
  }
};
