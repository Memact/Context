/**
 * Context Locker - Locks technical contexts from merging with documentation
 */

const { DOMAIN_TYPES, SOURCE_TYPES, ISOLATION_STATUS } = require('./domain-constants');

class ContextLocker {
  constructor(domainIsolator) {
    this.domainIsolator = domainIsolator;
    this.lockedContexts = new Map();
  }

  /**
   * Lock a context to prevent merging
   * @param {Object} context - Context to lock
   * @param {string} reason - Reason for locking
   * @returns {Object} Locked context
   */
  lock(context, reason = 'Domain isolation required') {
    const isolated = this.domainIsolator.isolate(context);
    
    if (isolated.domain === DOMAIN_TYPES.TECHNICAL) {
      const locked = {
        ...isolated,
        locked: true,
        lockedAt: new Date().toISOString(),
        reason,
        mergeable: false,
        status: ISOLATION_STATUS.ISOLATED
      };
      
      this.lockedContexts.set(isolated.isolationId, locked);
      return locked;
    }

    return {
      ...isolated,
      locked: false,
      reason: 'Only technical contexts are locked'
    };
  }

  /**
   * Check if a context is locked
   * @param {string} id - Context ID
   * @returns {boolean} True if locked
   */
  isLocked(id) {
    return this.lockedContexts.has(id);
  }

  /**
   * Unlock a context
   * @param {string} id - Context ID
   * @returns {boolean} True if unlocked
   */
  unlock(id) {
    if (this.lockedContexts.has(id)) {
      this.lockedContexts.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get all locked contexts
   * @param {string} domain - Optional domain filter
   * @returns {Array} Locked contexts
   */
  getLocked(domain = null) {
    const result = [];
    for (const [id, context] of this.lockedContexts) {
      if (!domain || context.domain === domain) {
        result.push({ id, ...context });
      }
    }
    return result;
  }

  /**
   * Attempt to merge contexts (with lock check)
   * @param {Object} context1 - First context
   * @param {Object} context2 - Second context
   * @returns {Object} Merge result
   */
  attemptMerge(context1, context2) {
    const id1 = context1.isolationId || context1.id;
    const id2 = context2.isolationId || context2.id;

    const isLocked1 = this.isLocked(id1);
    const isLocked2 = this.isLocked(id2);

    // If either is locked, prevent merge
    if (isLocked1 || isLocked2) {
      return {
        merged: false,
        reason: `Context(s) locked: ${isLocked1 ? id1 : ''} ${isLocked2 ? id2 : ''}`,
        locked: true,
        contexts: [context1, context2]
      };
    }

    // Check for domain conflicts
    const conflict = this.domainIsolator.checkConflict(context1, context2);
    
    if (conflict.hasConflict) {
      return {
        merged: false,
        reason: 'Domain conflict detected',
        conflict,
        contexts: [context1, context2]
      };
    }

    // Merge allowed
    const merged = {
      ...context1,
      ...context2,
      mergedAt: new Date().toISOString(),
      mergeId: this.generateId(),
      sources: [context1.source, context2.source]
    };

    return {
      merged: true,
      mergedContext: merged,
      reason: 'No conflicts detected'
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `merge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get lock statistics
   * @returns {Object} Lock statistics
   */
  getStats() {
    const locked = this.getLocked();
    const technical = this.getLocked(DOMAIN_TYPES.TECHNICAL);
    const documentation = this.getLocked(DOMAIN_TYPES.DOCUMENTATION);

    return {
      totalLocked: locked.length,
      technical: technical.length,
      documentation: documentation.length,
      bySource: this.getLockedBySource()
    };
  }

  /**
   * Get locked contexts by source
   * @returns {Object} Locked by source
   */
  getLockedBySource() {
    const bySource = {};
    for (const [id, context] of this.lockedContexts) {
      const source = context.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    }
    return bySource;
  }
}

module.exports = ContextLocker;