/**
 * Threshold Calibrator - Dynamically adjusts matching thresholds based on user feedback
 */

const {
  CALIBRATION_STATUS,
  ADJUSTMENT_DIRECTION,
  DEFAULT_CONFIG,
  FEEDBACK_TYPES
} = require('./threshold-constants');

class ThresholdCalibrator {
  constructor(options = {}) {
    this.config = {
      initialThreshold: options.initialThreshold || DEFAULT_CONFIG.initialThreshold,
      minThreshold: options.minThreshold || DEFAULT_CONFIG.minThreshold,
      maxThreshold: options.maxThreshold || DEFAULT_CONFIG.maxThreshold,
      adjustmentStep: options.adjustmentStep || DEFAULT_CONFIG.adjustmentStep,
      maxAdjustments: options.maxAdjustments || DEFAULT_CONFIG.maxAdjustments,
      learningRate: options.learningRate || DEFAULT_CONFIG.learningRate,
      confidenceThreshold: options.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold
    };

    this.currentThreshold = this.config.initialThreshold;
    this.adjustmentHistory = [];
    this.feedbackHistory = [];
    this.status = CALIBRATION_STATUS.ACTIVE;
    this.stats = {
      totalFeedback: 0,
      accepts: 0,
      rejects: 0,
      adjustments: 0,
      direction: ADJUSTMENT_DIRECTION.STABLE
    };
  }

  /**
   * Process user feedback and adjust threshold
   * @param {string} feedbackType - 'accept' or 'reject'
   * @param {Object} match - The match that was accepted/rejected
   * @param {Object} options - Additional options
   * @returns {Object} Calibration result
   */
  processFeedback(feedbackType, match = {}, options = {}) {
    const { score, confidence, field } = match;
    const timestamp = new Date().toISOString();

    // Record feedback
    this.feedbackHistory.push({
      type: feedbackType,
      score,
      confidence,
      field,
      timestamp,
      thresholdAtTime: this.currentThreshold
    });

    this.stats.totalFeedback++;
    if (feedbackType === FEEDBACK_TYPES.ACCEPT) {
      this.stats.accepts++;
    } else if (feedbackType === FEEDBACK_TYPES.REJECT) {
      this.stats.rejects++;
    }

    // Calculate new threshold based on feedback
    let newThreshold = this.currentThreshold;
    let adjustment = 0;
    let direction = ADJUSTMENT_DIRECTION.STABLE;

    if (feedbackType === FEEDBACK_TYPES.REJECT) {
      // Rejection means threshold is too low - increase it
      const confidenceScore = confidence || this.calculateConfidence(match);
      const adjustmentAmount = this.calculateAdjustment(confidenceScore, 'reject');
      newThreshold = Math.min(
        this.config.maxThreshold,
        this.currentThreshold + adjustmentAmount
      );
      adjustment = adjustmentAmount;
      direction = ADJUSTMENT_DIRECTION.INCREASE;
    } else if (feedbackType === FEEDBACK_TYPES.ACCEPT) {
      // Acceptance means threshold might be too high - decrease it slightly
      const confidenceScore = confidence || this.calculateConfidence(match);
      const adjustmentAmount = this.calculateAdjustment(confidenceScore, 'accept');
      newThreshold = Math.max(
        this.config.minThreshold,
        this.currentThreshold - adjustmentAmount
      );
      adjustment = -adjustmentAmount;
      direction = ADJUSTMENT_DIRECTION.DECREASE;
    }

    // Apply threshold limits
    newThreshold = Math.max(this.config.minThreshold, Math.min(this.config.maxThreshold, newThreshold));

    // Record adjustment
    this.adjustmentHistory.push({
      oldThreshold: this.currentThreshold,
      newThreshold,
      adjustment,
      feedbackType,
      direction,
      timestamp,
      reason: this.getAdjustmentReason(feedbackType, match)
    });

    // Update current threshold
    this.currentThreshold = newThreshold;
    this.stats.adjustments++;
    this.stats.direction = direction;

    // Update status
    this.updateStatus();

    return {
      oldThreshold: this.adjustmentHistory[this.adjustmentHistory.length - 1].oldThreshold,
      newThreshold: this.currentThreshold,
      adjustment,
      direction,
      feedbackType,
      timestamp,
      status: this.status,
      stats: { ...this.stats }
    };
  }

  /**
   * Calculate adjustment amount based on confidence
   * @param {number} confidence - Confidence score (0-1)
   * @param {string} feedbackType - 'accept' or 'reject'
   * @returns {number} Adjustment amount
   */
  calculateAdjustment(confidence, feedbackType) {
    const baseStep = this.config.adjustmentStep;
    
    // Higher confidence = larger adjustment
    const confidenceMultiplier = confidence || 0.5;
    const adjustedStep = baseStep * (1 + confidenceMultiplier * this.config.learningRate);

    // Rejections cause larger adjustments than accepts
    const feedbackMultiplier = feedbackType === FEEDBACK_TYPES.REJECT ? 1.5 : 0.8;

    return adjustedStep * feedbackMultiplier;
  }

  /**
   * Calculate confidence from match data
   * @param {Object} match - Match object
   * @returns {number} Confidence score
   */
  calculateConfidence(match) {
    if (!match) return 0.5;
    
    const score = match.score || 0;
    const matchCount = match.matchCount || 1;
    const uniqueMatches = match.uniqueMatches || 1;

    // Calculate confidence based on match quality
    const scoreConfidence = Math.min(1, score / 0.5);
    const matchConfidence = Math.min(1, matchCount / 3);
    const uniqueConfidence = Math.min(1, uniqueMatches / 5);

    return (scoreConfidence + matchConfidence + uniqueConfidence) / 3;
  }

  /**
   * Get reason for adjustment
   * @param {string} feedbackType - 'accept' or 'reject'
   * @param {Object} match - Match object
   * @returns {string} Reason
   */
  getAdjustmentReason(feedbackType, match) {
    if (feedbackType === FEEDBACK_TYPES.REJECT) {
      return `User rejected match with score ${match?.score?.toFixed(3) || 'unknown'}`;
    }
    return `User accepted match with score ${match?.score?.toFixed(3) || 'unknown'}`;
  }

  /**
   * Update calibration status
   */
  updateStatus() {
    if (this.adjustmentHistory.length > this.config.maxAdjustments) {
      this.status = CALIBRATION_STATUS.ADJUSTED;
    }
  }

  /**
   * Get current threshold
   * @returns {number} Current threshold
   */
  getThreshold() {
    return this.currentThreshold;
  }

  /**
   * Reset threshold to initial value
   * @param {string} reason - Reason for reset
   * @returns {Object} Reset result
   */
  resetThreshold(reason = 'Manual reset') {
    const oldThreshold = this.currentThreshold;
    this.currentThreshold = this.config.initialThreshold;
    this.status = CALIBRATION_STATUS.RESET;

    this.adjustmentHistory.push({
      oldThreshold,
      newThreshold: this.currentThreshold,
      adjustment: this.currentThreshold - oldThreshold,
      feedbackType: 'reset',
      direction: ADJUSTMENT_DIRECTION.STABLE,
      timestamp: new Date().toISOString(),
      reason
    });

    return {
      oldThreshold,
      newThreshold: this.currentThreshold,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get calibration history
   * @param {number} limit - Number of records
   * @returns {Array} History records
   */
  getHistory(limit = 20) {
    return this.adjustmentHistory.slice(-limit).reverse();
  }

  /**
   * Get feedback statistics
   * @returns {Object} Feedback stats
   */
  getFeedbackStats() {
    const total = this.feedbackHistory.length;
    if (total === 0) {
      return {
        total: 0,
        accepts: 0,
        rejects: 0,
        acceptRate: '0%',
        rejectRate: '0%'
      };
    }

    const accepts = this.feedbackHistory.filter(f => f.type === FEEDBACK_TYPES.ACCEPT).length;
    const rejects = this.feedbackHistory.filter(f => f.type === FEEDBACK_TYPES.REJECT).length;

    return {
      total,
      accepts,
      rejects,
      acceptRate: ((accepts / total) * 100).toFixed(1) + '%',
      rejectRate: ((rejects / total) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Get threshold trends
   * @param {number} period - Number of adjustments to analyze
   * @returns {Object} Trend analysis
   */
  getTrends(period = 10) {
    const recent = this.adjustmentHistory.slice(-period);
    if (recent.length === 0) {
      return {
        trend: 'stable',
        averageAdjustment: 0,
        direction: ADJUSTMENT_DIRECTION.STABLE,
        volatility: 0
      };
    }

    const adjustments = recent.map(h => h.adjustment);
    const avgAdjustment = adjustments.reduce((a, b) => a + b, 0) / adjustments.length;
    const direction = avgAdjustment > 0.001 ? 'increasing' :
                     avgAdjustment < -0.001 ? 'decreasing' : 'stable';

    // Calculate volatility (standard deviation)
    const variance = adjustments.reduce((sum, val) => sum + Math.pow(val - avgAdjustment, 2), 0) / adjustments.length;
    const volatility = Math.sqrt(variance);

    return {
      trend: direction === 'increasing' ? '📈 Increasing' :
             direction === 'decreasing' ? '📉 Decreasing' : '➡️ Stable',
      direction,
      averageAdjustment: avgAdjustment,
      volatility,
      sampleSize: recent.length
    };
  }

  /**
   * Get full statistics
   * @returns {Object} All statistics
   */
  getStats() {
    const feedbackStats = this.getFeedbackStats();
    const trends = this.getTrends();

    return {
      currentThreshold: this.currentThreshold,
      initialThreshold: this.config.initialThreshold,
      status: this.status,
      adjustments: this.stats.adjustments,
      direction: this.stats.direction,
      feedback: feedbackStats,
      trends,
      historySize: this.adjustmentHistory.length,
      config: {
        minThreshold: this.config.minThreshold,
        maxThreshold: this.config.maxThreshold,
        adjustmentStep: this.config.adjustmentStep,
        learningRate: this.config.learningRate
      }
    };
  }

  /**
   * Generate recommendation for optimal threshold
   * @returns {Object} Recommendation
   */
  getRecommendation() {
    const feedbackStats = this.getFeedbackStats();
    const trends = this.getTrends();

    // Calculate optimal threshold based on feedback
    let recommendedThreshold = this.currentThreshold;

    if (feedbackStats.total > 10) {
      const rejectRate = parseFloat(feedbackStats.rejectRate);
      const acceptRate = parseFloat(feedbackStats.acceptRate);

      if (rejectRate > 30) {
        // Too many rejections - increase threshold
        recommendedThreshold = Math.min(
          this.config.maxThreshold,
          this.currentThreshold + this.config.adjustmentStep * 3
        );
      } else if (acceptRate > 80 && trends.direction === 'stable') {
        // High acceptance with stable threshold - might be too low
        recommendedThreshold = Math.max(
          this.config.minThreshold,
          this.currentThreshold - this.config.adjustmentStep * 2
        );
      }
    }

    return {
      currentThreshold: this.currentThreshold,
      recommendedThreshold,
      difference: recommendedThreshold - this.currentThreshold,
      reason: this.getRecommendationReason(feedbackStats, trends),
      confidence: this.calculateRecommendationConfidence(feedbackStats),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recommendation reason
   * @param {Object} feedbackStats - Feedback statistics
   * @param {Object} trends - Trend analysis
   * @returns {string} Reason
   */
  getRecommendationReason(feedbackStats, trends) {
    const rejectRate = parseFloat(feedbackStats.rejectRate);
    const acceptRate = parseFloat(feedbackStats.acceptRate);

    if (rejectRate > 30) {
      return `High rejection rate (${feedbackStats.rejectRate}) - consider increasing threshold`;
    }
    if (acceptRate > 80 && trends.direction === 'stable') {
      return `High acceptance rate (${feedbackStats.acceptRate}) with stable threshold - consider decreasing threshold`;
    }
    return 'Current threshold appears optimal based on user feedback';
  }

  /**
   * Calculate recommendation confidence
   * @param {Object} feedbackStats - Feedback statistics
   * @returns {number} Confidence (0-1)
   */
  calculateRecommendationConfidence(feedbackStats) {
    const total = feedbackStats.total;
    if (total === 0) return 0.3;
    if (total < 5) return 0.5;
    if (total < 20) return 0.7;
    return 0.9;
  }
}

module.exports = ThresholdCalibrator;