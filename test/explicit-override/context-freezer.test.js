const assert = require('assert');
const OverrideManager = require('../../src/explicit-override/override-manager');
const ContextFreezer = require('../../src/explicit-override/context-freezer');
const { OVERRIDE_SOURCES } = require('../../src/explicit-override/override-constants');

describe('ContextFreezer', () => {
  let manager;
  let freezer;

  beforeEach(() => {
    manager = new OverrideManager();
    freezer = new ContextFreezer(manager);
  });

  describe('Freezing Context', () => {
    it('should freeze context field', () => {
      const context = { diet: { preference: 'vegan' } };
      const frozen = freezer.freezeContext(context, {
        field: 'diet.preference',
        value: 'vegan',
        source: OVERRIDE_SOURCES.USER_EXPLICIT
      });

      assert.ok(frozen._frozen);
      assert.strictEqual(frozen._source, OVERRIDE_SOURCES.USER_EXPLICIT);
      assert.strictEqual(frozen.status, 'frozen');
    });

    it('should apply freezer to context', () => {
      const context = {
        diet: { preference: 'vegan' },
        fitness: { goal: 'weight_loss' }
      };

      const processed = freezer.apply(context, ['diet.preference']);
      
      assert.ok(processed['diet.preference']._frozen);
      assert.strictEqual(processed['diet.preference'].status, 'frozen');
    });
  });

  describe('Processing Inferences', () => {
    it('should block inference for frozen field', () => {
      freezer.freezeContext({}, {
        field: 'diet.preference',
        value: 'vegan',
        source: OVERRIDE_SOURCES.USER_EXPLICIT
      });

      const result = freezer.processInference('diet.preference', 'non-vegan');
      
      assert.ok(result.blocked);
      assert.strictEqual(result.frozenValue, 'vegan');
    });

    it('should not block inference for non-frozen field', () => {
      const result = freezer.processInference('diet.preference', 'vegan');
      
      assert.ok(!result.blocked);
      assert.strictEqual(result.value, 'vegan');
    });
  });

  describe('Context Management', () => {
    it('should get frozen context', () => {
      const context = { diet: { preference: 'vegan' } };
      freezer.freezeContext(context, {
        field: 'diet.preference',
        value: 'vegan'
      });

      const frozen = freezer.getFrozenContext('diet.preference');
      assert.ok(frozen);
      assert.strictEqual(frozen._frozen, true);
    });

    it('should get all frozen contexts', () => {
      const context1 = { diet: { preference: 'vegan' } };
      const context2 = { fitness: { goal: 'weight_loss' } };

      freezer.freezeContext(context1, { field: 'diet.preference', value: 'vegan' });
      freezer.freezeContext(context2, { field: 'fitness.goal', value: 'weight_loss' });

      const all = freezer.getAllFrozenContexts();
      assert.strictEqual(all.length, 2);
    });

    it('should unfreeze context', () => {
      const context = { diet: { preference: 'vegan' } };
      freezer.freezeContext(context, {
        field: 'diet.preference',
        value: 'vegan'
      });

      const unfrozen = freezer.unfreeze('diet.preference', 'User unfroze');
      assert.ok(unfrozen);
      
      const frozen = freezer.getFrozenContext('diet.preference');
      assert.ok(!frozen);
    });
  });

  describe('Statistics', () => {
    it('should provide stats', () => {
      const context = { diet: { preference: 'vegan' } };
      freezer.freezeContext(context, {
        field: 'diet.preference',
        value: 'vegan'
      });

      const stats = freezer.getStats();
      assert.strictEqual(stats.frozenContexts, 1);
      assert.strictEqual(stats.totalOverrides, 1);
    });
  });
});