/**
 * Override Manager - Manages explicit user overrides
 */

const {
  OVERRIDE_STATUS,
  OVERRIDE_SOURCES,
  FIELD_STATUS,
  PRIORITY_LEVELS,
  CONFLICT_RESOLUTION
} = require('./override-constants');

class OverrideManager {
  constructor(options = {}) {
    this.overrides = new Map();
    this.frozenFields = new Map();
    this.overrideHistory = [];
    this.maxHistory = options.maxHistory || 100;
    this.conflictResolution = options.conflictResolution || CONFLICT_RESOLUTION.USER_WINS;
  }

  /**
   * Set an explicit user override
   * @param {string} field - Field to override
   * @param {any} value - New value
   * @param {Object} options - Additional options
   * @returns {Object} Override result
   */
  setOverride(field, value, options = {}) {
    const { source = OVERRIDE_SOURCES.USER_EXPLICIT, reason, expiresAt } = options;

    // Create override record
    const override = {
      id: this.generateId(),
      field,
      value,
      source,
      reason: reason || 'User explicit declaration',
      status: OVERRIDE_STATUS.ACTIVE,
      priority: PRIORITY_LEVELS[source] || PRIORITY_LEVELS.DEFAULT,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      frozen: true,
      history: [{
        action: 'set',
        value,
        timestamp: new Date().toISOString()
      }]
    };

    // Store override
    this.overrides.set(field, override);
    this.frozenFields.set(field, {
      field,
      value,
      frozenAt: new Date().toISOString(),
      expiresAt: expiresAt || null
    });

    // Add to history
    this.overrideHistory.push({
      ...override,
      timestamp: new Date().toISOString()
    });
    if (this.overrideHistory.length > this.maxHistory) {
      this.overrideHistory.shift();
    }

    return override;
  }

  /**
   * Check if a field has an active override
   * @param {string} field - Field to check
   * @returns {boolean} True if overridden
   */
  hasOverride(field) {
    if (!this.overrides.has(field)) return false;
    
    const override = this.overrides.get(field);
    return override.status === OVERRIDE_STATUS.ACTIVE;
  }

  /**
   * Get override for a field
   * @param {string} field - Field name
   * @returns {Object|null} Override or null
   */
  getOverride(field) {
    if (this.hasOverride(field)) {
      return this.overrides.get(field);
    }
    return null;
  }

  /**
   * Get value with override applied
   * @param {string} field - Field name
   * @param {any} defaultValue - Default value if no override
   * @returns {any} Override value or default
   */
  getValue(field, defaultValue = null) {
    const override = this.getOverride(field);
    return override ? override.value : defaultValue;
  }

  /**
   * Check if field is frozen
   * @param {string} field - Field name
   * @returns {boolean} True if frozen
   */
  isFrozen(field) {
    if (!this.frozenFields.has(field)) return false;
    
    const frozen = this.frozenFields.get(field);
    if (frozen.expiresAt && new Date(frozen.expiresAt) < new Date()) {
      this.unfreeze(field);
      return false;
    }
    return true;
  }

  /**
   * Freeze a field
   * @param {string} field - Field to freeze
   * @param {any} value - Value to freeze
   * @param {Object} options - Options
   * @returns {Object} Freeze result
   */
  freeze(field, value, options = {}) {
    const { reason = 'User explicit override', expiresAt = null } = options;

    this.frozenFields.set(field, {
      field,
      value,
      frozenAt: new Date().toISOString(),
      expiresAt,
      reason,
      isExplicit: true
    });

    return {
      field,
      value,
      frozen: true,
      expiresAt,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Unfreeze a field
   * @param {string} field - Field to unfreeze
   * @returns {boolean} True if unfrozen
   */
  unfreeze(field) {
    if (this.frozenFields.has(field)) {
      this.frozenFields.delete(field);
      return true;
    }
    return false;
  }

  /**
   * Resolve conflict between override and inference
   * @param {string} field - Field name
   * @param {any} inferenceValue - Value from inference
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  resolveConflict(field, inferenceValue, options = {}) {
    const { strategy = this.conflictResolution } = options;
    const override = this.getOverride(field);
    
    if (!override) {
      return {
        resolved: false,
        reason: 'No override found',
        value: inferenceValue,
        source: 'inference'
      };
    }

    // Check if inference should be allowed
    const shouldBlockInference = override.frozen && override.status === OVERRIDE_STATUS.ACTIVE;

    if (shouldBlockInference) {
      return {
        resolved: true,
        reason: 'User explicit override prevents inference',
        value: override.value,
        source: 'user_explicit',
        blocked: true,
        blockedValue: inferenceValue
      };
    }

    // Compare priorities
    const overridePriority = override.priority;
    const inferencePriority = PRIORITY_LEVELS[OVERRIDE_SOURCES.INFERENCE] || 3;

    if (overridePriority > inferencePriority) {
      return {
        resolved: true,
        reason: 'Override has higher priority',
        value: override.value,
        source: 'user_explicit'
      };
    }

    return {
      resolved: false,
      reason: 'No resolution needed',
      value: inferenceValue,
      source: 'inference'
    };
  }

  /**
   * Check if inference should be blocked
   * @param {string} field - Field name
   * @param {any} inferenceValue - Inference value
   * @param {Object} options - Options
   * @returns {Object} Block check result
   */
  shouldBlockInference(field, inferenceValue, options = {}) {
    const override = this.getOverride(field);
    
    if (!override) {
      return {
        block: false,
        reason: 'No override exists'
      };
    }

    if (!override.frozen || override.status !== OVERRIDE_STATUS.ACTIVE) {
      return {
        block: false,
        reason: 'Override not active or not frozen'
      };
    }

    // Check if inference differs from override
    const differs = JSON.stringify(override.value) !== JSON.stringify(inferenceValue);

    if (!differs) {
      return {
        block: false,
        reason: 'Inference matches override'
      };
    }

    // Check priority
    const overridePriority = override.priority;
    const inferencePriority = PRIORITY_LEVELS[OVERRIDE_SOURCES.INFERENCE] || 3;

    if (overridePriority > inferencePriority) {
      return {
        block: true,
        reason: 'User explicit override takes priority',
        overrideValue: override.value,
        inferenceValue,
        priority: {
          override: overridePriority,
          inference: inferencePriority
        }
      };
    }

    return {
      block: false,
      reason: 'Inference has higher or equal priority'
    };
  }

  /**
   * Revoke an override
   * @param {string} field - Field to revoke
   * @param {string} reason - Reason for revocation
   * @returns {boolean} True if revoked
   */
  revokeOverride(field, reason = 'User revoked') {
    if (this.overrides.has(field)) {
      const override = this.overrides.get(field);
      override.status = OVERRIDE_STATUS.REVOKED;
      override.revokedAt = new Date().toISOString();
      override.revokedReason = reason;
      
      this.unfreeze(field);
      
      return true;
    }
    return false;
  }

  /**
   * Update override value
   * @param {string} field - Field to update
   * @param {any} value - New value
   * @param {string} reason - Reason for update
   * @returns {Object} Updated override
   */
  updateOverride(field, value, reason = 'User updated') {
    if (this.overrides.has(field)) {
      const override = this.overrides.get(field);
      const oldValue = override.value;
      
      override.value = value;
      override.history.push({
        action: 'update',
        oldValue,
        newValue: value,
        reason,
        timestamp: new Date().toISOString()
      });
      override.updatedAt = new Date().toISOString();

      // Update frozen field
      if (this.frozenFields.has(field)) {
        const frozen = this.frozenFields.get(field);
        frozen.value = value;
        frozen.updatedAt = new Date().toISOString();
      }

      return override;
    }
    return null;
  }

  /**
   * Get all active overrides
   * @param {string} source - Optional source filter
   * @returns {Array} Active overrides
   */
  getActiveOverrides(source = null) {
    const active = [];
    for (const [field, override] of this.overrides) {
      if (override.status === OVERRIDE_STATUS.ACTIVE) {
        if (!source || override.source === source) {
          active.push({ field, ...override });
        }
      }
    }
    return active;
  }

  /**
   * Get all frozen fields
   * @returns {Array} Frozen fields
   */
  getFrozenFields() {
    const frozen = [];
    for (const [field, data] of this.frozenFields) {
      frozen.push({ field, ...data });
    }
    return frozen;
  }

  /**
   * Get override history
   * @param {string} field - Optional field filter
   * @param {number} limit - Number of records
   * @returns {Array} History records
   */
  getHistory(field = null, limit = 10) {
    let history = this.overrideHistory;
    if (field) {
      history = history.filter(h => h.field === field);
    }
    return history.slice(-limit).reverse();
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const active = this.getActiveOverrides();
    const frozen = this.getFrozenFields();
    
    return {
      totalOverrides: this.overrides.size,
      activeOverrides: active.length,
      frozenFields: frozen.length,
      bySource: this.getSourceStats(),
      historySize: this.overrideHistory.length
    };
  }

  /**
   * Get source statistics
   * @returns {Object} Source stats
   */
  getSourceStats() {
    const stats = {};
    for (const [field, override] of this.overrides) {
      const source = override.source || 'unknown';
      stats[source] = (stats[source] || 0) + 1;
    }
    return stats;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.overrides.clear();
    this.frozenFields.clear();
    this.overrideHistory = [];
  }
}

module.exports = OverrideManager;