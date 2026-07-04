/**
 * Context Freezer - Freezes context fields with user_explicit flag
 */

const { FIELD_STATUS, OVERRIDE_SOURCES } = require('./override-constants');

class ContextFreezer {
  constructor(overrideManager) {
    this.overrideManager = overrideManager;
    this.frozenContexts = new Map();
  }

  /**
   * Freeze a context field
   * @param {Object} context - Context to freeze
   * @param {Object} options - Options
   * @returns {Object} Frozen context
   */
  freezeContext(context, options = {}) {
    const { field, value, source = OVERRIDE_SOURCES.USER_EXPLICIT, reason } = options;

    // Set override
    const override = this.overrideManager.setOverride(field, value, {
      source,
      reason,
      expiresAt: options.expiresAt || null
    });

    // Mark context as frozen
    const frozen = {
      ...context,
      _frozen: true,
      _overrideId: override.id,
      _frozenAt: new Date().toISOString(),
      _source: source,
      _reason: reason || 'User explicit override',
      status: FIELD_STATUS.FROZEN
    };

    this.frozenContexts.set(field, frozen);

    return frozen;
  }

  /**
   * Check if context is frozen
   * @param {string} field - Field to check
   * @returns {boolean} True if frozen
   */
  isFrozen(field) {
    return this.overrideManager.isFrozen(field);
  }

  /**
   * Apply freezer to context
   * @param {Object} context - Context to process
   * @param {Array} explicitFields - Fields marked as explicit
   * @returns {Object} Processed context
   */
  apply(context, explicitFields = []) {
    if (!context) return context;

    const processed = { ...context };

    for (const field of explicitFields) {
      if (context[field] !== undefined) {
        // Freeze this field
        const frozen = this.freezeContext(context, {
          field,
          value: context[field],
          source: OVERRIDE_SOURCES.USER_EXPLICIT
        });
        processed[field] = frozen;
      }
    }

    return processed;
  }

  /**
   * Process incoming inference
   * @param {string} field - Field name
   * @param {any} inferenceValue - Inference value
   * @param {Object} options - Options
   * @returns {Object} Processed inference
   */
  processInference(field, inferenceValue, options = {}) {
    // Check if field is frozen
    if (this.overrideManager.isFrozen(field)) {
      const blockResult = this.overrideManager.shouldBlockInference(field, inferenceValue);
      
      if (blockResult.block) {
        return {
          field,
          blocked: true,
          reason: blockResult.reason,
          originalValue: inferenceValue,
          frozenValue: blockResult.overrideValue,
          priority: blockResult.priority,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      field,
      blocked: false,
      value: inferenceValue,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get frozen context for a field
   * @param {string} field - Field name
   * @returns {Object|null} Frozen context or null
   */
  getFrozenContext(field) {
    return this.frozenContexts.get(field) || null;
  }

  /**
   * Get all frozen contexts
   * @returns {Array} All frozen contexts
   */
  getAllFrozenContexts() {
    const result = [];
    for (const [field, context] of this.frozenContexts) {
      result.push({ field, ...context });
    }
    return result;
  }

  /**
   * Unfreeze a context
   * @param {string} field - Field to unfreeze
   * @param {string} reason - Reason for unfreezing
   * @returns {boolean} True if unfrozen
   */
  unfreeze(field, reason = 'User unfroze') {
    if (this.frozenContexts.has(field)) {
      const context = this.frozenContexts.get(field);
      this.overrideManager.revokeOverride(field, reason);
      this.frozenContexts.delete(field);
      return true;
    }
    return false;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const frozenCount = this.frozenContexts.size;
    const overrides = this.overrideManager.getStats();

    return {
      frozenContexts: frozenCount,
      ...overrides
    };
  }
}

module.exports = ContextFreezer;