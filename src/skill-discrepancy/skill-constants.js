/**
 * Skill Discrepancy Constants for Language Skills
 */

const SOURCE_TYPES = {
  LINKEDIN: 'linkedin',
  DUOLINGO: 'duolingo',
  RESUME: 'resume',
  OTHER: 'other'
};

const SKILL_LEVELS = {
  BEGINNER: 'beginner',
  ELEMENTARY: 'elementary',
  INTERMEDIATE: 'intermediate',
  UPPER_INTERMEDIATE: 'upper_intermediate',
  ADVANCED: 'advanced',
  FLUENT: 'fluent',
  NATIVE: 'native'
};

const SKILL_SCORES = {
  [SKILL_LEVELS.BEGINNER]: 10,
  [SKILL_LEVELS.ELEMENTARY]: 25,
  [SKILL_LEVELS.INTERMEDIATE]: 45,
  [SKILL_LEVELS.UPPER_INTERMEDIATE]: 65,
  [SKILL_LEVELS.ADVANCED]: 80,
  [SKILL_LEVELS.FLUENT]: 90,
  [SKILL_LEVELS.NATIVE]: 100
};

const LABEL_TYPES = {
  STATED_PROFESSIONAL: 'stated_professional',
  ACTIVE_MEASURED: 'active_measured',
  DISCREPANCY: 'discrepancy',
  MATCH: 'match'
};

const DISCREPANCY_LEVELS = {
  NONE: 'none',
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe'
};

const CONFIDENCE_WEIGHTS = {
  [SOURCE_TYPES.LINKEDIN]: 0.6,
  [SOURCE_TYPES.DUOLINGO]: 0.85,
  [SOURCE_TYPES.RESUME]: 0.5,
  [SOURCE_TYPES.OTHER]: 0.3
};

module.exports = {
  SOURCE_TYPES,
  SKILL_LEVELS,
  SKILL_SCORES,
  LABEL_TYPES,
  DISCREPANCY_LEVELS,
  CONFIDENCE_WEIGHTS
};