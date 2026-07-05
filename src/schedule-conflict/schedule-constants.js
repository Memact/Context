/**
 * Schedule Conflict Constants for Calendar Reconciliation
 */

const CALENDAR_SOURCES = {
  GOOGLE: 'google_calendar',
  NOTION: 'notion_timeline',
  OUTLOOK: 'outlook',
  APPLE: 'apple_calendar',
  WORKSPACE: 'workspace_notes'
};

const EVENT_STATUS = {
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELLED: 'cancelled',
  MERGED: 'merged',
  CONFLICT: 'conflict'
};

const CONFLICT_TYPES = {
  OVERLAP: 'overlap',
  DUPLICATE: 'duplicate',
  TIME_MISMATCH: 'time_mismatch',
  LOCATION_MISMATCH: 'location_mismatch',
  ATTENDEE_MISMATCH: 'attendee_mismatch'
};

const RESOLUTION_STRATEGIES = {
  MERGE: 'merge',
  KEEP_FIRST: 'keep_first',
  KEEP_LAST: 'keep_last',
  PREFER_GOOGLE: 'prefer_google',
  PREFER_NOTION: 'prefer_notion',
  MANUAL: 'manual'
};

const PRIORITY_WEIGHTS = {
  [CALENDAR_SOURCES.GOOGLE]: 0.7,
  [CALENDAR_SOURCES.NOTION]: 0.6,
  [CALENDAR_SOURCES.OUTLOOK]: 0.5,
  [CALENDAR_SOURCES.APPLE]: 0.5,
  [CALENDAR_SOURCES.WORKSPACE]: 0.4
};

module.exports = {
  CALENDAR_SOURCES,
  EVENT_STATUS,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  PRIORITY_WEIGHTS
};