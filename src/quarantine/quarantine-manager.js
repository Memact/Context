/**
 * Quarantine Manager - Manages quarantined purchases with decay
 */

const { QUARANTINE_STATUS, QUARANTINE_CONFIG } = require('./quarantine-constants');

class QuarantineManager {
  constructor(options = {}) {
    this.quarantinedItems = new Map();
    this.config = {
      maxItems: options.maxItems || QUARANTINE_CONFIG.maxItemsInQuarantine,
      decayInterval: options.decayInterval || QUARANTINE_CONFIG.decayIntervalHours,
      cleanupInterval: options.cleanupInterval || QUARANTINE_CONFIG.cleanupIntervalHours
    };
    this.stats = {
      totalQuarantined: 0,
      active: 0,
      decayed: 0,
      expired: 0
    };
  }

  /**
   * Add item to quarantine
   * @param {Object} item - Item to quarantine
   * @param {Object} detection - Detection result
   * @returns {Object} Quarantined item
   */
  quarantine(item, detection) {
    // Check if over limit
    if (this.quarantinedItems.size >= this.config.maxItems) {
      this.cleanup();
    }

    const id = this.generateId();
    const now = new Date();

    const quarantined = {
      id,
      item,
      detection,
      status: QUARANTINE_STATUS.ACTIVE,
      quarantinedAt: now,
      lastDecayedAt: now,
      expiresAt: new Date(now.getTime() + detection.quarantineDays * 24 * 60 * 60 * 1000),
      decayFactor: 1.0,
      history: [{
        action: 'quarantined',
        timestamp: now.toISOString(),
        factor: 1.0
      }]
    };

    this.quarantinedItems.set(id, quarantined);
    this.stats.totalQuarantined++;
    this.stats.active++;

    return quarantined;
  }

  /**
   * Apply decay to all quarantined items
   * @param {number} hours - Hours to decay
   * @returns {Array} Decayed items
   */
  decay(hours = 24) {
    const decayed = [];
    const now = new Date();

    for (const [id, item] of this.quarantinedItems.entries()) {
      if (item.status === QUARANTINE_STATUS.EXPIRED) continue;

      const timeSinceLastDecay = (now - new Date(item.lastDecayedAt)) / (1000 * 60 * 60);
      if (timeSinceLastDecay < this.config.decayInterval) continue;

      // Calculate decay
      const decayAmount = item.detection.decayRate * (hours / 24);
      item.decayFactor = Math.max(0, item.decayFactor - decayAmount);

      // Update status
      if (item.decayFactor <= 0) {
        item.status = QUARANTINE_STATUS.EXPIRED;
        item.expiredAt = now;
        this.stats.expired++;
        this.stats.active--;
      } else if (item.decayFactor < 0.5) {
        item.status = QUARANTINE_STATUS.DECAYING;
      }

      item.lastDecayedAt = now;
      item.history.push({
        action: 'decayed',
        timestamp: now.toISOString(),
        factor: item.decayFactor,
        decayAmount
      });

      decayed.push({ id, ...item });
    }

    return decayed;
  }

  /**
   * Get active quarantined items
   * @returns {Array} Active items
   */
  getActive() {
    const active = [];
    const now = new Date();

    for (const [id, item] of this.quarantinedItems.entries()) {
      if (item.status === QUARANTINE_STATUS.EXPIRED) continue;

      // Check expiration
      if (new Date(item.expiresAt) < now) {
        item.status = QUARANTINE_STATUS.EXPIRED;
        item.expiredAt = now;
        this.stats.expired++;
        this.stats.active--;
        continue;
      }

      active.push({ id, ...item });
    }

    return active;
  }

  /**
   * Get item by ID
   * @param {string} id - Item ID
   * @returns {Object|null} Item or null
   */
  getById(id) {
    if (this.quarantinedItems.has(id)) {
      return { id, ...this.quarantinedItems.get(id) };
    }
    return null;
  }

  /**
   * Remove item from quarantine
   * @param {string} id - Item ID
   * @returns {boolean} True if removed
   */
  remove(id) {
    if (this.quarantinedItems.has(id)) {
      const item = this.quarantinedItems.get(id);
      if (item.status !== QUARANTINE_STATUS.EXPIRED) {
        this.stats.active--;
      }
      this.quarantinedItems.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Cleanup expired items
   * @returns {number} Number of items cleaned
   */
  cleanup() {
    const now = new Date();
    let cleaned = 0;

    for (const [id, item] of this.quarantinedItems.entries()) {
      if (item.status === QUARANTINE_STATUS.EXPIRED) {
        this.quarantinedItems.delete(id);
        cleaned++;
      } else if (new Date(item.expiresAt) < now) {
        item.status = QUARANTINE_STATUS.EXPIRED;
        item.expiredAt = now;
        this.quarantinedItems.delete(id);
        this.stats.expired++;
        this.stats.active--;
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get quarantine statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const active = this.getActive();
    const decaying = active.filter(item => item.status === QUARANTINE_STATUS.DECAYING);
    const fresh = active.filter(item => item.status === QUARANTINE_STATUS.ACTIVE);

    return {
      ...this.stats,
      currentActive: active.length,
      currentlyDecaying: decaying.length,
      freshQuarantines: fresh.length,
      totalHistory: this.quarantinedItems.size
    };
  }

  /**
   * Get all quarantined items with their status
   * @returns {Array} All items
   */
  getAll() {
    const items = [];
    for (const [id, item] of this.quarantinedItems.entries()) {
      items.push({ id, ...item });
    }
    return items;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all quarantined items
   */
  clear() {
    this.quarantinedItems.clear();
    this.stats = {
      totalQuarantined: 0,
      active: 0,
      decayed: 0,
      expired: 0
    };
  }

  /**
   * Get decay factor for an item
   * @param {string} id - Item ID
   * @returns {number} Decay factor (0-1)
   */
  getDecayFactor(id) {
    const item = this.getById(id);
    return item ? item.decayFactor : 0;
  }

  /**
   * Check if item is still relevant
   * @param {string} id - Item ID
   * @returns {boolean} True if relevant
   */
  isRelevant(id) {
    const item = this.getById(id);
    if (!item) return false;
    return item.decayFactor > 0.3 && item.status !== QUARANTINE_STATUS.EXPIRED;
  }
}

module.exports = QuarantineManager;