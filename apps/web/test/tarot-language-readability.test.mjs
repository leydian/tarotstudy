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
  assert.equal(source.includes("limitTarotSentenceDensity(String(text || ''), purpose === 'detail' ? 'detail' : 'quick')"), true);
  assert.equal(source.includes('normalizeTarotKorean'), true);
  assert.equal(source.includes('diversifyTarotOpening'), true);
});

test('tarot leader avoids difficult stock terms and formal endings', () => {
  const source = read('apps/web/src/lib/tarot-language.ts');
  const blocked = ['파급효과', '지속 가능한', '종합하면', '핵심 변수와 즉시 대응'];
  blocked.forEach((token) => {
    assert.equal(source.includes(token), true, `expected simplification mapping for ${token}`);
  });
  assert.equal(source.includes(".replace(/입니다\\./g, '이에요.')"), true);
  assert.equal(source.includes(".replace(/습니다\\./g, '어요.')"), true);
  assert.equal(source.includes('/영향를/g'), true);
  assert.equal(source.includes('/진행는/g'), true);
});

test('card view presenter applies same readability law', () => {
  const source = read('apps/web/src/pages/spreads-presenters.tsx');
  assert.equal(source.includes('function toReadableTarotDisplay'), true);
  assert.equal(source.includes("limitTarotSentenceDensity(normalized, mode === 'compact' ? 'cardCompact' : 'cardNormal')"), true);
  assert.equal(source.includes('normalizeTarotKorean'), true);
});
