/**
 * Budget Conflict Module - Main Export
 * Provides budget conflict detection and resolution
 */

const BudgetAnalyzer = require('./budget-analyzer');
const BudgetResolver = require('./budget-resolver');
const {
  SOURCE_TYPES,
  CATEGORIES,
  BUDGET_STATUS,
  CONFLICT_TYPES,
  PRIORITY_WEIGHTS,
  RECOMMENDATION_ACTIONS
} = require('./budget-constants');

module.exports = {
  BudgetAnalyzer,
  BudgetResolver,
  SOURCE_TYPES,
  CATEGORIES,
  BUDGET_STATUS,
  CONFLICT_TYPES,
  PRIORITY_WEIGHTS,
  RECOMMENDATION_ACTIONS
};