import { describe, it } from 'node:test';
import assert from 'assert';
import { applyTimeDecay } from '../src/time-decay.mjs';

describe('Time-Decay (Half-Life) Weighting', () => {
  // Use a fixed "NOW" time so tests are deterministic and never fail due to timezone/future dates
  const NOW = new Date('2026-07-03T12:00:00Z').getTime(); 
  const EIGHTY_DAYS_AGO = new Date(NOW - (80 * 24 * 60 * 60 * 1000)).toISOString();
  const HUNDRED_DAYS_AGO = new Date(NOW - (100 * 24 * 60 * 60 * 1000)).toISOString();

  it('should downgrade inferred_preference confidence to low if older than 90 days', () => {
    const input = [{
      claim_type: 'inferred_preference',
      category: 'health',
      confidence: 'medium',
      last_observed: HUNDRED_DAYS_AGO
    }];
    
    const result = applyTimeDecay(input, NOW);
    assert.strictEqual(result[0].confidence, 'low', 'Confidence should degrade to low after 90 days');
  });

  it('should NOT downgrade inferred_preference if within 90 days', () => {
    const input = [{
      claim_type: 'inferred_preference',
      category: 'health',
      confidence: 'medium',
      last_observed: EIGHTY_DAYS_AGO
    }];
    
    const result = applyTimeDecay(input, NOW);
    assert.strictEqual(result[0].confidence, 'medium', 'Confidence should remain unchanged if within 90 days');
  });

  it('should NEVER downgrade explicit_preference even if older than 90 days', () => {
    const input = [{
      claim_type: 'explicit_preference',
      category: 'diet',
      confidence: 'high',
      last_observed: HUNDRED_DAYS_AGO
    }];
    
    const result = applyTimeDecay(input, NOW);
    assert.strictEqual(result[0].confidence, 'high', 'Explicit preferences must be exempt from time-decay');
  });
});