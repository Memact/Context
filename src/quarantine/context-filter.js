/**
 * Context Filter - Filters out quarantined items from context
 */

class ContextFilter {
  constructor(quarantineManager) {
    this.quarantineManager = quarantineManager;
  }

  /**
   * Filter context items to remove quarantined ones
   * @param {Array} contextItems - Context items
   * @param {Object} options - Filter options
   * @returns {Array} Filtered context items
   */
  filter(contextItems, options = {}) {
    if (!Array.isArray(contextItems) || contextItems.length === 0) {
      return contextItems;
    }

    const { includeDecaying = false, threshold = 0.3 } = options;

    // Get all quarantined IDs
    const quarantinedIds = new Set();
    const activeQuarantines = this.quarantineManager.getActive();

    for (const q of activeQuarantines) {
      // Only filter if decay factor is above threshold or we want to include decaying
      if (includeDecaying || q.decayFactor > threshold) {
        quarantinedIds.add(q.id);
      }
    }

    // Filter context items
    return contextItems.filter(item => {
      // Check if item is quarantined
      const itemId = item.id || item._id || item.purchaseId;
      if (quarantinedIds.has(itemId)) {
        return false;
      }

      // Check if item is from quarantined category
      const category = item.category || item.type;
      if (category) {
        const isQuarantined = this.isCategoryQuarantined(category);
        if (isQuarantined && !includeDecaying) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if a category is quarantined
   * @param {string} category - Category name
   * @returns {boolean} True if quarantined
   */
  isCategoryQuarantined(category) {
    const active = this.quarantineManager.getActive();
    return active.some(q => q.detection.category === category);
  }

  /**
   * Get quarantine scores for context items
   * @param {Array} contextItems - Context items
   * @returns {Array} Items with quarantine scores
   */
  getQuarantineScores(contextItems) {
    if (!Array.isArray(contextItems)) return [];

    const active = this.quarantineManager.getActive();
    const quarantineMap = new Map();
    for (const q of active) {
      quarantineMap.set(q.id, q.decayFactor);
    }

    return contextItems.map(item => {
      const itemId = item.id || item._id || item.purchaseId;
      const quarantineScore = quarantineMap.get(itemId) || 0;

      return {
        ...item,
        quarantineScore,
        isQuarantined: quarantineScore > 0
      };
    });
  }

  /**
   * Apply quarantine decay to scores
   * @param {Array} items - Items with scores
   * @param {number} decayMultiplier - Decay multiplier
   * @returns {Array} Items with adjusted scores
   */
  applyDecayToScores(items, decayMultiplier = 1.0) {
    if (!Array.isArray(items)) return [];

    const active = this.quarantineManager.getActive();
    const quarantineMap = new Map();
    for (const q of active) {
      quarantineMap.set(q.id, q.decayFactor);
    }

    return items.map(item => {
      const itemId = item.id || item._id || item.purchaseId;
      const decayFactor = quarantineMap.get(itemId) || 1.0;
      
      if (decayFactor < 1.0) {
        const originalScore = item.score || item.relevance || 1.0;
        const adjustedScore = originalScore * (decayFactor * decayMultiplier);
        
        return {
          ...item,
          originalScore,
          adjustedScore,
          decayFactor,
          isQuarantined: true,
          quarantineApplied: true
        };
      }

      return item;
    });
  }

  /**
   * Get quarantine summary for context
   * @param {Array} contextItems - Context items
   * @returns {Object} Quarantine summary
   */
  getQuarantineSummary(contextItems) {
    const scored = this.getQuarantineScores(contextItems);
    const quarantined = scored.filter(i => i.isQuarantined);
    const nonQuarantined = scored.filter(i => !i.isQuarantined);

    const activeQuarantines = this.quarantineManager.getActive();
    const avgDecay = quarantined.length > 0
      ? quarantined.reduce((sum, i) => sum + i.quarantineScore, 0) / quarantined.length
      : 0;

    return {
      totalItems: contextItems.length,
      quarantinedCount: quarantined.length,
      nonQuarantinedCount: nonQuarantined.length,
      activeQuarantines: activeQuarantines.length,
      averageDecayFactor: avgDecay,
      categories: this.getCategoryBreakdown(activeQuarantines)
    };
  }

  /**
   * Get category breakdown of quarantines
   * @param {Array} quarantines - Quarantined items
   * @returns {Object} Category breakdown
   */
  getCategoryBreakdown(quarantines) {
    const breakdown = {};
    for (const q of quarantines) {
      const category = q.detection.category;
      breakdown[category] = (breakdown[category] || 0) + 1;
    }
    return breakdown;
  }
}

module.exports = ContextFilter;