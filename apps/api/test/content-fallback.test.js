import test from 'node:test';
import assert from 'node:assert/strict';
import { getCardById } from '../src/data/cards.js';
import { buildFallbackExplanation, buildSpreadReading } from '../src/content.js';

function lines(text) {
  return String(text).split('\n').filter(Boolean);
}

test('buildFallbackExplanation enforces 3+ lines per section', () => {
  const card = getCardById('major-6');
  assert.ok(card, 'card should exist');

  const explanation = buildFallbackExplanation(card, 'beginner', '재회 가능성');
  const sections = Object.values(explanation.sections);

  for (const sectionText of sections) {
    assert.ok(lines(sectionText).length >= 3);
  }
});

test('buildFallbackExplanation uses relationship/career context branching', () => {
  const card = getCardById('minor-cups-three');
  assert.ok(card, 'card should exist');

  const reconnect = buildFallbackExplanation(card, 'beginner', '재회 연락 가능할까?');
  const conflict = buildFallbackExplanation(card, 'beginner', '연애 갈등이 심해요');
  const interview = buildFallbackExplanation(card, 'beginner', '면접 합격 가능성');

  assert.match(reconnect.sections.love, /재회\/회복 맥락/);
  assert.match(conflict.sections.love, /갈등 맥락/);
  assert.match(interview.sections.career, /면접\/지원 맥락/);
});

test('buildSpreadReading keeps learning persona separated', () => {
  const card = getCardById('minor-wands-five');
  assert.ok(card, 'card should exist');

  const reading = buildSpreadReading({
    card,
    spreadId: 'one-card',
    position: { name: '핵심 메시지' },
    orientation: 'upright',
    level: 'intermediate',
    context: '오늘 업무 우선순위',
    experimentVariant: 'A'
  });

  assert.ok(reading.learningPoint.includes('[학습 리더]'));
  assert.doesNotMatch(reading.coreMessage, /\[학습 리더\]/);
  assert.doesNotMatch(reading.interpretation, /\[학습 리더\]/);
});

test('buildFallbackExplanation applies strong context branching across sections', () => {
  const card = getCardById('major-1');
  assert.ok(card, 'card should exist');

  const general = buildFallbackExplanation(card, 'beginner', '');
  const career = buildFallbackExplanation(card, 'beginner', '이직을 언제할까?');

  assert.notEqual(career.sections.coreMeaning, general.sections.coreMeaning);
  assert.notEqual(career.sections.symbolism, general.sections.symbolism);
  assert.notEqual(career.sections.upright, general.sections.upright);
  assert.notEqual(career.sections.reversed, general.sections.reversed);
  assert.notEqual(career.sections.advice, general.sections.advice);
  assert.match(career.sections.career, /이직|취업|지원/);
  assert.match(career.sections.coreMeaning, /커리어|실행 지표|질문 맥락/);
});
