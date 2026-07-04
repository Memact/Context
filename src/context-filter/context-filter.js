/**
 * Context Filter - Filters entertainment context for productivity clients
 */

const {
  DOMAIN_TYPES,
  APP_CATEGORIES,
  MEDIA_SCHEMAS,
  BLOCK_RULES,
  FILTER_ACTION
} = require('./context-filter-constants');

class ContextFilter {
  constructor(options = {}) {
    this.blockRules = options.blockRules || BLOCK_RULES;
    this.mediaSchemas = options.mediaSchemas || MEDIA_SCHEMAS;
    this.appCategories = options.appCategories || APP_CATEGORIES;
    this.filterLog = [];
    this.maxLogSize = options.maxLogSize || 100;
  }

  /**
   * Filter context based on client domain
   * @param {Array} contextItems - Context items to filter
   * @param {Object} clientInfo - Client information
   * @param {Array} options - Additional options
   * @returns {Array} Filtered context items
   */
  filter(contextItems, clientInfo = {}, options = {}) {
    if (!Array.isArray(contextItems) || contextItems.length === 0) {
      return contextItems;
    }

    const { clientType = 'unknown', app = 'unknown', domain = 'productivity' } = clientInfo;
    const { strictMode = true } = options;

    const filtered = [];
    const blocked = [];

    for (const item of contextItems) {
      const filterResult = this.checkItem(item, clientInfo);
      
      if (filterResult.allowed) {
        filtered.push(item);
      } else {
        blocked.push({
          item,
          reason: filterResult.reason,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Log filter action
    if (blocked.length > 0) {
      this.logFilter({
        clientType,
        app,
        domain,
        totalItems: contextItems.length,
        blockedItems: blocked.length,
        allowedItems: filtered.length,
        blockedDetails: blocked,
        timestamp: new Date().toISOString()
      });
    }

    return filtered;
  }

  /**
   * Check if a context item should be allowed
   * @param {Object} item - Context item
   * @param {Object} clientInfo - Client information
   * @returns {Object} Check result
   */
  checkItem(item, clientInfo) {
    const { domain = 'productivity' } = clientInfo;
    
    // If client is entertainment domain, allow everything
    if (domain === DOMAIN_TYPES.ENTERTAINMENT) {
      return { allowed: true, reason: 'Entertainment client' };
    }

    // Check if item is from entertainment source
    const isEntertainmentSource = this.isEntertainmentSource(item);
    const isMediaSchema = this.isMediaSchema(item);
    const isEntertainmentCategory = this.isEntertainmentCategory(item);

    if (isEntertainmentSource || isMediaSchema || isEntertainmentCategory) {
      return {
        allowed: false,
        reason: `Blocked by filter: ${this.getBlockReason(item, { isEntertainmentSource, isMediaSchema, isEntertainmentCategory })}`
      };
    }

    return { allowed: true, reason: 'Allowed by filter' };
  }

  /**
   * Check if item is from entertainment source
   * @param {Object} item - Context item
   * @returns {boolean} True if entertainment source
   */
  isEntertainmentSource(item) {
    const source = item.source || item.app || '';
    const sourceLower = source.toLowerCase();
    
    return this.appCategories.ENTERTAINMENT.some(app => 
      sourceLower.includes(app) || sourceLower === app
    );
  }

  /**
   * Check if item uses media schema
   * @param {Object} item - Context item
   * @returns {boolean} True if media schema
   */
  isMediaSchema(item) {
    const schema = item.schema || item.type || item.category || '';
    const schemaLower = schema.toLowerCase();
    
    for (const [key, values] of Object.entries(this.mediaSchemas)) {
      if (values.some(v => schemaLower.includes(v) || schemaLower === v)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if item is entertainment category
   * @param {Object} item - Context item
   * @returns {boolean} True if entertainment category
   */
  isEntertainmentCategory(item) {
    const category = item.category || item.type || item.field || '';
    const categoryLower = category.toLowerCase();
    
    return this.appCategories.ENTERTAINMENT.some(cat =>
      categoryLower.includes(cat) || categoryLower === cat
    );
  }

  /**
   * Get block reason for item
   * @param {Object} item - Context item
   * @param {Object} flags - Block flags
   * @returns {string} Block reason
   */
  getBlockReason(item, flags) {
    const reasons = [];
    
    if (flags.isEntertainmentSource) {
      reasons.push('source is entertainment app');
    }
    if (flags.isMediaSchema) {
      reasons.push('media schema detected');
    }
    if (flags.isEntertainmentCategory) {
      reasons.push('entertainment category');
    }
    
    return reasons.join(', ');
  }

  /**
   * Log filter action
   * @param {Object} logEntry - Log entry
   */
  logFilter(logEntry) {
    this.filterLog.push(logEntry);
    if (this.filterLog.length > this.maxLogSize) {
      this.filterLog.shift();
    }
  }

  /**
   * Get filter logs
   * @param {number} limit - Number of logs
   * @returns {Array} Filter logs
   */
  getLogs(limit = 10) {
    return this.filterLog.slice(-limit).reverse();
  }

  /**
   * Get filter statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalLogs = this.filterLog.length;
    
    if (totalLogs === 0) {
      return {
        totalFilters: 0,
        totalBlocked: 0,
        totalAllowed: 0,
        blockRate: '0%'
      };
    }

    const totalBlocked = this.filterLog.reduce((sum, log) => sum + log.blockedItems, 0);
    const totalAllowed = this.filterLog.reduce((sum, log) => sum + log.allowedItems, 0);
    const totalItems = totalBlocked + totalAllowed;

    return {
      totalFilters: totalLogs,
      totalBlocked,
      totalAllowed,
      totalItems,
      blockRate: totalItems > 0 ? ((totalBlocked / totalItems) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Get blocked items count by app
   * @returns {Object} Blocked by app
   */
  getBlockedByApp() {
    const blocked = {};
    
    for (const log of this.filterLog) {
      const app = log.app || 'unknown';
      blocked[app] = (blocked[app] || 0) + log.blockedItems;
    }
    
    return blocked;
  }

  /**
   * Clear filter logs
   */
  clearLogs() {
    this.filterLog = [];
  }
}

module.exports = ContextFilter;