import { getLanguageProfile } from './config/languageProfiles.js';

const MISUNDERSTANDING_CUES = ['não entendi', 'nao entendi', 'não sei', 'nao sei', 'confuso', 'hã'];

export function detectMisunderstanding(input = '') {
  const t = input.toLowerCase();
  return MISUNDERSTANDING_CUES.some((cue) => t.includes(cue));
}

function trimToWordLimit(text, limit) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, limit).join(' ');
}

function ensureSentence(text) {
  let t = (text || '').trim();
  if (!t) return 'Tudo bem. Vamos continuar.';
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

function ensureMinWords(text, minWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= minWords) return text;
  return 'Tudo bem, vamos continuar agora.';
}

export function validateLevel0Output({ text, targetLanguage, repairMode }) {
  const profile = getLanguageProfile(targetLanguage);
  if (!profile) return { valid: false, reason: 'unknown_language_profile' };

  const maxWords = repairMode ? profile.level0.maxWordsRepair : profile.level0.maxWordsSimple;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) return { valid: false, reason: 'word_limit_exceeded' };
  if (words.length < profile.level0.minWords) return { valid: false, reason: 'too_short' };

  // Lightweight language guardrail placeholder.
  if (profile.level0.requireTargetLanguage && /\b(the|and|is|are|you|your)\b/i.test(text)) {
    return { valid: false, reason: 'likely_non_target_language' };
  }

  return { valid: true };
}

export function enforceLevel0Output({ rawText, targetLanguage, repairMode }) {
  const profile = getLanguageProfile(targetLanguage);
  if (!profile) {
    return {
      text: rawText,
      complexity: repairMode ? 'simpler' : 'simple',
      validation: { valid: false, reason: 'unknown_language_profile' }
    };
  }

  const complexity = repairMode ? 'simpler' : 'simple';
  const maxWords = repairMode ? profile.level0.maxWordsRepair : profile.level0.maxWordsSimple;
  let normalized = ensureSentence(rawText);
  normalized = trimToWordLimit(normalized, maxWords);
  normalized = ensureSentence(normalized);
  normalized = ensureMinWords(normalized, profile.level0.minWords);
  const validation = validateLevel0Output({ text: normalized, targetLanguage, repairMode });

  return { text: normalized, complexity, validation };
}
