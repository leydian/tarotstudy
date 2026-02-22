import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTarotPredictedQuestions,
  getTarotPredictedQuestionsByTopic,
  inferQuestionIntent
} from '../src/data/question-intents.js';

test('predicted question bank provides 10000 questions', () => {
  const questions = getTarotPredictedQuestions();
  assert.equal(questions.length, 10000);
  assert.equal(new Set(questions).size, questions.length, 'questions should be unique');
});

test('predicted question bank is grouped by topic with 10 items each', () => {
  const byTopic = getTarotPredictedQuestionsByTopic();
  const entries = Object.entries(byTopic);
  assert.equal(entries.length, 1000);
  for (const [, questions] of entries) {
    assert.equal(questions.length, 10);
  }
});

test('inferQuestionIntent classifies representative tarot questions', () => {
  assert.equal(inferQuestionIntent('헤어진 사람에게 다시 연락해도 될까?'), 'relationship-repair');
  assert.equal(inferQuestionIntent('주변 사람들이 요즘 나를 어떻게 볼까?'), 'social');
  assert.equal(inferQuestionIntent('올해 이직 타이밍은 언제가 좋을까?'), 'career');
  assert.equal(inferQuestionIntent('지금 상대와 관계를 이어가도 괜찮을까?'), 'relationship');
  assert.equal(inferQuestionIntent('지금 큰 금액 결제를 진행해도 될까?'), 'finance');
  assert.equal(inferQuestionIntent('이번 시험 준비 방향이 맞을까?'), 'study');
  assert.equal(inferQuestionIntent('요즘 컨디션이 떨어지는데 무리해서 운동해도 될까?'), 'health');
  assert.equal(inferQuestionIntent('오늘 운세는 전반적으로 어떤 흐름일까?'), 'daily');
  assert.equal(inferQuestionIntent('지금 내 삶의 흐름에서 가장 중요한 주제는 무엇일까? [장기 운영 · 운세]'), 'daily');
});

test('every predicted question is classifiable (non-general)', () => {
  const questions = getTarotPredictedQuestions();
  for (const question of questions) {
    assert.notEqual(inferQuestionIntent(question), 'general');
  }
});
