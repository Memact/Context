const assert = require('assert');
const ScheduleAnalyzer = require('../../src/schedule-conflict/schedule-analyzer');
const { CONFLICT_TYPES } = require('../../src/schedule-conflict/schedule-constants');

describe('ScheduleAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ScheduleAnalyzer();
  });

  describe('Conflict Detection', () => {
    it('should detect overlapping events', () => {
      const events = [
        {
          id: '1',
          title: 'Meeting 1',
          startTime: '2026-07-15T10:00:00Z',
          endTime: '2026-07-15T11:00:00Z',
          source: 'google_calendar'
        },
        {
          id: '2',
          title: 'Meeting 2',
          startTime: '2026-07-15T10:30:00Z',
          endTime: '2026-07-15T11:30:00Z',
          source: 'notion_timeline'
        }
      ];

      const result = analyzer.analyze(events);
      assert.strictEqual(result.conflicts.length, 1);
      assert.strictEqual(result.conflicts[0].type, CONFLICT_TYPES.OVERLAP);
    });

    it('should not detect conflict for non-overlapping events', () => {
      const events = [
        {
          id: '1',
          title: 'Meeting 1',
          startTime: '2026-07-15T10:00:00Z',
          endTime: '2026-07-15T11:00:00Z',
          source: 'google_calendar'
        },
        {
          id: '2',
          title: 'Meeting 2',
          startTime: '2026-07-15T11:30:00Z',
          endTime: '2026-07-15T12:30:00Z',
          source: 'notion_timeline'
        }
      ];

      const result = analyzer.analyze(events);
      assert.strictEqual(result.conflicts.length, 0);
    });
  });

  describe('Schedule Analysis', () => {
    it('should analyze schedule metrics', () => {
      const events = [
        {
          id: '1',
          title: 'Meeting 1',
          startTime: '2026-07-15T10:00:00Z',
          endTime: '2026-07-15T11:00:00Z',
          source: 'google_calendar'
        },
        {
          id: '2',
          title: 'Meeting 2',
          startTime: '2026-07-15T14:00:00Z',
          endTime: '2026-07-15T15:00:00Z',
          source: 'notion_timeline'
        }
      ];

      const result = analyzer.analyze(events);
      assert.strictEqual(result.totalEvents, 2);
      assert.ok(result.scheduleAnalysis.totalEventMinutes > 0);
    });
  });

  describe('Free Slots', () => {
    it('should calculate free slots', () => {
      const events = [
        {
          id: '1',
          title: 'Meeting 1',
          startTime: '2026-07-15T10:00:00Z',
          endTime: '2026-07-15T11:00:00Z'
        },
        {
          id: '2',
          title: 'Meeting 2',
          startTime: '2026-07-15T14:00:00Z',
          endTime: '2026-07-15T15:00:00Z'
        }
      ];

      const result = analyzer.analyze(events);
      assert.ok(result.scheduleAnalysis.freeSlots.length > 0);
    });
  });
});