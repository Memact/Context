/**
 * Domain Isolation Module - Main Export
 * Provides domain isolation for code vs documentation contexts
 */

const DomainIsolator = require('./domain-isolator');
const ContextLocker = require('./context-locker');
const {
  DOMAIN_TYPES,
  SOURCE_TYPES,
  CONTEXT_TYPES,
  ISOLATION_RULES,
  CONFLICT_TYPES,
  ISOLATION_STATUS
} = require('./domain-constants');

module.exports = {
  DomainIsolator,
  ContextLocker,
  DOMAIN_TYPES,
  SOURCE_TYPES,
  CONTEXT_TYPES,
  ISOLATION_RULES,
  CONFLICT_TYPES,
  ISOLATION_STATUS
};