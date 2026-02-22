import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTelemetryStore } from '../src/telemetry.js';

test('createTelemetryStore rotates oversized telemetry store and starts a new window', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-store-'));
  const filePath = path.join(tmpDir, 'telemetry-store.json');
  const archiveDir = path.join(tmpDir, 'archive');

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      windowStartedAt: '2025-01-01T00:00:00.000Z',
      imageFallbackStats: {
        totalEvents: 999,
        byStage: { render: 999 },
        byCard: { c1: 999 },
        recent: []
      },
      spreadTelemetryStats: {
        totalEvents: 999,
        byType: { spread_drawn: 999 },
        bySpread: { 'one-card': 999 },
        bySpreadType: { 'one-card': { spread_drawn: 999 } },
        recent: []
      },
      savedAt: '2025-01-01T00:00:00.000Z'
    }),
    'utf-8'
  );

  const store = createTelemetryStore({
    filePath,
    archiveDir,
    maxFileBytes: 32,
    maxAgeDays: 365,
    keepArchives: 2
  });

  store.recordSpreadEvent({
    type: 'spread_drawn',
    spreadId: 'one-card',
    level: 'beginner',
    context: '테스트'
  });

  const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assert.equal(saved.spreadTelemetryStats.totalEvents, 1);
  assert.equal(saved.spreadTelemetryStats.byType.spread_drawn, 1);

  const archives = fs.readdirSync(archiveDir).filter((name) => name.endsWith('.json'));
  assert.equal(archives.length, 1);
});
