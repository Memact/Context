/**
 * Role Resolver - Resolves role conflicts and unifies taxonomy
 */

const { UNIFIED_ROLES, ROLE_HIERARCHY, CONFLICT_SEVERITY } = require('./role-constants');

class RoleResolver {
  constructor(options = {}) {
    this.unifiedRoles = options.unifiedRoles || UNIFIED_ROLES;
    this.roleHierarchy = options.roleHierarchy || ROLE_HIERARCHY;
    this.resolvedRoles = new Map();
    this.resolutionHistory = [];
    this.maxHistory = options.maxHistory || 100;
  }

  /**
   * Resolve role conflicts
   * @param {Object} analysis - Role analysis
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolve(analysis, options = {}) {
    const { strategy = 'highest_priority', storeResolution = true } = options;
    const resolved = [];

    for (const [entity, roles] of Object.entries(analysis.groupedRoles)) {
      const resolution = this.resolveEntity(entity, roles, strategy);
      resolved.push(resolution);
      
      // Store resolved role
      this.resolvedRoles.set(entity, resolution);
    }

    // Generate unified view
    const unifiedView = this.generateUnifiedView(resolved);

    const result = {
      resolved,
      unifiedView,
      strategy,
      stats: {
        totalEntities: resolved.length,
        resolvedConflicts: resolved.filter(r => r.conflictResolved).length,
        unresolvedConflicts: resolved.filter(r => !r.conflictResolved).length
      },
      timestamp: new Date().toISOString()
    };

    if (storeResolution) {
      this.recordResolution(result);
    }

    return result;
  }

  /**
   * Resolve roles for a single entity
   * @param {string} entity - Entity name
   * @param {Array} roles - Roles for entity
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolution
   */
  resolveEntity(entity, roles, strategy) {
    let resolvedRole = null;
    let conflictResolved = false;
    let reason = '';

    switch (strategy) {
      case 'highest_priority':
        resolvedRole = this.resolveByHighestPriority(roles);
        conflictResolved = true;
        reason = 'Selected highest priority role';
        break;
      case 'lowest_priority':
        resolvedRole = this.resolveByLowestPriority(roles);
        conflictResolved = true;
        reason = 'Selected lowest priority role';
        break;
      case 'majority':
        resolvedRole = this.resolveByMajority(roles);
        conflictResolved = true;
        reason = 'Selected majority role';
        break;
      case 'most_recent':
        resolvedRole = this.resolveByMostRecent(roles);
        conflictResolved = true;
        reason = 'Selected most recent role';
        break;
      default:
        resolvedRole = this.resolveByHighestPriority(roles);
        conflictResolved = true;
        reason = 'Default: selected highest priority role';
    }

    return {
      entity,
      originalRoles: roles,
      resolvedRole,
      conflictResolved,
      reason,
      unifiedRole: resolvedRole?.unifiedRole || null,
      hierarchyLevel: resolvedRole?.hierarchyLevel || 0
    };
  }

  /**
   * Resolve by highest priority (hierarchy level)
   * @param {Array} roles - Roles
   * @returns {Object} Highest priority role
   */
  resolveByHighestPriority(roles) {
    return roles.reduce((a, b) => a.hierarchyLevel > b.hierarchyLevel ? a : b);
  }

  /**
   * Resolve by lowest priority (hierarchy level)
   * @param {Array} roles - Roles
   * @returns {Object} Lowest priority role
   */
  resolveByLowestPriority(roles) {
    return roles.reduce((a, b) => a.hierarchyLevel < b.hierarchyLevel ? a : b);
  }

  /**
   * Resolve by majority (most common role)
   * @param {Array} roles - Roles
   * @returns {Object} Majority role
   */
  resolveByMajority(roles) {
    const roleCount = {};
    for (const role of roles) {
      const key = role.unifiedRole;
      roleCount[key] = (roleCount[key] || 0) + 1;
    }

    let maxCount = 0;
    let majorityRole = null;

    for (const [role, count] of Object.entries(roleCount)) {
      if (count > maxCount) {
        maxCount = count;
        majorityRole = role;
      }
    }

    return roles.find(r => r.unifiedRole === majorityRole) || roles[0];
  }

  /**
   * Resolve by most recent
   * @param {Array} roles - Roles
   * @returns {Object} Most recent role
   */
  resolveByMostRecent(roles) {
    const sorted = [...roles].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
    return sorted[0];
  }

  /**
   * Generate unified view
   * @param {Array} resolved - Resolved roles
   * @returns {Object} Unified view
   */
  generateUnifiedView(resolved) {
    const view = {
      roles: {},
      summary: {
        totalEntities: resolved.length,
        byRole: {},
        hierarchyDistribution: {}
      }
    };

    for (const item of resolved) {
      const role = item.unifiedRole || 'unknown';
      view.roles[item.entity] = {
        role,
        level: item.hierarchyLevel,
        source: item.resolvedRole?.source || 'unknown'
      };

      view.summary.byRole[role] = (view.summary.byRole[role] || 0) + 1;
      
      const level = item.hierarchyLevel;
      const levelKey = Math.floor(level / 20) * 20;
      view.summary.hierarchyDistribution[levelKey] = (view.summary.hierarchyDistribution[levelKey] || 0) + 1;
    }

    return view;
  }

  /**
   * Get resolved role for entity
   * @param {string} entity - Entity name
   * @returns {Object|null} Resolved role
   */
  getResolvedRole(entity) {
    return this.resolvedRoles.get(entity) || null;
  }

  /**
   * Get all resolved roles
   * @returns {Array} All resolved roles
   */
  getAllResolvedRoles() {
    const roles = [];
    for (const [entity, role] of this.resolvedRoles) {
      roles.push({ entity, ...role });
    }
    return roles;
  }

  /**
   * Record resolution
   * @param {Object} result - Resolution result
   */
  recordResolution(result) {
    this.resolutionHistory.push({
      ...result,
      recordedAt: new Date().toISOString(),
      id: this.generateId()
    });

    if (this.resolutionHistory.length > this.maxHistory) {
      this.resolutionHistory.shift();
    }
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
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.resolutionHistory.length;
    const resolved = this.resolutionHistory.filter(h => h.stats.resolvedConflicts > 0).length;

    return {
      totalResolutions: total,
      totalResolved: resolved,
      totalEntities: this.resolvedRoles.size,
      byStrategy: this.getStrategyStats()
    };
  }

  /**
   * Get strategy statistics
   * @returns {Object} Strategy stats
   */
  getStrategyStats() {
    const stats = {};
    for (const record of this.resolutionHistory) {
      const strategy = record.strategy || 'unknown';
      stats[strategy] = (stats[strategy] || 0) + 1;
    }
    return stats;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `role-resolve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.resolvedRoles.clear();
    this.resolutionHistory = [];
  }
}

module.exports = RoleResolver;