import assert from 'node:assert/strict';
import { inferQuestionProfileV2 } from '../src/domains/reading/questionType.js';

const mixed = inferQuestionProfileV2({
  question: '이번달 이직과 연봉 협상 흐름이 궁금하고, 부모님 건강도 걱정돼',
  category: 'general',
  context: {
    recentTurns: [
      { role: 'user', text: '연봉 협상 준비 중이야' },
      { role: 'assistant', text: '핵심 변수는 일정과 협상 레버리지야', summary: '협상 우선순위 점검' }
    ]
  }
});

assert.ok(Array.isArray(mixed.analysis?.intentBreakdown), 'intentBreakdown should exist');
assert.ok((mixed.analysis?.intentBreakdown?.length || 0) > 0, 'intentBreakdown should not be empty');
assert.equal(typeof mixed.confidence, 'number', 'confidence should be number');
assert.equal(typeof mixed.lowConfidence, 'boolean', 'lowConfidence should be boolean');
assert.equal(typeof mixed.contextUsed, 'boolean', 'contextUsed should be boolean');

const legalCase = inferQuestionProfileV2({
  question: '계약 분쟁 소송을 진행해도 될까?',
  category: 'general'
});

assert.equal(legalCase.domainTag, 'legal');
assert.equal(legalCase.readingKind, 'general_reading', 'legal domain should force conservative readingKind');

console.log('Question profile v2 tests passed.');
