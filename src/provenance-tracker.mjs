/**
 * Memact Engine - Context Read Provenance Tracker
 *
 * Tracks historical read queries and returned value signatures to identify
 * recommendation-driven write feed loops.
 */

export class ProvenanceTracker {
  constructor() {
    this.logs = new Map(); // queryId -> { fields: Set, values: Set, timestamp: number }
  }

  /**
   * Registers a read event.
   *
   * @param {string} queryId - Unique identifier of the read query / session.
   * @param {string[]} fields - Field paths read or matched by the query.
   * @param {string[]} values - Values returned by the query.
   * @param {number} [timestamp] - Timestamp of the read event (default: Date.now()).
   */
  registerQuery(queryId, fields = [], values = [], timestamp = Date.now()) {
    if (!queryId) return;
    this.logs.set(queryId, {
      fields: new Set(fields.map(f => String(f).toLowerCase().trim())),
      values: new Set(values.map(v => String(v).toLowerCase().trim())),
      timestamp
    });
  }

  /**
   * Purges logs older than the expiration window.
   *
   * @param {number} [expirationMs] - Expiration window in milliseconds (default: 10 minutes).
   */
  cleanup(expirationMs = 600000) {
    const cutoff = Date.now() - expirationMs;
    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoff) {
        this.logs.delete(id);
      }
    }
  }

  /**
   * Returns a list of active query logs.
   *
   * @returns {Object[]}
   */
  getQueries() {
    return Array.from(this.logs.entries()).map(([id, val]) => ({
      queryId: id,
      fields: Array.from(val.fields),
      values: Array.from(val.values),
      timestamp: val.timestamp
    }));
  }

  /**
   * Clears all stored provenance logs.
   */
  clear() {
    this.logs.clear();
  }

  /**
   * Identifies if a write/claim constitutes a recommendation feedback loop.
   *
   * @param {Object} claim - Incoming/candidate context memory node.
   * @param {number} [windowMs] - Loop detection sliding time window (default: 10 minutes).
   * @returns {boolean} True if a feedback loop is detected.
   */
  detectRecommendationLoop(claim, windowMs = 600000) {
    if (!claim) return false;
    const cutoff = Date.now() - windowMs;
    const field = String(claim.field_path || "").toLowerCase().trim();
    const category = String(claim.category || "").toLowerCase().trim();

    const candidateValues = [];
    if (Array.isArray(claim.value)) {
      candidateValues.push(...claim.value.map(v => String(v).toLowerCase().trim()));
    } else if (claim.value !== undefined && claim.value !== null) {
      candidateValues.push(String(claim.value).toLowerCase().trim());
    }

    for (const log of this.logs.values()) {
      if (log.timestamp >= cutoff) {
        if (log.fields.has(field) || log.fields.has(category)) {
          return true;
        }
        for (const val of candidateValues) {
          if (val && log.values.has(val)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

export const provenanceTracker = new ProvenanceTracker();
