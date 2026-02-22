import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningFunnel, buildNextActions, buildReviewInbox } from '../src/learning-read-models.js';

test('buildNextActions returns high-priority next lesson and review actions', () => {
  const result = buildNextActions({
    userId: 'u1',
    snapshot: {
      completedLessons: ['l1'],
      quizHistory: [{ lessonId: 'l2', percent: 55, date: new Date().toISOString() }],
      spreadHistory: [{ id: 's1', spreadId: 'one-card', spreadName: '원카드', drawnAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString()
    },
    courses: [{ id: 'c1', stage: '기초 입문', stageOrder: 1, order: 1, track: '입문' }],
    lessonsByCourse: { c1: [{ id: 'l1', title: '레슨 1' }, { id: 'l2', title: '레슨 2' }] }
  });

  assert.equal(result.userId, 'u1');
  assert.ok(result.actions.some((item) => item.type === 'next_lesson'));
  assert.ok(result.actions.some((item) => item.type === 'quiz_review'));
  assert.ok(result.actions.some((item) => item.type === 'spread_review'));
});

test('buildReviewInbox returns only pending reviews', () => {
  const result = buildReviewInbox({
    snapshot: {
      spreadHistory: [
        { id: 'a', spreadId: 'one-card', spreadName: '원카드', drawnAt: new Date().toISOString(), summary: '요약 A' },
        { id: 'b', spreadId: 'three-card', spreadName: '3카드', drawnAt: new Date().toISOString(), summary: '요약 B', outcome: 'matched' }
      ]
    },
    limit: 10
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, 'a');
});

test('buildLearningFunnel computes conversion steps', () => {
  const now = new Date().toISOString();
  const result = buildLearningFunnel({
    window: '7d',
    progressRows: [
      {
        userId: 'u1',
        snapshot: {
          completedLessons: ['l1'],
          quizHistory: [{ lessonId: 'l1', percent: 80, date: now }],
          spreadHistory: [{ id: 's1', drawnAt: now, outcome: 'matched' }],
          updatedAt: now
        }
      },
      {
        userId: 'u2',
        snapshot: {
          completedLessons: [],
          quizHistory: [],
          spreadHistory: [],
          updatedAt: now
        }
      }
    ]
  });

  assert.equal(result.window, '7d');
  assert.equal(result.steps.length, 5);
  assert.equal(result.steps[0].id, 'active_users');
});
