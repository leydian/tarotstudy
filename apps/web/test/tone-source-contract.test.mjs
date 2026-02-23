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

test('canonical reading lines resolve source before branching', () => {
  const source = read('apps/web/src/lib/tone-render.ts');
  assert.equal(source.includes("const source = resolveToneSource(draw);"), true);
  assert.equal(source.includes("if (source === 'readingModel')"), true);
  assert.equal(source.includes("if (source === 'tonePayload')"), true);
  assert.equal(source.includes("if (source === 'readingV3' && draw.readingV3)"), true);
});

test('persona onepager and renderer keep same source priority order', () => {
  const source = read('apps/web/src/lib/tone-render.ts');
  const onepager = read('docs/persona-onepager.md');
  assert.equal(source.includes("['readingModel', 'tonePayload', 'readingV3', 'summary']"), true);
  assert.equal(onepager.includes('`readingModel -> tonePayload -> readingV3 -> summary`'), true);
});
