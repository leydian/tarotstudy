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

function createChoices(correctText, distractorCandidates, fallbackCandidates = [], targetChoiceCount = 4) {
  const safeCount = Math.max(2, Math.min(Number(targetChoiceCount) || 4, 4));
  const targetDistractors = Math.max(1, safeCount - 1);
  const distractors = uniqueTexts(distractorCandidates)
    .filter((text) => text !== correctText)
    .slice(0, targetDistractors);
  const fallback = uniqueTexts(fallbackCandidates)
    .filter((text) => text !== correctText && !distractors.includes(text));
  while (distractors.length < targetDistractors && fallback.length > 0) {
    distractors.push(fallback.shift());
  }

  const choices = shuffle([
    { text: correctText, correct: true },
    ...distractors.map((text) => ({ text, correct: false }))
  ]).slice(0, safeCount);

  return choices.map((choice, i) => ({
    id: `c-${i + 1}`,
    text: choice.text,
    correct: choice.correct
  }));
}

function sentenceifyChoiceText(text, card, level) {
  const normalized = String(text || '').trim();
  if (!normalized) return normalized;
  if (/[.!?]|다\)|다\./.test(normalized) || normalized.includes(' ')) return normalized;
  const lead = level === 'intermediate' ? '해석 우선순위는' : '우선 체크할 포인트는';
  return `${lead} "${normalized}"이며, 카드 근거 1개와 함께 말한다.`;
}

function buildDifficultyPolicy({ level = 'beginner', quizMode = 'guided', recentAccuracy = null } = {}) {
  const normalizedMode = ['guided', 'exam', 'auto'].includes(quizMode) ? quizMode : 'guided';
  const accuracy = Number.isFinite(Number(recentAccuracy)) ? Number(recentAccuracy) : null;
  const lowAccuracy = accuracy != null && accuracy < 70;
  const baseChoiceCount = level === 'beginner' ? 3 : 4;
  const modeChoiceCount = normalizedMode === 'guided' ? 3 : baseChoiceCount;
  const choiceCount = lowAccuracy ? 3 : Math.min(4, Math.max(3, modeChoiceCount));
  const hintsEnabled = normalizedMode !== 'exam' || lowAccuracy;
  const twoStepEnabled = true;
  return {
    quizMode: normalizedMode,
    lowAccuracy,
    choiceCount,
    hintsEnabled,
    twoStepEnabled
  };
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

function inferContextTagFromArchetype(archetypeId) {
  if (archetypeId.includes('relationship')) return '관계';
  if (archetypeId.includes('career')) return '커리어';
  if (archetypeId.includes('study')) return '학습';
  if (archetypeId.includes('reversed')) return '리스크';
  if (archetypeId.includes('suit') || archetypeId.includes('rank')) return '카드 구조';
  if (archetypeId.includes('arcana')) return '아르카나';
  return '기본 해석';
}

function inferHintByArchetype(archetypeId, card) {
  const key = card?.keywords?.[0] || '핵심';
  const map = {
    keyword_primary: `힌트: ${card.nameKo}의 대표 키워드(${key})를 먼저 떠올려 보세요.`,
    keyword_secondary: '힌트: 대표 키워드 옆에서 보조 역할을 하는 신호를 찾으세요.',
    keyword_context: '힌트: 키워드 2개를 결론+근거 구조로 연결해 보세요.',
    arcana_type: '힌트: 메이저(큰 흐름)와 마이너(실전 상황)를 먼저 구분하세요.',
    suit_domain: '힌트: 수트는 행동/감정/판단/현실 영역을 가릅니다.',
    rank_stage: '힌트: 랭크는 단계(시작-전개-완결)를 나타냅니다.',
    upright_action: '힌트: 정방향은 과속보다 안정된 실행 유지가 핵심입니다.',
    reversed_guard: '힌트: 역방향은 부정 단정보다 병목 1개를 먼저 찾는 것이 우선입니다.',
    relationship_context: '힌트: 관계 질문은 감정 추측보다 근거 설명이 먼저입니다.',
    career_context: '힌트: 커리어/학업은 오늘 끝낼 수 있는 작은 작업으로 쪼개 보세요.',
    study_context: '힌트: 학습은 오답 원인 1개 + 보완 1개가 가장 효율적입니다.',
    evidence_structure: '힌트: 카드 키워드 + 상황 사실 + 실행 조건 3요소를 맞추세요.',
    final_line: '힌트: 마지막 문장은 언제/어디서/무엇을 할지로 닫아보세요.'
  };
  return map[archetypeId] || '힌트: 카드 근거 1개를 먼저 잡고 행동 문장으로 이어보세요.';
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

function resolveLessonArchetypes(lessonMeta = {}) {
  const lessonId = String(lessonMeta.lessonId || '');
  const [series] = lessonId.split('-');
  const map = {
    fz: ['keyword_primary', 'keyword_secondary', 'upright_action', 'reversed_guard', 'final_line'],
    fm: ['arcana_type', 'keyword_context', 'upright_action', 'reversed_guard', 'evidence_structure'],
    bd: ['keyword_primary', 'keyword_context', 'final_line', 'study_context', 'evidence_structure'],
    bt: ['keyword_context', 'upright_action', 'reversed_guard', 'evidence_structure', 'final_line'],
    ubr: ['reversed_guard', 'upright_action', 'evidence_structure', 'final_line', 'keyword_secondary'],
    ubs: ['suit_domain', 'rank_stage', 'keyword_context', 'evidence_structure', 'final_line'],
    icb: ['relationship_context', 'career_context', 'study_context', 'evidence_structure', 'final_line'],
    icv: ['rank_stage', 'suit_domain', 'keyword_secondary', 'evidence_structure', 'final_line'],
    ich: ['evidence_structure', 'career_context', 'relationship_context', 'final_line', 'keyword_context'],
    uis: ['keyword_context', 'evidence_structure', 'upright_action', 'reversed_guard', 'final_line'],
    uip: ['evidence_structure', 'keyword_secondary', 'reversed_guard', 'final_line', 'keyword_context'],
    acs: ['arcana_type', 'keyword_context', 'evidence_structure', 'final_line', 'reversed_guard'],
    ayc: ['keyword_context', 'career_context', 'study_context', 'final_line', 'evidence_structure'],
    eql: ['evidence_structure', 'final_line', 'keyword_context', 'reversed_guard', 'upright_action']
  };
  return new Set(map[series] || []);
}

function buildQuestionBankFromPool(pool, level, policy = buildDifficultyPolicy({ level })) {
  const families = buildQuestionFamilies(level);
  const fallbackCandidates = [
    '오늘 할 행동 1개를 시간과 함께 정한다.',
    '결론 1문장과 근거 1문장을 함께 말한다.',
    '실행 후 적중 1줄과 오차 1줄을 복기한다.',
    '감정 추측보다 카드 근거를 먼저 제시한다.',
    '우선순위 1개를 먼저 완료한다.'
  ];
  const beginnerSafeDistractors = [
    '카드 뜻을 외우는 데만 집중하고 행동으로 연결하지 않는다.',
    '결론 없이 느낌 위주로 길게 설명한다.',
    '실행 시점 없이 추상적인 조언으로 마무리한다.',
    '복기 없이 다음 질문으로 바로 넘어간다.'
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
        const softenedDistractors = level === 'beginner'
          ? beginnerSafeDistractors
          : distractorCandidates;

        const choices = built.fixedChoices
          ? createChoices(
            sentenceifyChoiceText(built.correctText, card, level),
            built.fixedChoices.filter((text) => text !== built.correctText),
            fallbackCandidates.map((line) => sentenceifyChoiceText(line, card, level)),
            policy.choiceCount
          )
          : createChoices(
            sentenceifyChoiceText(built.correctText, card, level),
            softenedDistractors.map((text) => sentenceifyChoiceText(text, card, level)),
            fallbackCandidates.map((line) => sentenceifyChoiceText(line, card, level)),
            policy.choiceCount
          );

        const normalizedChoices = choices.map((choice) => ({
          ...choice,
          text: sentenceifyChoiceText(choice.text, card, level)
        }));
        const evidenceCorrect = `카드 키워드(${card.keywords?.[0] || '핵심'})와 질문 사실 1개를 연결했기 때문이다.`;
        const evidenceChoices = createChoices(
          evidenceCorrect,
          [
            '카드 근거 없이 직감만으로 결론을 낸 설명이기 때문이다.',
            '실행 시점 없이 단정 문장만 남겨서 설득력이 약하기 때문이다.',
            '질문 맥락과 무관한 일반론을 반복했기 때문이다.',
            ...(level === 'beginner' ? beginnerSafeDistractors : [])
          ],
          [
            '카드 근거 1개와 행동 1개가 같이 제시되어 있기 때문이다.',
            '결론과 근거가 같은 방향으로 정리되어 있기 때문이다.'
          ],
          policy.choiceCount
        );
        const contextTag = inferContextTagFromArchetype(family.id);

        bank.push({
          id: `bank-${family.id}-v${variant + 1}-${card.id}`,
          archetypeId: family.id,
          cardId: card.id,
          stem: built.stem,
          hint: inferHintByArchetype(family.id, card),
          contextTag,
          cardNameKo: card.nameKo,
          cardImageUrl: card.imageUrl,
          keywordCue: card.keywords?.slice(0, 2) || [],
          arcanaLabel: card.arcana === 'major' ? '메이저' : '마이너',
          orientationHint: family.id.includes('reversed')
            ? '역방향'
            : family.id.includes('upright')
              ? '정방향'
              : '공통',
          step1: {
            stem: built.stem,
            choices: normalizedChoices
          },
          step2: {
            stem: `[근거 선택] 방금 고른 결론이 타당한 이유로 가장 적절한 것은?`,
            choices: evidenceChoices
          },
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
    type: 'two_step_multiple_choice',
    cardId: question.cardId,
    stem: question.stem,
    hint: question.hint,
    contextTag: question.contextTag,
    cardNameKo: question.cardNameKo,
    cardImageUrl: question.cardImageUrl,
    keywordCue: question.keywordCue,
    arcanaLabel: question.arcanaLabel,
    orientationHint: question.orientationHint,
    steps: [
      {
        id: 'step-1',
        title: '1단계: 결론 선택',
        stem: question.step1.stem,
        choices: question.step1.choices.map((choice, i) => ({
          id: `s1-c-${i + 1}`,
          text: choice.text,
          correct: choice.correct
        }))
      },
      {
        id: 'step-2',
        title: '2단계: 근거 선택',
        stem: question.step2.stem,
        choices: question.step2.choices.map((choice, i) => ({
          id: `s2-c-${i + 1}`,
          text: choice.text,
          correct: choice.correct
        }))
      }
    ],
    explanation: question.explanation,
    scoring: { full: 1, partial: 0.5 }
  };
}

export function generateQuiz({
  lessonCards,
  lessonMeta = null,
  level = 'beginner',
  count = 5,
  quizMode = 'guided',
  recentAccuracy = null
}) {
  const policy = buildDifficultyPolicy({ level, quizMode, recentAccuracy });
  const basePool = lessonCards.length ? lessonCards : cards;
  const hasLessonScope = Boolean(lessonMeta && lessonMeta.lessonId && lessonCards.length);
  const expandedPool = hasLessonScope ? basePool : expandQuizPool(basePool);
  const bank = buildQuestionBankFromPool(expandedPool, level, policy);
  const allowedArchetypes = resolveLessonArchetypes(lessonMeta || {});
  const alignedBank = allowedArchetypes.size
    ? bank.filter((item) => allowedArchetypes.has(item.archetypeId))
    : bank;
  const safeCount = Math.max(1, Math.min(Number(count) || 5, 30));
  const sourceBank = alignedBank.length >= Math.min(safeCount, 5) ? alignedBank : bank;
  const selected = pickDiverseQuestions(sourceBank, Math.min(safeCount, sourceBank.length));
  return {
    policy,
    questions: selected.map((question, index) => toQuizQuestion(question, index))
  };
}

export function getQuizQuestionBankSize(level = 'beginner') {
  return buildQuestionBankFromPool(cards, level).length;
}

export function gradeQuiz({ questions, answers }) {
  let score = 0;
  const details = questions.map((question) => {
    const step1 = question.steps?.[0];
    const step2 = question.steps?.[1];
    const answer1 = answers[`${question.id}:step-1`];
    const answer2 = answers[`${question.id}:step-2`];
    const selected1 = step1?.choices?.find((choice) => choice.id === answer1) ?? null;
    const selected2 = step2?.choices?.find((choice) => choice.id === answer2) ?? null;
    const correctChoice1 = step1?.choices?.find((choice) => choice.correct) ?? null;
    const correctChoice2 = step2?.choices?.find((choice) => choice.correct) ?? null;
    const step1Correct = Boolean(selected1?.correct);
    const step2Correct = Boolean(selected2?.correct);
    const gainedScore = step1Correct && step2Correct ? 1 : (step1Correct || step2Correct ? 0.5 : 0);
    score += gainedScore;
    const correct = gainedScore === 1;

    return {
      questionId: question.id,
      cardId: question.cardId,
      score: gainedScore,
      correct,
      step1Correct,
      step2Correct,
      selected: {
        step1: selected1?.text ?? null,
        step2: selected2?.text ?? null
      },
      correctAnswer: {
        step1: correctChoice1?.text ?? null,
        step2: correctChoice2?.text ?? null
      },
      explanation: question.explanation
    };
  });

  const weakCardIds = details
    .filter((detail) => detail.score < 1)
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
