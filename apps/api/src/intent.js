const QUESTION_PATTERNS = [
  { type: 'capability', re: /(você|voce).*(sabe|consegue|pode).*(fazer|cozinhar|assar)|\bcan you\b/i },
  { type: 'yes_no', re: /(você|voce).*(gosta|quer|tem)|\bdo you\b/i },
  { type: 'either_or', re: /\bou\b|\bor\b/i }
];

const AFFIRMATION_RE = /\b(sim|yes|yeah|yep|gosto|amo|legal|ok|beleza)\b/i;
const NEGATION_RE = /\b(não|nao|no|not)\b/i;
const CAPABILITY_RE = /\b(sab|consig|posso|can|can't|cannot|sei|não sei|nao sei)\b/i;

export function classifyAssistantIntent(text = '') {
  const t = text.toLowerCase();
  for (const p of QUESTION_PATTERNS) {
    if (p.re.test(t)) return p.type;
  }
  return 'statement';
}

export function isUserAligned({ intentType, userInput = '' }) {
  const u = userInput.toLowerCase();
  if (intentType === 'statement') return true;

  if (intentType === 'capability') {
    return CAPABILITY_RE.test(u) || NEGATION_RE.test(u) || AFFIRMATION_RE.test(u);
  }

  if (intentType === 'yes_no') {
    return AFFIRMATION_RE.test(u) || NEGATION_RE.test(u);
  }

  if (intentType === 'either_or') {
    // lightweight: assume alignment if user provides more than 1 token answer
    return u.trim().split(/\s+/).length >= 1;
  }

  return true;
}

export function buildRepairPrompt({ originalQuestion, attempt }) {
  if (attempt >= 3) {
    return 'Tudo bem, não é importante. Vamos continuar devagar.';
  }

  if (attempt === 2) {
    return `Quase. Minha pergunta é: ${originalQuestion} Responda sim ou não.`;
  }

  return `Não. Minha pergunta é: ${originalQuestion}`;
}
