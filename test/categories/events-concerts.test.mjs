import { describe, it } from 'node:test';
import assert from 'assert';
import * as eventsSchema from '../../src/categories/events-concerts.mjs';

describe('Events & Concerts Category Schema & Normalization', () => {

  it('should export the required declarative schema fields', () => {
    assert.strictEqual(eventsSchema.category, 'events-concerts');
    assert.ok(eventsSchema.contextFields);
    assert.ok(eventsSchema.rawInputExamples);
    assert.ok(eventsSchema.proposalOutputExamples);
  });

  it('should treat a single concert attendance as a weak observation', () => {
    const rawActivity = {
      source: 'ticket_app',
      type: 'activity',
      data: {
        event_name: 'Summer Fest',
        venue: 'Stadium',
      }
    };

    const normalized = eventsSchema.normalizeEventsConcertsContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.confidence, 'low');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.visibility, 'private');
    assert.match(normalized.suggestion, /Do you want to add this/);
  });

  it('should handle explicit durable live event preferences correctly', () => {
    const rawPreference = {
      source: 'music_profile',
      type: 'preference',
      explicit: true,
      data: {
        preferred_venues: ['Acoustic Lounge'],
        ticket_price_range: 'Under $50',
        preferred_days: ['Saturday', 'Sunday']
      }
    };

    const normalized = eventsSchema.normalizeEventsConcertsContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.visibility, 'private');
    assert.deepStrictEqual(normalized.data.preferred_venues, ['Acoustic Lounge']);
    assert.strictEqual(normalized.data.ticket_price_range, 'Under $50');
    assert.deepStrictEqual(normalized.data.preferred_days, ['Saturday', 'Sunday']);
  });
});