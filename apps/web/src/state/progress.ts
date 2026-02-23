import { create } from 'zustand';
import type { SpreadReviewRecord } from '../types';

interface ProgressState {
  completedLessons: string[];
  weakCardIds: string[];
  quizHistory: Array<{ lessonId: string; percent: number; date: string }>;
  spreadHistory: SpreadReviewRecord[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'synced';
  markLessonCompleted: (lessonId: string) => void;
  addQuizResult: (lessonId: string, percent: number, weakCardIds: string[]) => void;
  addSpreadReading: (record: SpreadReviewRecord) => void;
  reviewSpreadReading: (id: string, outcome: SpreadReviewRecord['outcome'], reviewNote?: string) => void;
  removeSpreadReading: (id: string) => void;
  removeSpreadReadingsBySpreadId: (spreadId: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'tarot-study-progress-v1';
const USER_ID_KEY = 'tarot-study-user-id-v1';
const SYNC_DEBOUNCE_MS = 1200;
type PersistSnapshot = Pick<ProgressState, 'completedLessons' | 'weakCardIds' | 'quizHistory' | 'spreadHistory'>;
let pendingSyncSnapshot: PersistSnapshot | null = null;
let syncTimer: number | null = null;
let syncInFlight = false;
let lifecycleBound = false;
let storeSet: ((partial: Partial<ProgressState> | ((state: ProgressState) => Partial<ProgressState>)) => void) | null = null;

function getLocalUserId() {
  const saved = localStorage.getItem(USER_ID_KEY);
  if (saved) return saved;
  const next = `local-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(USER_ID_KEY, next);
  return next;
}

export function getProgressUserId() {
  return getLocalUserId();
}

function loadInitial(): PersistSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLessons: [], weakCardIds: [], quizHistory: [], spreadHistory: [] };
    const parsed = JSON.parse(raw);
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      weakCardIds: Array.isArray(parsed.weakCardIds) ? parsed.weakCardIds : [],
      quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
      spreadHistory: Array.isArray(parsed.spreadHistory) ? parsed.spreadHistory : []
    };
  } catch {
    return { completedLessons: [], weakCardIds: [], quizHistory: [], spreadHistory: [] };
  }
}

function persistLocal(state: PersistSnapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildSyncPayload(state: PersistSnapshot) {
  return { ...state, updatedAt: new Date().toISOString() };
}

function sendSyncWithBeacon(state: PersistSnapshot) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;
  const userId = getLocalUserId();
  const payload = buildSyncPayload(state);
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  return navigator.sendBeacon(`/api/progress/${encodeURIComponent(userId)}/sync`, blob);
}

async function sendSync(state: PersistSnapshot, keepalive = false) {
  const userId = getLocalUserId();
  await fetch(`/api/progress/${encodeURIComponent(userId)}/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildSyncPayload(state)),
    keepalive
  });
}

async function flushSync({ keepalive = false }: { keepalive?: boolean } = {}) {
  if (syncInFlight || !pendingSyncSnapshot) return;
  
  if (storeSet) storeSet({ syncStatus: 'syncing' });

  const snapshot = pendingSyncSnapshot;
  pendingSyncSnapshot = null;
  syncInFlight = true;

  try {
    await sendSync(snapshot, keepalive);
    if (storeSet) storeSet({ syncStatus: 'synced' });
  } catch {
    pendingSyncSnapshot = snapshot;
    if (storeSet) storeSet({ syncStatus: 'error' });
  } finally {
    syncInFlight = false;
    if (pendingSyncSnapshot && syncTimer == null) {
      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        void flushSync();
      }, SYNC_DEBOUNCE_MS);
    }
  }
}

function bindLifecycleSync() {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;

  const flushWithBestEffort = () => {
    if (!pendingSyncSnapshot) return;
    if (sendSyncWithBeacon(pendingSyncSnapshot)) {
      pendingSyncSnapshot = null;
      return;
    }
    void flushSync({ keepalive: true });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushWithBestEffort();
  });
  window.addEventListener('pagehide', flushWithBestEffort);
  window.addEventListener('beforeunload', flushWithBestEffort);
}

function queueSync(state: PersistSnapshot) {
  bindLifecycleSync();
  pendingSyncSnapshot = state;

  if (syncTimer != null) {
    window.clearTimeout(syncTimer);
  }
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void flushSync();
  }, SYNC_DEBOUNCE_MS);
}

function persist(state: PersistSnapshot) {
  persistLocal(state);
  queueSync(state);
}

export const useProgressStore = create<ProgressState>((set, get) => {
  storeSet = set;
  return {
    syncStatus: 'idle',
    ...loadInitial(),
    markLessonCompleted: (lessonId) => {
      const next = Array.from(new Set([...get().completedLessons, lessonId]));
      const prev = get();
      const snapshot = {
        completedLessons: next,
        weakCardIds: prev.weakCardIds,
        quizHistory: prev.quizHistory,
        spreadHistory: prev.spreadHistory
      };
      persist(snapshot);
      set({ completedLessons: next });
    },
    addQuizResult: (lessonId, percent, weakCardIds) => {
      const prev = get();
      const mergedWeak = Array.from(new Set([...prev.weakCardIds, ...weakCardIds])).slice(-30);
      const nextHistory = [{ lessonId, percent, date: new Date().toISOString() }, ...prev.quizHistory].slice(0, 50);
      const snapshot = {
        completedLessons: prev.completedLessons,
        weakCardIds: mergedWeak,
        quizHistory: nextHistory,
        spreadHistory: prev.spreadHistory
      };
      persist(snapshot);
      set({ weakCardIds: mergedWeak, quizHistory: nextHistory });
    },
    addSpreadReading: (record) => {
      const prev = get();
      const spreadHistory = [record, ...prev.spreadHistory].slice(0, 60);
      persist({
        completedLessons: prev.completedLessons,
        weakCardIds: prev.weakCardIds,
        quizHistory: prev.quizHistory,
        spreadHistory
      });
      set({ spreadHistory });
    },
    reviewSpreadReading: (id, outcome, reviewNote = '') => {
      const prev = get();
      const spreadHistory = prev.spreadHistory.map((item) =>
        item.id === id
          ? { ...item, outcome, reviewNote, reviewedAt: new Date().toISOString() }
          : item
      );
      persist({
        completedLessons: prev.completedLessons,
        weakCardIds: prev.weakCardIds,
        quizHistory: prev.quizHistory,
        spreadHistory
      });
      set({ spreadHistory });
    },
    removeSpreadReading: (id) => {
      const prev = get();
      const spreadHistory = prev.spreadHistory.filter((item) => item.id !== id);
      persist({
        completedLessons: prev.completedLessons,
        weakCardIds: prev.weakCardIds,
        quizHistory: prev.quizHistory,
        spreadHistory
      });
      set({ spreadHistory });
    },
    removeSpreadReadingsBySpreadId: (spreadId) => {
      const prev = get();
      const spreadHistory = prev.spreadHistory.filter((item) => item.spreadId !== spreadId);
      persist({
        completedLessons: prev.completedLessons,
        weakCardIds: prev.weakCardIds,
        quizHistory: prev.quizHistory,
        spreadHistory
      });
      set({ spreadHistory });
    },
    reset: () => {
      const snapshot = { completedLessons: [], weakCardIds: [], quizHistory: [], spreadHistory: [] };
      persist(snapshot);
      set(snapshot);
    }
  };
});
