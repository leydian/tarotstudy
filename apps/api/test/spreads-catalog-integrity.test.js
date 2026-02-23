import test from 'node:test';
import assert from 'node:assert/strict';
import { spreads } from '../src/data/spreads.js';

function ensureUnique(values, label) {
  const seen = new Set();
  const duplicates = [];
  values.forEach((value) => {
    if (seen.has(value)) duplicates.push(value);
    seen.add(value);
  });
  assert.equal(duplicates.length, 0, `${label} duplicates: ${duplicates.join(', ')}`);
}

function exactSignature(spread) {
  return JSON.stringify({
    cardCount: spread.cardCount,
    purpose: spread.purpose,
    whenToUse: spread.whenToUse,
    positions: spread.positions,
    layout: spread.layout,
    studyGuide: spread.studyGuide
  });
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()·/,-]/g, '')
    .replace(/스프레드|리딩|점검|핵심흐름|흐름점검|핵심/g, '');
}

test('spread catalog has unique ids and names', () => {
  ensureUnique(spreads.map((spread) => spread.id), 'spread id');
  ensureUnique(spreads.map((spread) => spread.name), 'spread name');
});

test('spread catalog has no exact duplicate definitions', () => {
  const signatures = spreads.map((spread) => exactSignature(spread));
  ensureUnique(signatures, 'spread definition');
});

test('one-card style spreads are not semantically duplicated', () => {
  const oneCardLike = spreads.filter((spread) => {
    const normalized = normalizeName(spread.name);
    return spread.cardCount === 1 || normalized.includes('원카드') || normalized.includes('onecard');
  });
  assert.equal(
    oneCardLike.length,
    1,
    `expected one one-card style spread, got: ${oneCardLike.map((s) => `${s.id}(${s.name})`).join(', ')}`
  );
});
