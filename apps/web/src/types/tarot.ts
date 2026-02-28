export interface Card {
  id: string;
  name: string;
  nameKo: string;
  image: string;
  summary: string;
  description: string;
  symbolism?: string;
  keywords: string[];
  meanings: {
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
  reversed: {
    summary: string;
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
  orientation?: 'upright' | 'reversed';
}

export interface Position {
  id: number;
  label: string;
  x: number;
  y: number;
}

export interface Spread {
  id: string;
  name: string;
  description: string;
  positions: Position[];
}

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  isAction?: boolean;
  cards?: Card[];
}

export interface ReadingResponse {
  conclusion: string;
  evidence: string[];
  action: string[];
  yesNoVerdict: 'YES' | 'NO' | 'MAYBE';
  mode?: 'legacy' | 'hybrid';
  apiUsed?: 'anthropic' | 'fallback' | 'none';
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  report?: {
    summary: string;
    verdict: {
      label: 'YES' | 'NO' | 'MAYBE';
      rationale: string;
      recommendedOption?: 'A' | 'B' | 'EITHER' | 'NONE';
    };
    fortune?: {
      period: 'today' | 'week' | 'month' | 'year';
      trendLabel: 'UP' | 'BALANCED' | 'CAUTION';
      energy: string;
      workFinance: string;
      love: string;
      healthMind: string;
      message: string;
    };
    evidence: Array<{
      cardId: string;
      positionLabel: string;
      claim: string;
      rationale: string;
      caution: string;
    }>;
    counterpoints: string[];
    actions: string[];
  };
  quality?: {
    consistencyScore: number;
    unsupportedClaimCount: number;
    regenerationCount: number;
  };
  analysis?: {
    intentBreakdown: Array<{
      intent: string;
      score: number;
      source: 'question' | 'context' | 'merged';
    }>;
    domainDecision: {
      domainTag: string;
      riskLevel: 'low' | 'medium' | 'high';
      confidence: number;
    };
    readingDecision: {
      readingKind: 'overall_fortune' | 'general_reading';
      recommendedSpreadId: string;
      responseMode: 'concise' | 'balanced' | 'creative' | null;
    };
    safety: {
      downgraded: boolean;
      reasons: string[];
    };
  };
  meta?: {
    requestId?: string;
    serverRevision?: string;
    serverTimestamp?: string;
    questionType?: string;
    domainTag?: 'health' | 'relationship' | 'career' | 'emotional' | 'lifestyle' | 'general' | 'finance' | 'family' | 'education' | 'spirituality' | 'legal';
    riskLevel?: 'low' | 'medium' | 'high';
    readingKind?: 'overall_fortune' | 'general_reading';
    fortunePeriod?: 'today' | 'week' | 'month' | 'year' | null;
    trendLabel?: 'UP' | 'BALANCED' | 'CAUTION';
    recommendedSpreadId?: string;
    responseMode?: 'concise' | 'balanced' | 'creative';
    path?: 'anthropic_primary' | 'anthropic_retry' | 'fallback';
    timings?: {
      totalMs: number;
      anthropicPrimaryMs?: number | null;
      anthropicRetryMs?: number | null;
      anthropicRepairMs?: number | null;
    };
    attempts?: {
      primary: {
        attempted: boolean;
        success: boolean;
        reason?: string | null;
        status?: number | null;
        durationMs?: number | null;
      };
      retry: {
        attempted: boolean;
        success: boolean;
        reason?: string | null;
        status?: number | null;
        durationMs?: number | null;
      };
      repair: {
        attempted: boolean;
        success: boolean;
        reason?: string | null;
        status?: number | null;
        durationMs?: number | null;
      };
    };
    failureStage?: 'network' | 'parse' | 'http' | 'model_unavailable' | 'engine' | 'validation' | 'unknown' | null;
    fallbackReason?: string | null;
    confidence?: number;
    lowConfidence?: boolean;
    contextUsed?: boolean;
    analysis?: ReadingResponse['analysis'];
    qualityFlags?: string[];
  };
}
