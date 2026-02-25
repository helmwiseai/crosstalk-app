export class StubGenerator {
  generate({ topic, targetWords, userInput, lastAssistantQuestion, activeRepair }) {
    const [w1, w2] = targetWords;
    const lower = (userInput || '').toLowerCase();

    const shiftIntent = /(move on|move off|different topic|something else|change topic|muda de assunto|outro assunto)/i.test(lower);

    if (shiftIntent) {
      return {
        assistantTextPtBr: 'Tudo bem, podemos mudar de assunto. O que você quer agora?',
        intentAligned: true,
        repairNeeded: false,
        shiftIntent: true,
        nextQuestion: 'O que você quer agora?'
      };
    }

    if (activeRepair && lastAssistantQuestion) {
      return {
        assistantTextPtBr: `Quase. Minha pergunta: ${lastAssistantQuestion}`,
        intentAligned: false,
        repairNeeded: true,
        shiftIntent: false,
        nextQuestion: lastAssistantQuestion
      };
    }

    return {
      assistantTextPtBr: `Hoje falamos sobre ${topic}. Eu uso ${w1} e ${w2}. Você gosta disso?`,
      intentAligned: true,
      repairNeeded: false,
      shiftIntent: false,
      nextQuestion: 'Você gosta disso?'
    };
  }
}
