export const translations = {
  en: {
    welcome: 'Welcome',
    description: 'Submit a math problem and let AI guide you through the solution step by step.',
    typeAnyProblem: 'Type any math problem',
    getInstantExplanations: 'Get instant explanations',
    learnStepByStep: 'Learn step by step',
    tryAskingAbout: 'Try asking about:',
    derivatives: 'Derivatives',
    equations: 'Equations',
    geometry: 'Geometry',
    calculus: 'Calculus',
    algebra: 'Algebra',
    newConversation: 'New conversation',
    discussions: 'Discussions',
    recent: 'Recent',
    noConversations: 'No conversations',
    loading: 'Loading...',
    settings: 'Settings',
    logout: 'Logout',
    connected: 'Connected',
    askQuestion: 'Ask your question here...',
    sendMessage: 'Send',
  },
  fr: {
    welcome: 'Bienvenue',
    description: 'Soumettez un problème mathématique et laissez l\'IA vous guider à travers la solution étape par étape.',
    typeAnyProblem: 'Tapez n\'importe quel problème mathématique',
    getInstantExplanations: 'Obtenez des explications instantanées',
    learnStepByStep: 'Apprenez étape par étape',
    tryAskingAbout: 'Essayez de demander à propos de:',
    derivatives: 'Dérivées',
    equations: 'Équations',
    geometry: 'Géométrie',
    calculus: 'Calcul',
    algebra: 'Algèbre',
    newConversation: 'Nouvelle conversation',
    discussions: 'Discussions',
    recent: 'Récent',
    noConversations: 'Aucune conversation',
    loading: 'Chargement...',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    connected: 'Connecté',
    askQuestion: 'Posez votre question ici...',
    sendMessage: 'Envoyer',
  },
};

export const getLanguage = (): keyof typeof translations => {
  const saved = localStorage.getItem('app-language');
  return (saved as keyof typeof translations) || 'fr';
};

export const getTranslation = (key: keyof typeof translations.en): string => {
  const language = getLanguage();
  return translations[language]?.[key] || translations.fr[key];
};
