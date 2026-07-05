const assert = require('assert');
const BudgetAnalyzer = require('../../src/budget-conflict/budget-analyzer');
const { SOURCE_TYPES, BUDGET_STATUS, CATEGORIES } = require('../../src/budget-conflict/budget-constants');

describe('BudgetAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new BudgetAnalyzer();
  });

  describe('Budget Analysis', () => {
    it('should detect no conflict when within budget', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {
          [CATEGORIES.ELECTRONICS]: 30000,
          [CATEGORIES.CLOTHING]: 20000
        },
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 25000, category: CATEGORIES.ELECTRONICS },
        { name: 'Shirt', price: 15000, category: CATEGORIES.CLOTHING }
      ];

      const result = analyzer.analyze(budget, purchases);
      
      assert.ok(!result.conflicts.hasConflicts);
      assert.strictEqual(result.status.total, BUDGET_STATUS.WITHIN_LIMIT);
    });

    it('should detect total budget conflict', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {},
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000 },
        { name: 'Phone', price: 25000 },
        { name: 'Tablet', price: 20000 }
      ];

      const result = analyzer.analyze(budget, purchases);
      
      assert.ok(result.conflicts.hasConflicts);
      assert.ok(result.conflicts.total);
      assert.strictEqual(result.conflicts.total.type, 'total_overspend');
    });

    it('should detect category budget conflict', () => {
      const budget = {
        totalBudget: 100000,
        categoryBudgets: {
          [CATEGORIES.ELECTRONICS]: 30000
        },
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 35000, category: CATEGORIES.ELECTRONICS },
        { name: 'Mouse', price: 2000, category: CATEGORIES.ELECTRONICS }
      ];

      const result = analyzer.analyze(budget, purchases);
      
      assert.ok(result.conflicts.hasConflicts);
      assert.strictEqual(result.conflicts.category.length, 1);
      assert.strictEqual(result.conflicts.category[0].category, CATEGORIES.ELECTRONICS);
    });
  });

  describe('Category Detection', () => {
    it('should detect electronics category', () => {
      const category = analyzer.getCategory({ name: 'MacBook Pro' });
      assert.strictEqual(category, CATEGORIES.ELECTRONICS);
    });

    it('should detect clothing category', () => {
      const category = analyzer.getCategory({ name: 'Nike Running Shoes' });
      assert.strictEqual(category, CATEGORIES.CLOTHING);
    });

    it('should detect food category', () => {
      const category = analyzer.getCategory({ name: 'Grocery Store' });
      assert.strictEqual(category, CATEGORIES.FOOD);
    });
  });

  describe('Budget Status', () => {
    it('should identify within limit', () => {
      const status = analyzer.checkBudget(800, 1000);
      assert.strictEqual(status, BUDGET_STATUS.WITHIN_LIMIT);
    });

    it('should identify approaching', () => {
      const status = analyzer.checkBudget(950, 1000);
      assert.strictEqual(status, BUDGET_STATUS.APPROACHING);
    });

    it('should identify exceeded', () => {
      const status = analyzer.checkBudget(1100, 1000);
      assert.strictEqual(status, BUDGET_STATUS.EXCEEDED);
    });

    it('should identify over budget', () => {
      const status = analyzer.checkBudget(1300, 1000);
      assert.strictEqual(status, BUDGET_STATUS.OVER_BUDGET);
    });
  });

  describe('Priority Source', () => {
    it('should prioritize budget planner', () => {
      const budget = {
        totalBudget: 50000,
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000, source: SOURCE_TYPES.AMAZON }
      ];

      const priority = analyzer.getPrioritySource(budget, purchases);
      assert.strictEqual(priority, 'budget');
    });

    it('should compare weights correctly', () => {
      const budget = {
        totalBudget: 50000,
        source: SOURCE_TYPES.WORKSAPCE
      };

      const purchases = [
        { name: 'Laptop', price: 30000, source: SOURCE_TYPES.COMMERCE }
      ];

      const priority = analyzer.getPrioritySource(budget, purchases);
      assert.strictEqual(priority, 'budget'); // Workspace has higher weight
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations for conflicts', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {
          [CATEGORIES.ELECTRONICS]: 30000
        },
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 35000, category: CATEGORIES.ELECTRONICS }
      ];

      const result = analyzer.analyze(budget, purchases);
      
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.recommendations.some(r => 
        r.message.includes('exceeded') || r.message.includes('overspend')
      ));
    });
  });
});