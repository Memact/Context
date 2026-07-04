/**
 * Domain Isolator - Enforces domain isolation between technical and documentation contexts
 */

const {
  DOMAIN_TYPES,
  SOURCE_TYPES,
  CONTEXT_TYPES,
  ISOLATION_RULES,
  CONFLICT_TYPES,
  ISOLATION_STATUS
} = require('./domain-constants');

class DomainIsolator {
  constructor(options = {}) {
    this.isolationRules = options.isolationRules || ISOLATION_RULES;
    this.isolatedContexts = new Map();
    this.conflicts = [];
    this.conflictHistory = [];
  }

  /**
   * Isolate a context based on its source
   * @param {Object} context - Context to isolate
   * @returns {Object} Isolated context
   */
  isolate(context) {
    const { source, type, content, metadata } = context;
    
    // Get isolation rules for this source
    const rules = this.isolationRules[source];
    if (!rules) {
      return {
        ...context,
        domain: DOMAIN_TYPES.GENERAL,
        isolated: false,
        status: ISOLATION_STATUS.PENDING,
        reason: 'No isolation rules found'
      };
    }

    // Check if context is allowed
    const isAllowed = rules.allowedContexts.includes(type);
    if (!isAllowed) {
      return {
        ...context,
        domain: rules.domain,
        isolated: true,
        status: ISOLATION_STATUS.CONFLICTING,
        reason: `Context type '${type}' not allowed for source '${source}'`,
        rules
      };
    }

    // Create isolated context
    const isolated = {
      ...context,
      domain: rules.domain,
      isolated: true,
      status: ISOLATION_STATUS.ISOLATED,
      priority: rules.priority,
      mergeable: rules.mergeable,
      rules,
      isolatedAt: new Date().toISOString(),
      isolationId: this.generateId()
    };

    // Store isolated context
    this.isolatedContexts.set(isolated.isolationId, isolated);

    return isolated;
  }

  /**
   * Check for conflicts between two contexts
   * @param {Object} context1 - First context
   * @param {Object} context2 - Second context
   * @returns {Object} Conflict analysis
   */
  checkConflict(context1, context2) {
    const isolated1 = this.isolate(context1);
    const isolated2 = this.isolate(context2);

    const conflicts = [];

    // Check domain mismatch
    if (isolated1.domain !== isolated2.domain) {
      conflicts.push({
        type: CONFLICT_TYPES.DOMAIN_MISMATCH,
        description: `Domain mismatch: ${isolated1.domain} vs ${isolated2.domain}`,
        severity: 'high'
      });
    }

    // Check context overlap
    if (isolated1.type === isolated2.type) {
      conflicts.push({
        type: CONFLICT_TYPES.CONTEXT_OVERLAP,
        description: `Context overlap: both are ${isolated1.type}`,
        severity: 'medium'
      });
    }

    // Check priority conflict
    if (isolated1.priority && isolated2.priority && isolated1.priority === isolated2.priority) {
      conflicts.push({
        type: CONFLICT_TYPES.PRIORITY_CONFLICT,
        description: `Priority conflict: both have priority ${isolated1.priority}`,
        severity: 'low'
      });
    }

    const hasConflict = conflicts.length > 0;
    const status = hasConflict ? ISOLATION_STATUS.CONFLICTING : ISOLATION_STATUS.ISOLATED;

    const conflictResult = {
      context1: isolated1,
      context2: isolated2,
      hasConflict,
      conflicts,
      status,
      resolution: hasConflict ? this.resolveConflict(isolated1, isolated2, conflicts) : null
    };

    if (hasConflict) {
      this.conflicts.push(conflictResult);
      this.conflictHistory.push({
        timestamp: new Date().toISOString(),
        conflictResult,
        resolved: false
      });
    }

    return conflictResult;
  }

  /**
   * Resolve conflict between contexts
   * @param {Object} context1 - First context
   * @param {Object} context2 - Second context
   * @param {Array} conflicts - List of conflicts
   * @returns {Object} Resolution result
   */
  resolveConflict(context1, context2, conflicts) {
    const resolution = {
      winner: null,
      strategy: 'domain_isolation',
      reason: '',
      merged: false
    };

    // Check if domains are different - keep separate
    if (context1.domain !== context2.domain) {
      resolution.winner = 'both';
      resolution.reason = 'Domains are different - keeping both isolated';
      resolution.merged = false;
      return resolution;
    }

    // If same domain, use priority
    if (context1.priority && context2.priority) {
      if (context1.priority > context2.priority) {
        resolution.winner = 'context1';
        resolution.reason = `Higher priority (${context1.priority} vs ${context2.priority})`;
        resolution.merged = true;
        return resolution;
      }
      if (context2.priority > context1.priority) {
        resolution.winner = 'context2';
        resolution.reason = `Higher priority (${context2.priority} vs ${context1.priority})`;
        resolution.merged = true;
        return resolution;
      }
    }

    // Tie breaker - check source type
    const sourceOrder = [SOURCE_TYPES.ESLINT, SOURCE_TYPES.PRETTIER, SOURCE_TYPES.CODE_EDITOR, SOURCE_TYPES.NOTION, SOURCE_TYPES.STYLE_GUIDE, SOURCE_TYPES.WORKSPACE_NOTES];
    
    const index1 = sourceOrder.indexOf(context1.source);
    const index2 = sourceOrder.indexOf(context2.source);

    if (index1 !== -1 && index2 !== -1) {
      if (index1 < index2) {
        resolution.winner = 'context1';
        resolution.reason = `Source priority: ${context1.source} takes precedence`;
        resolution.merged = true;
        return resolution;
      }
      if (index2 < index1) {
        resolution.winner = 'context2';
        resolution.reason = `Source priority: ${context2.source} takes precedence`;
        resolution.merged = true;
        return resolution;
      }
    }

    // Default: keep both
    resolution.winner = 'both';
    resolution.reason = 'Default: keeping both contexts isolated';
    resolution.merged = false;

    return resolution;
  }

  /**
   * Apply isolation to a set of contexts
   * @param {Array} contexts - List of contexts
   * @returns {Array} Isolated contexts
   */
  applyIsolation(contexts) {
    const isolated = [];
    const processed = new Set();

    for (const context of contexts) {
      const isolatedContext = this.isolate(context);
      isolated.push(isolatedContext);
      processed.add(context.id || context._id);
    }

    // Check for conflicts between all pairs
    const conflictResults = [];
    for (let i = 0; i < isolated.length; i++) {
      for (let j = i + 1; j < isolated.length; j++) {
        const result = this.checkConflict(isolated[i], isolated[j]);
        if (result.hasConflict) {
          conflictResults.push(result);
        }
      }
    }

    // Resolve conflicts and apply resolutions
    for (const result of conflictResults) {
      if (result.resolution && result.resolution.winner === 'context1') {
        // Mark context2 as superseded
        const index = isolated.findIndex(c => c.isolationId === result.context2.isolationId);
        if (index !== -1) {
          isolated[index].supersededBy = result.context1.isolationId;
          isolated[index].status = ISOLATION_STATUS.RESOLVED;
        }
      } else if (result.resolution && result.resolution.winner === 'context2') {
        const index = isolated.findIndex(c => c.isolationId === result.context1.isolationId);
        if (index !== -1) {
          isolated[index].supersededBy = result.context2.isolationId;
          isolated[index].status = ISOLATION_STATUS.RESOLVED;
        }
      }
    }

    return isolated;
  }

  /**
   * Get contexts by domain
   * @param {string} domain - Domain type
   * @returns {Array} Contexts in domain
   */
  getContextsByDomain(domain) {
    const result = [];
    for (const [id, context] of this.isolatedContexts) {
      if (context.domain === domain) {
        result.push({ id, ...context });
      }
    }
    return result;
  }

  /**
   * Get conflicts by status
   * @param {string} status - Conflict status
   * @returns {Array} Conflicts
   */
  getConflicts(status = null) {
    if (status) {
      return this.conflicts.filter(c => c.status === status);
    }
    return this.conflicts;
  }

  /**
   * Get conflict history
   * @param {number} limit - Number of history items
   * @returns {Array} Conflict history
   */
  getConflictHistory(limit = 10) {
    return this.conflictHistory.slice(-limit).reverse();
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const technical = this.getContextsByDomain(DOMAIN_TYPES.TECHNICAL);
    const documentation = this.getContextsByDomain(DOMAIN_TYPES.DOCUMENTATION);
    const general = this.getContextsByDomain(DOMAIN_TYPES.GENERAL);

    const activeConflicts = this.conflicts.filter(c => c.status === ISOLATION_STATUS.CONFLICTING);
    const resolvedConflicts = this.conflicts.filter(c => c.status === ISOLATION_STATUS.RESOLVED);

    return {
      totalContexts: this.isolatedContexts.size,
      technical: technical.length,
      documentation: documentation.length,
      general: general.length,
      conflicts: {
        total: this.conflicts.length,
        active: activeConflicts.length,
        resolved: resolvedConflicts.length
      },
      history: this.conflictHistory.length
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `domain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.isolatedContexts.clear();
    this.conflicts = [];
    this.conflictHistory = [];
  }
}

module.exports = DomainIsolator;