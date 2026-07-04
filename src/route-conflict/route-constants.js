/**
 * Route Conflict Constants for Commute Routes
 */

const ROUTE_SOURCES = {
  NAVIGATION: 'navigation',
  RIDE_BOOKING: 'ride_booking',
  UBER: 'uber',
  GOOGLE_MAPS: 'google_maps',
  USER_PREFERENCE: 'user_preference'
};

const ROUTE_STATUS = {
  ANALYZED: 'analyzed',
  CONFLICT: 'conflict',
  RESOLVED: 'resolved',
  PREFERRED: 'preferred'
};

const COMPARISON_METRICS = {
  DURATION: 'duration',
  DISTANCE: 'distance',
  TRAFFIC: 'traffic',
  COST: 'cost',
  RELIABILITY: 'reliability'
};

const PREFERENCE_WEIGHTS = {
  [ROUTE_SOURCES.NAVIGATION]: 0.5,
  [ROUTE_SOURCES.RIDE_BOOKING]: 0.7,
  [ROUTE_SOURCES.UBER]: 0.8,
  [ROUTE_SOURCES.GOOGLE_MAPS]: 0.4,
  [ROUTE_SOURCES.USER_PREFERENCE]: 0.9
};

const CONFLICT_TYPES = {
  ROUTE_DIFFERENT: 'route_different',
  DURATION_MISMATCH: 'duration_mismatch',
  DISTANCE_MISMATCH: 'distance_mismatch',
  COST_MISMATCH: 'cost_mismatch'
};

module.exports = {
  ROUTE_SOURCES,
  ROUTE_STATUS,
  COMPARISON_METRICS,
  PREFERENCE_WEIGHTS,
  CONFLICT_TYPES
};