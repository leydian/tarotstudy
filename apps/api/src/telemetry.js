import fs from 'node:fs';
import path from 'node:path';

function emptyImageStats() {
  return {
    totalEvents: 0,
    byStage: {},
    byCard: {},
    recent: []
  };
}

function emptySpreadStats() {
  return {
    totalEvents: 0,
    byType: {},
    bySpread: {},
    bySpreadType: {},
    recent: []
  };
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createTelemetryStore({ filePath = path.join(process.cwd(), 'tmp', 'telemetry-store.json') } = {}) {
  const saved = safeReadJson(filePath) || {};
  const state = {
    imageFallbackStats: { ...emptyImageStats(), ...(saved.imageFallbackStats || {}) },
    spreadTelemetryStats: { ...emptySpreadStats(), ...(saved.spreadTelemetryStats || {}) }
  };

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const payload = {
      imageFallbackStats: state.imageFallbackStats,
      spreadTelemetryStats: state.spreadTelemetryStats,
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  function recordImageFallbackEvent({ stage = 'unknown', cardId = 'unknown', source = '' }) {
    const stats = state.imageFallbackStats;
    stats.totalEvents += 1;
    stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;
    stats.byCard[cardId] = (stats.byCard[cardId] || 0) + 1;
    stats.recent.unshift({
      at: new Date().toISOString(),
      stage,
      cardId,
      source: String(source || '').slice(0, 180)
    });
    stats.recent = stats.recent.slice(0, 50);
    persist();
    return stats;
  }

  function recordSpreadEvent({ type = 'unknown', spreadId = 'unknown', level = 'unknown', context = '' }) {
    const stats = state.spreadTelemetryStats;
    stats.totalEvents += 1;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.bySpread[spreadId] = (stats.bySpread[spreadId] || 0) + 1;
    if (!stats.bySpreadType[spreadId]) stats.bySpreadType[spreadId] = {};
    stats.bySpreadType[spreadId][type] = (stats.bySpreadType[spreadId][type] || 0) + 1;
    stats.recent.unshift({
      at: new Date().toISOString(),
      type: String(type),
      spreadId: String(spreadId),
      level: String(level),
      context: String(context || '').slice(0, 180)
    });
    stats.recent = stats.recent.slice(0, 80);
    persist();
    return stats;
  }

  return {
    filePath,
    getImageFallbackStats: () => state.imageFallbackStats,
    getSpreadTelemetryStats: () => state.spreadTelemetryStats,
    recordImageFallbackEvent,
    recordSpreadEvent
  };
}
