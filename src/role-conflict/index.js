/**
 * Role Conflict Module - Main Export
 */

const RoleAnalyzer = require('./role-analyzer');
const RoleResolver = require('./role-resolver');
const {
  ROLE_SOURCES,
  UNIFIED_ROLES,
  ROLE_HIERARCHY,
  SOURCE_MAPPINGS,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY
} = require('./role-constants');

module.exports = {
  RoleAnalyzer,
  RoleResolver,
  ROLE_SOURCES,
  UNIFIED_ROLES,
  ROLE_HIERARCHY,
  SOURCE_MAPPINGS,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY
};