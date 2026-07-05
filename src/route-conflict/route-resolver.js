/**
 * Route Resolver - Resolves route conflicts and stores preferences
 */

const { ROUTE_STATUS, ROUTE_SOURCES } = require('./route-constants');

class RouteResolver {
  constructor(options = {}) {
    this.resolvedRoutes = new Map();
    this.preferenceStore = new Map();
    this.resolutionHistory = [];
    this.maxHistory = options.maxHistory || 100;
  }

  /**
   * Resolve route conflict
   * @param {Object} analysis - Route analysis
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolve(analysis, options = {}) {
    const { strategy = 'prefer_actual', storePreference = true } = options;
    
    let resolution = null;

    if (!analysis.hasConflict) {
      resolution = {
        resolved: true,
        action: 'no_conflict',
        route: analysis.navigationRoute,
        reason: 'No conflict detected'
      };
    } else if (strategy === 'prefer_actual') {
      resolution = this.resolvePreferActual(analysis);
    } else if (strategy === 'prefer_navigation') {
      resolution = this.resolvePreferNavigation(analysis);
    } else if (strategy === 'highest_confidence') {
      resolution = this.resolveByConfidence(analysis);
    } else {
      resolution = this.resolvePreferActual(analysis);
    }

    // Store preference if requested
    if (storePreference && resolution.resolved) {
      this.storePreference(analysis, resolution);
    }

    // Record resolution
    this.recordResolution(analysis, resolution);

    return {
      ...resolution,
      resolvedAt: new Date().toISOString(),
      stored: storePreference,
      analysisId: this.generateId()
    };
  }

  /**
   * Resolve by preferring actual route
   * @param {Object} analysis - Route analysis
   * @returns {Object} Resolution
   */
  resolvePreferActual(analysis) {
    const { actualRoute, preferredRoute } = analysis;
    
    return {
      resolved: true,
      action: 'actual_preferred',
      route: actualRoute,
      preferred: preferredRoute,
      reason: 'User actual route preferred over navigation'
    };
  }

  /**
   * Resolve by preferring navigation
   * @param {Object} analysis - Route analysis
   * @returns {Object} Resolution
   */
  resolvePreferNavigation(analysis) {
    const { navigationRoute, preferredRoute } = analysis;
    
    return {
      resolved: true,
      action: 'navigation_preferred',
      route: navigationRoute,
      preferred: preferredRoute,
      reason: 'Navigation route preferred over actual'
    };
  }

  /**
   * Resolve by highest confidence
   * @param {Object} analysis - Route analysis
   * @returns {Object} Resolution
   */
  resolveByConfidence(analysis) {
    const { navigationRoute, actualRoute, confidence } = analysis;
    
    if (confidence > 0.7) {
      return {
        resolved: true,
        action: 'actual_preferred',
        route: actualRoute,
        reason: 'High confidence in actual route preference'
      };
    }

    return {
      resolved: true,
      action: 'navigation_preferred',
      route: navigationRoute,
      reason: 'Insufficient confidence in actual route'
    };
  }

  /**
   * Store route preference
   * @param {Object} analysis - Route analysis
   * @param {Object} resolution - Resolution result
   */
  storePreference(analysis, resolution) {
    const key = this.getPreferenceKey(analysis.navigationRoute);
    
    this.preferenceStore.set(key, {
      route: resolution.route,
      source: resolution.route?.source || 'user_preference',
      resolvedAt: new Date().toISOString(),
      confidence: analysis.confidence,
      history: analysis.actualRoute
    });
  }

  /**
   * Get preference key
   * @param {Object} route - Route object
   * @returns {string} Preference key
   */
  getPreferenceKey(route) {
    const start = route.start || 'unknown';
    const end = route.end || 'unknown';
    return `${start}-${end}`;
  }

  /**
   * Get stored preference
   * @param {Object} route - Route object
   * @returns {Object|null} Stored preference or null
   */
  getPreference(route) {
    const key = this.getPreferenceKey(route);
    return this.preferenceStore.get(key) || null;
  }

  /**
   * Record resolution
   * @param {Object} analysis - Route analysis
   * @param {Object} resolution - Resolution result
   */
  recordResolution(analysis, resolution) {
    const record = {
      analysis,
      resolution,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    this.resolutionHistory.push(record);
    if (this.resolutionHistory.length > this.maxHistory) {
      this.resolutionHistory.shift();
    }

    // Update resolved routes
    const key = this.getPreferenceKey(analysis.navigationRoute);
    this.resolvedRoutes.set(key, {
      ...resolution,
      resolvedAt: new Date().toISOString()
    });
  }

  /**
   * Get resolution history
   * @param {number} limit - Number of records
   * @returns {Array} History
   */
  getHistory(limit = 10) {
    return this.resolutionHistory.slice(-limit).reverse();
  }

  /**
   * Get all stored preferences
   * @returns {Array} Preferences
   */
  getPreferences() {
    const preferences = [];
    for (const [key, value] of this.preferenceStore) {
      preferences.push({ key, ...value });
    }
    return preferences;
  }

  /**
   * Get resolved routes
   * @param {string} status - Filter by status
   * @returns {Array} Resolved routes
   */
  getResolvedRoutes(status = null) {
    const routes = [];
    for (const [key, value] of this.resolvedRoutes) {
      if (!status || value.action === status) {
        routes.push({ key, ...value });
      }
    }
    return routes;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const resolved = this.resolvedRoutes.size;
    const preferences = this.preferenceStore.size;
    const history = this.resolutionHistory.length;

    const byAction = {};
    for (const [key, value] of this.resolvedRoutes) {
      const action = value.action || 'unknown';
      byAction[action] = (byAction[action] || 0) + 1;
    }

    return {
      totalResolved: resolved,
      storedPreferences: preferences,
      historySize: history,
      byAction
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `route-resolve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.resolvedRoutes.clear();
    this.preferenceStore.clear();
    this.resolutionHistory = [];
  }
}

module.exports = RouteResolver;