const assert = require('assert');
const HealthAnalyzer = require('../../src/health-food-correlation/health-analyzer');
const { ACTIVITY_LEVELS } = require('../../src/health-food-correlation/correlation-constants');

describe('HealthAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new HealthAnalyzer();
  });

  describe('Activity Detection', () => {
    it('should detect sedentary activity', () => {
      const level = analyzer.determineActivityLevel(50, 1000);
      assert.strictEqual(level, ACTIVITY_LEVELS.SEDENTARY);
    });

    it('should detect moderately active', () => {
      const level = analyzer.determineActivityLevel(400, 8000);
      assert.strictEqual(level, ACTIVITY_LEVELS.MODERATELY_ACTIVE);
    });

    it('should detect very active', () => {
      const level = analyzer.determineActivityLevel(700, 12000);
      assert.strictEqual(level, ACTIVITY_LEVELS.VERY_ACTIVE);
    });
  });

  describe('Food Analysis', () => {
    it('should analyze food data', () => {
      const healthData = { caloriesBurned: 500, steps: 8000 };
      const foodData = {
        items: [
          { name: 'Salad', calories: 300, mealType: 'lunch' },
          { name: 'Chicken', calories: 400, mealType: 'dinner' }
        ]
      };

      const result = analyzer.analyze(healthData, foodData);
      assert.strictEqual(result.foodAnalysis.totalCalories, 700);
      assert.ok(result.foodAnalysis.isWithinBudget);
    });

    it('should detect over budget', () => {
      const healthData = { caloriesBurned: 500, steps: 3000 };
      const foodData = {
        items: [
          { name: 'Pizza', calories: 800 },
          { name: 'Burger', calories: 600 }
        ]
      };

      const result = analyzer.analyze(healthData, foodData);
      assert.strictEqual(result.foodAnalysis.status, 'over_budget');
    });
  });

  describe('Correlations', () => {
    it('should calculate correlations', () => {
      const healthData = { caloriesBurned: 500 };
      const foodData = {
        items: [{ name: 'Salad', calories: 400 }]
      };
      const recommendations = { caloriesNeeded: 2000 };

      const result = analyzer.analyze(healthData, foodData);
      assert.ok(result.correlations);
      assert.ok(result.correlations.correlationScore >= 0);
    });
  });

  describe('Meal Suggestions', () => {
    it('should suggest meals', () => {
      const healthData = { caloriesBurned: 500 };
      const foodData = { items: [] };
      const recommendations = { caloriesNeeded: 2000 };

      const result = analyzer.analyze(healthData, foodData);
      assert.ok(result.suggestedMeals.length > 0);
    });
  });
});