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

test('question recommendation module defines 1000~10000 pool boundaries', () => {
  const source = read('apps/web/src/lib/question-recommendations.ts');
  assert.equal(source.includes('const MIN_POOL_SIZE = 1000;'), true);
  assert.equal(source.includes('const MAX_POOL_SIZE = 10000;'), true);
  assert.equal(source.includes('const DEFAULT_POOL_SIZE = 3000;'), true);
});

test('chat page consumes random question recommendation pool', () => {
  const source = read('apps/web/src/pages/ChatSpreadPage.tsx');
  assert.equal(source.includes('recommendRandomQuestions'), true);
  assert.equal(source.includes('poolSize: 3000'), true);
  assert.equal(source.includes('count: 6'), true);
});
