const assert = require('assert');
const ThresholdCalibrator = require('../../src/threshold-calibration/threshold-calibrator');
const { FEEDBACK_TYPES, ADJUSTMENT_DIRECTION } = require('../../src/threshold-calibration/threshold-constants');

describe('ThresholdCalibrator', () => {
  let calibrator;

  beforeEach(() => {
    calibrator = new ThresholdCalibrator();
  });

  describe('Initialization', () => {
    it('should set initial threshold correctly', () => {
      assert.strictEqual(calibrator.getThreshold(), 0.12);
    });

    it('should respect custom config', () => {
      const custom = new ThresholdCalibrator({
        initialThreshold: 0.2,
        minThreshold: 0.05,
        maxThreshold: 0.6,
        adjustmentStep: 0.02
      });

      assert.strictEqual(custom.getThreshold(), 0.2);
      assert.strictEqual(custom.config.minThreshold, 0.05);
      assert.strictEqual(custom.config.maxThreshold, 0.6);
    });
  });

  describe('Feedback Processing', () => {
    it('should increase threshold on rejection', () => {
      const match = { score: 0.15, confidence: 0.7 };
      const oldThreshold = calibrator.getThreshold();
      
      const result = calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      
      assert.ok(result.newThreshold > oldThreshold);
      assert.strictEqual(result.direction, ADJUSTMENT_DIRECTION.INCREASE);
    });

    it('should decrease threshold on acceptance', () => {
      const match = { score: 0.15, confidence: 0.7 };
      const oldThreshold = calibrator.getThreshold();
      
      const result = calibrator.processFeedback(FEEDBACK_TYPES.ACCEPT, match);
      
      assert.ok(result.newThreshold < oldThreshold);
      assert.strictEqual(result.direction, ADJUSTMENT_DIRECTION.DECREASE);
    });

    it('should track feedback statistics', () => {
      const match = { score: 0.15, confidence: 0.7 };
      
      calibrator.processFeedback(FEEDBACK_TYPES.ACCEPT, match);
      calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      
      const stats = calibrator.getFeedbackStats();
      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.accepts, 1);
      assert.strictEqual(stats.rejects, 1);
    });
  });

  describe('Threshold Limits', () => {
    it('should not exceed max threshold', () => {
      const calibrator2 = new ThresholdCalibrator({
        initialThreshold: 0.49,
        maxThreshold: 0.5,
        adjustmentStep: 0.02
      });

      const match = { score: 0.15, confidence: 0.9 };
      calibrator2.processFeedback(FEEDBACK_TYPES.REJECT, match);
      
      assert.ok(calibrator2.getThreshold() <= 0.5);
    });

    it('should not go below min threshold', () => {
      const calibrator3 = new ThresholdCalibrator({
        initialThreshold: 0.02,
        minThreshold: 0.01,
        adjustmentStep: 0.02
      });

      const match = { score: 0.15, confidence: 0.9 };
      calibrator3.processFeedback(FEEDBACK_TYPES.ACCEPT, match);
      
      assert.ok(calibrator3.getThreshold() >= 0.01);
    });
  });

  describe('Reset', () => {
    it('should reset to initial threshold', () => {
      const match = { score: 0.15, confidence: 0.7 };
      calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      
      const oldThreshold = calibrator.getThreshold();
      const resetResult = calibrator.resetThreshold('Test reset');
      
      assert.strictEqual(resetResult.oldThreshold, oldThreshold);
      assert.strictEqual(calibrator.getThreshold(), 0.12);
    });
  });

  describe('History', () => {
    it('should maintain adjustment history', () => {
      const match = { score: 0.15, confidence: 0.7 };
      
      calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      calibrator.processFeedback(FEEDBACK_TYPES.ACCEPT, match);
      
      const history = calibrator.getHistory();
      assert.strictEqual(history.length, 2);
    });
  });

  describe('Trends', () => {
    it('should analyze trends', () => {
      const match = { score: 0.15, confidence: 0.7 };
      
      for (let i = 0; i < 5; i++) {
        calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      }
      
      const trends = calibrator.getTrends(5);
      assert.strictEqual(trends.direction, 'increasing');
      assert.ok(trends.averageAdjustment > 0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendation', () => {
      const match = { score: 0.15, confidence: 0.7 };
      
      for (let i = 0; i < 5; i++) {
        calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      }
      
      const recommendation = calibrator.getRecommendation();
      assert.ok(recommendation.currentThreshold);
      assert.ok(recommendation.recommendedThreshold);
      assert.ok(recommendation.reason);
      assert.ok(recommendation.confidence);
    });
  });

  describe('Statistics', () => {
    it('should provide full stats', () => {
      const match = { score: 0.15, confidence: 0.7 };
      
      calibrator.processFeedback(FEEDBACK_TYPES.ACCEPT, match);
      calibrator.processFeedback(FEEDBACK_TYPES.REJECT, match);
      
      const stats = calibrator.getStats();
      assert.ok(stats.currentThreshold);
      assert.ok(stats.feedback);
      assert.ok(stats.trends);
      assert.strictEqual(stats.adjustments, 2);
    });
  });
});