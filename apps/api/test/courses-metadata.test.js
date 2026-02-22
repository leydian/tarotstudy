import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, lessonsByCourse } from '../src/data/courses.js';

test('courses define stable order and stageOrder metadata', () => {
  assert.ok(courses.length > 0, 'courses should not be empty');

  const orders = courses.map((course) => course.order);
  const uniqueOrders = new Set(orders);
  assert.equal(uniqueOrders.size, courses.length, 'course order should be unique');

  const sorted = [...courses].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sorted.length; i += 1) {
    assert.equal(sorted[i].order, i + 1, `order should be contiguous at index ${i}`);
    assert.ok(Number.isInteger(sorted[i].stageOrder), 'stageOrder should be integer');
    assert.ok(sorted[i].stageOrder >= 1 && sorted[i].stageOrder <= 7, 'stageOrder should be within known range');
  }
});

test('courses map to lessons consistently', () => {
  for (const course of courses) {
    const lessons = lessonsByCourse[course.id] || [];
    assert.ok(lessons.length > 0, `course should have lessons: ${course.id}`);
  }
});
