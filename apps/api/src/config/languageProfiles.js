export const languageProfiles = {
  'pt-BR': {
    code: 'pt-BR',
    displayName: 'Portuguese (Brazil)',
    level0: {
      maxWordsSimple: 12,
      maxWordsRepair: 8,
      requireTargetLanguage: true
    },
    defaultTopics: ['comida', 'casa', 'rotina', 'família', 'trabalho'],
    targetWordBank: ['água', 'comer', 'casa', 'andar', 'gostar', 'querer', 'falar']
  }
};

export function getLanguageProfile(code) {
  return languageProfiles[code] || null;
}
