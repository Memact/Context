const assert = require('assert');
const HealthAnalyzer = require('../../src/health-food-correlation/health-analyzer');
const FoodAdapter = require('../../src/health-food-correlation/food-adapter');

describe('FoodAdapter', () => {
  let analyzer;
  let adapter;

  beforeEach(() => {
    analyzer = new HealthAnalyzer();
    adapter = new FoodAdapter();
  });

  describe('Food Filtering', () => {
    it('should filter food items', () => {
      const healthData = { caloriesBurned: 500, steps: 8000 };
      const foodData = { items: [] };
      
      const analysis = analyzer.analyze(healthData, foodData);
      
      const foodItems = [
        { name: 'Pizza', calories: 800 },
        { name: 'Salad', calories: 200 },
        { name: 'Steak', calories: 600 }
      ];

      const adapted = adapter.adapt(analysis, foodItems);
      assert.ok(adapted.filteredItems.length > 0);
    });

    it('should score food items', () => {
      const healthData = { caloriesBurned: 500, steps: 8000 };
      const foodData = { items: [] };
      
      const analysis = analyzer.analyze(healthData, foodData);
      
      const foodItems = [
        { name: 'Salad', calories: 200, healthy: true },
        { name: 'Burger', calories: 500 }
      ];

      const adapted = adapter.adapt(analysis, foodItems);
      assert.ok(adapted.filteredItems[0].score >= 0);
    });
  });

  describe('Meal Plan', () => {
    it('should generate meal plan', () => {
      const healthData = { caloriesBurned: 500, steps: 8000 };
      const foodData = { items: [] };
      
      const analysis = analyzer.analyze(healthData, foodData);
      
      const foodItems = [
        { name: 'Salad', calories: 200 },
        { name: 'Chicken', calories: 300 },
        { name: 'Rice', calories: 200 },
        { name: 'Steak', calories: 400 }
      ];

      const adapted = adapter.adapt(analysis, foodItems);
      assert.ok(adapted.mealPlan);
      assert.ok(adapted.mealPlan.items.length > 0);
    });
  });

  describe('Shopping List', () => {
    it('should generate shopping list', () => {
      const healthData = { caloriesBurned: 500, steps: 8000 };
      const foodData = { items: [] };
      
      const analysis = analyzer.analyze(healthData, foodData);
      
      const foodItems = [
        { name: 'Salad', calories: 200 },
        { name: 'Salad', calories: 200 },
        { name: 'Chicken', calories: 300 }
      ];

      const adapted = adapter.adapt(analysis, foodItems);
      const list = adapter.generateShoppingList(adapted.mealPlan);
      
      assert.ok(list.length > 0);
      assert.strictEqual(list[0].quantity, 2);
    });
  });
});