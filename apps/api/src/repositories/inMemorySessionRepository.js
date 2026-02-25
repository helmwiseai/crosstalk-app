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

    this.sessions.delete(sessionId);

    return {
      sessionId,
      durationSec,
      topic: session.topic,
      summary,
      exposureSummary
    };
  }

  pickTargetWords(bank, n) {
    return [...bank].sort(() => Math.random() - 0.5).slice(0, n);
  }
}
