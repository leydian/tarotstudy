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
  apiUsed?: 'anthropic' | 'openai' | 'fallback' | 'none';
  fallbackUsed?: boolean;
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
    questionType?: string;
    fallbackReason?: string;
  };
}
