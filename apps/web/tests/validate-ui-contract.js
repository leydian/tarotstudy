import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcRoot = path.resolve(__dirname, '../src/pages');

const read = (relativePath) => fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');

const tarotMastery = read('TarotMastery.tsx');
const cardsPage = read('Cards.tsx');

const quickFortunes = ['today', 'week', 'month', 'year'];
for (const id of quickFortunes) {
  assert.ok(
    tarotMastery.includes(`id: '${id}'`),
    `quick fortune button id "${id}" is missing`
  );
}

assert.ok(tarotMastery.includes("role=\"tablist\""), 'tablist role is missing in TarotMastery tabs');
assert.ok(tarotMastery.includes("role=\"tab\""), 'tab role is missing in TarotMastery tabs');
assert.ok(tarotMastery.includes("role=\"tabpanel\""), 'tabpanel role is missing in TarotMastery content');
assert.ok(
  tarotMastery.includes('{messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}'),
  'message key should use msg.id for stable reconciliation'
);

assert.ok(cardsPage.includes('aria-label="카드 검색"'), 'Cards search input aria-label is missing');
assert.ok(cardsPage.includes('aria-pressed={filter === key}'), 'Cards filter button aria-pressed is missing');

assert.ok(
  tarotMastery.includes("const handleQuickFortune = async (question: string) =>"),
  'quick fortune handler should exist'
);
assert.ok(
  tarotMastery.includes("setStep('reading')"),
  'reading step transition should exist'
);
assert.ok(
  tarotMastery.includes("setStep('result')"),
  'result step transition should exist'
);
assert.ok(
  tarotMastery.includes("const handleReset = () =>"),
  'reset handler should exist'
);
assert.ok(
  tarotMastery.includes("setStep('input')"),
  'reset should return to input step'
);
assert.ok(
  tarotMastery.includes("setMessages([makeMsg('bot', '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?')]);"),
  'reset baseline bot message should be restored'
);

console.log('Web UI contract regression checks passed.');
