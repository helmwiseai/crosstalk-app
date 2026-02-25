import crypto from 'node:crypto';

const TOPICS = ['comida', 'casa', 'rotina', 'família', 'trabalho'];
const TARGET_WORD_BANK = ['água', 'comer', 'casa', 'andar', 'gostar', 'querer', 'falar'];

export class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  startSession({ userId, topic }) {
    const sessionId = crypto.randomUUID();
    const selectedTopic = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const targetWords = this.pickTargetWords(4);

    const session = {
      sessionId,
      userId,
      topic: selectedTopic,
      level: 'L0',
      targetWords,
      exposure: Object.fromEntries(targetWords.map((w) => [w, 0])),
      startedAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const durationSec = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const exposureSummary = Object.entries(session.exposure).map(([lemma, count]) => ({ lemma, count }));

    this.sessions.delete(sessionId);

    return {
      sessionId,
      durationSec,
      exposureSummary
    };
  }

  pickTargetWords(n) {
    return [...TARGET_WORD_BANK].sort(() => Math.random() - 0.5).slice(0, n);
  }
}
