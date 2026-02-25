import crypto from 'node:crypto';
import { buildStubReply, detectMisunderstanding } from './constraintPolicy.js';

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
      startedAt: Date.now(),
      turns: [],
      summaryKeywords: new Set([selectedTopic])
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  handleTurn(sessionId, userInput) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const repairMode = detectMisunderstanding(userInput);
    const assistantRaw = buildStubReply({
      topic: session.topic,
      targetWords: session.targetWords,
      repairMode
    });

    const targetHits = [];
    for (const word of session.targetWords) {
      if (assistantRaw.toLowerCase().includes(word.toLowerCase())) {
        session.exposure[word] += 1;
        targetHits.push(word);
      }
    }

    session.turns.push({
      at: Date.now(),
      userInput,
      repairMode,
      targetHits
    });

    // summary data only (no full transcript persistence target for DB phase)
    const tokens = userInput.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 6);
    tokens.forEach((t) => session.summaryKeywords.add(t));

    return {
      session,
      assistantRaw,
      repairMode,
      targetHits
    };
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

  pickTargetWords(n) {
    return [...TARGET_WORD_BANK].sort(() => Math.random() - 0.5).slice(0, n);
  }
}
