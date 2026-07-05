/**
 * Schedule Resolver - Resolves schedule conflicts
 */

const {
  EVENT_STATUS,
  RESOLUTION_STRATEGIES,
  PRIORITY_WEIGHTS
} = require('./schedule-constants');

class ScheduleResolver {
  constructor(options = {}) {
    this.strategy = options.strategy || RESOLUTION_STRATEGIES.MERGE;
    this.priorityWeights = options.priorityWeights || PRIORITY_WEIGHTS;
    this.resolvedEvents = [];
    this.resolutionHistory = [];
    this.maxHistory = options.maxHistory || 100;
  }

  /**
   * Resolve schedule conflicts
   * @param {Object} analysis - Schedule analysis
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolve(analysis, options = {}) {
    const { strategy = this.strategy, storeHistory = true } = options;
    const resolved = [];
    const merged = [];

    // Group conflicts by event
    const conflictGroups = this.groupConflicts(analysis.conflicts);

    // Resolve each conflict group
    for (const [eventId, group] of Object.entries(conflictGroups)) {
      const resolution = this.resolveGroup(group, strategy);
      resolved.push(resolution);
      
      if (resolution.merged) {
        merged.push(resolution);
      }
    }

    // Generate reconciled schedule
    const reconciled = this.generateReconciledSchedule(analysis.eventsBySource, resolved);

    const result = {
      resolved,
      merged,
      reconciled,
      strategy,
      stats: {
        totalConflicts: analysis.conflicts.length,
        resolvedCount: resolved.length,
        mergedCount: merged.length,
        unresolved: analysis.conflicts.length - resolved.length
      },
      timestamp: new Date().toISOString()
    };

    if (storeHistory) {
      this.recordResolution(result);
    }

    return result;
  }

  /**
   * Group conflicts by event
   * @param {Array} conflicts - Conflicts
   * @returns {Object} Grouped conflicts
   */
  groupConflicts(conflicts) {
    const groups = {};
    
    for (const conflict of conflicts) {
      const id1 = conflict.event1.id || conflict.event1._id;
      const id2 = conflict.event2.id || conflict.event2._id;
      
      if (!groups[id1]) groups[id1] = [];
      if (!groups[id2]) groups[id2] = [];
      
      groups[id1].push(conflict);
      groups[id2].push(conflict);
    }
    
    return groups;
  }

  /**
   * Resolve a conflict group
   * @param {Array} group - Conflict group
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolution
   */
  resolveGroup(group, strategy) {
    const events = group.map(c => c.event1);
    
    switch (strategy) {
      case RESOLUTION_STRATEGIES.MERGE:
        return this.mergeEvents(events);
      case RESOLUTION_STRATEGIES.KEEP_FIRST:
        return this.keepFirst(events);
      case RESOLUTION_STRATEGIES.KEEP_LAST:
        return this.keepLast(events);
      case RESOLUTION_STRATEGIES.PREFER_GOOGLE:
        return this.preferSource(events, 'google_calendar');
      case RESOLUTION_STRATEGIES.PREFER_NOTION:
        return this.preferSource(events, 'notion_timeline');
      default:
        return this.mergeEvents(events);
    }
  }

  /**
   * Merge events into one
   * @param {Array} events - Events to merge
   * @returns {Object} Merged event
   */
  mergeEvents(events) {
    const firstEvent = events[0];
    const allTimes = events.map(e => ({
      start: new Date(e.startTime),
      end: new Date(e.endTime)
    }));

    const earliestStart = Math.min(...allTimes.map(t => t.start.getTime()));
    const latestEnd = Math.max(...allTimes.map(t => t.end.getTime()));

    const merged = {
      id: `merged-${Date.now()}`,
      title: this.mergeTitles(events.map(e => e.title)),
      startTime: new Date(earliestStart).toISOString(),
      endTime: new Date(latestEnd).toISOString(),
      status: EVENT_STATUS.TENTATIVE,
      source: 'merged',
      originalEvents: events.map(e => ({ id: e.id || e._id, source: e.source })),
      description: this.mergeDescriptions(events.map(e => e.description)),
      attendees: this.mergeAttendees(events.map(e => e.attendees || []))
    };

    return {
      action: 'merged',
      originalEvents: events,
      mergedEvent: merged,
      merged: true,
      reason: 'Events merged into tentative slot'
    };
  }

  /**
   * Merge titles
   * @param {Array} titles - Titles
   * @returns {string} Merged title
   */
  mergeTitles(titles) {
    const unique = [...new Set(titles)];
    if (unique.length === 1) return unique[0];
    return `${unique[0]} / ${unique[1]}`;
  }

  /**
   * Merge descriptions
   * @param {Array} descriptions - Descriptions
   * @returns {string} Merged description
   */
  mergeDescriptions(descriptions) {
    const filtered = descriptions.filter(d => d);
    if (filtered.length === 0) return 'Merged schedule item';
    return filtered.join('\n---\n');
  }

  /**
   * Merge attendees
   * @param {Array} attendeeLists - Attendee lists
   * @returns {Array} Merged attendees
   */
  mergeAttendees(attendeeLists) {
    const all = new Set();
    for (const list of attendeeLists) {
      for (const attendee of list) {
        all.add(attendee);
      }
    }
    return [...all];
  }

  /**
   * Keep first event
   * @param {Array} events - Events
   * @returns {Object} Resolution
   */
  keepFirst(events) {
    return {
      action: 'keep_first',
      originalEvents: events,
      keptEvent: events[0],
      merged: false,
      reason: 'Kept first event, marked others as tentative'
    };
  }

  /**
   * Keep last event
   * @param {Array} events - Events
   * @returns {Object} Resolution
   */
  keepLast(events) {
    return {
      action: 'keep_last',
      originalEvents: events,
      keptEvent: events[events.length - 1],
      merged: false,
      reason: 'Kept last event, marked others as tentative'
    };
  }

  /**
   * Prefer specific source
   * @param {Array} events - Events
   * @param {string} source - Preferred source
   * @returns {Object} Resolution
   */
  preferSource(events, source) {
    const preferred = events.find(e => e.source === source);
    const others = events.filter(e => e.source !== source);

    if (preferred) {
      return {
        action: `prefer_${source}`,
        originalEvents: events,
        keptEvent: preferred,
        otherEvents: others,
        merged: false,
        reason: `Preferring ${source} calendar`
      };
    }

    return this.keepFirst(events);
  }

  /**
   * Generate reconciled schedule
   * @param {Object} eventsBySource - Events by source
   * @param {Array} resolutions - Resolutions
   * @returns {Array} Reconciled schedule
   */
  generateReconciledSchedule(eventsBySource, resolutions) {
    const schedule = [];

    // Add resolved events
    for (const resolution of resolutions) {
      if (resolution.merged) {
        schedule.push({
          ...resolution.mergedEvent,
          isMerged: true,
          status: EVENT_STATUS.TENTATIVE
        });
      } else if (resolution.keptEvent) {
        schedule.push({
          ...resolution.keptEvent,
          isResolved: true,
          status: EVENT_STATUS.CONFIRMED
        });
      }
    }

    return schedule;
  }

  /**
   * Record resolution
   * @param {Object} result - Resolution result
   */
  recordResolution(result) {
    this.resolutionHistory.push({
      ...result,
      recordedAt: new Date().toISOString(),
      id: this.generateId()
    });

    if (this.resolutionHistory.length > this.maxHistory) {
      this.resolutionHistory.shift();
    }
  }

  /**
   * Get resolution history
   * @param {number} limit - Number of records
   * @returns {Array} History
   */
  getHistory(limit = 10) {
    return this.resolutionHistory.slice(-limit).reverse();
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.resolutionHistory.length;
    const merged = this.resolutionHistory.filter(h => h.mergedCount > 0).length;
    const resolved = this.resolutionHistory.filter(h => h.resolvedCount > 0).length;

    return {
      totalResolutions: total,
      totalMerged: merged,
      totalResolved: resolved,
      averageConflicts: total > 0 
        ? this.resolutionHistory.reduce((sum, h) => sum + h.stats.totalConflicts, 0) / total
        : 0
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `schedule-resolve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear() {
    this.resolutionHistory = [];
    this.resolvedEvents = [];
  }
}

module.exports = ScheduleResolver;