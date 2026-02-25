import crypto from 'node:crypto';
import { SessionRepository } from './sessionRepository.js';
import { getLanguageProfile } from '../config/languageProfiles.js';

export class InMemorySessionRepository extends SessionRepository {
  constructor() {
    super();
    this.sessions = new Map();
  }

  startSession({ userId, topic, targetLanguage }) {
    const profile = getLanguageProfile(targetLanguage);
    if (!profile) throw new Error(`Unsupported language profile: ${targetLanguage}`);

    const sessionId = crypto.randomUUID();
    const selectedTopic = topic || profile.defaultTopics[Math.floor(Math.random() * profile.defaultTopics.length)];
    const targetWords = this.pickTargetWords(profile.targetWordBank, 4);

    const session = {
      sessionId,
      userId,
      targetLanguage,
      topic: selectedTopic,
      level: 'L0',
      targetWords,
      exposure: Object.fromEntries(targetWords.map((w) => [w, 0])),
      startedAt: Date.now(),
      turns: [],
      summaryKeywords: new Set([selectedTopic]),
      telemetry: [],
      flow: {
        repairAttempt: 0,
        lastAssistantQuestion: '',
        lastAssistantIntent: 'statement'
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  saveSession(session) {
    this.sessions.set(session.sessionId, session);
    return session;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const durationSec = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const exposureSummary = Object.entries(session.exposure).map(([lemma, count]) => ({ lemma, count }));
    const summary = `Tema: ${session.topic}. Conversa curta com foco em ${[...session.summaryKeywords].slice(0, 8).join(', ')}.`;

    const repairTurns = (session.turns || []).filter((t) => t.repairMode).length;
    const avgWords = (() => {
      const turns = (session.turns || []).map((t) => (t.assistantTextPtBr || '').split(/\s+/).filter(Boolean).length);
      if (!turns.length) return 0;
      return Math.round(turns.reduce((a, b) => a + b, 0) / turns.length);
    })();

    const lowExposure = exposureSummary
      .filter((r) => r.count < 2)
      .map((r) => r.lemma)
      .slice(0, 5);

    this.sessions.delete(sessionId);

    return {
      sessionId,
      durationSec,
      topic: session.topic,
      summary,
      exposureSummary,
      sessionReport: {
        repairTurns,
        avgAssistantWords: avgWords,
        lowExposureHints: lowExposure,
        promptTuningSuggestion:
          repairTurns > 2
            ? 'Increase simplification and clarification examples in next prompt.'
            : 'Keep prompt style; tune focus words for better exposure spread.'
      }
    };
  }

  pickTargetWords(bank, n) {
    return [...bank].sort(() => Math.random() - 0.5).slice(0, n);
  }
}
