/**
 * Food Adapter - Maps health metrics to food recommendations
 */

const { PORTION_RECOMMENDATIONS } = require('./correlation-constants');

class FoodAdapter {
  constructor(options = {}) {
    this.recommendations = options.recommendations || PORTION_RECOMMENDATIONS;
    this.calorieBuffer = options.calorieBuffer || 0.1; // 10% buffer
  }

  /**
   * Adapter health metrics to food recommendations
   * @param {Object} healthAnalysis - Health analysis result
   * @param {Object} foodItems - Available food items
   * @param {Object} options - Adapter options
   * @returns {Object} Adapted recommendations
   */
  adapt(healthAnalysis, foodItems, options = {}) {
    const { activityLevel, recommendations, caloriesBurned } = healthAnalysis;
    
    // Get recommended calories
    const recommendedCalories = recommendations.caloriesNeeded;
    
    // Filter food items based on recommendations
    const filteredItems = this.filterFoodItems(foodItems, recommendedCalories);
    
    // Score food items
    const scoredItems = this.scoreFoodItems(filteredItems, recommendations);
    
    // Generate meal plan
    const mealPlan = this.generateMealPlan(scoredItems, recommendedCalories);
    
    // Calculate savings
    const savings = this.calculateSavings(healthAnalysis, mealPlan);

    return {
      adaptedFor: activityLevel,
      recommendedCalories,
      mealPlan,
      filteredItems: scoredItems,
      savings,
      confidence: healthAnalysis.confidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Filter food items based on calorie limits
   * @param {Array} items - Food items
   * @param {number} maxCalories - Maximum calories
   * @returns {Array} Filtered items
   */
  filterFoodItems(items, maxCalories) {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter(item => {
      const calories = item.calories || 0;
      return calories <= maxCalories * 0.5; // Single item shouldn't exceed 50% of daily
    });
  }

  /**
   * Score food items for suitability
   * @param {Array} items - Food items
   * @param {Object} recommendations - Recommendations
   * @returns {Array} Scored items
   */
  scoreFoodItems(items, recommendations) {
    return items.map(item => {
      const calories = item.calories || 0;
      const targetCalories = recommendations.caloriesNeeded / 3; // Per meal target
      
      // Calculate score based on how well item fits
      const ratio = calories / targetCalories;
      let score = 1 - Math.abs(1 - ratio);
      
      // Boost for healthy items
      if (item.healthy === true) score += 0.1;
      if (item.nutritionalScore) score += item.nutritionalScore * 0.1;
      
      // Boost for portion match
      if (item.portionSize === recommendations.portionSize) {
        score += 0.1;
      }

      return {
        ...item,
        score: Math.min(1, Math.max(0, score)),
        matchQuality: this.getMatchQuality(score)
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Get match quality description
   * @param {number} score - Score value
   * @returns {string} Match quality
   */
  getMatchQuality(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'moderate';
    return 'poor';
  }

  /**
   * Generate meal plan
   * @param {Array} scoredItems - Scored food items
   * @param {number} totalCalories - Total calorie budget
   * @returns {Object} Meal plan
   */
  generateMealPlan(scoredItems, totalCalories) {
    const plan = {
      meals: [],
      totalCalories: 0,
      items: []
    };

    let remainingCalories = totalCalories;
    let mealCounter = 0;

    for (const item of scoredItems) {
      if (remainingCalories <= 0) break;
      
      const itemCalories = item.calories || 0;
      if (itemCalories <= remainingCalories * 1.2) {
        plan.items.push(item);
        plan.totalCalories += itemCalories;
        remainingCalories -= itemCalories;
        mealCounter++;

        // Group into meals (3 per day)
        if (mealCounter % 3 === 0 && plan.items.length > 0) {
          plan.meals.push({
            type: ['breakfast', 'lunch', 'dinner'][(mealCounter / 3) - 1] || 'snack',
            items: plan.items.slice(-3),
            calories: plan.items.slice(-3).reduce((sum, i) => sum + (i.calories || 0), 0)
          });
        }
      }
    }

    // Calculate remaining calories
    plan.remainingCalories = Math.max(0, totalCalories - plan.totalCalories);
    plan.percentageUsed = (plan.totalCalories / totalCalories) * 100;

    return plan;
  }

  /**
   * Calculate savings
   * @param {Object} healthAnalysis - Health analysis
   * @param {Object} mealPlan - Meal plan
   * @returns {Object} Savings
   */
  calculateSavings(healthAnalysis, mealPlan) {
    const { caloriesBurned } = healthAnalysis;
    const totalCalories = mealPlan.totalCalories;
    
    const calorieDeficit = caloriesBurned - totalCalories;
    const isBalanced = Math.abs(calorieDeficit) < 200;

    return {
      calorieDeficit,
      isBalanced,
      status: isBalanced ? 'balanced' : 
              calorieDeficit > 0 ? 'deficit' : 'surplus',
      recommendation: this.getSavingsRecommendation(calorieDeficit)
    };
  }

  /**
   * Get savings recommendation
   * @param {number} deficit - Calorie deficit
   * @returns {string} Recommendation
   */
  getSavingsRecommendation(deficit) {
    if (Math.abs(deficit) < 200) {
      return 'Calories balanced - maintain current intake';
    }
    if (deficit > 0) {
      return `You can add ${Math.round(deficit)} calories of healthy food`;
    }
    return `Consider reducing intake by ${Math.round(Math.abs(deficit))} calories`;
  }

  /**
   * Generate shopping list from meal plan
   * @param {Object} mealPlan - Meal plan
   * @returns {Array} Shopping list
   */
  generateShoppingList(mealPlan) {
    const list = [];
    const itemMap = {};

    for (const item of mealPlan.items) {
      const key = item.name || item.id;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.name || 'Unknown',
          quantity: 0,
          caloriesPerUnit: item.calories || 0,
          category: item.category || 'general'
        };
      }
      itemMap[key].quantity += 1;
    }

    for (const [key, data] of Object.entries(itemMap)) {
      list.push(data);
    }

    return list;
  }
}

module.exports = FoodAdapter;