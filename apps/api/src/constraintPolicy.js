const COMPLEXITY_LIMITS = {
  simple: 12,
  simpler: 8
};

const MISUNDERSTANDING_CUES = [
  'não entendi',
  'nao entendi',
  'what',
  'não sei',
  'nao sei',
  'confuso',
  'hã',
  'huh'
];

export function detectMisunderstanding(input = '') {
  const t = input.toLowerCase();
  return MISUNDERSTANDING_CUES.some((cue) => t.includes(cue));
}

function trimToWordLimit(text, limit) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, limit).join(' ');
}

export function applyLevel0Policy({ rawText, repairMode }) {
  // Keep Portuguese-only behavior by generating PT text server-side in this stub.
  // In provider-backed mode, this function will validate and rewrite if needed.
  const complexity = repairMode ? 'simpler' : 'simple';
  const limited = trimToWordLimit(rawText, COMPLEXITY_LIMITS[complexity]);
  return {
    text: limited,
    complexity
  };
}

export function buildStubReply({ topic, targetWords, repairMode }) {
  const [w1, w2] = targetWords;
  if (repairMode) {
    return `Tudo bem. Vamos devagar. Hoje: ${topic}. Eu falo simples. ${w1} e ${w2}.`;
  }
  return `Hoje falamos sobre ${topic}. Eu uso ${w1} e ${w2} em frases curtas.`;
}
