import { getCardById, cards } from './data/cards.js';

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeQuestion(card, pool, level, index) {
  const distractors = shuffle(pool.filter((c) => c.id !== card.id)).slice(0, 3);
  const choices = shuffle([
    { cardId: card.id, text: card.keywords[0], correct: true },
    ...distractors.map((d) => ({ cardId: d.id, text: d.keywords[0], correct: false }))
  ]);

  const stem =
    level === 'intermediate'
      ? `${card.nameKo} 카드가 강조하는 핵심 에너지는 무엇인가요? (문맥 해석 기준)`
      : `${card.nameKo} 카드의 대표 키워드로 가장 적절한 것은?`;

  return {
    id: `q-${index + 1}-${card.id}`,
    type: 'multiple_choice',
    cardId: card.id,
    stem,
    choices: choices.map((choice, i) => ({
      id: `c-${i + 1}`,
      text: choice.text,
      correct: choice.correct
    })),
    explanation: `${card.nameKo}의 기본 키워드는 ${card.keywords.join(', ')}이며, 해석 시 스프레드 위치와 질문 맥락을 함께 고려합니다.`
  };
}

export function generateQuiz({ lessonCards, level = 'beginner', count = 5 }) {
  const basePool = lessonCards.length ? lessonCards : cards;
  const selected = shuffle(basePool).slice(0, Math.min(count, basePool.length));
  return selected.map((card, index) => makeQuestion(card, basePool, level, index));
}

export function gradeQuiz({ questions, answers }) {
  let score = 0;
  const details = questions.map((question) => {
    const answerId = answers[question.id];
    const selected = question.choices.find((choice) => choice.id === answerId);
    const correctChoice = question.choices.find((choice) => choice.correct);
    const correct = Boolean(selected?.correct);
    if (correct) score += 1;

    return {
      questionId: question.id,
      cardId: question.cardId,
      correct,
      selected: selected?.text ?? null,
      correctAnswer: correctChoice?.text ?? null,
      explanation: question.explanation
    };
  });

  const weakCardIds = details
    .filter((detail) => !detail.correct)
    .map((detail) => detail.cardId)
    .slice(0, 3);

  return {
    total: questions.length,
    score,
    percent: questions.length ? Math.round((score / questions.length) * 100) : 0,
    details,
    weakCards: weakCardIds.map((cardId) => getCardById(cardId)).filter(Boolean)
  };
}
