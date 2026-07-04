const assert = require('assert');
const OverrideManager = require('../../src/explicit-override/override-manager');
const { OVERRIDE_SOURCES, OVERRIDE_STATUS } = require('../../src/explicit-override/override-constants');

describe('OverrideManager', () => {
  let manager;

  beforeEach(() => {
    manager = new OverrideManager();
  });

  describe('Setting Overrides', () => {
    it('should set user explicit override', () => {
      const result = manager.setOverride('diet.preference', 'vegan', {
        source: OVERRIDE_SOURCES.USER_EXPLICIT,
        reason: 'User declared vegan'
      });

      assert.ok(result.id);
      assert.strictEqual(result.field, 'diet.preference');
      assert.strictEqual(result.value, 'vegan');
      assert.strictEqual(result.status, OVERRIDE_STATUS.ACTIVE);
      assert.ok(result.frozen);
    });

    it('should freeze field when override is set', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      assert.ok(manager.isFrozen('diet.preference'));
      assert.ok(manager.hasOverride('diet.preference'));
    });

    it('should get override value', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      const value = manager.getValue('diet.preference');
      assert.strictEqual(value, 'vegan');
    });
  });

  describe('Conflict Resolution', () => {
    it('should block inference when override exists', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      const result = manager.shouldBlockInference('diet.preference', 'non-vegan');
      
      assert.ok(result.block);
      assert.strictEqual(result.overrideValue, 'vegan');
      assert.strictEqual(result.inferenceValue, 'non-vegan');
    });

    it('should not block inference when no override exists', () => {
      const result = manager.shouldBlockInference('diet.preference', 'non-vegan');
      
      assert.ok(!result.block);
    });

    it('should resolve conflict in favor of user', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      const result = manager.resolveConflict('diet.preference', 'non-vegan');
      
      assert.ok(result.resolved);
      assert.strictEqual(result.value, 'vegan');
      assert.strictEqual(result.source, 'user_explicit');
      assert.ok(result.blocked);
    });
  });

  describe('Override Management', () => {
    it('should update override value', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      const updated = manager.updateOverride('diet.preference', 'vegetarian', 'User changed preference');
      
      assert.strictEqual(updated.value, 'vegetarian');
      assert.strictEqual(updated.history.length, 2);
    });

    it('should revoke override', () => {
      manager.setOverride('diet.preference', 'vegan');
      
      const revoked = manager.revokeOverride('diet.preference', 'User revoked');
      
      assert.ok(revoked);
      assert.ok(!manager.hasOverride('diet.preference'));
      assert.ok(!manager.isFrozen('diet.preference'));
    });

    it('should get active overrides', () => {
      manager.setOverride('diet.preference', 'vegan');
      manager.setOverride('fitness.goal', 'weight_loss');
      
      const active = manager.getActiveOverrides();
      assert.strictEqual(active.length, 2);
    });
  });

  describe('Frozen Fields', () => {
    it('should freeze field with value', () => {
      const result = manager.freeze('diet.preference', 'vegan', {
        reason: 'User explicit'
      });

      assert.ok(result.frozen);
      assert.strictEqual(result.value, 'vegan');
      assert.ok(manager.isFrozen('diet.preference'));
    });

    it('should unfreeze field', () => {
      manager.freeze('diet.preference', 'vegan');
      
      const unfrozen = manager.unfreeze('diet.preference');
      assert.ok(unfrozen);
      assert.ok(!manager.isFrozen('diet.preference'));
    });
  });

  describe('Statistics', () => {
    it('should provide stats', () => {
      manager.setOverride('diet.preference', 'vegan');
      manager.setOverride('fitness.goal', 'weight_loss');
      
      const stats = manager.getStats();
      assert.strictEqual(stats.totalOverrides, 2);
      assert.strictEqual(stats.activeOverrides, 2);
      assert.ok(stats.bySource.user_explicit);
    });
  });

  describe('History', () => {
    it('should track history', () => {
      manager.setOverride('diet.preference', 'vegan');
      manager.updateOverride('diet.preference', 'vegetarian', 'Changed');
      
      const history = manager.getHistory('diet.preference');
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].action, 'update');
    });
  });
});