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

test('buildSpreadReading compacts one-card output for short questions', () => {
  const card = getCardById('minor-cups-three');
  assert.ok(card, 'card should exist');

  const reading = buildSpreadReading({
    card,
    spreadId: 'one-card',
    position: { name: '핵심 메시지' },
    orientation: 'upright',
    level: 'beginner',
    context: '지금 잘까?',
    experimentVariant: 'A'
  });

  assert.match(reading.coreMessage, /고민 중이시군요|질문이네요/);
  assert.match(reading.coreMessage, /결론:/);
  assert.match(reading.interpretation, /카드는 지금 질문에서/);
  assert.match(reading.interpretation, /답부터 말씀드리면|답부터 짧게 말씀드리면|그래서 결론은/);
  assert.match(reading.interpretation, /자는 쪽|바로 자지 말고|주무시는 쪽/);
  assert.match(reading.interpretation, /오늘의 테마는/);
  assert.match(reading.interpretation, /해보신 뒤 체감 변화|실행 후 20분/);
  assert.doesNotMatch(reading.interpretation, /카드 상징 키워드는/);
  assert.ok(reading.learningPoint.includes('[학습 리더]'));
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

test('buildFallbackExplanation keeps all sections context-sensitive across multiple card groups', () => {
  const sectionNames = ['coreMeaning', 'symbolism', 'upright', 'reversed', 'love', 'career', 'advice'];
  const contexts = {
    career: '이직 타이밍을 알고 싶어',
    reconnect: '재회 연락을 해도 될까?',
    finance: '재정 흐름과 지출 관리를 점검하고 싶어'
  };
  const cardIds = [
    'major-0',
    'major-14',
    'minor-cups-six',
    'minor-swords-two',
    'minor-pentacles-eight',
    'minor-wands-three'
  ];

  for (const cardId of cardIds) {
    const card = getCardById(cardId);
    assert.ok(card, `card should exist: ${cardId}`);

    const baseline = buildFallbackExplanation(card, 'intermediate', '');
    const career = buildFallbackExplanation(card, 'intermediate', contexts.career);
    const reconnect = buildFallbackExplanation(card, 'intermediate', contexts.reconnect);
    const finance = buildFallbackExplanation(card, 'intermediate', contexts.finance);

    for (const sectionName of sectionNames) {
      const baseSection = baseline.sections[sectionName];
      assert.ok(lines(baseSection).length >= 5, `baseline ${cardId}.${sectionName} should have 5+ lines`);

      assert.notEqual(
        career.sections[sectionName],
        baseSection,
        `career context should change ${cardId}.${sectionName}`
      );
      assert.notEqual(
        reconnect.sections[sectionName],
        baseSection,
        `reconnect context should change ${cardId}.${sectionName}`
      );
      assert.notEqual(
        finance.sections[sectionName],
        baseSection,
        `finance context should change ${cardId}.${sectionName}`
      );
    }
  }
});
