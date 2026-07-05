/**
 * Cross-Category Connection Module - Main Export
 */

const ConnectionSuggester = require('./connection-suggester');
const {
  CATEGORIES,
  CONNECTION_STATUS,
  CONNECTION_TYPES,
  CATEGORY_RELATIONSHIPS
} = require('./category-constants');

module.exports = {
  ConnectionSuggester,
  CATEGORIES,
  CONNECTION_STATUS,
  CONNECTION_TYPES,
  CATEGORY_RELATIONSHIPS
};