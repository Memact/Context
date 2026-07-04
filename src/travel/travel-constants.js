/**
 * Travel Constants for Sleep Disruption Detection
 */

const TRAVEL_TYPES = {
  FLIGHT: 'flight',
  UBER: 'uber',
  AIRPORT: 'airport',
  RED_EYE: 'red_eye'
};

const SLEEP_DISRUPTION = {
  TRAVEL_DISRUPTED: 'travel-disrupted',
  NORMAL: 'normal',
  RECOVERING: 'recovering'
};

const RED_EYE_HOURS = {
  START: 20, // 8 PM
  END: 6     // 6 AM
};

const TIME_WINDOWS = {
  PRE_TRAVEL: 24,   // 24 hours before
  POST_TRAVEL: 48   // 48 hours after
};

const SLEEP_METRICS = {
  DURATION: 'duration',
  QUALITY_SCORE: 'qualityScore',
  REM: 'rem',
  DEEP: 'deep',
  LATENCY: 'latency',
  EFFICIENCY: 'efficiency'
};

const DISRUPTION_THRESHOLDS = {
  MIN_DURATION_CHANGE: 0.4,    // 40% decrease
  MIN_QUALITY_CHANGE: 0.3,     // 30% decrease
  MIN_REM_CHANGE: 0.25,        // 25% decrease
  MIN_DEEP_CHANGE: 0.2,        // 20% decrease
  CONFIDENCE_THRESHOLD: 0.6    // 60% confidence required
};

module.exports = {
  TRAVEL_TYPES,
  SLEEP_DISRUPTION,
  RED_EYE_HOURS,
  TIME_WINDOWS,
  SLEEP_METRICS,
  DISRUPTION_THRESHOLDS
};