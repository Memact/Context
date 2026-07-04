/**
 * Health Analyzer - Analyzes health metrics and provides correlations
 */

const {
  ACTIVITY_LEVELS,
  CALORIE_THRESHOLDS,
  PORTION_RECOMMENDATIONS,
  MEAL_TYPES,
  MEAL_CALORIE_DISTRIBUTION
} = require('./correlation-constants');

class HealthAnalyzer {
  constructor(options = {}) {
    this.calorieThresholds = options.calorieThresholds || CALORIE_THRESHOLDS;
    this.portionRecommendations = options.portionRecommendations || PORTION_RECOMMENDATIONS;
    this.mealDistribution = options.mealDistribution || MEAL_CALORIE_DISTRIBUTION;
  }

  /**
   * Analyze health data and provide recommendations
   * @param {Object} healthData - Health metrics data
   * @param {Object} foodData - Food consumption data
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis result
   */
  analyze(healthData, foodData, options = {}) {
    const { caloriesBurned, steps, heartRate, activityLevel } = healthData;
    
    // Determine activity level
    const determinedLevel = this.determineActivityLevel(caloriesBurned, steps);
    const finalLevel = activityLevel || determinedLevel;
    
    // Get recommendations
    const recommendations = this.getRecommendations(finalLevel);
    
    // Analyze food consumption
    const foodAnalysis = this.analyzeFood(foodData, recommendations);
    
    // Calculate correlations
    const correlations = this.calculateCorrelations(healthData, foodData, recommendations);
    
    // Generate recommendations
    const suggestedMeals = this.suggestMeals(recommendations, foodData);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(healthData, foodData);

    return {
      activityLevel: finalLevel,
      caloriesBurned,
      recommendations,
      foodAnalysis,
      correlations,
      suggestedMeals,
      confidence,
      summary: this.generateSummary(finalLevel, recommendations, foodAnalysis),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determine activity level from metrics
   * @param {number} caloriesBurned - Calories burned
   * @param {number} steps - Steps taken
   * @returns {string} Activity level
   */
  determineActivityLevel(caloriesBurned, steps) {
    // Use calories first
    for (const [level, threshold] of Object.entries(this.calorieThresholds)) {
      if (caloriesBurned >= threshold.min && caloriesBurned <= threshold.max) {
        return level;
      }
    }

    // Fallback to steps
    if (!steps) return ACTIVITY_LEVELS.MODERATELY_ACTIVE;
    
    if (steps < 3000) return ACTIVITY_LEVELS.SEDENTARY;
    if (steps < 7000) return ACTIVITY_LEVELS.LIGHTLY_ACTIVE;
    if (steps < 10000) return ACTIVITY_LEVELS.MODERATELY_ACTIVE;
    if (steps < 15000) return ACTIVITY_LEVELS.VERY_ACTIVE;
    return ACTIVITY_LEVELS.EXTREMELY_ACTIVE;
  }

  /**
   * Get recommendations for activity level
   * @param {string} activityLevel - Activity level
   * @returns {Object} Recommendations
   */
  getRecommendations(activityLevel) {
    return this.portionRecommendations[activityLevel] || this.portionRecommendations[ACTIVITY_LEVELS.MODERATELY_ACTIVE];
  }

  /**
   * Analyze food data
   * @param {Object} foodData - Food consumption data
   * @param {Object} recommendations - Recommendations
   * @returns {Object} Food analysis
   */
  analyzeFood(foodData, recommendations) {
    const totalCalories = foodData.items?.reduce((sum, item) => sum + (item.calories || 0), 0) || 0;
    const totalPortions = foodData.items?.length || 0;
    
    const recommendedCalories = recommendations.caloriesNeeded;
    const calorieDifference = totalCalories - recommendedCalories;
    const isWithinBudget = totalCalories <= recommendedCalories;

    return {
      totalCalories,
      totalPortions,
      recommendedCalories,
      calorieDifference,
      isWithinBudget,
      status: this.getCalorieStatus(totalCalories, recommendedCalories),
      items: foodData.items || [],
      mealBreakdown: this.analyzeMeals(foodData.items || [])
    };
  }

  /**
   * Get calorie status
   * @param {number} actual - Actual calories
   * @param {number} recommended - Recommended calories
   * @returns {string} Status
   */
  getCalorieStatus(actual, recommended) {
    const ratio = actual / recommended;
    if (ratio <= 0.8) return 'under_budget';
    if (ratio <= 1.0) return 'on_track';
    if (ratio <= 1.2) return 'slightly_over';
    return 'over_budget';
  }

  /**
   * Analyze meals
   * @param {Array} items - Food items
   * @returns {Object} Meal breakdown
   */
  analyzeMeals(items) {
    const breakdown = {};
    let totalCalories = 0;

    for (const item of items) {
      const mealType = item.mealType || MEAL_TYPES.SNACK;
      if (!breakdown[mealType]) {
        breakdown[mealType] = { calories: 0, items: [] };
      }
      breakdown[mealType].calories += item.calories || 0;
      breakdown[mealType].items.push(item);
      totalCalories += item.calories || 0;
    }

    // Calculate percentages
    for (const [meal, data] of Object.entries(breakdown)) {
      data.percentage = totalCalories > 0 ? (data.calories / totalCalories) * 100 : 0;
    }

    return breakdown;
  }

  /**
   * Calculate correlations between health and food
   * @param {Object} healthData - Health data
   * @param {Object} foodData - Food data
   * @param {Object} recommendations - Recommendations
   * @returns {Object} Correlations
   */
  calculateCorrelations(healthData, foodData, recommendations) {
    const { caloriesBurned } = healthData;
    const totalCalories = foodData.items?.reduce((sum, item) => sum + (item.calories || 0), 0) || 0;
    
    const recommendedCalories = recommendations.caloriesNeeded;
    const calorieDeficit = recommendedCalories - totalCalories;

    // Calculate correlation score
    const burnToIntakeRatio = totalCalories > 0 ? caloriesBurned / totalCalories : 0;
    const correlationScore = Math.min(1, burnToIntakeRatio / 0.8);

    return {
      caloriesBurned,
      caloriesIntake: totalCalories,
      recommendedCalories,
      calorieDeficit,
      burnToIntakeRatio,
      correlationScore,
      status: this.getCorrelationStatus(burnToIntakeRatio)
    };
  }

  /**
   * Get correlation status
   * @param {number} ratio - Burn to intake ratio
   * @returns {string} Status
   */
  getCorrelationStatus(ratio) {
    if (ratio < 0.5) return 'low_correlation';
    if (ratio < 0.8) return 'moderate_correlation';
    if (ratio < 1.2) return 'good_correlation';
    return 'high_correlation';
  }

  /**
   * Suggest meals based on recommendations
   * @param {Object} recommendations - Recommendations
   * @param {Object} foodData - Food data
   * @returns {Array} Suggested meals
   */
  suggestMeals(recommendations, foodData) {
    const totalCalories = recommendations.caloriesNeeded;
    const suggestions = [];

    for (const [mealType, percentage] of Object.entries(this.mealDistribution)) {
      const calories = totalCalories * percentage;
      suggestions.push({
        mealType,
        recommendedCalories: Math.round(calories),
        percentage: Math.round(percentage * 100),
        suggestion: this.getMealSuggestion(mealType, calories, foodData)
      });
    }

    return suggestions;
  }

  /**
   * Get meal suggestion
   * @param {string} mealType - Meal type
   * @param {number} calories - Calorie budget
   * @param {Object} foodData - Food data
   * @returns {string} Suggestion
   */
  getMealSuggestion(mealType, calories, foodData) {
    const currentMealCalories = foodData.items?.filter(
      item => item.mealType === mealType
    ).reduce((sum, item) => sum + (item.calories || 0), 0) || 0;

    if (currentMealCalories > calories) {
      return `Consider reducing ${mealType} portion (${Math.round(currentMealCalories - calories)} calories over)`;
    }
    
    if (currentMealCalories < calories * 0.8) {
      return `You can add more to ${mealType} (${Math.round(calories - currentMealCalories)} calories available)`;
    }

    return `${mealType} is well balanced`;
  }

  /**
   * Calculate confidence score
   * @param {Object} healthData - Health data
   * @param {Object} foodData - Food data
   * @returns {number} Confidence score
   */
  calculateConfidence(healthData, foodData) {
    let confidence = 0.5;

    // More health data = higher confidence
    if (healthData.caloriesBurned) confidence += 0.1;
    if (healthData.steps) confidence += 0.05;
    if (healthData.heartRate) confidence += 0.05;

    // More food data = higher confidence
    if (foodData.items && foodData.items.length > 0) {
      confidence += Math.min(0.2, foodData.items.length * 0.02);
    }

    return Math.min(1, confidence);
  }

  /**
   * Generate summary
   * @param {string} activityLevel - Activity level
   * @param {Object} recommendations - Recommendations
   * @param {Object} foodAnalysis - Food analysis
   * @returns {Object} Summary
   */
  generateSummary(activityLevel, recommendations, foodAnalysis) {
    return {
      activityLevel,
      recommendedCalories: recommendations.caloriesNeeded,
      actualCalories: foodAnalysis.totalCalories,
      status: foodAnalysis.status,
      portionSize: recommendations.portionSize,
      description: recommendations.description,
      isWithinBudget: foodAnalysis.isWithinBudget
    };
  }
}

module.exports = HealthAnalyzer;