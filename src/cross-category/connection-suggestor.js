/**
 * Connection Suggester - Suggests cross-category connections
 */

const {
  CATEGORIES,
  CONNECTION_STATUS,
  CONNECTION_TYPES,
  CATEGORY_RELATIONSHIPS
} = require('./category-constants');

class ConnectionSuggester {
  constructor(options = {}) {
    this.categoryRelationships = options.categoryRelationships || CATEGORY_RELATIONSHIPS;
    this.minConfidence = options.minConfidence || 0.4;
    this.maxSuggestions = options.maxSuggestions || 20;
  }

  /**
   * Suggest cross-category connections
   * @param {Array} contextItems - Context items from different categories
   * @param {Object} options - Suggestion options
   * @returns {Object} Suggestion results
   */
  suggest(contextItems, options = {}) {
    // Group items by category
    const groupedItems = this.groupByCategory(contextItems);
    
    // Find potential connections
    const connections = this.findConnections(groupedItems);
    
    // Score connections
    const scoredConnections = this.scoreConnections(connections);
    
    // Filter by confidence
    const filteredConnections = this.filterConnections(scoredConnections);
    
    // Generate proposals
    const proposals = this.generateProposals(filteredConnections);
    
    // Create inbox items
    const inboxItems = this.createInboxItems(proposals);

    return {
      totalConnections: connections.length,
      scoredConnections: scoredConnections.length,
      proposals: proposals.length,
      inboxItems: inboxItems.length,
      connections: filteredConnections,
      proposals: proposals,
      inboxItems: inboxItems,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Group items by category
   * @param {Array} items - Context items
   * @returns {Object} Grouped items
   */
  groupByCategory(items) {
    const grouped = {};
    
    for (const item of items) {
      const category = item.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    }
    
    return grouped;
  }

  /**
   * Find potential connections between categories
   * @param {Object} groupedItems - Items grouped by category
   * @returns {Array} Potential connections
   */
  findConnections(groupedItems) {
    const connections = [];
    const categories = Object.keys(groupedItems);

    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        
        // Check if categories are related
        const relationship = this.getRelationship(catA, catB);
        if (relationship) {
          connections.push({
            categoryA: catA,
            categoryB: catB,
            itemsA: groupedItems[catA],
            itemsB: groupedItems[catB],
            relationship,
            connectionType: this.determineConnectionType(groupedItems[catA], groupedItems[catB]),
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return connections;
  }

  /**
   * Get relationship between categories
   * @param {string} catA - Category A
   * @param {string} catB - Category B
   * @returns {Object|null} Relationship
   */
  getRelationship(catA, catB) {
    const relA = this.categoryRelationships[catA];
    if (relA && relA.related.includes(catB)) {
      return {
        weight: relA.weight,
        source: catA,
        target: catB
      };
    }

    const relB = this.categoryRelationships[catB];
    if (relB && relB.related.includes(catA)) {
      return {
        weight: relB.weight,
        source: catB,
        target: catA
      };
    }

    return null;
  }

  /**
   * Determine connection type
   * @param {Array} itemsA - Items from category A
   * @param {Array} itemsB - Items from category B
   * @returns {string} Connection type
   */
  determineConnectionType(itemsA, itemsB) {
    // Check if items share temporal patterns
    const temporalOverlap = this.checkTemporalOverlap(itemsA, itemsB);
    if (temporalOverlap > 0.5) {
      return CONNECTION_TYPES.TEMPORAL;
    }

    // Check if items share behavioral patterns
    const behavioralOverlap = this.checkBehavioralOverlap(itemsA, itemsB);
    if (behavioralOverlap > 0.5) {
      return CONNECTION_TYPES.BEHAVIORAL;
    }

    // Check if items have strong correlation
    if (itemsA.length > 3 && itemsB.length > 3) {
      return CONNECTION_TYPES.STRONG;
    }

    return CONNECTION_TYPES.POTENTIAL;
  }

  /**
   * Check temporal overlap between items
   * @param {Array} itemsA - Items from category A
   * @param {Array} itemsB - Items from category B
   * @returns {number} Overlap score
   */
  checkTemporalOverlap(itemsA, itemsB) {
    if (itemsA.length === 0 || itemsB.length === 0) return 0;

    const timesA = itemsA.map(i => new Date(i.timestamp).getTime());
    const timesB = itemsB.map(i => new Date(i.timestamp).getTime());

    let overlap = 0;
    for (const timeA of timesA) {
      for (const timeB of timesB) {
        const diff = Math.abs(timeA - timeB);
        if (diff < 3600000) { // Within 1 hour
          overlap++;
        }
      }
    }

    return overlap / (itemsA.length * itemsB.length);
  }

  /**
   * Check behavioral overlap between items
   * @param {Array} itemsA - Items from category A
   * @param {Array} itemsB - Items from category B
   * @returns {number} Overlap score
   */
  checkBehavioralOverlap(itemsA, itemsB) {
    if (itemsA.length === 0 || itemsB.length === 0) return 0;

    // Extract behavioral patterns
    const patternsA = itemsA.map(i => i.pattern || i.type || 'unknown');
    const patternsB = itemsB.map(i => i.pattern || i.type || 'unknown');

    let overlap = 0;
    for (const patA of patternsA) {
      for (const patB of patternsB) {
        if (patA === patB) {
          overlap++;
        }
      }
    }

    return overlap / (itemsA.length * itemsB.length);
  }

  /**
   * Score connections
   * @param {Array} connections - Potential connections
   * @returns {Array} Scored connections
   */
  scoreConnections(connections) {
    return connections.map(conn => {
      const confidence = this.calculateConfidence(conn);
      const relevance = this.calculateRelevance(conn);
      
      return {
        ...conn,
        confidence,
        relevance,
        score: (confidence + relevance) / 2
      };
    });
  }

  /**
   * Calculate confidence score
   * @param {Object} connection - Connection
   * @returns {number} Confidence score
   */
  calculateConfidence(connection) {
    const { itemsA, itemsB, relationship } = connection;
    
    let confidence = 0.5;

    // Item count factor
    const countScore = Math.min(1, (itemsA.length + itemsB.length) / 10);
    confidence += countScore * 0.3;

    // Relationship weight factor
    confidence += (relationship.weight || 0.5) * 0.3;

    // Temporal overlap factor
    const temporalOverlap = this.checkTemporalOverlap(itemsA, itemsB);
    confidence += temporalOverlap * 0.2;

    // Behavioral overlap factor
    const behavioralOverlap = this.checkBehavioralOverlap(itemsA, itemsB);
    confidence += behavioralOverlap * 0.2;

    return Math.min(1, confidence);
  }

  /**
   * Calculate relevance score
   * @param {Object} connection - Connection
   * @returns {number} Relevance score
   */
  calculateRelevance(connection) {
    const { categoryA, categoryB, itemsA, itemsB } = connection;
    
    let relevance = 0.5;

    // Category importance
    const importanceA = this.getCategoryImportance(categoryA);
    const importanceB = this.getCategoryImportance(categoryB);
    relevance += (importanceA + importanceB) / 4;

    // Item recency
    const recencyA = this.calculateRecency(itemsA);
    const recencyB = this.calculateRecency(itemsB);
    relevance += (recencyA + recencyB) / 4;

    return Math.min(1, relevance);
  }

  /**
   * Get category importance
   * @param {string} category - Category name
   * @returns {number} Importance score
   */
  getCategoryImportance(category) {
    const importance = {
      [CATEGORIES.HEALTH]: 0.9,
      [CATEGORIES.FITNESS]: 0.8,
      [CATEGORIES.WORK]: 0.8,
      [CATEGORIES.FOOD]: 0.7,
      [CATEGORIES.TRAVEL]: 0.7,
      [CATEGORIES.SOCIAL]: 0.6,
      [CATEGORIES.SHOPPING]: 0.5,
      [CATEGORIES.MUSIC]: 0.4,
      [CATEGORIES.READING]: 0.4,
      [CATEGORIES.ENTERTAINMENT]: 0.3
    };
    return importance[category] || 0.5;
  }

  /**
   * Calculate recency of items
   * @param {Array} items - Items
   * @returns {number} Recency score
   */
  calculateRecency(items) {
    if (items.length === 0) return 0.5;

    const now = Date.now();
    const avgTime = items.reduce((sum, i) => {
      const time = i.timestamp ? new Date(i.timestamp).getTime() : now;
      return sum + time;
    }, 0) / items.length;

    const daysAgo = (now - avgTime) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(1, 1 - (daysAgo / 30)));
  }

  /**
   * Filter connections by confidence
   * @param {Array} connections - Scored connections
   * @returns {Array} Filtered connections
   */
  filterConnections(connections) {
    return connections
      .filter(c => c.confidence >= this.minConfidence)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxSuggestions);
  }

  /**
   * Generate proposals from connections
   * @param {Array} connections - Filtered connections
   * @returns {Array} Proposals
   */
  generateProposals(connections) {
    return connections.map((conn, index) => ({
      id: `proposal-${Date.now()}-${index}`,
      categoryA: conn.categoryA,
      categoryB: conn.categoryB,
      connectionType: conn.connectionType,
      confidence: conn.confidence,
      relevance: conn.relevance,
      score: conn.score,
      description: this.generateDescription(conn),
      rationale: this.generateRationale(conn),
      suggestedAction: this.suggestAction(conn),
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Generate description for proposal
   * @param {Object} connection - Connection
   * @returns {string} Description
   */
  generateDescription(connection) {
    const { categoryA, categoryB, itemsA, itemsB } = connection;
    return `Connect ${categoryA} (${itemsA.length} items) with ${categoryB} (${itemsB.length} items)`;
  }

  /**
   * Generate rationale for proposal
   * @param {Object} connection - Connection
   * @returns {string} Rationale
   */
  generateRationale(connection) {
    const { categoryA, categoryB, confidence, relationship } = connection;
    const confidencePercent = Math.round(confidence * 100);
    return `Based on ${relationship.weight} relationship weight and ${confidencePercent}% confidence. ${categoryA} and ${categoryB} show correlated patterns.`;
  }

  /**
   * Suggest action for proposal
   * @param {Object} connection - Connection
   * @returns {string} Suggested action
   */
  suggestAction(connection) {
    if (connection.confidence > 0.8) {
      return 'Strongly recommend connecting these categories';
    }
    if (connection.confidence > 0.6) {
      return 'Consider connecting these categories';
    }
    return 'Review and decide if these categories should be connected';
  }

  /**
   * Create inbox items from proposals
   * @param {Array} proposals - Proposals
   * @returns {Array} Inbox items
   */
  createInboxItems(proposals) {
    return proposals.map(proposal => ({
      id: `inbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      proposalId: proposal.id,
      title: `Connect ${proposal.categoryA} ↔ ${proposal.categoryB}`,
      description: proposal.description,
      rationale: proposal.rationale,
      suggestedAction: proposal.suggestedAction,
      confidence: proposal.confidence,
      status: CONNECTION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      actions: [
        { type: 'approve', label: 'Approve Connection' },
        { type: 'reject', label: 'Reject Connection' },
        { type: 'archive', label: 'Archive for Later' }
      ]
    }));
  }

  /**
   * Get inbox items
   * @param {string} status - Status filter
   * @param {number} limit - Limit
   * @returns {Array} Inbox items
   */
  getInboxItems(status = CONNECTION_STATUS.PENDING, limit = 20) {
    // This would normally query from storage
    // For now, return suggestions
    return [];
  }

  /**
   * Update inbox item status
   * @param {string} id - Inbox item ID
   * @param {string} status - New status
   * @param {string} reason - Reason for status change
   * @returns {Object} Updated inbox item
   */
  updateInboxItem(id, status, reason = '') {
    // This would normally update storage
    return {
      id,
      status,
      reason,
      updatedAt: new Date().toISOString()
    };
  }
}

module.exports = ConnectionSuggester;