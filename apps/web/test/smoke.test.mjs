import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf-8');
}

test('App routes expose core pages', () => {
  const appSource = read('apps/web/src/App.tsx');
  const requiredRoutes = [
    "path=\"/\"",
    "path=\"/courses\"",
    "path=\"/library\"",
    "path=\"/spreads\"",
    "path=\"/dashboard\""
  ];

  requiredRoutes.forEach((route) => {
    assert.equal(appSource.includes(route), true, `missing route: ${route}`);
  });
});

test('Spreads page reports draw and review telemetry', () => {
  const source = read('apps/web/src/pages/SpreadsPage.tsx');
  assert.equal(source.includes("type: 'spread_drawn'"), true);
  assert.equal(source.includes("type: 'spread_review_saved'"), true);
  assert.equal(source.includes('api.reportSpreadEvent'), true);
});

test('Chat and card views expose export controls', () => {
  const chatSource = read('apps/web/src/pages/ChatSpreadPage.tsx');
  const spreadsSource = read('apps/web/src/pages/SpreadsPage.tsx');
  const exportSource = read('apps/web/src/lib/reading-export.ts');

  assert.equal(chatSource.includes('TXT 내보내기'), true);
  assert.equal(chatSource.includes('PDF 내보내기'), true);
  assert.equal(spreadsSource.includes('TXT 내보내기'), true);
  assert.equal(spreadsSource.includes('PDF 내보내기'), true);
  assert.equal(exportSource.includes('실행 체크리스트'), true);
  assert.equal(exportSource.includes('카드 근거'), true);
  assert.equal(chatSource.includes('chat-workbench'), true);
  assert.equal(chatSource.includes('chat-column-sidebar'), true);
  assert.equal(chatSource.includes('sidebarStarterPrompts'), true);
  assert.equal(chatSource.includes('const used = new Set(starterPrompts);'), true);
});

test('API client avoids /api/api path duplication and has request timeout', () => {
  const source = read('apps/web/src/lib/api.ts');
  assert.equal(source.includes('function buildRequestUrl'), true);
  assert.equal(source.includes("normalizedPath.startsWith(`${normalizedBase}/`)"), true);
  assert.equal(source.includes('const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);'), true);
});
