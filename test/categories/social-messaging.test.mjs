import { describe, it } from 'node:test';
import assert from 'assert';
import * as socialSchema from '../../src/categories/social-messaging.mjs';

describe('Social Messaging Category Schema', () => {
  it('should export required declarative fields', () => {
    assert.strictEqual(socialSchema.category, 'social-messaging');
    assert.ok(socialSchema.contextFields);
  });

  it('should treat individual message activity as a weak observation', () => {
    const rawActivity = { source: 'slack', type: 'activity', data: { group: 'work' } };
    const normalized = socialSchema.normalizeSocialContext(rawActivity);
    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.is_identity_claim, false);
  });

  it('should process durable preference settings', () => {
    const rawPref = { 
      source: 'settings', 
      type: 'preference', 
      explicit: true, 
      data: { communication_tone: 'detailed' } 
    };
    const normalized = socialSchema.normalizeSocialContext(rawPref);
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.data.communication_tone, 'detailed');
  });
});