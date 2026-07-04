/**
 * Sleep Analyzer - Analyzes sleep patterns and detects disruptions
 */

const { SLEEP_METRICS, SLEEP_DISRUPTION, DISRUPTION_THRESHOLDS } = require('./travel-constants');

class SleepAnalyzer {
  constructor() {
    this.baseline = null;
    this.analysisWindow = 7; // days
  }

  /**
   * Analyze sleep data
   * @param {Array} sleepData - Sleep data array
   * @param {Date} referenceDate - Date to analyze around
   * @returns {Object} Sleep analysis results
   */
  analyze(sleepData, referenceDate = new Date()) {
    if (!Array.isArray(sleepData) || sleepData.length === 0) {
      return { hasDisruption: false, label: SLEEP_DISRUPTION.NORMAL };
    }

    // Calculate baseline from last N days
    this.baseline = this.calculateBaseline(sleepData, this.analysisWindow);

    // Analyze recent sleep
    const recentSleep = this.getRecentSleep(sleepData, referenceDate, 72); // 3 days
    const isDisrupted = this.detectDisruption(recentSleep, this.baseline);

    // Calculate disruption score
    const disruptionScore = this.calculateDisruptionScore(recentSleep, this.baseline);

    return {
      isDisrupted,
      label: isDisrupted ? SLEEP_DISRUPTION.TRAVEL_DISRUPTED : SLEEP_DISRUPTION.NORMAL,
      disruptionScore,
      baseline: this.baseline,
      metrics: this.extractMetrics(recentSleep)
    };
  }

  /**
   * Calculate baseline from sleep data
   * @param {Array} sleepData - Sleep data
   * @param {number} windowDays - Number of days to analyze
   * @returns {Object} Baseline metrics
   */
  calculateBaseline(sleepData, windowDays) {
    const recent = sleepData.slice(-windowDays);
    if (recent.length === 0) return null;

    const metrics = {
      duration: [],
      qualityScore: [],
      rem: [],
      deep: [],
      latency: [],
      efficiency: []
    };

    recent.forEach(record => {
      if (record.duration) metrics.duration.push(record.duration);
      if (record.qualityScore) metrics.qualityScore.push(record.qualityScore);
      if (record.rem) metrics.rem.push(record.rem);
      if (record.deep) metrics.deep.push(record.deep);
      if (record.latency) metrics.latency.push(record.latency);
      if (record.efficiency) metrics.efficiency.push(record.efficiency);
    });

    // Calculate averages
    const baseline = {};
    for (const [key, values] of Object.entries(metrics)) {
      if (values.length > 0) {
        baseline[key] = values.reduce((a, b) => a + b, 0) / values.length;
      } else {
        baseline[key] = null;
      }
    }

    return baseline;
  }

  /**
   * Get sleep data within time window
   * @param {Array} sleepData - Sleep data
   * @param {Date} referenceDate - Reference date
   * @param {number} hours - Hours window
   * @returns {Array} Filtered sleep data
   */
  getRecentSleep(sleepData, referenceDate, hours) {
    const start = new Date(referenceDate);
    start.setHours(start.getHours() - hours);

    return sleepData.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= start && recordDate <= referenceDate;
    });
  }

  /**
   * Detect sleep disruption
   * @param {Array} recentSleep - Recent sleep data
   * @param {Object} baseline - Baseline metrics
   * @returns {boolean} True if disrupted
   */
  detectDisruption(recentSleep, baseline) {
    if (!baseline || recentSleep.length === 0) return false;

    const { MIN_DURATION_CHANGE, MIN_QUALITY_CHANGE, CONFIDENCE_THRESHOLD } = DISRUPTION_THRESHOLDS;

    let disruptionIndicators = 0;
    let totalIndicators = 0;

    // Check duration change
    const avgDuration = recentSleep.reduce((sum, r) => sum + (r.duration || 0), 0) / recentSleep.length;
    if (baseline.duration && avgDuration > 0) {
      totalIndicators++;
      const durationChange = 1 - (avgDuration / baseline.duration);
      if (durationChange > MIN_DURATION_CHANGE) {
        disruptionIndicators++;
      }
    }

    // Check quality change
    const avgQuality = recentSleep.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / recentSleep.length;
    if (baseline.qualityScore && avgQuality > 0) {
      totalIndicators++;
      const qualityChange = 1 - (avgQuality / baseline.qualityScore);
      if (qualityChange > MIN_QUALITY_CHANGE) {
        disruptionIndicators++;
      }
    }

    // Check REM change
    const avgREM = recentSleep.reduce((sum, r) => sum + (r.rem || 0), 0) / recentSleep.length;
    if (baseline.rem && avgREM > 0) {
      totalIndicators++;
      const remChange = 1 - (avgREM / baseline.rem);
      if (remChange > DISRUPTION_THRESHOLDS.MIN_REM_CHANGE) {
        disruptionIndicators++;
      }
    }

    // Check Deep sleep change
    const avgDeep = recentSleep.reduce((sum, r) => sum + (r.deep || 0), 0) / recentSleep.length;
    if (baseline.deep && avgDeep > 0) {
      totalIndicators++;
      const deepChange = 1 - (avgDeep / baseline.deep);
      if (deepChange > DISRUPTION_THRESHOLDS.MIN_DEEP_CHANGE) {
        disruptionIndicators++;
      }
    }

    if (totalIndicators === 0) return false;

    const confidence = disruptionIndicators / totalIndicators;
    return confidence >= CONFIDENCE_THRESHOLD;
  }

  /**
   * Calculate disruption score
   * @param {Array} recentSleep - Recent sleep data
   * @param {Object} baseline - Baseline metrics
   * @returns {number} Disruption score (0-1)
   */
  calculateDisruptionScore(recentSleep, baseline) {
    if (!baseline || recentSleep.length === 0) return 0;

    const metrics = ['duration', 'qualityScore', 'rem', 'deep'];
    let totalChange = 0;
    let validMetrics = 0;

    metrics.forEach(metric => {
      if (baseline[metric] !== null && baseline[metric] > 0) {
        const avg = recentSleep.reduce((sum, r) => sum + (r[metric] || 0), 0) / recentSleep.length;
        if (avg > 0) {
          const change = 1 - (avg / baseline[metric]);
          totalChange += Math.max(0, change);
          validMetrics++;
        }
      }
    });

    return validMetrics > 0 ? Math.min(1, totalChange / validMetrics) : 0;
  }

  /**
   * Extract metrics from sleep data
   * @param {Array} sleepData - Sleep data
   * @returns {Object} Extracted metrics
   */
  extractMetrics(sleepData) {
    if (sleepData.length === 0) return null;

    return {
      averageDuration: sleepData.reduce((sum, r) => sum + (r.duration || 0), 0) / sleepData.length,
      averageQuality: sleepData.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / sleepData.length,
      averageREM: sleepData.reduce((sum, r) => sum + (r.rem || 0), 0) / sleepData.length,
      averageDeep: sleepData.reduce((sum, r) => sum + (r.deep || 0), 0) / sleepData.length,
      count: sleepData.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SleepAnalyzer;