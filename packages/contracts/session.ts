export type StartSessionRequest = {
  userId: string;
  topic?: string;
  targetLanguage: 'pt-BR';
};

export type StartSessionResponse = {
  sessionId: string;
  topic: string;
  targetWords: string[];
};

export type EndSessionResponse = {
  sessionId: string;
  exposureSummary: Array<{ lemma: string; count: number }>;
};
