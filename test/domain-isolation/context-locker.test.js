const assert = require('assert');
const DomainIsolator = require('../../src/domain-isolation/domain-isolator');
const ContextLocker = require('../../src/domain-isolation/context-locker');
const { SOURCE_TYPES, CONTEXT_TYPES } = require('../../src/domain-isolation/domain-constants');

describe('ContextLocker', () => {
  let isolator;
  let locker;

  beforeEach(() => {
    isolator = new DomainIsolator();
    locker = new ContextLocker(isolator);
  });

  describe('Locking', () => {
    it('should lock technical context', () => {
      const context = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      const result = locker.lock(context);
      assert.ok(result.locked);
      assert.strictEqual(result.status, 'isolated');
      assert.strictEqual(result.mergeable, false);
    });

    it('should not lock documentation context', () => {
      const context = {
        source: SOURCE_TYPES.NOTION,
        type: CONTEXT_TYPES.WRITING,
        content: 'Use Oxford comma'
      };

      const result = locker.lock(context);
      assert.ok(!result.locked);
    });
  });

  describe('Merge Prevention', () => {
    it('should prevent merge of locked contexts', () => {
      const context1 = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      const context2 = {
        source: SOURCE_TYPES.NOTION,
        type: CONTEXT_TYPES.WRITING,
        content: 'Use Oxford comma'
      };

      const isolated1 = isolator.isolate(context1);
      const isolated2 = isolator.isolate(context2);

      locker.lock(context1);

      const result = locker.attemptMerge(isolated1, isolated2);
      assert.ok(!result.merged);
      assert.ok(result.locked);
    });

    it('should allow merge of unlocked contexts in same domain', () => {
      const context1 = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      const context2 = {
        source: SOURCE_TYPES.PRETTIER,
        type: CONTEXT_TYPES.FORMATTING,
        content: 'printWidth: 80'
      };

      const isolated1 = isolator.isolate(context1);
      const isolated2 = isolator.isolate(context2);

      const result = locker.attemptMerge(isolated1, isolated2);
      assert.ok(result.merged);
    });
  });

  describe('Lock Management', () => {
    it('should get all locked contexts', () => {
      const context = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      locker.lock(context);
      const locked = locker.getLocked();
      assert.strictEqual(locked.length, 1);
    });

    it('should unlock context', () => {
      const context = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      const result = locker.lock(context);
      assert.ok(locker.isLocked(result.isolationId));

      const unlocked = locker.unlock(result.isolationId);
      assert.ok(unlocked);
      assert.ok(!locker.isLocked(result.isolationId));
    });
  });
});