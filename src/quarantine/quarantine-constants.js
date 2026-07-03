/**
 * Quarantine Constants for Outlier Purchases
 */

const QUARANTINE_STATUS = {
  ACTIVE: 'active',
  DECAYING: 'decaying',
  EXPIRED: 'expired',
  QUARANTINED: 'quarantined'
};

const PURCHASE_CATEGORIES = {
  APPLIANCE: 'appliance',
  ELECTRONICS: 'electronics',
  FURNITURE: 'furniture',
  VEHICLE: 'vehicle',
  JEWELRY: 'jewelry',
  LUXURY: 'luxury',
  TOOL: 'tool',
  EQUIPMENT: 'equipment'
};

// High-ticket items that should be quarantined
const HIGH_TICKET_ITEMS = {
  [PURCHASE_CATEGORIES.APPLIANCE]: {
    threshold: 500,
    keywords: ['refrigerator', 'washer', 'dryer', 'dishwasher', 'oven', 'stove', 'microwave', 'ac', 'heater'],
    decayRate: 0.3,
    quarantineDays: 30
  },
  [PURCHASE_CATEGORIES.ELECTRONICS]: {
    threshold: 800,
    keywords: ['laptop', 'computer', 'tv', 'television', 'monitor', 'projector', 'camera', 'iphone', 'ipad', 'macbook'],
    decayRate: 0.25,
    quarantineDays: 45
  },
  [PURCHASE_CATEGORIES.FURNITURE]: {
    threshold: 400,
    keywords: ['sofa', 'bed', 'mattress', 'table', 'chair', 'desk', 'cabinet', 'dresser', 'bookshelf'],
    decayRate: 0.2,
    quarantineDays: 60
  },
  [PURCHASE_CATEGORIES.VEHICLE]: {
    threshold: 5000,
    keywords: ['car', 'bike', 'motorcycle', 'scooter', 'bicycle', 'vehicle'],
    decayRate: 0.15,
    quarantineDays: 90
  },
  [PURCHASE_CATEGORIES.JEWELRY]: {
    threshold: 300,
    keywords: ['ring', 'necklace', 'bracelet', 'watch', 'earring', 'pendant', 'diamond'],
    decayRate: 0.25,
    quarantineDays: 30
  },
  [PURCHASE_CATEGORIES.LUXURY]: {
    threshold: 1000,
    keywords: ['designer', 'luxury', 'premium', 'high-end', 'exclusive'],
    decayRate: 0.2,
    quarantineDays: 60
  },
  [PURCHASE_CATEGORIES.TOOL]: {
    threshold: 300,
    keywords: ['drill', 'saw', 'hammer', 'wrench', 'screwdriver', 'tool', 'workbench'],
    decayRate: 0.3,
    quarantineDays: 30
  },
  [PURCHASE_CATEGORIES.EQUIPMENT]: {
    threshold: 500,
    keywords: ['treadmill', 'exercise', 'gym', 'fitness', 'equipment', 'bike', 'elliptical'],
    decayRate: 0.25,
    quarantineDays: 45
  }
};

const DEFAULT_QUARANTINE = {
  threshold: 300,
  decayRate: 0.2,
  quarantineDays: 30,
  confidenceThreshold: 0.6
};

const QUARANTINE_CONFIG = {
  minPriceForQuarantine: 300,
  maxItemsInQuarantine: 50,
  decayIntervalHours: 24,
  cleanupIntervalHours: 72
};

module.exports = {
  QUARANTINE_STATUS,
  PURCHASE_CATEGORIES,
  HIGH_TICKET_ITEMS,
  DEFAULT_QUARANTINE,
  QUARANTINE_CONFIG
};