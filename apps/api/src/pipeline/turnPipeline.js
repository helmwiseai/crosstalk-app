import { detectMisunderstanding, enforceLevel0Output } from '../constraintPolicy.js';
import { buildTurnTelemetry } from '../telemetry.js';

export class TurnPipeline {
  constructor({ sessionRepository, generator, fallbackGenerator }) {
    this.sessionRepository = sessionRepository;
    this.generator = generator;
    this.fallbackGenerator = fallbackGenerator;
  }

  async run({ sessionId, userInput, inputMode = 'text' }) {
    const session = this.sessionRepository.getSession(sessionId);
    if (!session) return null;

    const misunderstandingCue = detectMisunderstanding(userInput);

    let decision;
    let providerUsed = 'primary';

    try {
      decision = await this.generator.generate({
        topic: session.topic,
        targetWords: session.targetWords,
        targetLanguage: session.targetLanguage,
        userInput,
        lastAssistantQuestion: session.flow.lastAssistantQuestion || '',
        repairAttempt: session.flow.repairAttempt || 0,
        activeRepair: misunderstandingCue
      });
    } catch (_err) {
      decision = this.fallbackGenerator.generate({
        topic: session.topic,
        targetWords: session.targetWords,
        targetLanguage: session.targetLanguage,
        userInput,
        lastAssistantQuestion: session.flow.lastAssistantQuestion || '',
        repairAttempt: session.flow.repairAttempt || 0,
        activeRepair: misunderstandingCue
      });
      providerUsed = 'fallback';
    }

    // Natural mode: LLM leads conversation flow.
    // Controller only enforces minimal hard guardrails.
    const repairMode = misunderstandingCue;

    let enforced = enforceLevel0Output({
      rawText: decision.assistantTextPtBr,
      targetLanguage: session.targetLanguage,
      repairMode
    });

    // If model output violates hard constraints, use safe fallback sentence.
    if (!enforced.validation?.valid) {
      const safeFallback = this.fallbackGenerator.generate({
        topic: session.topic,
        targetWords: session.targetWords,
        targetLanguage: session.targetLanguage,
        userInput,
        lastAssistantQuestion: session.flow.lastAssistantQuestion || '',
        repairAttempt: session.flow.repairAttempt || 0,
        activeRepair: repairMode
      });
      enforced = enforceLevel0Output({
        rawText: safeFallback.assistantTextPtBr,
        targetLanguage: session.targetLanguage,
        repairMode
      });
      providerUsed = 'fallback';
    }

    const targetHits = [];
    for (const word of session.targetWords) {
      if (enforced.text.toLowerCase().includes(word.toLowerCase())) {
        session.exposure[word] += 1;
        targetHits.push(word);
      }
    }

    session.flow.lastAssistantQuestion = decision.nextQuestion || '';
    session.flow.repairAttempt = repairMode ? (session.flow.repairAttempt || 0) + 1 : 0;

    session.turns.push({
      at: Date.now(),
      inputMode,
      repairMode,
      targetHitsCount: targetHits.length,
      providerUsed
    });

    const tokens = userInput.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 6);
    tokens.forEach((t) => session.summaryKeywords.add(t));

    const intentAligned = Boolean(decision.intentAligned ?? true);
    session.telemetry.push(
      buildTurnTelemetry({
        repairMode,
        targetHits,
        providerUsed,
        intentAligned,
        repairAttempt: session.flow.repairAttempt || 0
      })
    );

    this.sessionRepository.saveSession(session);

    return {
      sessionId,
      assistantTextPtBr: enforced.text,
      repairMode,
      targetHits,
      complexity: enforced.complexity,
      validation: enforced.validation,
      providerUsed,
      intentAligned,
      repairAttempt: session.flow.repairAttempt || 0
    };
  }
}
