const assert = require('assert');
const RoleAnalyzer = require('../../src/role-conflict/role-analyzer');
const { CONFLICT_TYPES, CONFLICT_SEVERITY } = require('../../src/role-conflict/role-constants');

describe('RoleAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new RoleAnalyzer();
  });

  describe('Role Mapping', () => {
    it('should map GitHub admin to unified admin', () => {
      const declarations = [{
        source: 'github',
        role: 'admin',
        user: 'user1',
        entity: 'org1'
      }];

      const result = analyzer.analyze(declarations);
      assert.strictEqual(result.mappedRoles[0].unifiedRole, 'admin');
    });

    it('should map Notion editor to unified editor', () => {
      const declarations = [{
        source: 'notion',
        role: 'editor',
        user: 'user1',
        entity: 'workspace1'
      }];

      const result = analyzer.analyze(declarations);
      assert.strictEqual(result.mappedRoles[0].unifiedRole, 'editor');
    });

    it('should guess unknown role', () => {
      const declarations = [{
        source: 'custom',
        role: 'superuser',
        user: 'user1',
        entity: 'org1'
      }];

      const result = analyzer.analyze(declarations);
      assert.ok(result.mappedRoles[0].unifiedRole);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect role mismatch', () => {
      const declarations = [
        {
          source: 'github',
          role: 'admin',
          user: 'user1',
          entity: 'org1'
        },
        {
          source: 'notion',
          role: 'viewer',
          user: 'user1',
          entity: 'workspace1'
        }
      ];

      const result = analyzer.analyze(declarations);
      assert.strictEqual(result.conflicts.length, 1);
      assert.strictEqual(result.conflicts[0].type, CONFLICT_TYPES.ROLE_MISMATCH);
    });

    it('should detect hierarchy differences', () => {
      const declarations = [
        {
          source: 'github',
          role: 'owner',
          user: 'user1',
          entity: 'org1'
        },
        {
          source: 'notion',
          role: 'viewer',
          user: 'user1',
          entity: 'workspace1'
        }
      ];

      const result = analyzer.analyze(declarations);
      assert.ok(result.conflicts.some(c => c.type === CONFLICT_TYPES.HIERARCHY_DIFFERENCE));
    });
  });

  describe('Hierarchy Analysis', () => {
    it('should analyze hierarchy differences', () => {
      const declarations = [
        {
          source: 'github',
          role: 'admin',
          user: 'user1',
          entity: 'org1'
        },
        {
          source: 'notion',
          role: 'editor',
          user: 'user1',
          entity: 'workspace1'
        }
      ];

      const result = analyzer.analyze(declarations);
      assert.ok(result.hierarchyDifferences.length > 0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', () => {
      const declarations = [
        {
          source: 'github',
          role: 'admin',
          user: 'user1',
          entity: 'org1'
        },
        {
          source: 'notion',
          role: 'viewer',
          user: 'user1',
          entity: 'workspace1'
        }
      ];

      const result = analyzer.analyze(declarations);
      assert.ok(result.recommendations.length > 0);
    });
  });
});