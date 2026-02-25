import { detectMisunderstanding, enforceLevel0Output } from '../constraintPolicy.js';
import { buildTurnTelemetry } from '../telemetry.js';

const MAX_REPAIR_ATTEMPTS = 3;

function isSocialSideStep(text = '') {
  return /(how are you|como vai|tudo bem\?|i'?m good|im good|thank you|obrigado|bom dia|boa noite)/i.test(text);
}

function chooseNextTopic(current) {
  const options = ['comida', 'casa', 'rotina', 'família', 'trabalho'];
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}

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
        activeRepair: (session.flow.repairAttempt || 0) > 0
      });
    } catch (_err) {
      decision = this.fallbackGenerator.generate({
        topic: session.topic,
        targetWords: session.targetWords,
        targetLanguage: session.targetLanguage,
        userInput,
        lastAssistantQuestion: session.flow.lastAssistantQuestion || '',
        repairAttempt: session.flow.repairAttempt || 0,
        activeRepair: (session.flow.repairAttempt || 0) > 0
      });
      providerUsed = 'fallback';
    }

    const shiftIntent = Boolean(decision.shiftIntent);
    const llmRepairNeeded = Boolean(decision.repairNeeded);
    const hasActiveQuestion = Boolean(session.flow.lastAssistantQuestion);
    const socialSideStep = isSocialSideStep(userInput);
    const repairMode = !shiftIntent && !socialSideStep && (misunderstandingCue || (hasActiveQuestion && llmRepairNeeded));

    const effectiveIntentAligned = hasActiveQuestion ? Boolean(decision.intentAligned) : true;

    if (repairMode) {
      session.flow.repairAttempt = (session.flow.repairAttempt || 0) + 1;
    } else {
      session.flow.repairAttempt = 0;
    }

    if (session.flow.repairAttempt >= MAX_REPAIR_ATTEMPTS) {
      decision.assistantTextPtBr = 'Tudo bem, não é importante. Vamos continuar com calma.';
      decision.nextQuestion = '';
      session.flow.repairAttempt = 0;
      providerUsed = 'controller';
    }

    if (shiftIntent) {
      const nextTopic = chooseNextTopic(session.topic);
      session.topic = nextTopic;
      session.summaryKeywords.add(nextTopic);
      decision.assistantTextPtBr = `Tudo bem, mudamos de assunto. Agora falamos de ${nextTopic}. O que você acha?`;
      decision.nextQuestion = 'O que você acha?';
      providerUsed = providerUsed === 'primary' ? 'controller' : providerUsed;
    }

    let enforced = enforceLevel0Output({
      rawText: decision.assistantTextPtBr,
      targetLanguage: session.targetLanguage,
      repairMode
    });

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

    session.turns.push({
      at: Date.now(),
      inputMode,
      repairMode,
      targetHitsCount: targetHits.length,
      providerUsed
    });

    const tokens = userInput.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 6);
    tokens.forEach((t) => session.summaryKeywords.add(t));

    session.telemetry.push(
      buildTurnTelemetry({
        repairMode,
        targetHits,
        providerUsed,
        intentAligned: effectiveIntentAligned,
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
      intentAligned: effectiveIntentAligned,
      repairAttempt: session.flow.repairAttempt || 0
    };
  }
}
