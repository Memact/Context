const assert = require('assert');
const TravelCorrelator = require('../../src/travel/travel-correlator');

describe('TravelCorrelator', () => {
  let correlator;

  beforeEach(() => {
    correlator = new TravelCorrelator();
  });

  it('should correlate travel with sleep disruption', () => {
    const travelEvents = [
      {
        type: 'flight',
        isRedEye: true,
        timestamp: '2026-07-15T22:00:00Z'
      }
    ];

    const sleepAnalysis = [
      {
        isDisrupted: true,
        disruptionScore: 0.8,
        timestamp: '2026-07-16T06:00:00Z',
        label: 'travel-disrupted'
      }
    ];

    const correlations = correlator.correlate(travelEvents, sleepAnalysis);
    assert.strictEqual(correlations.length, 1);
    assert.ok(correlations[0].confidence >= 0.5);
  });
});