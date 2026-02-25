export type TargetLanguage = 'pt-BR';

export type StartSessionRequest = {
  userId: string;
  topic?: string;
  targetLanguage: TargetLanguage;
};

export type StartSessionResponse = {
  sessionId: string;
  topic: string;
  targetWords: string[];
  level: 'L0';
};

export type TurnRequest = {
  sessionId: string;
  userInput: string;
  inputMode?: 'text' | 'voice';
};

export type TurnResponse = {
  sessionId: string;
  assistantTextPtBr: string;
  repairMode: boolean;
  targetHits: string[];
  complexity: 'simple' | 'simpler';
  providerUsed: 'primary' | 'fallback' | 'controller';
  intentAligned: boolean;
  repairAttempt: number;
};

export type EndSessionResponse = {
  sessionId: string;
  durationSec: number;
  topic: string;
  summary: string;
  exposureSummary: Array<{ lemma: string; count: number }>;
  sessionReport?: {
    repairTurns: number;
    avgAssistantWords: number;
    lowExposureHints: string[];
    promptTuningSuggestion: string;
  };
};
