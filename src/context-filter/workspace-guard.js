/**
 * Workspace Guard - Protects workspace clients from entertainment context
 */

const ContextFilter = require('./context-filter');
const { DOMAIN_TYPES } = require('./context-filter-constants');

class WorkspaceGuard {
  constructor(options = {}) {
    this.filter = new ContextFilter(options);
    this.guardConfig = {
      enabled: options.enabled !== false,
      strictMode: options.strictMode || true,
      allowedDomains: options.allowedDomains || [DOMAIN_TYPES.PRODUCTIVITY, DOMAIN_TYPES.GENERAL]
    };
    this.guardLog = [];
  }

  /**
   * Guard workspace request
   * @param {Array} contextItems - Context items
   * @param {Object} request - Request details
   * @returns {Object} Guard result
   */
  guard(contextItems, request = {}) {
    if (!this.guardConfig.enabled) {
      return {
        filtered: contextItems,
        blocked: [],
        guardApplied: false,
        reason: 'Guard disabled'
      };
    }

    const { clientDomain = 'productivity', clientApp = 'unknown' } = request;

    // Check if client domain is allowed
    if (!this.guardConfig.allowedDomains.includes(clientDomain)) {
      this.logGuard({
        clientDomain,
        clientApp,
        action: 'skipped',
        reason: 'Domain not in allowed list',
        timestamp: new Date().toISOString()
      });

      return {
        filtered: contextItems,
        blocked: [],
        guardApplied: false,
        reason: 'Domain not allowed'
      };
    }

    // Apply filter
    const filtered = this.filter.filter(contextItems, {
      clientType: clientDomain,
      app: clientApp,
      domain: clientDomain
    }, {
      strictMode: this.guardConfig.strictMode
    });

    // Identify blocked items
    const blocked = contextItems.filter(item => 
      !filtered.includes(item)
    );

    // Log guard action
    this.logGuard({
      clientDomain,
      clientApp,
      action: 'filtered',
      totalItems: contextItems.length,
      blockedCount: blocked.length,
      allowedCount: filtered.length,
      timestamp: new Date().toISOString()
    });

    return {
      filtered,
      blocked,
      guardApplied: true,
      reason: 'Guard applied successfully'
    };
  }

  /**
   * Check if a request should be guarded
   * @param {Object} request - Request details
   * @returns {boolean} True if should guard
   */
  shouldGuard(request) {
    const { clientDomain = 'productivity', clientApp = 'unknown' } = request;
    
    return this.guardConfig.enabled && 
           this.guardConfig.allowedDomains.includes(clientDomain);
  }

  /**
   * Get client domain from app name
   * @param {string} app - App name
   * @returns {string} Domain type
   */
  getClientDomain(app) {
    const appLower = (app || '').toLowerCase();
    
    if (this.filter.appCategories.ENTERTAINMENT.some(cat => 
      appLower.includes(cat) || appLower === cat
    )) {
      return DOMAIN_TYPES.ENTERTAINMENT;
    }
    
    if (this.filter.appCategories.PRODUCTIVITY.some(cat => 
      appLower.includes(cat) || appLower === cat
    )) {
      return DOMAIN_TYPES.PRODUCTIVITY;
    }
    
    return DOMAIN_TYPES.GENERAL;
  }

  /**
   * Log guard action
   * @param {Object} logEntry - Log entry
   */
  logGuard(logEntry) {
    this.guardLog.push(logEntry);
    if (this.guardLog.length > 100) {
      this.guardLog.shift();
    }
  }

  /**
   * Get guard logs
   * @param {number} limit - Number of logs
   * @returns {Array} Guard logs
   */
  getLogs(limit = 10) {
    return this.guardLog.slice(-limit).reverse();
  }

  /**
   * Get guard statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const filterStats = this.filter.getStats();
    const totalGuards = this.guardLog.length;
    const filteredGuards = this.guardLog.filter(log => log.action === 'filtered');

    return {
      totalGuards,
      filteredCount: filteredGuards.length,
      skippedCount: totalGuards - filteredGuards.length,
      ...filterStats
    };
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.filter.clearLogs();
    this.guardLog = [];
  }

  /**
   * Update guard configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.guardConfig = {
      ...this.guardConfig,
      ...config
    };
  }

  /**
   * Get configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.guardConfig };
  }
}

module.exports = WorkspaceGuard;