import { getLanguageProfile } from './config/languageProfiles.js';

const MISUNDERSTANDING_CUES = ['não entendi', 'nao entendi', 'what', 'não sei', 'nao sei', 'confuso', 'hã', 'huh'];

export function detectMisunderstanding(input = '') {
  const t = input.toLowerCase();
  return MISUNDERSTANDING_CUES.some((cue) => t.includes(cue));
}

function trimToWordLimit(text, limit) {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, limit).join(' ');
}

export function validateLevel0Output({ text, targetLanguage, repairMode }) {
  const profile = getLanguageProfile(targetLanguage);
  if (!profile) return { valid: false, reason: 'unknown_language_profile' };

  const maxWords = repairMode ? profile.level0.maxWordsRepair : profile.level0.maxWordsSimple;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) return { valid: false, reason: 'word_limit_exceeded' };

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
  const trimmed = trimToWordLimit(rawText, maxWords);
  const validation = validateLevel0Output({ text: trimmed, targetLanguage, repairMode });

  return { text: trimmed, complexity, validation };
}
