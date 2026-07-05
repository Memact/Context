/**
 * Schedule Conflict Module - Main Export
 */

const ScheduleAnalyzer = require('./schedule-analyzer');
const ScheduleResolver = require('./schedule-resolver');
const {
  CALENDAR_SOURCES,
  EVENT_STATUS,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  PRIORITY_WEIGHTS
} = require('./schedule-constants');

module.exports = {
  ScheduleAnalyzer,
  ScheduleResolver,
  CALENDAR_SOURCES,
  EVENT_STATUS,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  PRIORITY_WEIGHTS
};