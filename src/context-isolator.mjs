/**
 * Context Isolator - Isolates travel-disrupted sleep from health trends
 */

import TravelDetector from './travel/travel-detector.js';
import SleepAnalyzer from './travel/sleep-analyzer.js';
import TravelCorrelator from './travel/travel-correlator.js';
import { SLEEP_DISRUPTION } from './travel/travel-constants.js';

class ContextIsolator {
  constructor() {
    this.travelDetector = new TravelDetector();
    this.sleepAnalyzer = new SleepAnalyzer();
    this.correlator = new TravelCorrelator();
    this.isolatedContext = new Map();
  }

  /**
   * Process health data with travel context
   * @param {Object} data - Health and travel data
   * @param {Date} date - Reference date
   * @returns {Object} Processed context with isolation
   */
  process(data, date = new Date()) {
    const { sleepData, flightData, rideData } = data;

    // Detect travel events
    const flights = this.travelDetector.detectFlights(flightData || []);
    const rides = this.travelDetector.detectUberRides(rideData || []);
    
    this.travelDetector.addTravelEvents([...flights, ...rides]);

    // Analyze sleep
    const sleepAnalysis = sleepData.map(record => {
      const analysis = this.sleepAnalyzer.analyze([record], new Date(record.timestamp));
      return {
        ...record,
        ...analysis,
        timestamp: record.timestamp
      };
    });

    // Correlate travel with sleep disruption
    const travelEvents = this.travelDetector.getTravelEventsAround(date);
    const correlations = this.correlator.correlate(travelEvents, sleepAnalysis, date);

    // Isolate context
    const isolated = this.isolateContext(sleepData, correlations);

    return {
      correlations,
      isolatedSleep: isolated.isolatedRecords,
      regularSleep: isolated.regularRecords,
      isolationSummary: {
        totalRecords: sleepData.length,
        isolatedCount: isolated.isolatedRecords.length,
        regularCount: isolated.regularRecords.length,
        disruptions: correlations.length,
        timestamp: date.toISOString()
      }
    };
  }

  /**
   * Isolate sleep context
   * @param {Array} sleepData - Sleep data
   * @param {Array} correlations - Correlations
   * @returns {Object} Isolated context
   */
  isolateContext(sleepData, correlations) {
    // Get all disrupted timestamps
    const disruptedTimestamps = new Set();
    correlations.forEach(corr => {
      corr.affectedSleep.forEach(sleep => {
        disruptedTimestamps.add(new Date(sleep.timestamp).toISOString());
      });
    });

    const isolatedRecords = [];
    const regularRecords = [];

    sleepData.forEach(record => {
      const timestamp = new Date(record.timestamp).toISOString();
      if (disruptedTimestamps.has(timestamp)) {
        isolatedRecords.push({
          ...record,
          label: SLEEP_DISRUPTION.TRAVEL_DISRUPTED,
          isolated: true,
          isolationReason: 'travel_disruption',
          isolatedAt: new Date().toISOString()
        });
      } else {
        regularRecords.push({
          ...record,
          label: SLEEP_DISRUPTION.NORMAL,
          isolated: false
        });
      }
    });

    return { isolatedRecords, regularRecords };
  }

  /**
   * Get isolated context for a date range
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {Array} Isolated context records
   */
  getIsolatedContext(start, end) {
    const results = [];
    for (const [key, value] of this.isolatedContext.entries()) {
      const date = new Date(key);
      if (date >= start && date <= end) {
        results.push(value);
      }
    }
    return results;
  }

  /**
   * Clear isolated context
   */
  clear() {
    this.isolatedContext.clear();
  }

  /**
   * Get isolation statistics
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {Object} Isolation statistics
   */
  getIsolationStats(start, end) {
    const isolated = this.getIsolatedContext(start, end);
    
    return {
      total: isolated.length,
      byLabel: {
        [SLEEP_DISRUPTION.TRAVEL_DISRUPTED]: isolated.filter(r => r.label === SLEEP_DISRUPTION.TRAVEL_DISRUPTED).length,
        [SLEEP_DISRUPTION.NORMAL]: isolated.filter(r => r.label === SLEEP_DISRUPTION.NORMAL).length
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    };
  }
}

export default ContextIsolator;