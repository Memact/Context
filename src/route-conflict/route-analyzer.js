/**
 * Route Analyzer - Analyzes and compares routes from different sources
 */

const {
  ROUTE_SOURCES,
  ROUTE_STATUS,
  COMPARISON_METRICS,
  PREFERENCE_WEIGHTS,
  CONFLICT_TYPES
} = require('./route-constants');

class RouteAnalyzer {
  constructor(options = {}) {
    this.preferenceWeights = options.preferenceWeights || PREFERENCE_WEIGHTS;
    this.similarityThreshold = options.similarityThreshold || 0.85;
    this.durationThreshold = options.durationThreshold || 0.2; // 20% difference
  }

  /**
   * Analyze routes from different sources
   * @param {Object} navigationRoute - Route from navigation (Google Maps)
   * @param {Array} rideHistory - Historical ride data from Uber
   * @param {Object} options - Additional options
   * @returns {Object} Analysis result
   */
  analyze(navigationRoute, rideHistory, options = {}) {
    // Extract actual route from ride history
    const actualRoute = this.extractActualRoute(rideHistory);
    
    // Compare routes
    const comparison = this.compareRoutes(navigationRoute, actualRoute);
    
    // Detect conflicts
    const conflicts = this.detectConflicts(navigationRoute, actualRoute, comparison);
    
    // Determine if conflict exists
    const hasConflict = conflicts.length > 0;
    
    // Determine preferred route
    const preferredRoute = this.determinePreferredRoute(navigationRoute, actualRoute, rideHistory);

    // Calculate confidence
    const confidence = this.calculateConfidence(rideHistory, actualRoute);

    // Generate recommendations
    const recommendations = this.getRecommendations({
      hasConflict,
      navigationRoute,
      actualRoute,
      preferredRoute,
      confidence
    });

    return {
      navigationRoute,
      actualRoute,
      comparison,
      conflicts,
      hasConflict,
      preferredRoute,
      confidence,
      status: hasConflict ? ROUTE_STATUS.CONFLICT : ROUTE_STATUS.ANALYZED,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract actual route from ride history
   * @param {Array} rideHistory - Historical rides
   * @returns {Object} Actual route
   */
  extractActualRoute(rideHistory) {
    if (!Array.isArray(rideHistory) || rideHistory.length === 0) {
      return {
        source: ROUTE_SOURCES.UBER,
        path: [],
        duration: 0,
        distance: 0,
        confidence: 0.3
      };
    }

    // Find most frequent route
    const routeCount = {};
    let maxCount = 0;
    let mostFrequentRoute = null;

    for (const ride of rideHistory) {
      const routeKey = this.getRouteKey(ride);
      routeCount[routeKey] = (routeCount[routeKey] || 0) + 1;
      
      if (routeCount[routeKey] > maxCount) {
        maxCount = routeCount[routeKey];
        mostFrequentRoute = ride;
      }
    }

    if (!mostFrequentRoute) {
      return {
        source: ROUTE_SOURCES.UBER,
        path: [],
        duration: 0,
        distance: 0,
        confidence: 0.3
      };
    }

    // Calculate average metrics
    const avgDuration = rideHistory.reduce((sum, r) => sum + (r.duration || 0), 0) / rideHistory.length;
    const avgDistance = rideHistory.reduce((sum, r) => sum + (r.distance || 0), 0) / rideHistory.length;

    return {
      source: ROUTE_SOURCES.UBER,
      path: mostFrequentRoute.path || [],
      duration: avgDuration,
      distance: avgDistance,
      confidence: Math.min(1, maxCount / 3),
      frequency: maxCount,
      totalRides: rideHistory.length
    };
  }

  /**
   * Get route key for deduplication
   * @param {Object} route - Route object
   * @returns {string} Route key
   */
  getRouteKey(route) {
    const path = route.path || route.steps || [];
    return path.join('|') || 'unknown';
  }

  /**
   * Compare navigation route with actual route
   * @param {Object} navRoute - Navigation route
   * @param {Object} actualRoute - Actual route
   * @returns {Object} Comparison
   */
  compareRoutes(navRoute, actualRoute) {
    const durationDiff = actualRoute.duration > 0 
      ? Math.abs(actualRoute.duration - navRoute.duration) / actualRoute.duration
      : 1;
    
    const distanceDiff = actualRoute.distance > 0
      ? Math.abs(actualRoute.distance - navRoute.distance) / actualRoute.distance
      : 1;

    const isSimilarDuration = durationDiff <= this.durationThreshold;
    const isSimilarDistance = distanceDiff <= this.durationThreshold;
    const isSimilarRoute = this.compareRoutePaths(navRoute.path, actualRoute.path);

    return {
      durationDiff,
      distanceDiff,
      isSimilarDuration,
      isSimilarDistance,
      isSimilarRoute,
      similarityScore: (isSimilarDuration ? 0.33 : 0) + 
                      (isSimilarDistance ? 0.33 : 0) + 
                      (isSimilarRoute ? 0.34 : 0)
    };
  }

  /**
   * Compare route paths
   * @param {Array} path1 - First path
   * @param {Array} path2 - Second path
   * @returns {boolean} True if similar
   */
  compareRoutePaths(path1, path2) {
    if (!path1 || !path2 || path1.length === 0 || path2.length === 0) {
      return false;
    }

    const intersection = path1.filter(p => path2.includes(p));
    const union = new Set([...path1, ...path2]);
    
    const similarity = intersection.length / union.size;
    return similarity >= this.similarityThreshold;
  }

  /**
   * Detect conflicts between routes
   * @param {Object} navRoute - Navigation route
   * @param {Object} actualRoute - Actual route
   * @param {Object} comparison - Comparison result
   * @returns {Array} Conflicts
   */
  detectConflicts(navRoute, actualRoute, comparison) {
    const conflicts = [];

    if (!comparison.isSimilarRoute) {
      conflicts.push({
        type: CONFLICT_TYPES.ROUTE_DIFFERENT,
        description: 'Navigation suggests different route than actual rides',
        severity: 'high'
      });
    }

    if (!comparison.isSimilarDuration) {
      conflicts.push({
        type: CONFLICT_TYPES.DURATION_MISMATCH,
        description: `Duration mismatch: ${navRoute.duration} vs ${actualRoute.duration}`,
        severity: 'medium'
      });
    }

    if (!comparison.isSimilarDistance) {
      conflicts.push({
        type: CONFLICT_TYPES.DISTANCE_MISMATCH,
        description: `Distance mismatch: ${navRoute.distance} vs ${actualRoute.distance}`,
        severity: 'medium'
      });
    }

    return conflicts;
  }

  /**
   * Determine preferred route
   * @param {Object} navRoute - Navigation route
   * @param {Object} actualRoute - Actual route
   * @param {Array} rideHistory - Ride history
   * @returns {Object} Preferred route
   */
  determinePreferredRoute(navRoute, actualRoute, rideHistory) {
    // If no ride history or low confidence, use navigation
    if (!rideHistory || rideHistory.length === 0) {
      return {
        source: ROUTE_SOURCES.NAVIGATION,
        ...navRoute,
        reason: 'No ride history available'
      };
    }

    const navWeight = this.preferenceWeights[ROUTE_SOURCES.NAVIGATION] || 0.5;
    const actualWeight = this.preferenceWeights[ROUTE_SOURCES.UBER] || 0.8;

    // Weighted score comparison
    const navScore = navWeight * 0.7; // Default score for navigation
    const actualScore = actualWeight * actualRoute.confidence * 0.9;

    if (actualScore > navScore) {
      return {
        source: ROUTE_SOURCES.UBER,
        ...actualRoute,
        reason: 'Actual ride history shows consistent preference',
        score: actualScore
      };
    }

    return {
      source: ROUTE_SOURCES.NAVIGATION,
      ...navRoute,
      reason: 'Navigation route preferred based on scoring',
      score: navScore
    };
  }

  /**
   * Calculate confidence based on ride history
   * @param {Array} rideHistory - Ride history
   * @param {Object} actualRoute - Actual route
   * @returns {number} Confidence score
   */
  calculateConfidence(rideHistory, actualRoute) {
    if (!rideHistory || rideHistory.length === 0) return 0.3;
    
    const frequency = actualRoute.frequency || 0;
    const totalRides = actualRoute.totalRides || rideHistory.length;
    
    // More rides = higher confidence
    const countConfidence = Math.min(1, rideHistory.length / 10);
    
    // Consistent route = higher confidence
    const consistencyConfidence = totalRides > 0 ? frequency / totalRides : 0;
    
    return (countConfidence + consistencyConfidence) / 2;
  }

  /**
   * Get recommendations
   * @param {Object} params - Parameters
   * @returns {Array} Recommendations
   */
  getRecommendations(params) {
    const { hasConflict, navigationRoute, actualRoute, preferredRoute, confidence } = params;
    const recommendations = [];

    if (hasConflict) {
      recommendations.push({
        action: 'store_preference',
        message: 'Route conflict detected - storing actual route as preference',
        route: preferredRoute,
        confidence
      });

      recommendations.push({
        action: 'override',
        message: 'Using actual route preference for future recommendations',
        reason: 'User consistently takes this route'
      });
    } else {
      recommendations.push({
        action: 'use_navigation',
        message: 'No conflict detected - using navigation route',
        route: navigationRoute
      });
    }

    return recommendations;
  }

  /**
   * Get route summary
   * @param {Object} analysis - Analysis result
   * @returns {Object} Summary
   */
  getSummary(analysis) {
    return {
      status: analysis.status,
      hasConflict: analysis.hasConflict,
      preferredRoute: analysis.preferredRoute?.source || 'unknown',
      confidence: analysis.confidence,
      conflictCount: analysis.conflicts?.length || 0,
      recommendation: analysis.recommendations[0]?.message || 'No recommendation'
    };
  }
}

module.exports = RouteAnalyzer;