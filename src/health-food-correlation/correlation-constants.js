/**
 * Health-Food Correlation Constants
 */

const ACTIVITY_LEVELS = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'lightly_active',
  MODERATELY_ACTIVE: 'moderately_active',
  VERY_ACTIVE: 'very_active',
  EXTREMELY_ACTIVE: 'extremely_active'
};

const CALORIE_THRESHOLDS = {
  [ACTIVITY_LEVELS.SEDENTARY]: { min: 0, max: 100 },
  [ACTIVITY_LEVELS.LIGHTLY_ACTIVE]: { min: 101, max: 300 },
  [ACTIVITY_LEVELS.MODERATELY_ACTIVE]: { min: 301, max: 600 },
  [ACTIVITY_LEVELS.VERY_ACTIVE]: { min: 601, max: 900 },
  [ACTIVITY_LEVELS.EXTREMELY_ACTIVE]: { min: 901, max: 2000 }
};

const PORTION_RECOMMENDATIONS = {
  [ACTIVITY_LEVELS.SEDENTARY]: {
    caloriesNeeded: 1800,
    portionSize: 'small',
    multiplier: 0.8,
    description: 'Low activity - smaller portions recommended'
  },
  [ACTIVITY_LEVELS.LIGHTLY_ACTIVE]: {
    caloriesNeeded: 2000,
    portionSize: 'medium-small',
    multiplier: 0.9,
    description: 'Light activity - moderate portions'
  },
  [ACTIVITY_LEVELS.MODERATELY_ACTIVE]: {
    caloriesNeeded: 2200,
    portionSize: 'medium',
    multiplier: 1.0,
    description: 'Moderate activity - balanced portions'
  },
  [ACTIVITY_LEVELS.VERY_ACTIVE]: {
    caloriesNeeded: 2500,
    portionSize: 'medium-large',
    multiplier: 1.1,
    description: 'High activity - larger portions'
  },
  [ACTIVITY_LEVELS.EXTREMELY_ACTIVE]: {
    caloriesNeeded: 3000,
    portionSize: 'large',
    multiplier: 1.3,
    description: 'Extreme activity - extra large portions'
  }
};

const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack'
};

const MEAL_CALORIE_DISTRIBUTION = {
  [MEAL_TYPES.BREAKFAST]: 0.25,
  [MEAL_TYPES.LUNCH]: 0.35,
  [MEAL_TYPES.DINNER]: 0.35,
  [MEAL_TYPES.SNACK]: 0.05
};

module.exports = {
  ACTIVITY_LEVELS,
  CALORIE_THRESHOLDS,
  PORTION_RECOMMENDATIONS,
  MEAL_TYPES,
  MEAL_CALORIE_DISTRIBUTION
};