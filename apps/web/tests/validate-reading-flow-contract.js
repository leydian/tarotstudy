import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, '../src/pages/TarotMastery.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

const mustContain = (snippet, msg) => {
  assert.ok(source.includes(snippet), msg);
};

mustContain("const handleQuickFortune = async (question: string) =>", 'quick fortune handler should exist');
mustContain("await startRitual(question);", 'quick fortune should trigger ritual start');
mustContain("const handleStartRitual = async (e: React.FormEvent)", 'input submit handler should exist');
mustContain("setLoading(true);", 'ritual start should set loading=true');
mustContain("setStep('reading');", 'ritual flow should enter reading step');
mustContain("queueTimer(() => setStep('result'), 1500);", 'ritual flow should transition to result step');
mustContain("const handleReset = () =>", 'reset handler should exist');
mustContain("setStep('input');", 'reset should return to input step');
mustContain("setMessages([makeMsg('bot', '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?')]);", 'reset should restore baseline message');
mustContain("aria-live=\"polite\"", 'screen reader live region should exist');
mustContain("if (!currentSpread) {", 'spread fallback guard should exist');

console.log('Reading flow contract checks passed.');
