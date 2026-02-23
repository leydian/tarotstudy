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
  recommendedForPersona?: string[];
  estimatedMinutes?: number;
  difficultyConfidence?: number;
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
    sourceSpreadId?: string;
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
    tarotPersonaMeta?: {
      narrativePreset: 'short' | 'linked' | 'timeline';
      guardrailApplied: boolean;
      evidenceCount: number;
      tarotPurityScore: number;
      learningNaturalnessScore: number;
      repetitionRisk: 'low' | 'mid' | 'high';
      voiceProfile?: 'calm-oracle';
      storyDensity?: 'high' | 'mid' | 'low';
      symbolHits?: number;
      arcProgression?: 'scene-symbol-flow-action' | 'partial';
      personaApplied?: {
        group: 'user' | 'planner' | 'developer' | 'domain-expert';
        id: string;
        source: 'explicit' | 'inferred';
      };
      personaFitScore?: number;
      evidenceStructureScore?: number;
      actionClarityScore?: number;
    };
    learningPersonaMeta?: {
      sentenceCount: number;
      repetitionRisk: 'low' | 'mid' | 'high';
    };
  }>;
  summary: string;
  readingV2?: SpreadReadingV2;
  readingV3?: SpreadReadingV3;
  tonePayload?: SpreadTonePayload;
  readingModel?: ReadingModel;
  policyVersion?: string;
  policySource?: string;
}

export interface QuestionUnderstandingV2 {
  text: string;
  normalizedText: string;
  intent: string;
  subIntent: string;
  domain: string;
  questionType: 'yes_no' | 'forecast' | 'choice_ab' | 'open';
  timeHorizon: 'immediate' | 'week' | 'month' | 'year' | 'unspecified';
  riskClass: 'low' | 'medium' | 'high';
  confidence: number;
  confidenceBand: 'low' | 'medium' | 'high';
  choice: {
    mode: 'single' | 'explicit_ab';
    hasChoice: boolean;
    optionA: string;
    optionB: string;
    confidence?: number;
    isPurchaseChoice?: boolean;
    isLocationChoice?: boolean;
    isWorkChoice?: boolean;
  };
  entities: {
    timeHints: string[];
    domainHints: string[];
    locationCandidates: string[];
    productCandidates: string[];
  };
  source: string;
  templateVersion: string;
}

export interface SpreadReadingV2 {
  verdict: {
    label: '우세' | '조건부' | '박빙';
    confidenceBand: 'low' | 'medium' | 'high';
    cautionLevel: 'low' | 'medium' | 'high';
    reason: string;
  };
  narrative: {
    mode: string;
    opening: string;
    scene: string;
    bridge: string;
    closing: string;
  };
  evidence: Array<{
    position: string;
    card: string;
    orientation: string;
    keyword: string;
    reason: string;
  }>;
  actionPlan: {
    now: string;
    today: string;
    thisWeek: string;
  };
  reviewPlan: {
    metric: string;
    checkIn: string;
    failSafe: string;
  };
  safety: {
    disallowedToneTriggered: boolean;
    downtoned: boolean;
  };
  meta: {
    spreadId: string;
    spreadName: string;
    intent: string;
    subIntent: string;
    questionType: string;
    source: string;
    templateVersion: string;
  };
  summary: string;
}

export interface SpreadDrawResultV2 extends SpreadDrawResult {
  readingV2: SpreadReadingV2;
}

export interface SpreadReadingV3 {
  style: 'immersive';
  bridge: string;
  verdict: {
    label: 'yes' | 'conditional' | 'hold';
    sentence: string;
  };
  evidence: Array<{
    position: string;
    cardName: string;
    orientation: 'upright' | 'reversed';
    keyword: string;
    narrativeLine: string;
  }>;
  caution: string;
  action: {
    now: string;
    checkin: string;
  };
  closing: string;
  guardrails: {
    bannedAbsolute: true;
    duplicateRateMax: number;
  };
}

export interface SpreadTonePayload {
  v3Lines: {
    bridge: string;
    verdict: string;
    evidence: string[];
    caution: string;
    actionNow: string;
    checkin: string;
    closing: string;
  } | null;
  summaryLines: string[];
  meta: {
    source: 'readingV3' | 'summary' | 'readingModel-derived';
    version: string;
  };
}

export interface ReadingModelTurn {
  speaker: 'tarot' | 'learning';
  purpose: 'bridge' | 'verdict' | 'evidence' | 'caution' | 'action' | 'coach' | 'detail';
  text: string;
}

export interface ReadingModel {
  version: 'reading-model-v1';
  verdict: {
    label: 'yes' | 'conditional' | 'hold';
    sentence: string;
  };
  actions: {
    now: string;
    checkin: string;
    caution: string;
  };
  evidence: Array<{
    position: string;
    cardName: string;
    orientation: 'upright' | 'reversed';
    keyword: string;
    line: string;
  }>;
  channel: {
    card: {
      blocks: string[];
    };
    chatQuick: {
      turns: ReadingModelTurn[];
    };
    chatDetail: {
      turns: ReadingModelTurn[];
    };
    export: {
      summaryLines: string[];
      checklist: string[];
    };
  };
  meta: {
    source: 'readingV3' | 'summary' | 'model-native';
    version: 'reading-model-v1';
    timeHorizon: string;
    guardrailApplied: boolean;
    personaApplied: boolean;
    quality?: {
      naturalnessScore: number;
      specificityScore: number;
      repetitionScore: number;
      templateScore: number;
      grammarScore: number;
      redundancyScore: number;
      personaInjectionMode: 'style_profile';
      rewriteApplied: boolean;
    };
  };
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
  intentTag?: 'relationship' | 'career' | 'finance' | 'general';
  riskLevel?: 'low' | 'medium' | 'high';
  nextAction?: string;
  templateVersion?: string;
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
  reviewLatencyMedian?: number;
  completionByStage?: Array<{
    stage: string;
    completedLessons: number;
    totalLessons: number;
  }>;
  dropoffReasons?: Array<{
    reason: string;
    users: number;
  }>;
  generatedAt: string;
}

export interface NextAction {
  id: string;
  type: 'next_lesson' | 'quiz_review' | 'spread_review' | 'routine_resume';
  title: string;
  description: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface NextActionsResponse {
  userId: string;
  generatedAt: string;
  actions: NextAction[];
}

export interface ReviewInboxItem {
  id: string;
  spreadId: string;
  spreadName: string;
  variantName?: string | null;
  context: string;
  drawnAt: string;
  summaryPreview: string;
  suggestedAction: string;
}

export interface ReviewInboxResponse {
  generatedAt: string;
  total: number;
  items: ReviewInboxItem[];
}

export interface LearningFunnelResponse {
  generatedAt: string;
  window: '7d' | '30d';
  users: number;
  steps: Array<{
    id: string;
    label: string;
    users: number;
    conversionFromPrev: number;
  }>;
}
