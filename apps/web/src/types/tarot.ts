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
  apiUsed?: 'anthropic' | 'fallback' | 'none' | 'openai';
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  report?: {
    summary: string;
    verdict: {
      label: 'YES' | 'NO' | 'MAYBE';
      rationale: string;
      recommendedOption?: 'A' | 'B' | 'EITHER' | 'NONE';
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
  meta?: {
    requestId?: string;
    serverRevision?: string;
    serverTimestamp?: string;
    questionType?: string;
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
  };
}
