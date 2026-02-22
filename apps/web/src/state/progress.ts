import { create } from 'zustand';
import type { SpreadReviewRecord } from '../types';

interface ProgressState {
  completedLessons: string[];
  weakCardIds: string[];
  quizHistory: Array<{ lessonId: string; percent: number; date: string }>;
  spreadHistory: SpreadReviewRecord[];
  markLessonCompleted: (lessonId: string) => void;
  addQuizResult: (lessonId: string, percent: number, weakCardIds: string[]) => void;
  addSpreadReading: (record: SpreadReviewRecord) => void;
  reviewSpreadReading: (id: string, outcome: SpreadReviewRecord['outcome'], reviewNote?: string) => void;
  removeSpreadReading: (id: string) => void;
  removeSpreadReadingsBySpreadId: (spreadId: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'tarot-study-progress-v1';

function loadInitial(): Pick<ProgressState, 'completedLessons' | 'weakCardIds' | 'quizHistory' | 'spreadHistory'> {
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

function persist(state: Pick<ProgressState, 'completedLessons' | 'weakCardIds' | 'quizHistory' | 'spreadHistory'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useProgressStore = create<ProgressState>((set, get) => ({
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
}));
