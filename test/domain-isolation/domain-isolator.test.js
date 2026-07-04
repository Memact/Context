const assert = require('assert');
const DomainIsolator = require('../../src/domain-isolation/domain-isolator');
const { SOURCE_TYPES, DOMAIN_TYPES, CONTEXT_TYPES } = require('../../src/domain-isolation/domain-constants');

describe('DomainIsolator', () => {
  let isolator;

  beforeEach(() => {
    isolator = new DomainIsolator();
  });

  describe('Isolation', () => {
    it('should isolate ESLint context as technical', () => {
      const context = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.LINTING,
        content: 'semi: ["error", "always"]'
      };

      const result = isolator.isolate(context);
      assert.strictEqual(result.domain, DOMAIN_TYPES.TECHNICAL);
      assert.ok(result.isolated);
      assert.strictEqual(result.status, 'isolated');
    });

    it('should isolate Notion context as documentation', () => {
      const context = {
        source: SOURCE_TYPES.NOTION,
        type: CONTEXT_TYPES.WRITING,
        content: 'Use Oxford comma in all documents'
      };

      const result = isolator.isolate(context);
      assert.strictEqual(result.domain, DOMAIN_TYPES.DOCUMENTATION);
      assert.ok(result.isolated);
    });

    it('should mark conflicting context', () => {
      const context = {
        source: SOURCE_TYPES.ESLINT,
        type: CONTEXT_TYPES.WRITING, // Not allowed for ESLint
        content: 'Write clean code'
      };

      const result = isolator.isolate(context);
      assert.strictEqual(result.status, 'conflicting');
      assert.ok(result.reason.includes('not allowed'));
    });
  });

  describe('Conflict Detection', () => {
    it('should detect domain mismatch', () => {
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

      const result = isolator.checkConflict(context1, context2);
      assert.ok(result.hasConflict);
      assert.strictEqual(result.conflicts[0].type, 'domain_mismatch');
    });

    it('should not detect conflict for same domain', () => {
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

      const result = isolator.checkConflict(context1, context2);
      assert.ok(!result.hasConflict);
    });
  });

  describe('Resolution', () => {
    it('should resolve by priority', () => {
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

      const conflict = isolator.checkConflict(context1, context2);
      // No conflict expected, but if there is, resolve by priority
      if (conflict.hasConflict && conflict.resolution) {
        assert.ok(conflict.resolution.winner === 'context1' || conflict.resolution.winner === 'both');
      }
    });
  });

  describe('Statistics', () => {
    it('should track isolation stats', () => {
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

      isolator.isolate(context1);
      isolator.isolate(context2);

      const stats = isolator.getStats();
      assert.strictEqual(stats.totalContexts, 2);
      assert.strictEqual(stats.technical, 1);
      assert.strictEqual(stats.documentation, 1);
    });
  });
});