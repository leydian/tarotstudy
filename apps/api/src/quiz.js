import { getCardById, cards } from './data/cards.js';

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueTexts(values) {
  return Array.from(new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean)));
}

function createChoices(correctText, distractorCandidates, fallbackCandidates = []) {
  const distractors = uniqueTexts(distractorCandidates)
    .filter((text) => text !== correctText)
    .slice(0, 3);
  const fallback = uniqueTexts(fallbackCandidates)
    .filter((text) => text !== correctText && !distractors.includes(text));
  while (distractors.length < 3 && fallback.length > 0) {
    distractors.push(fallback.shift());
  }

  const choices = shuffle([
    { text: correctText, correct: true },
    ...distractors.map((text) => ({ text, correct: false }))
  ]).slice(0, 4);

  return choices.map((choice, i) => ({
    id: `c-${i + 1}`,
    text: choice.text,
    correct: choice.correct
  }));
}

function buildRankStage(rank) {
  return ({
    Ace: '시작/점화',
    Two: '균형/선택',
    Three: '전개/확장',
    Four: '안정/유지',
    Five: '마찰/도전',
    Six: '조정/회복',
    Seven: '점검/전략',
    Eight: '가속/숙련',
    Nine: '정리/완성 직전',
    Ten: '완결/전환',
    Page: '탐색/학습',
    Knight: '추진/실행',
    Queen: '내면 안정/관리',
    King: '책임/운영'
  }[rank] ?? '상황 점검');
}

function buildSuitDomain(suitKo) {
  return ({
    완드: '행동/추진/에너지',
    컵: '감정/관계/교감',
    소드: '판단/의사소통/분석',
    펜타클: '현실/성과/자원'
  }[suitKo] ?? '큰 흐름/전환');
}

function buildQuestionFamilies(level) {
  const levelTag = level === 'intermediate' ? '중급' : '입문';
  return [
    {
      id: 'keyword_primary',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 카드의 대표 키워드로 가장 적절한 것은?`,
        correctText: card.keywords?.[0] || '핵심 흐름',
        explanation: `${card.nameKo}의 핵심 키워드는 ${card.keywords?.[0] || '핵심 흐름'}입니다.`
      })
    },
    {
      id: 'keyword_secondary',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 카드의 보조 키워드에 가까운 것은?`,
        correctText: card.keywords?.[1] || card.keywords?.[0] || '상황 점검',
        explanation: `${card.nameKo}는 보조 신호로 ${card.keywords?.[1] || card.keywords?.[0] || '상황 점검'}를 함께 읽습니다.`
      })
    },
    {
      id: 'keyword_context',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 카드를 상황에 연결할 때 가장 맞는 키워드 조합은?`,
        correctText: `${card.keywords?.[0] || '핵심'} + ${card.keywords?.[1] || card.keywords?.[0] || '보조'}`,
        explanation: `${card.nameKo}는 키워드 조합(${card.keywords?.[0] || '핵심'} + ${card.keywords?.[1] || card.keywords?.[0] || '보조'})으로 읽을 때 정확도가 높아집니다.`
      })
    },
    {
      id: 'arcana_type',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 카드의 분류로 올바른 것은?`,
        correctText: card.arcana === 'major' ? '메이저 아르카나' : '마이너 아르카나',
        fixedChoices: ['메이저 아르카나', '마이너 아르카나', '코트 카드 전용', '점성 카드'],
        explanation: `${card.nameKo}는 ${card.arcana === 'major' ? '메이저 아르카나' : '마이너 아르카나'}에 속합니다.`
      })
    },
    {
      id: 'suit_domain',
      variants: 1,
      appliesTo: (card) => card.arcana === 'minor',
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo}가 속한 수트의 핵심 영역은?`,
        correctText: buildSuitDomain(card.suitKo),
        fixedChoices: [
          '행동/추진/에너지',
          '감정/관계/교감',
          '판단/의사소통/분석',
          '현실/성과/자원'
        ],
        explanation: `${card.nameKo}(${card.suitKo})는 ${buildSuitDomain(card.suitKo)} 흐름을 담당합니다.`
      })
    },
    {
      id: 'rank_stage',
      variants: 1,
      appliesTo: (card) => card.arcana === 'minor',
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo}의 랭크 단계 해석으로 가장 적절한 것은?`,
        correctText: buildRankStage(card.rank),
        fixedChoices: [
          '시작/점화',
          '전개/확장',
          '완결/전환',
          '탐색/학습',
          '추진/실행',
          '책임/운영'
        ],
        explanation: `${card.nameKo}의 랭크(${card.rankKo})는 ${buildRankStage(card.rank)} 단계로 읽습니다.`
      })
    },
    {
      id: 'upright_action',
      variants: 2,
      appliesTo: () => true,
      build: (card, variant) => ({
        stem: `[${levelTag}] ${card.nameKo}가 정방향일 때 가장 먼저 할 행동으로 알맞은 것은?`,
        correctText: variant === 0
          ? `핵심 키워드(${card.keywords?.[0] || '핵심'})를 살리는 작은 실행 1개부터 시작`
          : `속도를 무리하게 높이지 말고 ${card.keywords?.[0] || '핵심'} 기준을 유지`,
        explanation: `${card.nameKo} 정방향은 과장보다 핵심 실행을 유지하는 해석이 안정적입니다.`
      })
    },
    {
      id: 'reversed_guard',
      variants: 2,
      appliesTo: () => true,
      build: (card, variant) => ({
        stem: `[${levelTag}] ${card.nameKo}가 역방향일 때 우선 점검할 항목은?`,
        correctText: variant === 0
          ? `지연/과속/누락 중 핵심 병목 1개`
          : `${card.keywords?.[0] || '핵심'} 관련 과잉 행동 1개를 줄이기`,
        explanation: `${card.nameKo} 역방향은 부정 단정보다 병목 신호를 먼저 점검해야 합니다.`
      })
    },
    {
      id: 'relationship_context',
      variants: 2,
      appliesTo: () => true,
      build: (card, variant) => ({
        stem: `[${levelTag}] ${card.nameKo}를 관계 질문에 적용할 때 가장 좋은 문장은?`,
        correctText: variant === 0
          ? `감정 추측보다 카드 근거(${card.keywords?.[0] || '핵심'})를 먼저 설명`
          : `대화 문장 1개와 피할 문장 1개를 분리해 전달`,
        explanation: `${card.nameKo}의 관계 해석은 감정 단정보다 근거 기반 전달이 정확합니다.`
      })
    },
    {
      id: 'career_context',
      variants: 2,
      appliesTo: () => true,
      build: (card, variant) => ({
        stem: `[${levelTag}] ${card.nameKo}를 일/학업 질문에 적용할 때 적절한 행동은?`,
        correctText: variant === 0
          ? `오늘 20~40분 내 완료 가능한 작업 1개를 먼저 고정`
          : `우선순위 1개와 보완 항목 1개를 함께 설정`,
        explanation: `${card.nameKo}의 커리어/학업 해석은 실행 단위를 작게 쪼개는 것이 핵심입니다.`
      })
    },
    {
      id: 'study_context',
      variants: 2,
      appliesTo: () => true,
      build: (card, variant) => ({
        stem: `[${levelTag}] ${card.nameKo}를 학습 질문으로 읽을 때 가장 좋은 루틴은?`,
        correctText: variant === 0
          ? '25분 학습 + 5분 복기 1세트 먼저 실행'
          : '오답 원인 1개 + 다음 보완 1개만 기록',
        explanation: `${card.nameKo} 학습 해석은 양보다 반복과 복기가 성과를 만듭니다.`
      })
    },
    {
      id: 'evidence_structure',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 리딩에서 근거 문장 구조로 가장 적절한 것은?`,
        correctText: `카드 키워드(${card.keywords?.[0] || '핵심'}) + 현재 상황 1개 + 실행 조건 1개`,
        explanation: `${card.nameKo}는 키워드-상황-실행 조건 3요소로 쓰면 과해석이 줄어듭니다.`
      })
    },
    {
      id: 'final_line',
      variants: 1,
      appliesTo: () => true,
      build: (card) => ({
        stem: `[${levelTag}] ${card.nameKo} 리딩의 마지막 문장으로 가장 좋은 것은?`,
        correctText: '오늘 언제/어디서/무엇을 할지 한 문장으로 확정',
        explanation: `${card.nameKo} 리딩은 실행 문장으로 마무리해야 체감 효과가 큽니다.`
      })
    }
  ];
}

function buildQuestionBankFromPool(pool, level) {
  const families = buildQuestionFamilies(level);
  const fallbackCandidates = [
    '오늘 20분 실행 1개 고정',
    '결론 1문장 + 근거 1문장',
    '적중 1줄 + 오차 1줄 복기',
    '감정 추측보다 근거 제시',
    '우선순위 1개 먼저 완료'
  ];
  const bank = [];

  for (const card of pool) {
    for (const family of families) {
      if (!family.appliesTo(card)) continue;
      const variants = Math.max(1, Number(family.variants || 1));
      for (let variant = 0; variant < variants; variant += 1) {
        const built = family.build(card, variant);
        const distractorCards = shuffle(pool.filter((c) => c.id !== card.id)).slice(0, 12);
        const distractorCandidates = [
          ...distractorCards.map((d) => d.keywords?.[0]).filter(Boolean),
          ...distractorCards.map((d) => d.keywords?.[1]).filter(Boolean),
          ...distractorCards.map((d) => `${d.keywords?.[0] || '핵심'} + ${d.keywords?.[1] || '보조'}`),
          ...(built.fixedChoices || [])
        ];

        const choices = built.fixedChoices
          ? createChoices(
            built.correctText,
            built.fixedChoices.filter((text) => text !== built.correctText),
            fallbackCandidates
          )
          : createChoices(built.correctText, distractorCandidates, fallbackCandidates);

        bank.push({
          id: `bank-${family.id}-v${variant + 1}-${card.id}`,
          archetypeId: family.id,
          cardId: card.id,
          stem: built.stem,
          choices,
          explanation: built.explanation,
          type: 'multiple_choice'
        });
      }
    }
  }

  return bank;
}

function expandQuizPool(basePool) {
  if (basePool.length >= 24) return basePool;
  const ids = new Set(basePool.map((card) => card.id));
  const expanded = [...basePool];

  for (const card of cards) {
    if (expanded.length >= 24) break;
    if (ids.has(card.id)) continue;
    const related = basePool.some((base) =>
      base.arcana === card.arcana || (base.suit && card.suit && base.suit === card.suit));
    if (!related) continue;
    expanded.push(card);
    ids.add(card.id);
  }

  for (const card of cards) {
    if (expanded.length >= 24) break;
    if (ids.has(card.id)) continue;
    expanded.push(card);
    ids.add(card.id);
  }

  return expanded;
}

function pickDiverseQuestions(bank, count) {
  const byArchetype = new Map();
  for (const question of bank) {
    if (!byArchetype.has(question.archetypeId)) byArchetype.set(question.archetypeId, []);
    byArchetype.get(question.archetypeId).push(question);
  }
  for (const list of byArchetype.values()) {
    const shuffled = shuffle(list);
    list.length = 0;
    list.push(...shuffled);
  }

  const orderedArchetypes = shuffle(Array.from(byArchetype.keys()));
  const selected = [];
  const selectedIds = new Set();
  let cursor = 0;
  let guard = 0;
  const maxGuard = bank.length * 3;

  while (selected.length < count && guard < maxGuard && orderedArchetypes.length > 0) {
    const archetype = orderedArchetypes[cursor % orderedArchetypes.length];
    const bucket = byArchetype.get(archetype) || [];
    const next = bucket.pop();
    if (next && !selectedIds.has(next.id)) {
      selected.push(next);
      selectedIds.add(next.id);
    }
    cursor += 1;
    guard += 1;
  }

  if (selected.length < count) {
    for (const item of shuffle(bank)) {
      if (selected.length >= count) break;
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
    }
  }

  return selected.slice(0, count);
}

function toQuizQuestion(question, index) {
  return {
    id: `q-${index + 1}-${question.archetypeId}-${question.cardId}`,
    type: 'multiple_choice',
    cardId: question.cardId,
    stem: question.stem,
    choices: question.choices.map((choice, i) => ({
      id: `c-${i + 1}`,
      text: choice.text,
      correct: choice.correct
    })),
    explanation: question.explanation
  };
}

export function generateQuiz({ lessonCards, level = 'beginner', count = 5 }) {
  const basePool = lessonCards.length ? lessonCards : cards;
  const expandedPool = expandQuizPool(basePool);
  const bank = buildQuestionBankFromPool(expandedPool, level);
  const safeCount = Math.max(1, Math.min(Number(count) || 5, 30));
  const selected = pickDiverseQuestions(bank, Math.min(safeCount, bank.length));
  return selected.map((question, index) => toQuizQuestion(question, index));
}

export function getQuizQuestionBankSize(level = 'beginner') {
  return buildQuestionBankFromPool(cards, level).length;
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
