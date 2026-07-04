/**
 * Threshold Calibration Constants
 */

const CALIBRATION_STATUS = {
  ACTIVE: 'active',
  ADJUSTED: 'adjusted',
  RESET: 'reset'
};

const ADJUSTMENT_DIRECTION = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
  STABLE: 'stable'
};

const DEFAULT_CONFIG = {
  initialThreshold: 0.12,
  minThreshold: 0.01,
  maxThreshold: 0.5,
  adjustmentStep: 0.01,
  maxAdjustments: 100,
  learningRate: 0.3,
  confidenceThreshold: 0.6
};

const FEEDBACK_TYPES = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  MANUAL_ADJUST: 'manual_adjust'
};

module.exports = {
  CALIBRATION_STATUS,
  ADJUSTMENT_DIRECTION,
  DEFAULT_CONFIG,
  FEEDBACK_TYPES
};