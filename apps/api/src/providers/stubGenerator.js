export class StubGenerator {
  generate({ topic, targetWords, repairMode }) {
    const [w1, w2] = targetWords;
    if (repairMode) {
      return `Tudo bem. Vamos devagar. Hoje: ${topic}. Eu falo simples. ${w1} e ${w2}.`;
    }
    return `Hoje falamos sobre ${topic}. Eu uso ${w1} e ${w2} em frases curtas.`;
  }
}
