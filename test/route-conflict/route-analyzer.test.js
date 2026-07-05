const assert = require('assert');
const RouteAnalyzer = require('../../src/route-conflict/route-analyzer');
const { ROUTE_STATUS } = require('../../src/route-conflict/route-constants');

describe('RouteAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new RouteAnalyzer();
  });

  describe('Route Analysis', () => {
    it('should analyze routes and detect conflict', () => {
      const navigationRoute = {
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 },
        { path: ['A', 'D', 'C'], duration: 33, distance: 17 },
        { path: ['A', 'D', 'C'], duration: 36, distance: 18 }
      ];

      const result = analyzer.analyze(navigationRoute, rideHistory);
      
      assert.ok(result.hasConflict);
      assert.strictEqual(result.status, ROUTE_STATUS.CONFLICT);
      assert.ok(result.conflicts.length > 0);
    });

    it('should detect no conflict when routes match', () => {
      const navigationRoute = {
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'B', 'C'], duration: 31, distance: 15 },
        { path: ['A', 'B', 'C'], duration: 29, distance: 14 }
      ];

      const result = analyzer.analyze(navigationRoute, rideHistory);
      
      assert.ok(!result.hasConflict);
      assert.strictEqual(result.status, ROUTE_STATUS.ANALYZED);
    });
  });

  describe('Preference Detection', () => {
    it('should prefer actual route with high confidence', () => {
      const navigationRoute = {
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const rideHistory = [
        { path: ['A', 'D', 'C'], duration: 35, distance: 18 },
        { path: ['A', 'D', 'C'], duration: 33, distance: 17 },
        { path: ['A', 'D', 'C'], duration: 36, distance: 18 }
      ];

      const result = analyzer.analyze(navigationRoute, rideHistory);
      
      assert.strictEqual(result.preferredRoute.source, 'uber');
      assert.ok(result.confidence > 0.5);
    });
  });

  describe('Comparison', () => {
    it('should compare routes correctly', () => {
      const navRoute = {
        path: ['A', 'B', 'C'],
        duration: 30,
        distance: 15
      };

      const actualRoute = {
        path: ['A', 'D', 'C'],
        duration: 35,
        distance: 18,
        confidence: 0.8
      };

      const comparison = analyzer.compareRoutes(navRoute, actualRoute);
      
      assert.ok(comparison.durationDiff > 0);
      assert.ok(comparison.distanceDiff > 0);
    });
  });
});