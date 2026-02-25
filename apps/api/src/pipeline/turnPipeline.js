import { detectMisunderstanding, enforceLevel0Output } from '../constraintPolicy.js';
import { buildTurnTelemetry } from '../telemetry.js';

export class TurnPipeline {
  constructor({ sessionRepository, generator }) {
    this.sessionRepository = sessionRepository;
    this.generator = generator;
  }

  run({ sessionId, userInput, inputMode = 'text' }) {
    const session = this.sessionRepository.getSession(sessionId);
    if (!session) return null;

    const repairMode = detectMisunderstanding(userInput);

    const rawGeneratedText = this.generator.generate({
      topic: session.topic,
      targetWords: session.targetWords,
      repairMode,
      targetLanguage: session.targetLanguage
    });

    const enforced = enforceLevel0Output({
      rawText: rawGeneratedText,
      targetLanguage: session.targetLanguage,
      repairMode
    });

    const targetHits = [];
    for (const word of session.targetWords) {
      if (enforced.text.toLowerCase().includes(word.toLowerCase())) {
        session.exposure[word] += 1;
        targetHits.push(word);
      }
    }

    session.turns.push({
      at: Date.now(),
      inputMode,
      repairMode,
      targetHitsCount: targetHits.length
    });

    const tokens = userInput.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 6);
    tokens.forEach((t) => session.summaryKeywords.add(t));

    session.telemetry.push(buildTurnTelemetry({ repairMode, targetHits }));
    this.sessionRepository.saveSession(session);

    return {
      sessionId,
      assistantTextPtBr: enforced.text,
      repairMode,
      targetHits,
      complexity: enforced.complexity,
      validation: enforced.validation
    };
  }
}
