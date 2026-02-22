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
