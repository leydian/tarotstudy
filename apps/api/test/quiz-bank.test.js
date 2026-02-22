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

