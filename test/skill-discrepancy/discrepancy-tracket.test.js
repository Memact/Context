const assert = require('assert');
const SkillAnalyzer = require('../../src/skill-discrepancy/skill-analyzer');
const DiscrepancyTracker = require('../../src/skill-discrepancy/discrepancy-tracker');
const { SOURCE_TYPES, SKILL_LEVELS } = require('../../src/skill-discrepancy/skill-constants');

describe('DiscrepancyTracker', () => {
  let analyzer;
  let tracker;

  beforeEach(() => {
    analyzer = new SkillAnalyzer();
    tracker = new DiscrepancyTracker();
  });

  describe('Tracking', () => {
    it('should track discrepancy', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Spanish'
      };

      const analysis = analyzer.analyze(linkedIn, duolingo);
      const record = tracker.track(analysis, 'Spanish');

      assert.ok(record.id);
      assert.strictEqual(record.language, 'Spanish');
      assert.ok(record.isMatch === false);
    });

    it('should flag severe discrepancies', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.BEGINNER,
        language: 'Spanish'
      };

      const analysis = analyzer.analyze(linkedIn, duolingo);
      tracker.track(analysis, 'Spanish');

      const flagged = tracker.getFlagged();
      assert.strictEqual(flagged.length, 1);
      assert.strictEqual(flagged[0].language, 'Spanish');
    });
  });

  describe('History', () => {
    it('should store history', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Spanish'
      };

      const analysis = analyzer.analyze(linkedIn, duolingo);
      tracker.track(analysis, 'Spanish');

      const history = tracker.getHistory('Spanish');
      assert.strictEqual(history.length, 1);
    });

    it('should limit history', () => {
      const tracker2 = new DiscrepancyTracker({ maxHistory: 3 });

      for (let i = 0; i < 5; i++) {
        const linkedIn = {
          source: SOURCE_TYPES.LINKEDIN,
          level: SKILL_LEVELS.FLUENT,
          language: 'Spanish'
        };

        const duolingo = {
          source: SOURCE_TYPES.DUOLINGO,
          level: SKILL_LEVELS.INTERMEDIATE,
          language: 'Spanish'
        };

        const analysis = analyzer.analyze(linkedIn, duolingo);
        tracker2.track(analysis, 'Spanish');
      }

      const history = tracker2.getHistory();
      assert.strictEqual(history.length, 3);
    });
  });

  describe('Stats', () => {
    it('should provide statistics', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Spanish'
      };

      const analysis = analyzer.analyze(linkedIn, duolingo);
      tracker.track(analysis, 'Spanish');

      const stats = tracker.getStats();
      assert.strictEqual(stats.total, 1);
      assert.strictEqual(stats.discrepancies, 1);
      assert.ok(stats.matchRate);
    });
  });

  describe('Trend', () => {
    it('should analyze trend', () => {
      for (let i = 0; i < 3; i++) {
        const linkedIn = {
          source: SOURCE_TYPES.LINKEDIN,
          level: SKILL_LEVELS.FLUENT,
          language: 'Spanish'
        };

        const duolingo = {
          source: SOURCE_TYPES.DUOLINGO,
          level: i === 0 ? SKILL_LEVELS.BEGINNER : SKILL_LEVELS.INTERMEDIATE,
          language: 'Spanish'
        };

        const analysis = analyzer.analyze(linkedIn, duolingo);
        tracker.track(analysis, 'Spanish');
      }

      const trend = tracker.getTrend('Spanish', 2);
      assert.ok(trend.trend);
      assert.ok(trend.direction);
    });
  });
});