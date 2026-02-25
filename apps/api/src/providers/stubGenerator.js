export class StubGenerator {
  generate({ activeRepair }) {
    if (activeRepair) {
      return {
        assistantTextPtBr: 'Desculpa, não entendi bem. Pode repetir devagar?',
        intentAligned: true,
        repairNeeded: true,
        shiftIntent: false,
        nextQuestion: 'Pode repetir devagar?'
      };
    }

    return {
      assistantTextPtBr: 'Entendi. Conta mais um pouco, por favor.',
      intentAligned: true,
      repairNeeded: false,
      shiftIntent: false,
      nextQuestion: 'Conta mais um pouco?'
    };
  }
}
