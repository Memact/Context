/**
 * Threshold Calibration Module - Main Export
 */

const ThresholdCalibrator = require('./threshold-calibrator');
const {
  CALIBRATION_STATUS,
  ADJUSTMENT_DIRECTION,
  DEFAULT_CONFIG,
  FEEDBACK_TYPES
} = require('./threshold-constants');

module.exports = {
  ThresholdCalibrator,
  CALIBRATION_STATUS,
  ADJUSTMENT_DIRECTION,
  DEFAULT_CONFIG,
  FEEDBACK_TYPES
};