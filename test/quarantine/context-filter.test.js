const assert = require('assert');
const QuarantineManager = require('../../src/quarantine/quarantine-manager');
const ContextFilter = require('../../src/quarantine/context-filter');

describe('ContextFilter', () => {
  let manager;
  let filter;

  beforeEach(() => {
    manager = new QuarantineManager();
    filter = new ContextFilter(manager);
  });

  describe('Filtering', () => {
    it('should filter quarantined items', () => {
      const item = { id: '1', name: 'Laptop', category: 'electronics' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      
      const contextItems = [
        { id: '1', name: 'Laptop' },
        { id: '2', name: 'Phone' }
      ];
      
      const filtered = filter.filter(contextItems);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, '2');
    });

    it('should include decaying items when specified', () => {
      const item = { id: '1', name: 'Laptop', category: 'electronics' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.3,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      
      for (let i = 0; i < 3; i++) {
        manager.decay(24);
      }
      
      const contextItems = [{ id: '1', name: 'Laptop' }];
      const filtered = filter.filter(contextItems, { includeDecaying: true });
      
      assert.strictEqual(filtered.length, 1);
    });
  });

  describe('Scores', () => {
    it('should apply decay to scores', () => {
      const item = { id: '1', name: 'Laptop', score: 0.9 };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      manager.decay(24);
      
      const items = [{ id: '1', name: 'Laptop', score: 0.9 }];
      const scored = filter.applyDecayToScores(items);
      
      assert.ok(scored[0].adjustedScore < scored[0].originalScore);
      assert.ok(scored[0].isQuarantined);
    });
  });

  describe('Summary', () => {
    it('should generate quarantine summary', () => {
      const item = { id: '1', name: 'Laptop', category: 'electronics' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      
      const contextItems = [
        { id: '1', name: 'Laptop' },
        { id: '2', name: 'Phone' }
      ];
      
      const summary = filter.getQuarantineSummary(contextItems);
      assert.strictEqual(summary.quarantinedCount, 1);
      assert.strictEqual(summary.nonQuarantinedCount, 1);
      assert.ok(summary.categories.electronics);
    });
  });
});