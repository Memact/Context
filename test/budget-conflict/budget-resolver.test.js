const assert = require('assert');
const BudgetAnalyzer = require('../../src/budget-conflict/budget-analyzer');
const BudgetResolver = require('../../src/budget-conflict/budget-resolver');
const { SOURCE_TYPES, CATEGORIES } = require('../../src/budget-conflict/budget-constants');

describe('BudgetResolver', () => {
  let analyzer;
  let resolver;

  beforeEach(() => {
    analyzer = new BudgetAnalyzer();
    resolver = new BudgetResolver();
  });

  describe('Resolution', () => {
    it('should resolve total budget conflict', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {},
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000 },
        { name: 'Phone', price: 25000 }
      ];

      const analysis = analyzer.analyze(budget, purchases);
      const resolved = resolver.resolve(analysis, { preference: 'budget' });

      assert.ok(resolved.resolved);
      assert.ok(resolved.actions.length > 0);
      assert.ok(resolved.actions.some(a => a.type === 'restrict_spending'));
    });

    it('should resolve category budget conflict', () => {
      const budget = {
        totalBudget: 100000,
        categoryBudgets: {
          [CATEGORIES.ELECTRONICS]: 30000
        },
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 35000, category: CATEGORIES.ELECTRONICS }
      ];

      const analysis = analyzer.analyze(budget, purchases);
      const resolved = resolver.resolve(analysis, { preference: 'budget' });

      assert.ok(resolved.resolved);
      assert.ok(resolved.actions.some(a => a.type === 'category_restriction'));
    });

    it('should allow spending when preferred', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {},
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000 },
        { name: 'Phone', price: 25000 }
      ];

      const analysis = analyzer.analyze(budget, purchases);
      const resolved = resolver.resolve(analysis, { preference: 'purchases' });

      assert.ok(resolved.resolved);
      assert.ok(resolved.actions.some(a => a.type === 'allow_spending'));
    });
  });

  describe('History', () => {
    it('should track resolved conflicts', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {},
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000 },
        { name: 'Phone', price: 25000 }
      ];

      const analysis = analyzer.analyze(budget, purchases);
      resolver.resolve(analysis);

      const history = resolver.getHistory();
      assert.strictEqual(history.length, 1);
    });
  });

  describe('Stats', () => {
    it('should provide statistics', () => {
      const budget = {
        totalBudget: 50000,
        categoryBudgets: {},
        source: SOURCE_TYPES.BUDGET_PLANNER
      };

      const purchases = [
        { name: 'Laptop', price: 30000 },
        { name: 'Phone', price: 25000 }
      ];

      const analysis = analyzer.analyze(budget, purchases);
      resolver.resolve(analysis);

      const stats = resolver.getStats();
      assert.strictEqual(stats.totalResolved, 1);
      assert.ok(stats.totalActions > 0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', () => {
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

      const analysis = analyzer.analyze(budget, purchases);
      const resolved = resolver.resolve(analysis);

      assert.ok(resolved.recommendations);
      assert.ok(resolved.recommendations.length > 0);
    });
  });
});