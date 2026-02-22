import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeQuestionContextSync,
  inferQuestionIntentEnhanced,
  parseChoiceOptions
} from '../src/question-understanding/index.js';

test('analyzeQuestionContextSync classifies core intents', () => {
  assert.equal(analyzeQuestionContextSync('헤어진 사람에게 다시 연락해도 될까?').intent, 'relationship-repair');
  assert.equal(analyzeQuestionContextSync('올해 이직 타이밍은 언제가 좋을까?').intent, 'career');
  assert.equal(analyzeQuestionContextSync('지금 큰 금액 결제를 진행해도 될까?').intent, 'finance');
  assert.equal(analyzeQuestionContextSync('오늘 운세는 어때?').intent, 'daily');
});

test('parseChoiceOptions extracts explicit A/B choices', () => {
  const p1 = parseChoiceOptions('샤넬을 살까 버버리를 살까?');
  assert.equal(p1.hasChoice, true);
  assert.equal(p1.mode, 'explicit_ab');
  assert.equal(p1.isPurchaseChoice, true);

  const p2 = parseChoiceOptions('강남에서 일할까 용인에서 일할까?');
  assert.equal(p2.hasChoice, true);
  assert.equal(p2.mode, 'explicit_ab');
  assert.equal(p2.isWorkChoice, true);
});

test('question type detects forecast and yes/no', () => {
  assert.equal(analyzeQuestionContextSync('오늘 운세는 전반적으로 어떤 흐름일까?').questionType, 'forecast');
  assert.equal(analyzeQuestionContextSync('지금 연락해도 될까?').questionType, 'yes_no');
});

test('inferQuestionIntentEnhanced keeps legacy-safe fallback', () => {
  assert.equal(inferQuestionIntentEnhanced('무슨 질문을 해야 할지 모르겠어').length > 0, true);
});
