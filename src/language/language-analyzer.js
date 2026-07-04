/**
 * Language Analyzer - Analyzes and categorizes languages based on usage patterns
 */

const {
  LANGUAGE_STATUS,
  LANGUAGE_CATEGORIES,
  PRIORITY_WEIGHTS,
  DUOLINGO_PROGRESS,
  DUOLINGO_SCORES,
  LANGUAGE_RECOGNITION
} = require('./language-constants');

class LanguageAnalyzer {
  constructor(options = {}) {
    this.recognitionPatterns = options.recognitionPatterns || LANGUAGE_RECOGNITION;
    this.priorityWeights = options.priorityWeights || PRIORITY_WEIGHTS;
    this.activeThreshold = options.activeThreshold || 0.4;
  }

  /**
   * Analyze language data and determine status
   * @param {Object} languageData - Language data
   * @param {Array} history - Historical language usage
   * @returns {Object} Analysis result
   */
  analyze(languageData, history = []) {
    const { language, source, progress, usageFrequency, lastUsed } = languageData;

    // Determine category
    const category = this.determineCategory(source, language);

    // Determine status
    const status = this.determineStatus(languageData, history);

    // Calculate priority weight
    const priorityWeight = this.calculatePriority(status, progress, usageFrequency);

    // Determine if actively learning
    const isActiveLearning = this.isActiveLearning(status, progress, usageFrequency, lastUsed);

    // Get Duolingo progress if applicable
    const duolingoProgress = this.getDuolingoProgress(source, progress);

    // Get stable language status
    const isStable = this.isStableLanguage(status, category, usageFrequency);

    return {
      language,
      source,
      category,
      status,
      priorityWeight,
      isActiveLearning,
      isStable,
      duolingoProgress: duolingoProgress || null,
      duolingoScore: duolingoProgress ? DUOLINGO_SCORES[duolingoProgress] : null,
      confidence: this.calculateConfidence(languageData, history),
      timestamp: new Date().toISOString(),
      recommendations: this.getRecommendations(languageData, history)
    };
  }

  /**
   * Determine language category
   * @param {string} source - Source of language data
   * @param {string} language - Language name
   * @returns {string} Category
   */
  determineCategory(source, language) {
    const sourceLower = (source || '').toLowerCase();
    const langLower = (language || '').toLowerCase();

    // Check source first
    if (sourceLower === 'duolingo' || sourceLower.includes('duolingo')) {
      return LANGUAGE_CATEGORIES.DUOLINGO;
    }

    // Check language patterns
    if (this.recognitionPatterns.stable.includes(langLower) ||
        this.recognitionPatterns.stable.some(p => langLower.includes(p))) {
      return LANGUAGE_CATEGORIES.FLUENT;
    }

    if (this.recognitionPatterns.activeLearning.some(p => langLower.includes(p))) {
      return LANGUAGE_CATEGORIES.LEARNING;
    }

    return LANGUAGE_CATEGORIES.LEARNING; // Default
  }

  /**
   * Determine language status
   * @param {Object} data - Language data
   * @param {Array} history - Historical data
   * @returns {string} Status
   */
  determineStatus(data, history) {
    const { source, progress, usageFrequency, lastUsed } = data;

    // If from Duolingo with progress, it's active learning
    if (source === 'duolingo' && progress) {
      return LANGUAGE_STATUS.ACTIVE_LEARNING;
    }

    // Check if stable (fluent/native)
    if (this.isStableLanguage(LANGUAGE_STATUS.STABLE, data.category, usageFrequency)) {
      return LANGUAGE_STATUS.STABLE;
    }

    // Check if dormant (was learning, not used recently)
    if (this.isDormant(lastUsed, usageFrequency, history)) {
      return LANGUAGE_STATUS.DORMANT;
    }

    // Planned language
    if (this.isPlanned(data)) {
      return LANGUAGE_STATUS.PLANNED;
    }

    return LANGUAGE_STATUS.ACTIVE_LEARNING; // Default
  }

  /**
   * Calculate priority weight
   * @param {string} status - Language status
   * @param {string} progress - Progress level
   * @param {number} usageFrequency - Usage frequency
   * @returns {number} Priority weight (0-1)
   */
  calculatePriority(status, progress, usageFrequency) {
    let priority = this.priorityWeights[status] || 0.5;

    // Boost for active Duolingo users
    if (status === LANGUAGE_STATUS.ACTIVE_LEARNING && progress) {
      const progressBoost = DUOLINGO_SCORES[progress] / 100 * 0.2;
      priority = Math.min(1, priority + progressBoost);
    }

    // Boost for frequent usage
    if (usageFrequency && usageFrequency > 0.7) {
      priority = Math.min(1, priority + 0.1);
    }

    return Math.min(1, Math.max(0, priority));
  }

  /**
   * Check if actively learning
   * @param {string} status - Language status
   * @param {string} progress - Progress level
   * @param {number} usageFrequency - Usage frequency
   * @param {Date} lastUsed - Last used date
   * @returns {boolean} True if active learning
   */
  isActiveLearning(status, progress, usageFrequency, lastUsed) {
    if (status !== LANGUAGE_STATUS.ACTIVE_LEARNING) return false;

    // Must have progress
    if (!progress) return false;

    // Check if used recently
    if (lastUsed) {
      const daysAgo = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > 60) return false; // Not used in 2 months
    }

    // Check frequency
    if (usageFrequency !== undefined && usageFrequency < this.activeThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Check if stable language
   * @param {string} status - Language status
   * @param {string} category - Language category
   * @param {number} usageFrequency - Usage frequency
   * @returns {boolean} True if stable
   */
  isStableLanguage(status, category, usageFrequency) {
    if (status === LANGUAGE_STATUS.STABLE) return true;
    if (category === LANGUAGE_CATEGORIES.FLUENT || category === LANGUAGE_CATEGORIES.NATIVE) return true;

    // High usage frequency suggests stability
    if (usageFrequency && usageFrequency > 0.8) return true;

    return false;
  }

  /**
   * Check if dormant language
   * @param {Date} lastUsed - Last used date
   * @param {number} usageFrequency - Usage frequency
   * @param {Array} history - Historical data
   * @returns {boolean} True if dormant
   */
  isDormant(lastUsed, usageFrequency, history) {
    if (!lastUsed) return false;

    const daysAgo = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);

    // Not used in 3 months and low frequency
    if (daysAgo > 90 && (!usageFrequency || usageFrequency < 0.2)) {
      return true;
    }

    // Check history for inactivity pattern
    if (history && history.length > 0) {
      const recentActivity = history.filter(h => {
        const days = (Date.now() - new Date(h.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 90;
      });
      if (recentActivity.length === 0) return true;
    }

    return false;
  }

  /**
   * Check if planned language
   * @param {Object} data - Language data
   * @returns {boolean} True if planned
   */
  isPlanned(data) {
    const { source, description, status } = data;

    if (status === LANGUAGE_STATUS.PLANNED) return true;

    const searchText = `${source || ''} ${description || ''}`.toLowerCase();
    return this.recognitionPatterns.planned.some(p => searchText.includes(p));
  }

  /**
   * Get Duolingo progress
   * @param {string} source - Source
   * @param {string} progress - Progress string
   * @returns {string|null} Progress level
   */
  getDuolingoProgress(source, progress) {
    if (source !== 'duolingo') return null;
    if (!progress) return null;

    // Match progress to enum
    for (const [key, value] of Object.entries(DUOLINGO_PROGRESS)) {
      if (progress.toLowerCase().includes(value) || value.includes(progress.toLowerCase())) {
        return value;
      }
    }

    // If no match, try to infer from score
    if (typeof progress === 'number') {
      if (progress < 30) return DUOLINGO_PROGRESS.BEGINNER;
      if (progress < 50) return DUOLINGO_PROGRESS.ELEMENTARY;
      if (progress < 70) return DUOLINGO_PROGRESS.INTERMEDIATE;
      if (progress < 85) return DUOLINGO_PROGRESS.UPPER_INTERMEDIATE;
      if (progress < 100) return DUOLINGO_PROGRESS.ADVANCED;
      return DUOLINGO_PROGRESS.MASTER;
    }

    return DUOLINGO_PROGRESS.BEGINNER;
  }

  /**
   * Calculate confidence score
   * @param {Object} data - Language data
   * @param {Array} history - Historical data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(data, history) {
    let confidence = 0.5;

    // More data = higher confidence
    if (data.progress) confidence += 0.2;
    if (data.usageFrequency) confidence += 0.1;
    if (data.lastUsed) confidence += 0.1;

    // History data
    if (history && history.length > 0) {
      confidence += Math.min(0.2, history.length * 0.02);
    }

    // Source reliability
    if (data.source === 'duolingo') confidence += 0.1;
    if (data.source === 'duolingo' && data.progress) confidence += 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Get recommendations based on analysis
   * @param {Object} data - Language data
   * @param {Array} history - Historical data
   * @returns {Array} Recommendations
   */
  getRecommendations(data, history) {
    const recommendations = [];
    const { language, status, progress, source } = data;

    if (status === LANGUAGE_STATUS.ACTIVE_LEARNING) {
      recommendations.push(`Continue practicing ${language} - you're making progress!`);
      
      if (progress && DUOLINGO_SCORES[progress] < 50) {
        recommendations.push(`Try to reach intermediate level in ${language}`);
      }
    }

    if (status === LANGUAGE_STATUS.STABLE) {
      recommendations.push(`Use ${language} for communication - you're fluent!`);
    }

    if (status === LANGUAGE_STATUS.DORMANT) {
      recommendations.push(`You haven't used ${language} in a while. Consider a refresher!`);
    }

    if (status === LANGUAGE_STATUS.PLANNED) {
      recommendations.push(`Start learning ${language} - it's on your list!`);
    }

    if (source === 'duolingo' && progress) {
      const score = DUOLINGO_SCORES[progress];
      if (score < 50) {
        recommendations.push(`Keep going on Duolingo for ${language}!`);
      } else if (score >= 85) {
        recommendations.push(`You're mastering ${language} on Duolingo!`);
      }
    }

    return recommendations;
  }

  /**
   * Get language type for categorization
   * @param {Object} analysis - Analysis result
   * @returns {string} Language type
   */
  getLanguageType(analysis) {
    if (analysis.isActiveLearning) return 'active_learning';
    if (analysis.isStable) return 'stable';
    if (analysis.status === LANGUAGE_STATUS.DORMANT) return 'dormant';
    if (analysis.status === LANGUAGE_STATUS.PLANNED) return 'planned';
    return 'unknown';
  }
}

module.exports = LanguageAnalyzer;