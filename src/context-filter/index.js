/**
 * Context Filter Module - Main Export
 * Provides entertainment context filtering for productivity clients
 */

const ContextFilter = require('./context-filter');
const WorkspaceGuard = require('./workspace-guard');
const {
  DOMAIN_TYPES,
  APP_CATEGORIES,
  MEDIA_SCHEMAS,
  BLOCK_RULES,
  FILTER_ACTION
} = require('./context-filter-constants');

module.exports = {
  ContextFilter,
  WorkspaceGuard,
  DOMAIN_TYPES,
  APP_CATEGORIES,
  MEDIA_SCHEMAS,
  BLOCK_RULES,
  FILTER_ACTION
};