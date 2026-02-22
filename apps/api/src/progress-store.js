import fs from 'node:fs';
import path from 'node:path';

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function emptySnapshot() {
  return {
    completedLessons: [],
    weakCardIds: [],
    quizHistory: [],
    spreadHistory: [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeSnapshot(input = {}) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    completedLessons: Array.isArray(src.completedLessons) ? src.completedLessons.slice(0, 500) : [],
    weakCardIds: Array.isArray(src.weakCardIds) ? src.weakCardIds.slice(0, 200) : [],
    quizHistory: Array.isArray(src.quizHistory) ? src.quizHistory.slice(0, 200) : [],
    spreadHistory: Array.isArray(src.spreadHistory) ? src.spreadHistory.slice(0, 200) : [],
    updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : new Date().toISOString()
  };
}

export function createProgressStore({ filePath = path.join(process.cwd(), 'tmp', 'progress-store.json') } = {}) {
  const saved = safeReadJson(filePath) || {};
  const state = {
    users: saved.users && typeof saved.users === 'object' ? saved.users : {}
  };

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ users: state.users, savedAt: new Date().toISOString() }, null, 2), 'utf-8');
  }

  function getUserProgress(userId) {
    const key = String(userId || '').trim();
    if (!key) return emptySnapshot();
    return normalizeSnapshot(state.users[key] || emptySnapshot());
  }

  function syncUserProgress(userId, snapshot = {}) {
    const key = String(userId || '').trim();
    if (!key) throw new Error('userId is required');

    const normalized = normalizeSnapshot({ ...snapshot, updatedAt: new Date().toISOString() });
    state.users[key] = normalized;
    persist();
    return normalized;
  }

  function listAllProgress() {
    return Object.entries(state.users).map(([userId, snapshot]) => ({
      userId,
      snapshot: normalizeSnapshot(snapshot)
    }));
  }

  return {
    filePath,
    getUserProgress,
    syncUserProgress,
    listAllProgress
  };
}
