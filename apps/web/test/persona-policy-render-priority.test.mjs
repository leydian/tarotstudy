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

test('tone render keeps onepager priority order constant', () => {
  const source = read('apps/web/src/lib/tone-render.ts');
  assert.equal(source.includes("PERSONA_POLICY_RENDER_PRIORITY = ['readingModel', 'tonePayload', 'readingV3', 'summary']"), true);
  assert.equal(source.includes('export function resolveToneSource'), true);
});

test('persona onepager declares same render priority', () => {
  const doc = read('docs/persona-onepager.md');
  assert.equal(doc.includes('`readingModel -> tonePayload -> readingV3 -> summary`'), true);
});
