/**
 * Role Analyzer - Analyzes and maps role declarations
 */

const {
  ROLE_SOURCES,
  UNIFIED_ROLES,
  ROLE_HIERARCHY,
  SOURCE_MAPPINGS,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY
} = require('./role-constants');

class RoleAnalyzer {
  constructor(options = {}) {
    this.sourceMappings = options.sourceMappings || SOURCE_MAPPINGS;
    this.roleHierarchy = options.roleHierarchy || ROLE_HIERARCHY;
    this.unifiedRoles = options.unifiedRoles || UNIFIED_ROLES;
  }

  /**
   * Analyze roles from multiple sources
   * @param {Array} roleDeclarations - Role declarations from different sources
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis result
   */
  analyze(roleDeclarations, options = {}) {
    // Map roles to unified taxonomy
    const mappedRoles = this.mapRoles(roleDeclarations);
    
    // Group by user/entity
    const groupedRoles = this.groupRolesByEntity(mappedRoles);
    
    // Detect conflicts
    const conflicts = this.detectConflicts(groupedRoles);
    
    // Analyze hierarchy differences
    const hierarchyDifferences = this.analyzeHierarchy(groupedRoles);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(mappedRoles);

    // Generate recommendations
    const recommendations = this.getRecommendations(conflicts, hierarchyDifferences);

    return {
      mappedRoles,
      groupedRoles,
      conflicts,
      hierarchyDifferences,
      confidence,
      recommendations,
      summary: this.generateSummary(groupedRoles, conflicts),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Map roles to unified taxonomy
   * @param {Array} declarations - Role declarations
   * @returns {Array} Mapped roles
   */
  mapRoles(declarations) {
    const mapped = [];

    for (const declaration of declarations) {
      const { source, role, user, entity } = declaration;
      
      // Get mapping for source
      const mapping = this.sourceMappings[source] || {};
      const unifiedRole = mapping[role] || this.guessRole(role);
      
      mapped.push({
        source,
        originalRole: role,
        unifiedRole,
        user,
        entity,
        hierarchyLevel: this.roleHierarchy[unifiedRole] || 0,
        confidence: this.calculateRoleConfidence(source, role, unifiedRole)
      });
    }

    return mapped;
  }

  /**
   * Guess role if not in mapping
   * @param {string} role - Original role
   * @returns {string} Guessed unified role
   */
  guessRole(role) {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('owner')) return UNIFIED_ROLES.OWNER;
    if (roleLower.includes('admin') || roleLower.includes('administrator')) return UNIFIED_ROLES.ADMIN;
    if (roleLower.includes('manager')) return UNIFIED_ROLES.MANAGER;
    if (roleLower.includes('contributor')) return UNIFIED_ROLES.CONTRIBUTOR;
    if (roleLower.includes('editor')) return UNIFIED_ROLES.EDITOR;
    if (roleLower.includes('viewer') || roleLower.includes('reader')) return UNIFIED_ROLES.VIEWER;
    if (roleLower.includes('guest')) return UNIFIED_ROLES.GUEST;
    
    return UNIFIED_ROLES.MEMBER; // Default
  }

  /**
   * Group roles by user/entity
   * @param {Array} mappedRoles - Mapped roles
   * @returns {Object} Grouped roles
   */
  groupRolesByEntity(mappedRoles) {
    const grouped = {};

    for (const role of mappedRoles) {
      const key = role.user || role.entity || 'unknown';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(role);
    }

    return grouped;
  }

  /**
   * Detect conflicts in grouped roles
   * @param {Object} groupedRoles - Grouped roles
   * @returns {Array} Conflicts
   */
  detectConflicts(groupedRoles) {
    const conflicts = [];

    for (const [entity, roles] of Object.entries(groupedRoles)) {
      // Check for role mismatches
      const uniqueRoles = new Set(roles.map(r => r.unifiedRole));
      if (uniqueRoles.size > 1) {
        conflicts.push({
          type: CONFLICT_TYPES.ROLE_MISMATCH,
          entity,
          roles: roles.map(r => ({
            source: r.source,
            role: r.unifiedRole,
            original: r.originalRole
          })),
          severity: this.calculateConflictSeverity(roles),
          description: `Multiple roles detected for ${entity}`
        });
      }

      // Check hierarchy differences
      const hierarchyLevels = roles.map(r => r.hierarchyLevel);
      const maxLevel = Math.max(...hierarchyLevels);
      const minLevel = Math.min(...hierarchyLevels);
      const diff = maxLevel - minLevel;

      if (diff > 30) {
        conflicts.push({
          type: CONFLICT_TYPES.HIERARCHY_DIFFERENCE,
          entity,
          difference: diff,
          maxLevel,
          minLevel,
          severity: CONFLICT_SEVERITY.HIGH,
          description: `Significant hierarchy difference (${diff} points) for ${entity}`
        });
      }

      // Check for missing roles
      const sources = new Set(roles.map(r => r.source));
      const expectedSources = Object.keys(this.sourceMappings);
      
      for (const source of expectedSources) {
        if (!sources.has(source) && source !== ROLE_SOURCES.CUSTOM) {
          conflicts.push({
            type: CONFLICT_TYPES.MISSING_ROLE,
            entity,
            source,
            severity: CONFLICT_SEVERITY.MEDIUM,
            description: `No role found for ${entity} in ${source}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Analyze hierarchy differences
   * @param {Object} groupedRoles - Grouped roles
   * @returns {Array} Hierarchy differences
   */
  analyzeHierarchy(groupedRoles) {
    const differences = [];

    for (const [entity, roles] of Object.entries(groupedRoles)) {
      const hierarchyMap = {};
      for (const role of roles) {
        hierarchyMap[role.source] = {
          role: role.unifiedRole,
          level: role.hierarchyLevel
        };
      }

      differences.push({
        entity,
        hierarchyMap,
        maxRole: Object.values(hierarchyMap).reduce((a, b) => a.level > b.level ? a : b),
        minRole: Object.values(hierarchyMap).reduce((a, b) => a.level < b.level ? a : b)
      });
    }

    return differences;
  }

  /**
   * Calculate conflict severity
   * @param {Array} roles - Roles
   * @returns {string} Severity
   */
  calculateConflictSeverity(roles) {
    const levels = roles.map(r => r.hierarchyLevel);
    const maxLevel = Math.max(...levels);
    const minLevel = Math.min(...levels);
    const diff = maxLevel - minLevel;

    if (diff > 50) return CONFLICT_SEVERITY.CRITICAL;
    if (diff > 30) return CONFLICT_SEVERITY.HIGH;
    if (diff > 15) return CONFLICT_SEVERITY.MEDIUM;
    return CONFLICT_SEVERITY.LOW;
  }

  /**
   * Calculate role confidence
   * @param {string} source - Source
   * @param {string} role - Original role
   * @param {string} unifiedRole - Unified role
   * @returns {number} Confidence score
   */
  calculateRoleConfidence(source, role, unifiedRole) {
    let confidence = 0.7;

    // Higher confidence if mapping exists
    if (this.sourceMappings[source] && this.sourceMappings[source][role]) {
      confidence += 0.2;
    }

    // Higher confidence if role matches hierarchy
    const hierarchyLevel = this.roleHierarchy[unifiedRole];
    if (hierarchyLevel > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Calculate overall confidence
   * @param {Array} mappedRoles - Mapped roles
   * @returns {number} Confidence score
   */
  calculateConfidence(mappedRoles) {
    if (mappedRoles.length === 0) return 0.3;
    
    const avgConfidence = mappedRoles.reduce((sum, r) => sum + r.confidence, 0) / mappedRoles.length;
    const sourceVariety = new Set(mappedRoles.map(r => r.source)).size;
    
    let confidence = avgConfidence;
    if (sourceVariety > 1) confidence += 0.1;
    if (mappedRoles.length > 3) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * Get recommendations
   * @param {Array} conflicts - Conflicts
   * @param {Array} hierarchyDifferences - Hierarchy differences
   * @returns {Array} Recommendations
   */
  getRecommendations(conflicts, hierarchyDifferences) {
    const recommendations = [];

    const criticalConflicts = conflicts.filter(c => c.severity === CONFLICT_SEVERITY.CRITICAL);
    const highConflicts = conflicts.filter(c => c.severity === CONFLICT_SEVERITY.HIGH);

    if (criticalConflicts.length > 0) {
      recommendations.push({
        action: 'resolve_critical',
        message: `${criticalConflicts.length} critical role conflicts detected`,
        priority: 'critical',
        conflicts: criticalConflicts
      });
    }

    if (highConflicts.length > 0) {
      recommendations.push({
        action: 'review_high_priority',
        message: `${highConflicts.length} high-priority role conflicts detected`,
        priority: 'high'
      });
    }

    // Check hierarchy alignment
    for (const diff of hierarchyDifferences) {
      if (diff.maxRole.level - diff.minRole.level > 50) {
        recommendations.push({
          action: 'align_hierarchy',
          message: `Hierarchy misalignment for ${diff.entity}`,
          priority: 'high'
        });
      }
    }

    // Unified taxonomy recommendation
    recommendations.push({
      action: 'adopt_unified_taxonomy',
      message: 'Consider using unified role taxonomy across all platforms',
      priority: 'medium'
    });

    return recommendations;
  }

  /**
   * Generate summary
   * @param {Object} groupedRoles - Grouped roles
   * @param {Array} conflicts - Conflicts
   * @returns {Object} Summary
   */
  generateSummary(groupedRoles, conflicts) {
    const totalEntities = Object.keys(groupedRoles).length;
    const totalConflicts = conflicts.length;
    const bySeverity = {
      [CONFLICT_SEVERITY.CRITICAL]: 0,
      [CONFLICT_SEVERITY.HIGH]: 0,
      [CONFLICT_SEVERITY.MEDIUM]: 0,
      [CONFLICT_SEVERITY.LOW]: 0
    };

    for (const conflict of conflicts) {
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] || 0) + 1;
    }

    return {
      totalEntities,
      totalConflicts,
      bySeverity,
      conflictRate: totalEntities > 0 ? (totalConflicts / totalEntities) * 100 : 0
    };
  }
}

module.exports = RoleAnalyzer;