/**
 * Travel Correlator - Correlates travel events with sleep disruptions
 */

const { SLEEP_DISRUPTION, TIME_WINDOWS } = require('./travel-constants');

class TravelCorrelator {
  constructor() {
    this.correlations = [];
    this.confidenceThreshold = 0.6;
  }

  /**
   * Correlate travel events with sleep disruptions
   * @param {Array} travelEvents - Travel events
   * @param {Array} sleepAnalysis - Sleep analysis results
   * @param {Date} date - Reference date
   * @returns {Array} Correlation results
   */
  correlate(travelEvents, sleepAnalysis, date = new Date()) {
    if (!travelEvents || travelEvents.length === 0) {
      return [];
    }

    const correlations = [];

    for (const travelEvent of travelEvents) {
      // Find sleep disruptions around this travel event
      const { PRE_TRAVEL, POST_TRAVEL } = TIME_WINDOWS;
      const affectedSleep = this.findAffectedSleep(sleepAnalysis, travelEvent, PRE_TRAVEL, POST_TRAVEL);

      if (affectedSleep.length > 0) {
        const correlation = this.createCorrelation(travelEvent, affectedSleep, date);
        if (correlation.confidence >= this.confidenceThreshold) {
          correlations.push(correlation);
        }
      }
    }

    this.correlations = correlations;
    return correlations;
  }

  /**
   * Find sleep affected by travel
   * @param {Array} sleepAnalysis - Sleep analysis
   * @param {Object} travelEvent - Travel event
   * @param {number} hoursBefore - Hours before
   * @param {number} hoursAfter - Hours after
   * @returns {Array} Affected sleep records
   */
  findAffectedSleep(sleepAnalysis, travelEvent, hoursBefore, hoursAfter) {
    const travelTime = new Date(travelEvent.timestamp);
    const start = new Date(travelTime);
    start.setHours(start.getHours() - hoursBefore);
    const end = new Date(travelTime);
    end.setHours(end.getHours() + hoursAfter);

    return sleepAnalysis.filter(record => {
      const recordTime = new Date(record.timestamp);
      return recordTime >= start && recordTime <= end && record.isDisrupted;
    });
  }

  /**
   * Create correlation object
   * @param {Object} travelEvent - Travel event
   * @param {Array} affectedSleep - Affected sleep records
   * @param {Date} date - Reference date
   * @returns {Object} Correlation
   */
  createCorrelation(travelEvent, affectedSleep, date) {
    const confidence = this.calculateConfidence(travelEvent, affectedSleep);
    const severity = this.calculateSeverity(affectedSleep);

    return {
      id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      travelEvent: {
        type: travelEvent.type,
        isRedEye: travelEvent.isRedEye || false,
        timestamp: travelEvent.timestamp
      },
      affectedSleep: affectedSleep.map(s => ({
        timestamp: s.timestamp,
        disruptionScore: s.disruptionScore,
        label: s.label
      })),
      confidence,
      severity,
      label: SLEEP_DISRUPTION.TRAVEL_DISRUPTED,
      timestamp: date.toISOString(),
      metadata: {
        totalAffected: affectedSleep.length,
        timeWindow: {
          preTravel: TIME_WINDOWS.PRE_TRAVEL,
          postTravel: TIME_WINDOWS.POST_TRAVEL
        }
      }
    };
  }

  /**
   * Calculate confidence of correlation
   * @param {Object} travelEvent - Travel event
   * @param {Array} affectedSleep - Affected sleep records
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(travelEvent, affectedSleep) {
    if (!travelEvent || !affectedSleep || affectedSleep.length === 0) {
      return 0;
    }

    let confidence = 0;
    let factors = 0;

    // Factor 1: Number of affected sleep records
    const recordFactor = Math.min(1, affectedSleep.length / 3);
    confidence += recordFactor * 0.3;
    factors += 0.3;

    // Factor 2: Red-eye flight bonus
    if (travelEvent.isRedEye) {
      confidence += 0.2;
    }
    factors += 0.2;

    // Factor 3: Average disruption score
    const avgScore = affectedSleep.reduce((sum, s) => sum + (s.disruptionScore || 0), 0) / affectedSleep.length;
    confidence += avgScore * 0.3;
    factors += 0.3;

    // Factor 4: Proximity to travel
    const proximityScore = this.calculateProximityScore(travelEvent, affectedSleep);
    confidence += proximityScore * 0.2;
    factors += 0.2;

    return factors > 0 ? Math.min(1, confidence / factors) : 0;
  }

  /**
   * Calculate proximity score
   * @param {Object} travelEvent - Travel event
   * @param {Array} affectedSleep - Affected sleep records
   * @returns {number} Proximity score (0-1)
   */
  calculateProximityScore(travelEvent, affectedSleep) {
    const travelTime = new Date(travelEvent.timestamp).getTime();
    const times = affectedSleep.map(s => new Date(s.timestamp).getTime());
    
    const avgDiff = times.reduce((sum, t) => sum + Math.abs(t - travelTime), 0) / times.length;
    const maxDiff = 48 * 60 * 60 * 1000; // 48 hours in ms
    
    return Math.max(0, 1 - (avgDiff / maxDiff));
  }

  /**
   * Calculate severity of disruption
   * @param {Array} affectedSleep - Affected sleep records
   * @returns {number} Severity score (0-1)
   */
  calculateSeverity(affectedSleep) {
    if (!affectedSleep || affectedSleep.length === 0) return 0;

    const avgScore = affectedSleep.reduce((sum, s) => sum + (s.disruptionScore || 0), 0) / affectedSleep.length;
    const duration = affectedSleep.length;

    // Combine duration and intensity
    return Math.min(1, (avgScore * 0.7) + (Math.min(1, duration / 5) * 0.3));
  }

  /**
   * Get correlations for a specific travel event type
   * @param {string} type - Travel type
   * @returns {Array} Filtered correlations
   */
  getCorrelationsByType(type) {
    return this.correlations.filter(c => c.travelEvent.type === type);
  }

  /**
   * Get all correlations
   * @returns {Array} All correlations
   */
  getAllCorrelations() {
    return this.correlations;
  }

  /**
   * Clear correlations
   */
  clearCorrelations() {
    this.correlations = [];
  }
}

module.exports = TravelCorrelator;