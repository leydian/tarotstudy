import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { generateQuiz, getQuizQuestionBankSize } from '../src/quiz.js';

test('quiz question bank size is at least 1000', () => {
  const beginnerSize = getQuizQuestionBankSize('beginner');
  const intermediateSize = getQuizQuestionBankSize('intermediate');
  assert.ok(beginnerSize >= 1000, `beginner bank too small: ${beginnerSize}`);
  assert.ok(intermediateSize >= 1000, `intermediate bank too small: ${intermediateSize}`);
});

test('generateQuiz returns mixed archetypes and varied stems', () => {
  const lessonCards = cards.slice(0, 5);
  const questions = generateQuiz({ lessonCards, level: 'beginner', count: 12 });
  assert.equal(questions.length, 12);

  const archetypes = new Set(
    questions
      .map((q) => q.id.split('-').slice(2, -1).join('-'))
      .filter(Boolean)
  );
  const stems = new Set(questions.map((q) => q.stem));

  assert.ok(archetypes.size >= 5, `expected >=5 archetypes, got ${archetypes.size}`);
  assert.ok(stems.size >= 8, `expected >=8 unique stems, got ${stems.size}`);
});

test('generateQuiz aligns archetypes to lesson scope when lessonMeta is provided', () => {
  const lessonCards = cards.slice(0, 8);
  const questions = generateQuiz({
    lessonCards,
    level: 'beginner',
    count: 10,
    lessonMeta: { lessonId: 'fz-1' }
  });
  assert.equal(questions.length, 10);

  const allowed = new Set([
    'keyword_primary',
    'keyword_secondary',
    'upright_action',
    'reversed_guard',
    'final_line'
  ]);
  const archetypes = questions.map((q) => String(q.id).split('-')[2]);
  for (const archetype of archetypes) {
    assert.ok(allowed.has(archetype), `unexpected archetype for fz-1: ${archetype}`);
  }
});
