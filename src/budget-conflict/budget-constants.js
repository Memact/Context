/**
 * Budget Conflict Constants for Shopping vs Budget Planner
 */

const SOURCE_TYPES = {
  BUDGET_PLANNER: 'budget_planner',
  NOTION: 'notion',
  AMAZON: 'amazon',
  SHOPPING: 'shopping',
  COMMERCE: 'commerce',
  WORKSAPCE: 'workspace'
};

const CATEGORIES = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  FOOD: 'food',
  HOME: 'home',
  BOOKS: 'books',
  HEALTH: 'health',
  BEAUTY: 'beauty',
  SPORTS: 'sports',
  TOYS: 'toys',
  AUTOMOTIVE: 'automotive'
};

const BUDGET_STATUS = {
  WITHIN_LIMIT: 'within_limit',
  EXCEEDED: 'exceeded',
  APPROACHING: 'approaching',
  OVER_BUDGET: 'over_budget'
};

const CONFLICT_TYPES = {
  CATEGORY_OVERSPEND: 'category_overspend',
  TOTAL_OVERSPEND: 'total_overspend',
  BUDGET_MISMATCH: 'budget_mismatch'
};

const PRIORITY_WEIGHTS = {
  [SOURCE_TYPES.BUDGET_PLANNER]: 0.9,
  [SOURCE_TYPES.NOTION]: 0.85,
  [SOURCE_TYPES.WORKSAPCE]: 0.8,
  [SOURCE_TYPES.AMAZON]: 0.5,
  [SOURCE_TYPES.SHOPPING]: 0.4,
  [SOURCE_TYPES.COMMERCE]: 0.3
};

const RECOMMENDATION_ACTIONS = {
  ALLOW: 'allow',
  WARN: 'warn',
  BLOCK: 'block',
  SUGGEST_ALTERNATIVE: 'suggest_alternative'
};

module.exports = {
  SOURCE_TYPES,
  CATEGORIES,
  BUDGET_STATUS,
  CONFLICT_TYPES,
  PRIORITY_WEIGHTS,
  RECOMMENDATION_ACTIONS
};