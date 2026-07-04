const assert = require('assert');
const WorkspaceGuard = require('../../src/context-filter/workspace-guard');

describe('WorkspaceGuard', () => {
  let guard;

  beforeEach(() => {
    guard = new WorkspaceGuard();
  });

  describe('Guarding', () => {
    it('should guard workspace request', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify', schema: 'playlist' },
        { id: 2, type: 'workspace', app: 'notion', schema: 'document' }
      ];

      const request = {
        clientDomain: 'productivity',
        clientApp: 'notion'
      };

      const result = guard.guard(contextItems, request);
      
      assert.ok(result.guardApplied);
      assert.strictEqual(result.filtered.length, 1);
      assert.strictEqual(result.blocked.length, 1);
    });

    it('should not guard when disabled', () => {
      const guard2 = new WorkspaceGuard({ enabled: false });
      
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify' }
      ];

      const result = guard2.guard(contextItems, {});
      
      assert.ok(!result.guardApplied);
      assert.strictEqual(result.filtered.length, 1);
    });

    it('should get client domain', () => {
      const domain = guard.getClientDomain('spotify');
      assert.strictEqual(domain, 'entertainment');
      
      const domain2 = guard.getClientDomain('notion');
      assert.strictEqual(domain2, 'productivity');
    });
  });

  describe('Configuration', () => {
    it('should update config', () => {
      guard.updateConfig({
        strictMode: false,
        enabled: false
      });

      const config = guard.getConfig();
      assert.strictEqual(config.strictMode, false);
      assert.strictEqual(config.enabled, false);
    });

    it('should check if should guard', () => {
      const request = {
        clientDomain: 'productivity',
        clientApp: 'slack'
      };

      assert.ok(guard.shouldGuard(request));

      const request2 = {
        clientDomain: 'entertainment',
        clientApp: 'spotify'
      };

      assert.ok(!guard.shouldGuard(request2));
    });
  });

  describe('Logging', () => {
    it('should log guard actions', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify' }
      ];

      guard.guard(contextItems, {
        clientDomain: 'productivity',
        clientApp: 'notion'
      });

      const logs = guard.getLogs();
      assert.strictEqual(logs.length, 1);
    });

    it('should provide statistics', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify' }
      ];

      guard.guard(contextItems, {
        clientDomain: 'productivity',
        clientApp: 'notion'
      });

      const stats = guard.getStats();
      assert.strictEqual(stats.totalGuards, 1);
      assert.strictEqual(stats.filteredCount, 1);
    });
  });
});