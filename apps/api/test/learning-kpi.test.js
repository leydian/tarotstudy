import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningKpi } from '../src/learning-kpi.js';

test('buildLearningKpi returns summary with dropoff and conversion', () => {
  const courses = [
    { id: 'c1', stage: '기초 입문' },
    { id: 'c2', stage: '입문 실전' }
  ];
  const lessonsByCourse = {
    c1: [{ id: 'l1' }, { id: 'l2' }],
    c2: [{ id: 'l3' }, { id: 'l4' }]
  };
  const progressRows = [
    {
      userId: 'u1',
      snapshot: {
        completedLessons: ['l1', 'l2', 'l3'],
        quizHistory: [{ lessonId: 'l1', percent: 80, date: new Date().toISOString() }],
        spreadHistory: [{ id: 's1', drawnAt: new Date().toISOString() }]
      }
    },
    {
      userId: 'u2',
      snapshot: {
        completedLessons: ['l1'],
        quizHistory: [{ lessonId: 'l1', percent: 60, date: new Date().toISOString() }],
        spreadHistory: []
      }
    }
  ];

  const result = buildLearningKpi({ progressRows, courses, lessonsByCourse, spreadTelemetryStats: { totalEvents: 10, byType: { spread_drawn: 6, spread_review_saved: 4 } } });

  assert.equal(result.users, 2);
  assert.ok(result.courseCompletionRate >= 0);
  assert.ok(result.quizToSpreadConversion >= 0);
  assert.ok(result.stageDropoff.length >= 1);
  assert.equal(result.telemetry.spreadEvents, 10);
});
