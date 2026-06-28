import assert from 'assert';
import { normalizeTravelContext, generateUserReadableSuggestion } from '../../src/categories/travel.mjs';

describe('Travel Category Normalization', () => {
  
  it('should treat one-off activities as weak observations (Activity != Identity)', () => {
    // Example Raw App Context Dump: User searched for a hotel in Paris
    const rawActivity = {
      source: 'booking_app',
      type: 'activity',
      data: {
        destination: 'Paris',
        preferredStayType: 'hotel'
      }
    };

    const normalized = normalizeTravelContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.visibility, 'private');
    assert.strictEqual(normalized.needs_review, true);
    assert.match(normalized.suggestion, /Save this as your travel preference/);
  });

  it('should drop sensitive data like exact GPS without explicit consent', () => {
    const rawSensitiveData = {
      source: 'maps_app',
      type: 'activity',
      data: {
        current_gps: '48.8566, 2.3522',
        destination: 'Paris'
      }
    };

    const normalized = normalizeTravelContext(rawSensitiveData);

    assert.strictEqual(normalized.status, 'rejected');
    assert.match(normalized.reason, /Sensitive location tracking/);
  });

  it('should handle durable preferences correctly', () => {
    const rawPreference = {
      source: 'travel_profile',
      type: 'preference',
      explicit: true,
      data: {
        tripStyle: 'adventure',
        budgetRangeSignal: 'mid-range'
      }
    };

    const normalized = normalizeTravelContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.preferences.tripStyle, 'adventure');
  });
});