import { describe, it } from 'node:test';
import assert from 'assert';
import * as healthSchema from '../../src/categories/health.mjs';

const mockBaseline = {
    avg_sleep_minutes: 480,    // 8 hours standard
    avg_activity_minutes: 45,  // 45 minutes standard session
    avg_hydration_ml: 2000     // 2 Liters standard intake
  };

describe('Health Category Schema & Privacy Guardrails', () => {

  it('should explicitly drop sensitive vitals and medical data', () => {
    const rawActivity = {
      source: 'fitness_app',
      type: 'activity',
      data: {
        activity_log: 'Cycling',
        heart_rate: 160,
        weight: '70kg',
        blood_pressure: '120/80'
      }
    };

    const normalized = healthSchema.normalizeHealthContext(rawActivity);

    // Safe data is kept
    assert.strictEqual(normalized.data.activity_log, 'Cycling');
    
    // Sensitive data is dropped
    assert.strictEqual(normalized.data.heart_rate, undefined);
    assert.strictEqual(normalized.data.weight, undefined);
    assert.strictEqual(normalized.data.blood_pressure, undefined);
  });

  it('should set visibility to private by default for all observations', () => {
    const rawPreference = {
      source: 'wellness_profile',
      type: 'preference',
      explicit: true,
      data: {
        wellness_focus: 'better sleep'
      }
    };

    const normalized = healthSchema.normalizeHealthContext(rawPreference);

    assert.strictEqual(normalized.visibility, 'private');
  });

  it('should treat one-off health logs as weak observations( noise filtering)', () => {
    const rawHydration = {
      source: 'water_tracker',
      type: 'activity',
      data: {
        hydration_log: '250ml'
      }
    };

    const normalized = healthSchema.normalizeHealthContext(rawHydration);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.needs_review, true);
  });
  
  it('should catch and flag value variance anomalies when thresholds are breached', () => {
    const rawSleepAnomaly = {
      source: 'sleep_cycle',
      type: 'activity',
      data: {
        sleep_session: '4 hours 0 minutes' // 240 mins vs 480 baseline = 240 min variance (> 150 threshold)
      }
    };

    const normalized = healthSchema.normalizeHealthContext(rawSleepAnomaly, mockBaseline);

    assert.strictEqual(normalized.observation_type, 'anomaly_observation');
    assert.strictEqual(normalized.confidence, 'low');
    assert.match(normalized.suggestion, /sharp deviation/);
  });
});

    
