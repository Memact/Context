/**
 * Schedule Analyzer - Analyzes and detects schedule conflicts
 */

const {
  CALENDAR_SOURCES,
  EVENT_STATUS,
  CONFLICT_TYPES,
  PRIORITY_WEIGHTS
} = require('./schedule-constants');

class ScheduleAnalyzer {
  constructor(options = {}) {
    this.priorityWeights = options.priorityWeights || PRIORITY_WEIGHTS;
    this.conflictThreshold = options.conflictThreshold || 15; // minutes
    this.maxEventsToAnalyze = options.maxEventsToAnalyze || 100;
  }

  /**
   * Analyze events from multiple calendars
   * @param {Array} events - Array of events from different sources
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis result
   */
  analyze(events, options = {}) {
    const { timeRange, includeCancelled = false } = options;

    // Filter events
    const filteredEvents = this.filterEvents(events, { includeCancelled, timeRange });
    
    // Group events by day
    const eventsByDay = this.groupEventsByDay(filteredEvents);
    
    // Detect conflicts for each day
    const conflicts = this.detectAllConflicts(eventsByDay);
    
    // Analyze schedule
    const scheduleAnalysis = this.analyzeSchedule(filteredEvents, conflicts);

    // Calculate confidence
    const confidence = this.calculateConfidence(filteredEvents, conflicts);

    // Generate recommendations
    const recommendations = this.getRecommendations(conflicts, scheduleAnalysis);

    return {
      totalEvents: filteredEvents.length,
      eventsBySource: this.getEventsBySource(filteredEvents),
      conflicts,
      scheduleAnalysis,
      confidence,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Filter events
   * @param {Array} events - Events to filter
   * @param {Object} options - Filter options
   * @returns {Array} Filtered events
   */
  filterEvents(events, options = {}) {
    const { includeCancelled = false, timeRange } = options;
    
    let filtered = events.filter(event => {
      if (!includeCancelled && event.status === EVENT_STATUS.CANCELLED) {
        return false;
      }
      return true;
    });

    if (timeRange) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= timeRange.start && eventDate <= timeRange.end;
      });
    }

    return filtered;
  }

  /**
   * Group events by day
   * @param {Array} events - Events to group
   * @returns {Object} Events by day
   */
  groupEventsByDay(events) {
    const grouped = {};
    
    for (const event of events) {
      const date = new Date(event.startTime);
      const dayKey = date.toDateString();
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    }
    
    return grouped;
  }

  /**
   * Detect all conflicts in events
   * @param {Object} eventsByDay - Events grouped by day
   * @returns {Array} Conflicts
   */
  detectAllConflicts(eventsByDay) {
    const allConflicts = [];
    
    for (const [day, events] of Object.entries(eventsByDay)) {
      const dayConflicts = this.detectDayConflicts(events);
      allConflicts.push(...dayConflicts);
    }
    
    return allConflicts;
  }

  /**
   * Detect conflicts for a single day
   * @param {Array} events - Events for the day
   * @returns {Array} Conflicts
   */
  detectDayConflicts(events) {
    const conflicts = [];
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];
        
        const overlap = this.checkOverlap(event1, event2);
        if (overlap) {
          conflicts.push({
            type: CONFLICT_TYPES.OVERLAP,
            event1,
            event2,
            overlapMinutes: this.calculateOverlapMinutes(event1, event2),
            severity: this.calculateSeverity(event1, event2),
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two events overlap
   * @param {Object} event1 - First event
   * @param {Object} event2 - Second event
   * @returns {boolean} True if overlap
   */
  checkOverlap(event1, event2) {
    const start1 = new Date(event1.startTime).getTime();
    const end1 = new Date(event1.endTime).getTime();
    const start2 = new Date(event2.startTime).getTime();
    const end2 = new Date(event2.endTime).getTime();

    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate overlap minutes
   * @param {Object} event1 - First event
   * @param {Object} event2 - Second event
   * @returns {number} Overlap in minutes
   */
  calculateOverlapMinutes(event1, event2) {
    const start1 = new Date(event1.startTime).getTime();
    const end1 = new Date(event1.endTime).getTime();
    const start2 = new Date(event2.startTime).getTime();
    const end2 = new Date(event2.endTime).getTime();

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);

    return Math.round(overlapMs / (1000 * 60));
  }

  /**
   * Calculate severity of conflict
   * @param {Object} event1 - First event
   * @param {Object} event2 - Second event
   * @returns {string} Severity level
   */
  calculateSeverity(event1, event2) {
    const overlap = this.calculateOverlapMinutes(event1, event2);
    
    if (overlap > 60) return 'high';
    if (overlap > 30) return 'medium';
    return 'low';
  }

  /**
   * Analyze schedule metrics
   * @param {Array} events - Events
   * @param {Array} conflicts - Conflicts
   * @returns {Object} Schedule analysis
   */
  analyzeSchedule(events, conflicts) {
    const totalEvents = events.length;
    const totalConflicts = conflicts.length;
    const conflictingEvents = new Set();
    
    for (const conflict of conflicts) {
      conflictingEvents.add(conflict.event1.id || conflict.event1._id);
      conflictingEvents.add(conflict.event2.id || conflict.event2._id);
    }

    const eventDuration = events.reduce((sum, e) => {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      return sum + (end - start) / (1000 * 60);
    }, 0);

    return {
      totalEvents,
      totalConflicts,
      conflictingEventCount: conflictingEvents.size,
      conflictRate: totalEvents > 0 ? (totalConflicts / totalEvents) * 100 : 0,
      averageEventDuration: totalEvents > 0 ? eventDuration / totalEvents : 0,
      totalEventMinutes: eventDuration,
      freeSlots: this.calculateFreeSlots(events)
    };
  }

  /**
   * Calculate free slots between events
   * @param {Array} events - Events
   * @returns {Array} Free slots
   */
  calculateFreeSlots(events) {
    const sorted = [...events].sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );

    const freeSlots = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = new Date(sorted[i].endTime);
      const nextStart = new Date(sorted[i + 1].startTime);
      
      if (nextStart > currentEnd) {
        const gapMinutes = (nextStart - currentEnd) / (1000 * 60);
        if (gapMinutes > 15) {
          freeSlots.push({
            start: currentEnd,
            end: nextStart,
            minutes: gapMinutes
          });
        }
      }
    }

    return freeSlots;
  }

  /**
   * Get events by source
   * @param {Array} events - Events
   * @returns {Object} Events by source
   */
  getEventsBySource(events) {
    const bySource = {};
    for (const event of events) {
      const source = event.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    }
    return bySource;
  }

  /**
   * Calculate confidence score
   * @param {Array} events - Events
   * @param {Array} conflicts - Conflicts
   * @returns {number} Confidence score
   */
  calculateConfidence(events, conflicts) {
    if (events.length === 0) return 0.5;
    
    const conflictRatio = conflicts.length / events.length;
    const sourceVariety = Object.keys(this.getEventsBySource(events)).length;
    
    let confidence = 0.7;
    if (conflictRatio < 0.2) confidence += 0.1;
    if (sourceVariety > 1) confidence += 0.1;
    if (events.length > 5) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * Get recommendations
   * @param {Array} conflicts - Conflicts
   * @param {Object} analysis - Schedule analysis
   * @returns {Array} Recommendations
   */
  getRecommendations(conflicts, analysis) {
    const recommendations = [];

    if (conflicts.length > 0) {
      recommendations.push({
        action: 'review_conflicts',
        message: `${conflicts.length} schedule conflicts detected`,
        priority: analysis.conflictRate > 20 ? 'high' : 'medium'
      });

      // Group by severity
      const highConflicts = conflicts.filter(c => c.severity === 'high');
      if (highConflicts.length > 0) {
        recommendations.push({
          action: 'resolve_high_priority',
          message: `${highConflicts.length} high-severity conflicts need immediate attention`,
          priority: 'high',
          conflicts: highConflicts
        });
      }
    }

    if (analysis.totalEventMinutes > 480) {
      recommendations.push({
        action: 'reduce_meetings',
        message: 'Heavy meeting load detected (>8 hours)',
        priority: 'medium'
      });
    }

    if (analysis.freeSlots.length > 0) {
      recommendations.push({
        action: 'utilize_free_slots',
        message: `${analysis.freeSlots.length} free slots available for scheduling`,
        priority: 'low'
      });
    }

    return recommendations;
  }
}

module.exports = ScheduleAnalyzer;