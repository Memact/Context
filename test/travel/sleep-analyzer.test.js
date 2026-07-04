const assert = require('assert');
const SleepAnalyzer = require('../../src/travel/sleep-analyzer');
const { SLEEP_DISRUPTION } = require('../../src/travel/travel-constants');

describe('SleepAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SleepAnalyzer();
  });

  describe('Sleep Analysis', () => {
    it('should detect normal sleep', () => {
      const sleepData = [
        { duration: 7.5, qualityScore: 0.8, rem: 1.5, deep: 2.0, timestamp: '2026-07-14T08:00:00Z' },
        { duration: 8.0, qualityScore: 0.85, rem: 1.8, deep: 2.2, timestamp: '2026-07-13T08:00:00Z' }
      ];

      const result = analyzer.analyze(sleepData);
      assert.strictEqual(result.label, SLEEP_DISRUPTION.NORMAL);
    });

    it('should detect disrupted sleep', () => {
      const sleepData = [
        { duration: 7.5, qualityScore: 0.8, rem: 1.5, deep: 2.0, timestamp: '2026-07-14T08:00:00Z' },
        { duration: 8.0, qualityScore: 0.85, rem: 1.8, deep: 2.2, timestamp: '2026-07-13T08:00:00Z' },
        { duration: 3.5, qualityScore: 0.4, rem: 0.5, deep: 0.8, timestamp: '2026-07-15T08:00:00Z' }
      ];

      const result = analyzer.analyze(sleepData);
      assert.strictEqual(result.label, SLEEP_DISRUPTION.TRAVEL_DISRUPTED);
    });
  });
});