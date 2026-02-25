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

export type EndSessionResponse = {
  sessionId: string;
  durationSec: number;
  exposureSummary: Array<{ lemma: string; count: number }>;
};
