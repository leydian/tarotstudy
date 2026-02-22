import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spreads } from '../src/data/spreads.js';

const root = process.cwd();
const casesPath = path.join(root, 'scripts', 'summary-regression-cases.json');

function readCases() {
  const payload = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  return Array.isArray(payload?.cases) ? payload.cases : [];
}

test('summary regression cases cover all spread IDs', () => {
  const cases = readCases();
  assert.ok(cases.length > 0, 'summary regression cases must not be empty');

  const spreadIds = new Set(spreads.map((item) => item.id));
  const caseSpreadIds = new Set(cases.map((item) => item.spreadId));

  for (const spreadId of spreadIds) {
    assert.ok(caseSpreadIds.has(spreadId), `missing regression case coverage for spread: ${spreadId}`);
  }

  for (const caseItem of cases) {
    assert.ok(spreadIds.has(caseItem.spreadId), `unknown spreadId in case: ${caseItem.spreadId}`);
    assert.ok(typeof caseItem.id === 'string' && caseItem.id.length > 0, 'each case must have id');
    assert.ok(typeof caseItem.context === 'string', `case ${caseItem.id} context must be string`);
    assert.ok(caseItem.expect && typeof caseItem.expect === 'object', `case ${caseItem.id} expect must exist`);
  }
});

test('summary regression cases have at least two scenarios per spread', () => {
  const cases = readCases();
  const perSpread = new Map();

  for (const item of cases) {
    perSpread.set(item.spreadId, (perSpread.get(item.spreadId) || 0) + 1);
  }

  for (const spread of spreads) {
    assert.ok((perSpread.get(spread.id) || 0) >= 2, `spread ${spread.id} must have at least 2 cases`);
  }
});
