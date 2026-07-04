/**
 * Explicit Override Module - Main Export
 * Provides user_explicit override functionality
 */

const OverrideManager = require('./override-manager');
const ContextFreezer = require('./context-freezer');
const {
  OVERRIDE_STATUS,
  OVERRIDE_SOURCES,
  FIELD_STATUS,
  PRIORITY_LEVELS,
  CONFLICT_RESOLUTION
} = require('./override-constants');

module.exports = {
  OverrideManager,
  ContextFreezer,
  OVERRIDE_STATUS,
  OVERRIDE_SOURCES,
  FIELD_STATUS,
  PRIORITY_LEVELS,
  CONFLICT_RESOLUTION
};