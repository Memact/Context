import { describe, it } from 'node:test';
import assert from 'assert';
import * as healthSchema from '../../src/categories/health.mjs';

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

  it('should treat one-off health logs as weak observations', () => {
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
});