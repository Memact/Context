const assert = require('assert');
const QuarantineManager = require('../../src/quarantine/quarantine-manager');
const { QUARANTINE_STATUS } = require('../../src/quarantine/quarantine-constants');

describe('QuarantineManager', () => {
  let manager;

  beforeEach(() => {
    manager = new QuarantineManager();
  });

  describe('Quarantine', () => {
    it('should quarantine an item', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      const result = manager.quarantine(item, detection);
      assert.ok(result.id);
      assert.strictEqual(result.status, QUARANTINE_STATUS.ACTIVE);
      assert.strictEqual(result.decayFactor, 1.0);
    });

    it('should track stats', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      const stats = manager.getStats();
      assert.strictEqual(stats.totalQuarantined, 1);
      assert.strictEqual(stats.active, 1);
    });
  });

  describe('Decay', () => {
    it('should apply decay to items', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      const decayed = manager.decay(24);
      
      assert.strictEqual(decayed.length, 1);
      assert.ok(decayed[0].decayFactor < 1.0);
    });

    it('should handle multiple decay cycles', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.2,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      manager.decay(24);
      manager.decay(24);
      
      const active = manager.getActive();
      assert.ok(active[0].decayFactor < 0.8);
    });
  });

  describe('Status Changes', () => {
    it('should change status to decaying', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.3,
        quarantineDays: 30
      };

      manager.quarantine(item, detection);
      
      // Decay until factor < 0.5
      for (let i = 0; i < 3; i++) {
        manager.decay(24);
      }
      
      const active = manager.getActive();
      assert.strictEqual(active[0].status, QUARANTINE_STATUS.DECAYING);
    });

    it('should mark expired when decay factor reaches 0', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.3,
        quarantineDays: 1
      };

      manager.quarantine(item, detection);
      
      // Decay until factor <= 0
      for (let i = 0; i < 5; i++) {
        manager.decay(24);
      }
      
      const stats = manager.getStats();
      assert.ok(stats.expired > 0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired items', () => {
      const item = { id: '1', name: 'Laptop' };
      const detection = {
        category: 'electronics',
        confidence: 0.8,
        decayRate: 0.3,
        quarantineDays: 1
      };

      manager.quarantine(item, detection);
      
      for (let i = 0; i < 5; i++) {
        manager.decay(24);
      }
      
      const cleaned = manager.cleanup();
      assert.ok(cleaned > 0);
    });
  });
});