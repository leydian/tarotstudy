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

test('tarot leader readability rules stay enforced in chat renderer', () => {
  const source = read('apps/web/src/pages/ChatSpreadPage.tsx');
  assert.equal(source.includes('function compactTarotTurn'), true);
  assert.equal(source.includes("const maxSentences = purpose === 'detail' ? 3 : 2"), true);
  assert.equal(source.includes('raw.slice(0, maxChars)'), false, 'must not hard-cut sentence mid-way');
});

test('tarot leader avoids difficult stock terms and formal endings', () => {
  const source = read('apps/web/src/pages/ChatSpreadPage.tsx');
  const blocked = ['파급효과', '지속 가능한', '종합하면', '핵심 변수와 즉시 대응'];
  blocked.forEach((token) => {
    assert.equal(source.includes(token), true, `expected simplification mapping for ${token}`);
  });
  assert.equal(source.includes(".replace(/입니다\\./g, '이에요.')"), true);
  assert.equal(source.includes(".replace(/습니다\\./g, '어요.')"), true);
});
