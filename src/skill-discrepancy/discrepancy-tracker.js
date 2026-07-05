/**
 * Discrepancy Tracker - Tracks skill discrepancies over time
 */

class DiscrepancyTracker {
  constructor(options = {}) {
    this.discrepancyHistory = [];
    this.maxHistory = options.maxHistory || 100;
    this.flaggedItems = new Map();
  }

  /**
   * Track a discrepancy
   * @param {Object} analysis - Analysis result
   * @param {string} language - Language name
   * @returns {Object} Tracking record
   */
  track(analysis, language) {
    const record = {
      id: this.generateId(),
      language,
      discrepancy: analysis.discrepancy,
      discrepancyLevel: analysis.discrepancyLevel,
      labels: analysis.labels,
      sources: {
        source1: analysis.source1,
        source2: analysis.source2
      },
      confidence: analysis.confidence,
      isMatch: analysis.isMatch,
      timestamp: new Date().toISOString(),
      recommendations: analysis.recommendations
    };

    this.discrepancyHistory.push(record);
    if (this.discrepancyHistory.length > this.maxHistory) {
      this.discrepancyHistory.shift();
    }

    // Flag if discrepancy is severe
    if (analysis.discrepancyLevel === 'severe') {
      this.flagItem(language, analysis);
    }

    return record;
  }

  /**
   * Flag an item for attention
   * @param {string} language - Language name
   * @param {Object} analysis - Analysis result
   */
  flagItem(language, analysis) {
    this.flaggedItems.set(language, {
      language,
      discrepancy: analysis.discrepancy,
      discrepancyLevel: analysis.discrepancyLevel,
      flaggedAt: new Date().toISOString(),
      status: 'active',
      recommendations: analysis.recommendations
    });
  }

  /**
   * Unflag an item
   * @param {string} language - Language name
   * @returns {boolean} True if unflagged
   */
  unflagItem(language) {
    if (this.flaggedItems.has(language)) {
      const item = this.flaggedItems.get(language);
      item.status = 'resolved';
      item.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get flagged items
   * @param {string} status - Optional status filter
   * @returns {Array} Flagged items
   */
  getFlagged(status = null) {
    const items = [];
    for (const [language, item] of this.flaggedItems) {
      if (!status || item.status === status) {
        items.push({ language, ...item });
      }
    }
    return items;
  }

  /**
   * Get discrepancy history
   * @param {string} language - Optional language filter
   * @param {number} limit - Number of records
   * @returns {Array} History records
   */
  getHistory(language = null, limit = 10) {
    let history = this.discrepancyHistory;
    
    if (language) {
      history = history.filter(r => r.language === language);
    }

    return history.slice(-limit).reverse();
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.discrepancyHistory.length;
    const matches = this.discrepancyHistory.filter(r => r.isMatch).length;
    const discrepancies = total - matches;

    const byLevel = {
      none: 0,
      mild: 0,
      moderate: 0,
      severe: 0
    };

    for (const record of this.discrepancyHistory) {
      byLevel[record.discrepancyLevel] = (byLevel[record.discrepancyLevel] || 0) + 1;
    }

    const avgDiscrepancy = total > 0 
      ? this.discrepancyHistory.reduce((sum, r) => sum + r.discrepancy, 0) / total
      : 0;

    return {
      total,
      matches,
      discrepancies,
      matchRate: total > 0 ? (matches / total * 100).toFixed(2) + '%' : '0%',
      byLevel,
      averageDiscrepancy: avgDiscrepancy,
      flagged: this.flaggedItems.size,
      activeFlags: this.getFlagged('active').length
    };
  }

  /**
   * Get trend analysis
   * @param {string} language - Language name
   * @param {number} period - Number of records to analyze
   * @returns {Object} Trend analysis
   */
  getTrend(language, period = 5) {
    const history = this.getHistory(language, period);
    
    if (history.length === 0) {
      return {
        language,
        trend: 'No data',
        direction: 'stable',
        improvement: 0
      };
    }

    const recent = history.slice(0, Math.min(period, history.length));
    const older = history.slice(Math.min(period, history.length), history.length);

    const avgRecent = recent.reduce((sum, r) => sum + r.discrepancy, 0) / recent.length;
    const avgOlder = older.length > 0 
      ? older.reduce((sum, r) => sum + r.discrepancy, 0) / older.length
      : avgRecent;

    const improvement = avgOlder - avgRecent;
    const direction = improvement > 0.1 ? 'improving' :
                      improvement < -0.1 ? 'worsening' : 'stable';

    return {
      language,
      trend: direction === 'improving' ? '📈 Improving' :
             direction === 'worsening' ? '📉 Worsening' : '➡️ Stable',
      direction,
      improvement: Math.abs(improvement),
      avgRecent,
      avgOlder,
      sampleSize: recent.length
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.discrepancyHistory = [];
    this.flaggedItems.clear();
  }
}

module.exports = DiscrepancyTracker;