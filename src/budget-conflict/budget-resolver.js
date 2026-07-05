/**
 * Budget Resolver - Resolves budget conflicts and generates recommendations
 */

const { BUDGET_STATUS, RECOMMENDATION_ACTIONS, SOURCE_TYPES } = require('./budget-constants');

class BudgetResolver {
  constructor(options = {}) {
    this.conflictThreshold = options.conflictThreshold || 1.1;
    this.resolvedConflicts = [];
    this.pendingConflicts = [];
  }

  /**
   * Resolve budget conflicts
   * @param {Object} analysis - Budget analysis
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolve(analysis, options = {}) {
    const { conflicts } = analysis;
    const resolved = {
      resolved: true,
      timestamp: new Date().toISOString(),
      actions: [],
      warnings: []
    };

    // Handle total budget conflict
    if (conflicts.total) {
      const result = this.resolveTotalBudgetConflict(conflicts.total, options);
      resolved.actions.push(result.action);
      if (result.warning) {
        resolved.warnings.push(result.warning);
      }
    }

    // Handle category conflicts
    for (const conflict of conflicts.category) {
      const result = this.resolveCategoryConflict(conflict, options);
      resolved.actions.push(result.action);
      if (result.warning) {
        resolved.warnings.push(result.warning);
      }
    }

    // Generate final recommendations
    resolved.recommendations = this.generateRecommendations(analysis, resolved);

    // Store resolved conflict
    this.resolvedConflicts.push({
      id: this.generateId(),
      resolved,
      analysis,
      timestamp: new Date().toISOString()
    });

    return resolved;
  }

  /**
   * Resolve total budget conflict
   * @param {Object} conflict - Total budget conflict
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolveTotalBudgetConflict(conflict, options = {}) {
    const { preference = 'budget' } = options;
    const { spent, budget, excess } = conflict;

    if (preference === 'budget') {
      return {
        action: {
          type: 'restrict_spending',
          message: `Budget exceeded by ₹${excess}. Restricting further spending.`,
          budget: budget,
          spent: spent,
          remaining: 0,
          actionRequired: true
        },
        warning: `⚠️ Total budget exceeded! Consider reducing spending.`
      };
    }

    return {
      action: {
        type: 'allow_spending',
        message: `Spending ₹${spent} exceeds budget by ₹${excess}. Review recommended.`,
        budget: budget,
        spent: spent,
        remaining: spent - budget,
        actionRequired: false
      }
    };
  }

  /**
   * Resolve category budget conflict
   * @param {Object} conflict - Category budget conflict
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolveCategoryConflict(conflict, options = {}) {
    const { preference = 'budget' } = options;
    const { category, spent, budget, excess } = conflict;

    if (preference === 'budget') {
      return {
        action: {
          type: 'category_restriction',
          category,
          message: `${category} budget exceeded by ₹${excess}. Consider cheaper alternatives.`,
          budget,
          spent,
          excess,
          actionRequired: true
        },
        warning: `⚠️ ${category} over budget!`
      };
    }

    return {
      action: {
        type: 'category_warning',
        category,
        message: `${category} spending (₹${spent}) exceeds budget (₹${budget}).`,
        budget,
        spent,
        excess,
        actionRequired: false
      },
      warning: `📊 ${category} over budget - review recommended.`
    };
  }

  /**
   * Generate final recommendations
   * @param {Object} analysis - Budget analysis
   * @param {Object} resolved - Resolved conflicts
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis, resolved) {
    const recommendations = [];

    // Check if budget was exceeded
    if (analysis.status.total === BUDGET_STATUS.EXCEEDED) {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.WARN,
        priority: 'high',
        message: 'Total budget exceeded. Consider reducing spending in over-budget categories.',
        details: {
          totalBudget: analysis.budget.total,
          totalSpent: analysis.spending.total,
          overspend: analysis.spending.total - analysis.budget.total
        }
      });
    }

    // Check category overruns
    for (const [category, data] of Object.entries(analysis.status.categories)) {
      if (data.status === BUDGET_STATUS.EXCEEDED) {
        recommendations.push({
          action: RECOMMENDATION_ACTIONS.SUGGEST_ALTERNATIVE,
          priority: 'medium',
          category,
          message: `Find cheaper alternatives in ${category} category`,
          details: {
            current: data.spent,
            limit: data.budget,
            savingsNeeded: data.spent - data.budget
          }
        });
      }
    }

    // Check if budget is being utilized well
    const utilization = analysis.spending.utilization;
    if (utilization > 80) {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.WARN,
        priority: 'low',
        message: `Budget utilization at ${utilization.toFixed(0)}% - consider reviewing upcoming purchases`,
        details: {
          utilization,
          remaining: analysis.budget.total - analysis.spending.total
        }
      });
    }

    return recommendations;
  }

  /**
   * Get resolved conflicts
   * @param {string} status - Filter by status
   * @returns {Array} Resolved conflicts
   */
  getResolved(status = null) {
    if (status) {
      return this.resolvedConflicts.filter(c => c.status === status);
    }
    return this.resolvedConflicts;
  }

  /**
   * Get conflict history
   * @param {number} limit - Number of records
   * @returns {Array} Conflict history
   */
  getHistory(limit = 10) {
    return this.resolvedConflicts.slice(-limit).reverse();
  }

  /**
   * Get stats
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.resolvedConflicts.length;
    
    return {
      totalResolved: total,
      totalWarnings: this.resolvedConflicts.reduce((sum, c) => 
        sum + (c.resolved.warnings?.length || 0), 0
      ),
      totalActions: this.resolvedConflicts.reduce((sum, c) => 
        sum + (c.resolved.actions?.length || 0), 0
      )
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `budget-resolve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.resolvedConflicts = [];
    this.pendingConflicts = [];
  }
}

module.exports = BudgetResolver;