const assert = require('assert');
const ContextFilter = require('../../src/context-filter/context-filter');

describe('ContextFilter', () => {
  let filter;

  beforeEach(() => {
    filter = new ContextFilter();
  });

  describe('Filtering', () => {
    it('should block entertainment context for productivity client', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify', schema: 'playlist' },
        { id: 2, type: 'workspace', app: 'notion', schema: 'document' }
      ];

      const clientInfo = {
        clientType: 'productivity',
        app: 'notion',
        domain: 'productivity'
      };

      const result = filter.filter(contextItems, clientInfo);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 2);
    });

    it('should allow all context for entertainment client', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify', schema: 'playlist' },
        { id: 2, type: 'workspace', app: 'notion', schema: 'document' }
      ];

      const clientInfo = {
        clientType: 'entertainment',
        app: 'spotify',
        domain: 'entertainment'
      };

      const result = filter.filter(contextItems, clientInfo);
      
      assert.strictEqual(result.length, 2);
    });

    it('should block media schema items', () => {
      const contextItems = [
        { id: 1, schema: 'playlist' },
        { id: 2, schema: 'document' }
      ];

      const clientInfo = {
        clientType: 'productivity',
        app: 'slack',
        domain: 'productivity'
      };

      const result = filter.filter(contextItems, clientInfo);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 2);
    });

    it('should block entertainment category', () => {
      const contextItems = [
        { id: 1, category: 'music' },
        { id: 2, category: 'workspace' }
      ];

      const clientInfo = {
        clientType: 'productivity',
        app: 'teams',
        domain: 'productivity'
      };

      const result = filter.filter(contextItems, clientInfo);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 2);
    });
  });

  describe('Detection', () => {
    it('should detect entertainment source', () => {
      const item = { source: 'spotify' };
      assert.ok(filter.isEntertainmentSource(item));
    });

    it('should detect media schema', () => {
      const item = { schema: 'playlist' };
      assert.ok(filter.isMediaSchema(item));
    });

    it('should detect entertainment category', () => {
      const item = { category: 'music' };
      assert.ok(filter.isEntertainmentCategory(item));
    });

    it('should not flag productivity items', () => {
      const item = { category: 'workspace' };
      assert.ok(!filter.isEntertainmentCategory(item));
    });
  });

  describe('Logging', () => {
    it('should log filter actions', () => {
      const contextItems = [
        { id: 1, type: 'music', app: 'spotify' }
      ];

      const clientInfo = {
        clientType: 'productivity',
        app: 'notion',
        domain: 'productivity'
      };

      filter.filter(contextItems, clientInfo);
      
      const logs = filter.getLogs();
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].blockedItems, 1);
    });

    it('should not log when no items blocked', () => {
      const contextItems = [
        { id: 1, type: 'workspace', app: 'notion' }
      ];

      const clientInfo = {
        clientType: 'productivity',
        app: 'notion',
        domain: 'productivity'
      };

      filter.filter(contextItems, clientInfo);
      
      const logs = filter.getLogs();
      assert.strictEqual(logs.length, 0);
    });
  });

  describe('Statistics', () => {
    it('should provide statistics', () => {
      const contextItems1 = [{ id: 1, type: 'music', app: 'spotify' }];
      const contextItems2 = [{ id: 2, type: 'workspace', app: 'notion' }];

      const clientInfo = {
        clientType: 'productivity',
        app: 'notion',
        domain: 'productivity'
      };

      filter.filter(contextItems1, clientInfo);
      filter.filter(contextItems2, clientInfo);

      const stats = filter.getStats();
      assert.strictEqual(stats.totalFilters, 1);
      assert.strictEqual(stats.totalBlocked, 1);
      assert.strictEqual(stats.totalAllowed, 0);
    });

    it('should get blocked by app', () => {
      const contextItems = [{ id: 1, type: 'music', app: 'spotify' }];

      const clientInfo = {
        clientType: 'productivity',
        app: 'notion',
        domain: 'productivity'
      };

      filter.filter(contextItems, clientInfo);

      const blocked = filter.getBlockedByApp();
      assert.ok(blocked.notion > 0);
    });
  });
});