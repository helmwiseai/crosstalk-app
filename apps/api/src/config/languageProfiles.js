export const languageProfiles = {
  'pt-BR': {
    code: 'pt-BR',
    displayName: 'Portuguese (Brazil)',
    level0: {
      maxWordsSimple: 24,
      maxWordsRepair: 16,
      minWords: 3,
      requireTargetLanguage: true
    },
    defaultTopics: ['comida', 'casa', 'rotina', 'família', 'trabalho'],
    targetWordBank: ['água', 'comer', 'casa', 'andar', 'gostar', 'querer', 'falar']
  }
};

export function getLanguageProfile(code) {
  return languageProfiles[code] || null;
}
