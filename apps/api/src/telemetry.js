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

function listArchiveFiles(dirPath, baseName) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath)
      .filter((name) => name.startsWith(`${baseName}.`) && name.endsWith('.json'))
      .map((name) => path.join(dirPath, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {
    return [];
  }
}

export function createTelemetryStore({
  filePath = path.join(process.cwd(), 'tmp', 'telemetry-store.json'),
  maxFileBytes = 512 * 1024,
  maxAgeDays = 30,
  keepArchives = 8,
  archiveDir = path.join(process.cwd(), 'tmp', 'telemetry-archive')
} = {}) {
  const saved = safeReadJson(filePath) || {};
  const windowStartedAt = saved.windowStartedAt || saved.savedAt || new Date().toISOString();
  const state = {
    imageFallbackStats: { ...emptyImageStats(), ...(saved.imageFallbackStats || {}) },
    spreadTelemetryStats: { ...emptySpreadStats(), ...(saved.spreadTelemetryStats || {}) },
    windowStartedAt
  };

  function resetState() {
    state.imageFallbackStats = emptyImageStats();
    state.spreadTelemetryStats = emptySpreadStats();
    state.windowStartedAt = new Date().toISOString();
  }

  function shouldRotate() {
    const ageDays = (Date.now() - new Date(state.windowStartedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(maxAgeDays) && maxAgeDays > 0 && ageDays >= maxAgeDays) return true;
    try {
      if (!fs.existsSync(filePath)) return false;
      return fs.statSync(filePath).size >= maxFileBytes;
    } catch {
      return false;
    }
  }

  function rotateIfNeeded() {
    if (!shouldRotate()) return;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.mkdirSync(archiveDir, { recursive: true });
      if (fs.existsSync(filePath)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = path.basename(filePath, path.extname(filePath));
        const archivePath = path.join(archiveDir, `${baseName}.${stamp}.json`);
        fs.renameSync(filePath, archivePath);

        const archives = listArchiveFiles(archiveDir, baseName);
        for (const old of archives.slice(keepArchives)) {
          fs.unlinkSync(old);
        }
      }
    } catch {
      // Ignore rotation errors and continue writing current state.
    }
    resetState();
  }

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const payload = {
      imageFallbackStats: state.imageFallbackStats,
      spreadTelemetryStats: state.spreadTelemetryStats,
      windowStartedAt: state.windowStartedAt,
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  function recordImageFallbackEvent({ stage = 'unknown', cardId = 'unknown', source = '' }) {
    rotateIfNeeded();
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
    rotateIfNeeded();
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
