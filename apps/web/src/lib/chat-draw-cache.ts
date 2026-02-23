import type { SpreadDrawResult } from '../types';

const CHAT_DRAW_CACHE_KEY = 'tarot:chat:lastDraw';

export function saveChatDrawCache(payload: SpreadDrawResult) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHAT_DRAW_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
}

export function loadChatDrawCache(options?: { drawnAt?: string; spreadId?: string }) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHAT_DRAW_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpreadDrawResult;
    if (!parsed || typeof parsed !== 'object') return null;
    if (options?.drawnAt && parsed.drawnAt !== options.drawnAt) return null;
    if (options?.spreadId && parsed.spreadId !== options.spreadId) return null;
    return parsed;
  } catch {
    return null;
  }
}

