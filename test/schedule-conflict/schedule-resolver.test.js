const assert = require('assert');
const ScheduleAnalyzer = require('../../src/schedule-conflict/schedule-analyzer');
const ScheduleResolver = require('../../src/schedule-conflict/schedule-resolver');
const { RESOLUTION_STRATEGIES } = require('../../src/schedule-conflict/schedule-constants');

describe('ScheduleResolver', () => {
  let analyzer;
  let resolver;

  beforeEach(() => {
    analyzer = new ScheduleAnalyzer();
    resolver = new ScheduleResolver();
  });

  describe('Resolution', () => {
    it('should merge conflicting events', () => {
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

      const analysis = analyzer.analyze(events);
      const resolved = resolver.resolve(analysis, {
        strategy: RESOLUTION_STRATEGIES.MERGE
      });

      assert.ok(resolved.merged.length > 0);
      assert.strictEqual(resolved.merged[0].action, 'merged');
    });

    it('should keep first event', () => {
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

      const analysis = analyzer.analyze(events);
      const resolved = resolver.resolve(analysis, {
        strategy: RESOLUTION_STRATEGIES.KEEP_FIRST
      });

      assert.strictEqual(resolved.resolved[0].action, 'keep_first');
    });

    it('should prefer Google Calendar', () => {
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

      const analysis = analyzer.analyze(events);
      const resolved = resolver.resolve(analysis, {
        strategy: RESOLUTION_STRATEGIES.PREFER_GOOGLE
      });

      assert.strictEqual(resolved.resolved[0].action, 'prefer_google_calendar');
    });
  });

  describe('History', () => {
    it('should track resolution history', () => {
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

      const analysis = analyzer.analyze(events);
      resolver.resolve(analysis);

      const history = resolver.getHistory();
      assert.strictEqual(history.length, 1);
    });
  });
});