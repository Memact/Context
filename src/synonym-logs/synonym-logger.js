/**
 * Synonym Logger - Logs synonym expansion steps for explainability
 */

class SynonymLogger {
  constructor(options = {}) {
    this.logs = [];
    this.maxLogSize = options.maxLogSize || 1000;
    this.enabled = options.enabled !== false;
    this.currentTrace = null;
  }

  /**
   * Start a new trace for a matching request
   * @param {Object} request - Matching request
   * @returns {string} Trace ID
   */
  startTrace(request) {
    if (!this.enabled) return null;

    const traceId = this.generateId();
    this.currentTrace = {
      id: traceId,
      request: {
        text: request.text || '',
        field: request.field || '',
        category: request.category || ''
      },
      startedAt: new Date().toISOString(),
      steps: [],
      result: null
    };

    return traceId;
  }

  /**
   * Log a synonym expansion step
   * @param {Object} step - Step details
   */
  logStep(step) {
    if (!this.enabled || !this.currentTrace) return;

    this.currentTrace.steps.push({
      ...step,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log the final result of the match
   * @param {Object} result - Matching result
   */
  logResult(result) {
    if (!this.enabled || !this.currentTrace) return;

    this.currentTrace.result = result;
    this.currentTrace.completedAt = new Date().toISOString();
    this.currentTrace.duration = new Date(this.currentTrace.completedAt) - new Date(this.currentTrace.startedAt);

    // Store the complete trace
    this.logs.push(this.currentTrace);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    this.currentTrace = null;
  }

  /**
   * Log synonym expansion from app field to memact fields
   * @param {string} appField - App field name
   * @param {Array} memactFields - Matched memact fields
   * @param {Object} options - Additional options
   */
  logSynonymExpansion(appField, memactFields, options = {}) {
    this.logStep({
      type: 'synonym_expansion',
      appField,
      memactFields,
      matchType: options.matchType || 'exact',
      confidence: options.confidence || 1.0,
      reason: options.reason || 'Synonym mapping found'
    });
  }

  /**
   * Log failed synonym expansion
   * @param {string} appField - App field name
   * @param {string} reason - Failure reason
   */
  logSynonymFailure(appField, reason) {
    this.logStep({
      type: 'synonym_failure',
      appField,
      matchedFields: [],
      reason,
      confidence: 0
    });
  }

  /**
   * Log partial synonym match
   * @param {string} appField - App field name
   * @param {string} closestMatch - Closest match found
   * @param {number} similarity - Similarity score
   */
  logPartialMatch(appField, closestMatch, similarity) {
    this.logStep({
      type: 'partial_match',
      appField,
      closestMatch,
      similarity,
      reason: 'Partial match with similarity',
      confidence: similarity
    });
  }

  /**
   * Log synonym source information
   * @param {string} source - Source of synonym (trie, config, etc.)
   * @param {Array} synonyms - Synonyms found
   */
  logSynonymSource(source, synonyms) {
    this.logStep({
      type: 'synonym_source',
      source,
      synonyms,
      reason: `Synonyms from ${source}`
    });
  }

  /**
   * Get all logs
   * @param {Object} filters - Filter options
   * @returns {Array} Logs
   */
  getLogs(filters = {}) {
    let logs = this.logs;

    if (filters.limit) {
      logs = logs.slice(-filters.limit);
    }

    if (filters.fromDate) {
      logs = logs.filter(log => log.startedAt >= filters.fromDate);
    }

    if (filters.toDate) {
      logs = logs.filter(log => log.startedAt <= filters.toDate);
    }

    if (filters.type) {
      logs = logs.filter(log => 
        log.steps.some(step => step.type === filters.type)
      );
    }

    return logs;
  }

  /**
   * Get a specific trace by ID
   * @param {string} traceId - Trace ID
   * @returns {Object|null} Trace or null
   */
  getTrace(traceId) {
    return this.logs.find(log => log.id === traceId) || null;
  }

  /**
   * Get statistics about synonym logs
   * @returns {Object} Statistics
   */
  getStats() {
    const totalTraces = this.logs.length;
    const successfulTraces = this.logs.filter(log => 
      log.result && log.result.success !== false
    ).length;
    
    const totalSteps = this.logs.reduce((sum, log) => sum + log.steps.length, 0);
    const avgSteps = totalTraces > 0 ? totalSteps / totalTraces : 0;

    // Count by step type
    const stepTypes = {};
    for (const log of this.logs) {
      for (const step of log.steps) {
        stepTypes[step.type] = (stepTypes[step.type] || 0) + 1;
      }
    }

    return {
      totalTraces,
      successfulTraces,
      failedTraces: totalTraces - successfulTraces,
      totalSteps,
      averageStepsPerTrace: avgSteps.toFixed(2),
      stepTypes,
      enabled: this.enabled
    };
  }

  /**
   * Get recent synonym expansions
   * @param {number} limit - Number of expansions
   * @returns {Array} Recent expansions
   */
  getRecentExpansions(limit = 10) {
    const expansions = [];

    for (const log of this.logs.slice(-limit).reverse()) {
      const synonymSteps = log.steps.filter(step => step.type === 'synonym_expansion');
      for (const step of synonymSteps) {
        expansions.push({
          traceId: log.id,
          appField: step.appField,
          memactFields: step.memactFields,
          confidence: step.confidence,
          reason: step.reason,
          timestamp: step.timestamp
        });
      }
    }

    return expansions;
  }

  /**
   * Get failed synonym lookups
   * @param {number} limit - Number of failures
   * @returns {Array} Failed lookups
   */
  getFailures(limit = 10) {
    const failures = [];

    for (const log of this.logs.slice(-limit).reverse()) {
      const failureSteps = log.steps.filter(step => step.type === 'synonym_failure');
      for (const step of failureSteps) {
        failures.push({
          traceId: log.id,
          appField: step.appField,
          reason: step.reason,
          timestamp: step.timestamp
        });
      }
    }

    return failures;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.currentTrace = null;
  }

  /**
   * Enable/disable logging
   * @param {boolean} enabled - Enable status
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = SynonymLogger;