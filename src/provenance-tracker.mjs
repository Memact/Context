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
}

export const provenanceTracker = new ProvenanceTracker();
