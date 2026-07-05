const assert = require('assert');
const RoleAnalyzer = require('../../src/role-conflict/role-analyzer');
const RoleResolver = require('../../src/role-conflict/role-resolver');

describe('RoleResolver', () => {
  let analyzer;
  let resolver;

  beforeEach(() => {
    analyzer = new RoleAnalyzer();
    resolver = new RoleResolver();
  });

  describe('Resolution', () => {
    it('should resolve by highest priority', () => {
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

      const analysis = analyzer.analyze(declarations);
      const resolved = resolver.resolve(analysis, { strategy: 'highest_priority' });

      assert.ok(resolved.resolved.length > 0);
      assert.strictEqual(resolved.resolved[0].unifiedRole, 'admin');
    });

    it('should resolve by majority', () => {
      const declarations = [
        {
          source: 'github',
          role: 'admin',
          user: 'user1',
          entity: 'org1'
        },
        {
          source: 'notion',
          role: 'admin',
          user: 'user1',
          entity: 'workspace1'
        },
        {
          source: 'slack',
          role: 'member',
          user: 'user1',
          entity: 'workspace1'
        }
      ];

      const analysis = analyzer.analyze(declarations);
      const resolved = resolver.resolve(analysis, { strategy: 'majority' });

      assert.strictEqual(resolved.resolved[0].unifiedRole, 'admin');
    });

    it('should generate unified view', () => {
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
          user: 'user2',
          entity: 'workspace1'
        }
      ];

      const analysis = analyzer.analyze(declarations);
      const resolved = resolver.resolve(analysis);

      assert.ok(resolved.unifiedView);
      assert.ok(resolved.unifiedView.roles);
    });
  });

  describe('History', () => {
    it('should track resolution history', () => {
      const declarations = [
        {
          source: 'github',
          role: 'admin',
          user: 'user1',
          entity: 'org1'
        }
      ];

      const analysis = analyzer.analyze(declarations);
      resolver.resolve(analysis);

      const history = resolver.getHistory();
      assert.strictEqual(history.length, 1);
    });
  });
});