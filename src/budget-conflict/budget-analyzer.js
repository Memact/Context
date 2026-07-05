/**
 * Budget Analyzer - Analyzes budget constraints vs actual spending
 */

const {
  SOURCE_TYPES,
  CATEGORIES,
  BUDGET_STATUS,
  CONFLICT_TYPES,
  PRIORITY_WEIGHTS
} = require('./budget-constants');

class BudgetAnalyzer {
  constructor(options = {}) {
    this.priorityWeights = options.priorityWeights || PRIORITY_WEIGHTS;
    this.budgetBuffer = options.budgetBuffer || 0.1; // 10% buffer
    this.categoryMapping = options.categoryMapping || this.getDefaultCategoryMapping();
  }

  /**
   * Analyze budget against actual spending
   * @param {Object} budget - Budget constraints
   * @param {Array} purchases - Actual purchases
   * @returns {Object} Analysis result
   */
  analyze(budget, purchases) {
    const { totalBudget, categoryBudgets, source } = budget;
    
    // Calculate total spending
    const totalSpent = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
    
    // Calculate category spending
    const categorySpending = {};
    for (const purchase of purchases) {
      const category = this.getCategory(purchase);
      categorySpending[category] = (categorySpending[category] || 0) + (purchase.price || 0);
    }

    // Check overall budget
    const totalStatus = this.checkBudget(totalSpent, totalBudget);
    
    // Check category budgets
    const categoryStatus = {};
    const categoryConflicts = [];
    
    for (const [category, spent] of Object.entries(categorySpending)) {
      const budgetLimit = categoryBudgets?.[category] || 0;
      const status = this.checkBudget(spent, budgetLimit);
      categoryStatus[category] = {
        spent,
        budget: budgetLimit,
        status,
        isConflict: status === BUDGET_STATUS.EXCEEDED || status === BUDGET_STATUS.OVER_BUDGET
      };
      
      if (status === BUDGET_STATUS.EXCEEDED || status === BUDGET_STATUS.OVER_BUDGET) {
        categoryConflicts.push({
          type: CONFLICT_TYPES.CATEGORY_OVERSPEND,
          category,
          spent,
          budget: budgetLimit,
          excess: spent - budgetLimit
        });
      }
    }

    // Detect total budget conflict
    let totalConflict = null;
    if (totalStatus === BUDGET_STATUS.EXCEEDED || totalStatus === BUDGET_STATUS.OVER_BUDGET) {
      totalConflict = {
        type: CONFLICT_TYPES.TOTAL_OVERSPEND,
        spent: totalSpent,
        budget: totalBudget,
        excess: totalSpent - totalBudget
      };
    }

    // Determine if conflicts exist
    const hasConflicts = categoryConflicts.length > 0 || totalConflict !== null;
    
    // Calculate budget utilization
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Get priority source
    const prioritySource = this.getPrioritySource(budget, purchases);

    return {
      budget: {
        total: totalBudget,
        categories: categoryBudgets,
        source: budget.source || SOURCE_TYPES.BUDGET_PLANNER
      },
      spending: {
        total: totalSpent,
        categories: categorySpending,
        purchaseCount: purchases.length,
        utilization: Math.min(100, utilization)
      },
      status: {
        total: totalStatus,
        categories: categoryStatus
      },
      conflicts: {
        hasConflicts,
        category: categoryConflicts,
        total: totalConflict
      },
      prioritySource,
      recommendations: this.getRecommendations({
        totalStatus,
        categoryStatus,
        totalSpent,
        totalBudget,
        categoryConflicts,
        totalConflict,
        prioritySource
      }),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if spending is within budget
   * @param {number} spent - Amount spent
   * @param {number} budget - Budget limit
   * @returns {string} Budget status
   */
  checkBudget(spent, budget) {
    if (budget === 0) return BUDGET_STATUS.WITHIN_LIMIT;
    
    const ratio = spent / budget;
    const buffer = this.budgetBuffer;
    
    if (ratio <= 0.9 - buffer) return BUDGET_STATUS.WITHIN_LIMIT;
    if (ratio <= 1) return BUDGET_STATUS.APPROACHING;
    if (ratio <= 1.2) return BUDGET_STATUS.EXCEEDED;
    return BUDGET_STATUS.OVER_BUDGET;
  }

  /**
   * Get category for a purchase
   * @param {Object} purchase - Purchase item
   * @returns {string} Category
   */
  getCategory(purchase) {
    // Try explicit category
    if (purchase.category && this.categoryMapping[purchase.category]) {
      return this.categoryMapping[purchase.category];
    }
    
    // Try to infer from description
    const searchText = `${purchase.name || ''} ${purchase.description || ''}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.categoryMapping)) {
      if (keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
        return category;
      }
    }
    
    return CATEGORIES.OTHER || 'other';
  }

  /**
   * Get default category mapping
   * @returns {Object} Category mapping
   */
  getDefaultCategoryMapping() {
    return {
      [CATEGORIES.ELECTRONICS]: ['laptop', 'phone', 'tablet', 'tv', 'camera', 'headphone', 'speaker'],
      [CATEGORIES.CLOTHING]: ['shirt', 'pant', 'jean', 'shoe', 'jacket', 'dress', 'suit'],
      [CATEGORIES.FOOD]: ['grocery', 'restaurant', 'cafe', 'food', 'meal', 'takeout'],
      [CATEGORIES.HOME]: ['furniture', 'sofa', 'table', 'chair', 'decor', 'bed'],
      [CATEGORIES.BOOKS]: ['book', 'novel', 'textbook', 'magazine', 'e-book'],
      [CATEGORIES.HEALTH]: ['medicine', 'supplement', 'vitamin', 'gym', 'fitness'],
      [CATEGORIES.BEAUTY]: ['skincare', 'makeup', 'cream', 'lotion', 'perfume'],
      [CATEGORIES.SPORTS]: ['sport', 'racket', 'ball', 'bike', 'run', 'exercise'],
      [CATEGORIES.TOYS]: ['toy', 'game', 'play', 'child', 'kid'],
      [CATEGORIES.AUTOMOTIVE]: ['car', 'bike', 'tire', 'oil', 'repair']
    };
  }

  /**
   * Get priority source
   * @param {Object} budget - Budget source
   * @param {Array} purchases - Purchase sources
   * @returns {string} Priority source
   */
  getPrioritySource(budget, purchases) {
    const budgetSource = budget.source || SOURCE_TYPES.BUDGET_PLANNER;
    const budgetWeight = this.priorityWeights[budgetSource] || 0.5;
    
    // Check if any purchase source has higher weight
    let maxPurchaseWeight = 0;
    for (const purchase of purchases) {
      const source = purchase.source || SOURCE_TYPES.SHOPPING;
      const weight = this.priorityWeights[source] || 0.3;
      if (weight > maxPurchaseWeight) {
        maxPurchaseWeight = weight;
      }
    }
    
    return budgetWeight >= maxPurchaseWeight ? 'budget' : 'purchase';
  }

  /**
   * Get recommendations based on analysis
   * @param {Object} params - Analysis parameters
   * @returns {Array} Recommendations
   */
  getRecommendations(params) {
    const {
      totalStatus,
      categoryStatus,
      totalSpent,
      totalBudget,
      categoryConflicts,
      totalConflict,
      prioritySource
    } = params;

    const recommendations = [];

    // Total budget recommendations
    if (totalStatus === BUDGET_STATUS.EXCEEDED) {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.WARN,
        message: `⚠️ Total spending (₹${totalSpent}) exceeds budget (₹${totalBudget}) by ₹${totalSpent - totalBudget}`,
        priority: 'high'
      });
    } else if (totalStatus === BUDGET_STATUS.OVER_BUDGET) {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.BLOCK,
        message: `🚫 Significant overspend detected! Total spending ₹${totalSpent} vs ₹${totalBudget} budget`,
        priority: 'critical'
      });
    }

    // Category budget recommendations
    for (const [category, data] of Object.entries(categoryStatus)) {
      if (data.status === BUDGET_STATUS.EXCEEDED) {
        recommendations.push({
          action: RECOMMENDATION_ACTIONS.WARN,
          message: `⚠️ ${category} category exceeded budget by ₹${data.spent - data.budget}`,
          priority: 'medium'
        });
      } else if (data.status === BUDGET_STATUS.APPROACHING) {
        recommendations.push({
          action: RECOMMENDATION_ACTIONS.SUGGEST_ALTERNATIVE,
          message: `📊 ${category} spending approaching budget limit (${(data.spent/data.budget * 100).toFixed(0)}%)`,
          priority: 'low'
        });
      }
    }

    // Priority source recommendation
    if (prioritySource === 'budget') {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.ALLOW,
        message: '📋 Following budget planner constraints for recommendations',
        priority: 'info'
      });
    } else {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.SUGGEST_ALTERNATIVE,
        message: '📊 Considering purchase history alongside budget constraints',
        priority: 'info'
      });
    }

    // Conflict recommendations
    if (categoryConflicts.length > 0 || totalConflict !== null) {
      recommendations.push({
        action: RECOMMENDATION_ACTIONS.SUGGEST_ALTERNATIVE,
        message: `🔄 Found ${categoryConflicts.length + (totalConflict ? 1 : 0)} budget conflicts to resolve`,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Resolve budget conflict
   * @param {Object} analysis - Analysis result
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolve(analysis, options = {}) {
    const { strategy = 'prioritize_budget', preference = 'budget' } = options;
    
    const resolution = {
      resolved: true,
      strategy,
      preference,
      conflicts: analysis.conflicts,
      actions: [],
      timestamp: new Date().toISOString()
    };

    // Apply resolution strategy
    if (strategy === 'prioritize_budget') {
      resolution.actions.push({
        type: 'apply_budget_constraints',
        message: 'Prioritizing budget planner constraints over purchase history',
        details: {
          totalBudget: analysis.budget.total,
          currentSpent: analysis.spending.total,
          remainingBudget: analysis.budget.total - analysis.spending.total
        }
      });
      
      // Generate category-specific actions
      for (const [category, data] of Object.entries(analysis.status.categories)) {
        if (data.status === BUDGET_STATUS.EXCEEDED || data.status === BUDGET_STATUS.OVER_BUDGET) {
          resolution.actions.push({
            type: 'category_spend_alert',
            category,
            message: `⚠️ ${category} spending exceeds budget by ₹${data.spent - data.budget}`,
            action: 'reduce_spending',
            limit: data.budget,
            current: data.spent
          });
        }
      }
    }

    if (strategy === 'prioritize_purchases') {
      resolution.actions.push({
        type: 'allow_spending',
        message: 'Prioritizing purchase behavior over budget constraints',
        details: {
          totalSpent: analysis.spending.total,
          totalBudget: analysis.budget.total,
          difference: analysis.spending.total - analysis.budget.total
        }
      });
    }

    return resolution;
  }
}

module.exports = BudgetAnalyzer;