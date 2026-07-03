/**
 * Quarantine Module - Main Export
 * Provides outlier purchase detection and quarantine management
 */

const OutlierDetector = require('./outlier-detector');
const QuarantineManager = require('./quarantine-manager');
const ContextFilter = require('./context-filter');
const {
  QUARANTINE_STATUS,
  PURCHASE_CATEGORIES,
  HIGH_TICKET_ITEMS,
  DEFAULT_QUARANTINE,
  QUARANTINE_CONFIG
} = require('./quarantine-constants');

module.exports = {
  OutlierDetector,
  QuarantineManager,
  ContextFilter,
  QUARANTINE_STATUS,
  PURCHASE_CATEGORIES,
  HIGH_TICKET_ITEMS,
  DEFAULT_QUARANTINE,
  QUARANTINE_CONFIG
};