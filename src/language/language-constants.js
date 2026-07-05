/**
 * Language Constants for Distinguishing Learning from Stable Languages
 */

const LANGUAGE_STATUS = {
  ACTIVE_LEARNING: 'active_learning',
  STABLE: 'stable',
  DORMANT: 'dormant',
  PLANNED: 'planned'
};

const LANGUAGE_CATEGORIES = {
  DUOLINGO: 'duolingo',
  NATIVE: 'native',
  FLUENT: 'fluent',
  CONVERSATIONAL: 'conversational',
  LEARNING: 'learning'
};

const PRIORITY_WEIGHTS = {
  [LANGUAGE_STATUS.ACTIVE_LEARNING]: 0.9,
  [LANGUAGE_STATUS.STABLE]: 0.5,
  [LANGUAGE_STATUS.DORMANT]: 0.2,
  [LANGUAGE_STATUS.PLANNED]: 0.3
};

const DUOLINGO_PROGRESS = {
  BEGINNER: 'beginner',
  ELEMENTARY: 'elementary',
  INTERMEDIATE: 'intermediate',
  UPPER_INTERMEDIATE: 'upper_intermediate',
  ADVANCED: 'advanced',
  MASTER: 'master'
};

const DUOLINGO_SCORES = {
  [DUOLINGO_PROGRESS.BEGINNER]: 10,
  [DUOLINGO_PROGRESS.ELEMENTARY]: 30,
  [DUOLINGO_PROGRESS.INTERMEDIATE]: 50,
  [DUOLINGO_PROGRESS.UPPER_INTERMEDIATE]: 70,
  [DUOLINGO_PROGRESS.ADVANCED]: 85,
  [DUOLINGO_PROGRESS.MASTER]: 100
};

const LANGUAGE_RECOGNITION = {
  // Active learning languages (used in Duolingo)
  activeLearning: ['duolingo', 'active', 'learning', 'study'],
  
  // Stable languages (fluent/native)
  stable: ['native', 'fluent', 'mother_tongue', 'first_language'],
  
  // Dormant languages (studied but not used)
  dormant: ['dormant', 'inactive', 'used_to_know', 'forgotten'],
  
  // Planned languages (want to learn)
  planned: ['planned', 'want_to_learn', 'future', 'interested']
};

module.exports = {
  LANGUAGE_STATUS,
  LANGUAGE_CATEGORIES,
  PRIORITY_WEIGHTS,
  DUOLINGO_PROGRESS,
  DUOLINGO_SCORES,
  LANGUAGE_RECOGNITION
};