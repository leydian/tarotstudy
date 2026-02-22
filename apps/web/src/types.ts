export type Arcana = 'major' | 'minor';

export interface TarotCard {
  id: string;
  number: number;
  arcana: Arcana;
  suit: string | null;
  suitKo?: string;
  rank: string | null;
  rankKo?: string;
  name: string;
  nameKo: string;
  keywords: string[];
  summary: string;
  imageUrl: string;
  imageSources?: string[];
  imageAttribution?: {
    sourceName: string;
    sourceUrl: string;
    licenseName: string;
    licenseUrl: string;
  };
  descriptions: {
    beginner: string;
    intermediate: string;
  };
  difficulty: 'beginner' | 'intermediate';
  relatedCardIds?: string[];
}

export interface TarotImageAttribution {
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
}

export interface Course {
  id: string;
  track: string;
  stage?: string;
  stageOrder: number;
  order: number;
  nextCourseId: string | null;
  title: string;
  description: string;
  level: string;
  lessonCount: number;
  lessonOutline: Array<{
    id: string;
    title: string;
  }>;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  cardIds: string[];
  detail?: {
    intro: string;
    storyNovel?: string[];
    learningGoals: string[];
    lessonFlow: string[];
    lessonBody: string[];
    coreConcepts: string[];
    coachingScript: string[];
    workedExample: string[];
    practiceChecklist: string[];
    commonMistakes: string[];
    assignment: string;
    completionCriteria: string[];
    reflectionQuestions: string[];
    onePassScript?: string[];
  };
  cards: Array<Pick<TarotCard, 'id' | 'name' | 'nameKo' | 'arcana' | 'suit'>>;
}

export interface CardExplanation {
  cardId: string;
  source: 'cache' | 'generated' | 'fallback';
  sections: {
    coreMeaning: string;
    symbolism: string;
    upright: string;
    reversed: string;
    love: string;
    career: string;
    advice: string;
  };
}

export interface QuizChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'two_step_multiple_choice';
  cardId: string;
  stem: string;
  hint?: string;
  contextTag?: string;
  cardNameKo?: string;
  cardImageUrl?: string;
  keywordCue?: string[];
  arcanaLabel?: string;
  orientationHint?: string;
  steps: Array<{
    id: 'step-1' | 'step-2';
    title: string;
    stem: string;
    choices: QuizChoice[];
  }>;
  explanation: string;
  scoring?: {
    full: number;
    partial: number;
  };
}

export interface QuizPayload {
  lessonId: string;
  level: 'beginner' | 'intermediate';
  quizMode?: 'guided' | 'exam' | 'auto';
  policy?: {
    quizMode: 'guided' | 'exam' | 'auto';
    lowAccuracy: boolean;
    choiceCount: number;
    hintsEnabled: boolean;
    twoStepEnabled: boolean;
  };
  questions: QuizQuestion[];
}

export interface QuizResult {
  total: number;
  score: number;
  percent: number;
  details: Array<{
    questionId: string;
    cardId: string;
    score: number;
    correct: boolean;
    step1Correct: boolean;
    step2Correct: boolean;
    selected: {
      step1: string | null;
      step2: string | null;
    };
    correctAnswer: {
      step1: string | null;
      step2: string | null;
    };
    explanation: string;
  }>;
  weakCards: TarotCard[];
}

export interface Spread {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate';
  cardCount: number;
  purpose: string;
  whenToUse: string[];
  positions: Array<{ name: string; meaning: string }>;
  variants?: Array<{
    id: string;
    name: string;
    positions: Array<{ name: string; meaning: string }>;
  }>;
  layout: {
    cols: number;
    rows: number;
    slots: Array<{ position: string; col: number; row: number; rotate?: number }>;
  };
  studyGuide: string[];
}

export interface SpreadDrawResult {
  spreadId: string;
  spreadName: string;
  variantId: string | null;
  variantName: string | null;
  level: 'beginner' | 'intermediate';
  context: string;
  readingExperiment?: 'A' | 'B';
  drawnAt: string;
  items: Array<{
    position: { name: string; meaning: string };
    orientation: 'upright' | 'reversed';
    card: Pick<TarotCard, 'id' | 'name' | 'nameKo' | 'imageUrl' | 'imageSources' | 'imageAttribution' | 'keywords'>;
    interpretation: string;
    coreMessage: string;
    learningPoint: string;
  }>;
  summary: string;
}

export interface SpreadReviewRecord {
  id: string;
  spreadId: string;
  spreadName: string;
  variantId: string | null;
  variantName: string | null;
  context: string;
  level: 'beginner' | 'intermediate';
  readingExperiment?: 'A' | 'B';
  drawnAt: string;
  summary: string;
  items: SpreadDrawResult['items'];
  outcome?: 'matched' | 'partial' | 'different';
  reviewNote?: string;
  reviewedAt?: string;
}

export interface ImageFallbackStats {
  totalEvents: number;
  byStage: Record<string, number>;
  byCard: Record<string, number>;
  recent: Array<{
    at: string;
    stage: string;
    cardId: string;
    source: string;
  }>;
}

export interface ImageHealthCheckResult {
  checkedAt: string;
  summary: {
    total: number;
    ok: number;
    fail: number;
  };
  checks: Array<{
    cardId: string;
    source: string;
    ok: boolean;
    status: number;
    latencyMs: number;
  }>;
}

export interface ImageAlertResult {
  alert: boolean;
  evaluatedAt: string;
  metrics: {
    totalChecks: number;
    failChecks: number;
    failRatePercent: number;
    fallbackRatePercent: number;
  };
  threshold: {
    failRateThreshold: number;
    minChecks: number;
  };
}

export interface UserProgressSnapshot {
  completedLessons: string[];
  weakCardIds: string[];
  quizHistory: Array<{ lessonId: string; percent: number; date: string }>;
  spreadHistory: SpreadReviewRecord[];
  updatedAt: string;
}

export interface RecommendationReason {
  stage: string;
  remainingLessons: number;
  message: string;
}

export interface LearningKpi {
  users: number;
  courseCompletionRate: number;
  quizToSpreadConversion: number;
  weeklyRetention: number;
  stageDropoff: Array<{
    stage: string;
    completionRate: number;
    dropoffFromPrev: number;
  }>;
  telemetry: {
    spreadEvents: number;
    spreadReviewSaved: number;
    spreadDrawn: number;
  };
  generatedAt: string;
}
