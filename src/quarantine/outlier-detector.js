/**
 * Outlier Detector - Identifies high-price, low-frequency purchases
 */

const { HIGH_TICKET_ITEMS, DEFAULT_QUARANTINE, QUARANTINE_CONFIG } = require('./quarantine-constants');

class OutlierDetector {
  constructor(options = {}) {
    this.highTicketItems = options.highTicketItems || HIGH_TICKET_ITEMS;
    this.defaultConfig = options.defaultConfig || DEFAULT_QUARANTINE;
    this.minPrice = options.minPrice || QUARANTINE_CONFIG.minPriceForQuarantine;
    this.purchaseHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Detect if a purchase is an outlier
   * @param {Object} purchase - Purchase data
   * @param {Array} purchaseHistory - User's purchase history
   * @returns {Object} Detection result
   */
  detect(purchase, purchaseHistory = []) {
    const { category, price, description, productName } = purchase;

    // Find matching category
    const matchedCategory = this.matchCategory(category, description, productName);
    
    if (!matchedCategory) {
      return {
        isOutlier: false,
        category: null,
        reason: 'No matching category found',
        confidence: 0
      };
    }

    const config = this.highTicketItems[matchedCategory];
    const threshold = config?.threshold || this.defaultConfig.threshold;

    // Check if price is above threshold
    const isHighPrice = price >= threshold;

    // Check purchase frequency
    const frequency = this.getPurchaseFrequency(purchaseHistory, matchedCategory);
    const isLowFrequency = frequency <= 1;

    // Calculate confidence score
    const confidence = this.calculateConfidence({
      isHighPrice,
      isLowFrequency,
      price,
      threshold,
      frequency,
      priceRatio: price / threshold
    });

    // Determine if outlier
    const isOutlier = confidence >= this.defaultConfig.confidenceThreshold;

    // Determine decay rate
    const decayRate = this.getDecayRate(matchedCategory, confidence);

    return {
      isOutlier,
      category: matchedCategory,
      price,
      threshold,
      frequency,
      confidence,
      decayRate,
      quarantineDays: config?.quarantineDays || this.defaultConfig.quarantineDays,
      reason: this.getReason(isHighPrice, isLowFrequency, confidence),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Match purchase to a category
   * @param {string} category - Category from purchase
   * @param {string} description - Product description
   * @param {string} productName - Product name
   * @returns {string|null} Matched category
   */
  matchCategory(category, description, productName) {
    const searchText = `${category || ''} ${description || ''} ${productName || ''}`.toLowerCase();

    // Direct category match
    if (category && this.highTicketItems[category]) {
      return category;
    }

    // Keyword matching
    for (const [cat, config] of Object.entries(this.highTicketItems)) {
      for (const keyword of config.keywords) {
        if (searchText.includes(keyword)) {
          return cat;
        }
      }
    }

    return null;
  }

  /**
   * Get purchase frequency for a category
   * @param {Array} history - Purchase history
   * @param {string} category - Category to check
   * @returns {number} Frequency count
   */
  getPurchaseFrequency(history, category) {
    if (!Array.isArray(history) || history.length === 0) return 0;

    const recent = history.filter(p => {
      const daysAgo = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 180; // Last 6 months
    });

    const count = recent.filter(p => {
      const cat = this.matchCategory(p.category, p.description, p.productName);
      return cat === category;
    }).length;

    return count;
  }

  /**
   * Calculate confidence score
   * @param {Object} factors - Confidence factors
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(factors) {
    const { isHighPrice, isLowFrequency, price, threshold, frequency, priceRatio } = factors;

    let confidence = 0;
    let totalWeight = 0;

    // Price factor (30%)
    if (isHighPrice) {
      confidence += 0.3 * Math.min(1, priceRatio / 2);
    } else {
      confidence += 0.3 * (price / threshold) * 0.5;
    }
    totalWeight += 0.3;

    // Frequency factor (30%)
    if (isLowFrequency) {
      confidence += 0.3 * (1 - Math.min(1, frequency / 3));
    } else {
      confidence += 0.3 * (1 - Math.min(1, frequency / 5));
    }
    totalWeight += 0.3;

    // Price ratio factor (20%)
    const ratioScore = Math.min(1, priceRatio / 2);
    confidence += 0.2 * ratioScore;
    totalWeight += 0.2;

    // Category factor (20%)
    const categoryWeight = this.getCategoryWeight(factors.category);
    confidence += 0.2 * categoryWeight;
    totalWeight += 0.2;

    return totalWeight > 0 ? Math.min(1, confidence / totalWeight) : 0;
  }

  /**
   * Get category weight for confidence calculation
   * @param {string} category - Category name
   * @returns {number} Weight (0-1)
   */
  getCategoryWeight(category) {
    const weights = {
      vehicle: 0.9,
      jewelry: 0.8,
      luxury: 0.8,
      electronics: 0.7,
      appliance: 0.6,
      furniture: 0.5,
      equipment: 0.5,
      tool: 0.4
    };
    return weights[category] || 0.3;
  }

  /**
   * Get decay rate based on category and confidence
   * @param {string} category - Category name
   * @param {number} confidence - Confidence score
   * @returns {number} Decay rate
   */
  getDecayRate(category, confidence) {
    const config = this.highTicketItems[category];
    let decayRate = config?.decayRate || this.defaultConfig.decayRate;

    // Adjust decay rate based on confidence
    if (confidence > 0.8) {
      decayRate *= 0.8; // Slower decay for high confidence
    } else if (confidence < 0.7) {
      decayRate *= 1.2; // Faster decay for low confidence
    }

    return Math.min(0.5, Math.max(0.05, decayRate));
  }

  /**
   * Get reason for outlier detection
   * @param {boolean} isHighPrice - Is high price
   * @param {boolean} isLowFrequency - Is low frequency
   * @param {number} confidence - Confidence score
   * @returns {string} Reason
   */
  getReason(isHighPrice, isLowFrequency, confidence) {
    const reasons = [];
    if (isHighPrice) reasons.push('high price');
    if (isLowFrequency) reasons.push('low frequency');
    if (confidence > 0.8) reasons.push('high confidence');
    
    return reasons.length > 0 ? `Outlier detected: ${reasons.join(', ')}` : 'Potential outlier';
  }

  /**
   * Add purchase to history
   * @param {Object} purchase - Purchase to add
   */
  addToHistory(purchase) {
    this.purchaseHistory.push(purchase);
    if (this.purchaseHistory.length > this.maxHistory) {
      this.purchaseHistory.shift();
    }
  }

  /**
   * Get purchase history
   * @returns {Array} Purchase history
   */
  getHistory() {
    return this.purchaseHistory;
  }

  /**
   * Clear purchase history
   */
  clearHistory() {
    this.purchaseHistory = [];
  }
}

module.exports = OutlierDetector;