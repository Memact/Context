/**
 * Health-Food Correlation Module - Main Export
 */

const HealthAnalyzer = require('./health-analyzer');
const FoodAdapter = require('./food-adapter');
const {
  ACTIVITY_LEVELS,
  CALORIE_THRESHOLDS,
  PORTION_RECOMMENDATIONS,
  MEAL_TYPES,
  MEAL_CALORIE_DISTRIBUTION
} = require('./correlation-constants');

module.exports = {
  HealthAnalyzer,
  FoodAdapter,
  ACTIVITY_LEVELS,
  CALORIE_THRESHOLDS,
  PORTION_RECOMMENDATIONS,
  MEAL_TYPES,
  MEAL_CALORIE_DISTRIBUTION
};