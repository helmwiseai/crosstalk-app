import { detectMisunderstanding, enforceLevel0Output } from '../constraintPolicy.js';
import { buildIntentTelemetry, buildTurnTelemetry } from '../telemetry.js';
import { buildRepairPrompt, classifyAssistantIntent, isUserAligned } from '../intent.js';

const MAX_REPAIR_ATTEMPTS = 3;

export class TurnPipeline {
  constructor({ sessionRepository, generator, fallbackGenerator }) {
    this.sessionRepository = sessionRepository;
    this.generator = generator;
    this.fallbackGenerator = fallbackGenerator;
  }

  async run({ sessionId, userInput, inputMode = 'text' }) {
    const session = this.sessionRepository.getSession(sessionId);
    if (!session) return null;

    const previousIntent = session.flow?.lastAssistantIntent || 'statement';
    const intentAligned = isUserAligned({ intentType: previousIntent, userInput });
    const misunderstanding = detectMisunderstanding(userInput);
    const forcedRepair = !intentAligned || misunderstanding;

    if (forcedRepair) {
      session.flow.repairAttempt = (session.flow.repairAttempt || 0) + 1;
    } else {
      session.flow.repairAttempt = 0;
    }

    const shouldAbandon = session.flow.repairAttempt >= MAX_REPAIR_ATTEMPTS;

    let rawGeneratedText;
    let providerUsed = 'primary';

    if (shouldAbandon) {
      rawGeneratedText = 'Tudo bem, não é importante. Vamos continuar devagar no mesmo tema.';
      providerUsed = 'controller';
      session.flow.repairAttempt = 0;
    } else if (forcedRepair && session.flow.lastAssistantQuestion) {
      rawGeneratedText = buildRepairPrompt({
        originalQuestion: session.flow.lastAssistantQuestion,
        attempt: session.flow.repairAttempt
      });
      providerUsed = 'controller';
    } else {
      try {
        rawGeneratedText = await this.generator.generate({
          topic: session.topic,
          targetWords: session.targetWords,
          repairMode: false,
          targetLanguage: session.targetLanguage,
          userInput
        });
      } catch (_err) {
        rawGeneratedText = this.fallbackGenerator.generate({
          topic: session.topic,
          targetWords: session.targetWords,
          repairMode: false,
          targetLanguage: session.targetLanguage,
          userInput
        });
        providerUsed = 'fallback';
      }
    }

    const enforced = enforceLevel0Output({
      rawText: rawGeneratedText,
      targetLanguage: session.targetLanguage,
      repairMode: forcedRepair && !shouldAbandon
    });

    const targetHits = [];
    for (const word of session.targetWords) {
      if (enforced.text.toLowerCase().includes(word.toLowerCase())) {
        session.exposure[word] += 1;
        targetHits.push(word);
      }
    }

    const nextIntent = classifyAssistantIntent(enforced.text);
    if (nextIntent !== 'statement') {
      session.flow.lastAssistantQuestion = enforced.text;
      session.flow.lastAssistantIntent = nextIntent;
    }

    session.turns.push({
      at: Date.now(),
      inputMode,
      repairMode: forcedRepair,
      targetHitsCount: targetHits.length,
      providerUsed
    });

    const tokens = userInput.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 6);
    tokens.forEach((t) => session.summaryKeywords.add(t));

    session.telemetry.push(buildIntentTelemetry({ intentType: previousIntent, aligned: intentAligned }));
    session.telemetry.push(
      buildTurnTelemetry({
        repairMode: forcedRepair,
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
      repairMode: forcedRepair,
      targetHits,
      complexity: enforced.complexity,
      validation: enforced.validation,
      providerUsed,
      intentAligned,
      repairAttempt: session.flow.repairAttempt || 0
    };
  }
}
