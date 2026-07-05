const assert = require('assert');
const RouteAnalyzer = require('../../src/route-conflict/route-analyzer');
const RouteResolver = require('../../src/route-conflict/route-resolver');

describe('RouteResolver', () => {
  let analyzer;
  let resolver;

  beforeEach(() => {
    analyzer = new RouteAnalyzer();
    resolver = new RouteResolver();
  });

  describe('Resolution', () => {
    it('should resolve conflict preferring actual route', () => {
      const navigationRoute = {
        start: 'Home',
        end: 'Work',
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 },
        { path: ['A', 'D', 'C'], duration: 33, distance: 17 }
      ];

      const analysis = analyzer.analyze(navigationRoute, rideHistory);
      const resolved = resolver.resolve(analysis, { strategy: 'prefer_actual' });

      assert.ok(resolved.resolved);
      assert.strictEqual(resolved.action, 'actual_preferred');
    });

    it('should store preference after resolution', () => {
      const navigationRoute = {
        start: 'Home',
        end: 'Work',
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 },
        { path: ['A', 'D', 'C'], duration: 33, distance: 17 }
      ];

      const analysis = analyzer.analyze(navigationRoute, rideHistory);
      resolver.resolve(analysis, { storePreference: true });

      const stored = resolver.getPreference(navigationRoute);
      assert.ok(stored);
      assert.ok(stored.route);
    });
  });

  describe('History', () => {
    it('should track resolution history', () => {
      const navigationRoute = {
        start: 'Home',
        end: 'Work',
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 }
      ];

      const analysis = analyzer.analyze(navigationRoute, rideHistory);
      resolver.resolve(analysis);

      const history = resolver.getHistory();
      assert.strictEqual(history.length, 1);
    });
  });

  describe('Statistics', () => {
    it('should provide stats', () => {
      const navigationRoute = {
        start: 'Home',
        end: 'Work',
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 }
      ];

      const analysis = analyzer.analyze(navigationRoute, rideHistory);
      resolver.resolve(analysis);

      const stats = resolver.getStats();
      assert.strictEqual(stats.totalResolved, 1);
      assert.strictEqual(stats.storedPreferences, 1);
    });
  });
});