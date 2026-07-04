/**
 * Travel Module - Main Export
 * Provides sleep disruption detection during travel
 */

const TravelDetector = require('./travel-detector');
const SleepAnalyzer = require('./sleep-analyzer');
const TravelCorrelator = require('./travel-correlator');
const {
  TRAVEL_TYPES,
  SLEEP_DISRUPTION,
  RED_EYE_HOURS,
  TIME_WINDOWS,
  SLEEP_METRICS,
  DISRUPTION_THRESHOLDS
} = require('./travel-constants');

module.exports = {
  TravelDetector,
  SleepAnalyzer,
  TravelCorrelator,
  TRAVEL_TYPES,
  SLEEP_DISRUPTION,
  RED_EYE_HOURS,
  TIME_WINDOWS,
  SLEEP_METRICS,
  DISRUPTION_THRESHOLDS
};