import { describe, it } from 'node:test';
import assert from 'assert';
import * as styleSchema from '../../src/categories/interaction-style.mjs';

describe('Interaction Style Category Schema & Privacy Guardrails', () => {

  it('should explicitly drop sensitive raw chat logs and user emotions', () => {
    const rawActivity = {
      source: 'chat_session',
      type: 'activity',
      data: {
        preferred_tone: 'empathetic',
        verbosity_level: 'detailed',
        raw_chat_log: 'I am feeling really sad today, can you help me?',
        user_emotion: 'sad',
        message_content: 'Please make it longer.'
      }
    };

    const normalized = styleSchema.normalizeInteractionContext(rawActivity);

    // Safe data is kept
    assert.strictEqual(normalized.data.preferred_tone, 'empathetic');
    assert.strictEqual(normalized.data.verbosity_level, 'detailed');
    
    // Sensitive data is ruthlessly dropped
    assert.strictEqual(normalized.data.raw_chat_log, undefined);
    assert.strictEqual(normalized.data.user_emotion, undefined);
    assert.strictEqual(normalized.data.message_content, undefined);
  });

  it('should set visibility to private by default for all observations', () => {
    const rawPreference = {
      source: 'user_settings',
      type: 'preference',
      explicit: true,
      data: {
        preferred_tone: 'professional'
      }
    };

    const normalized = styleSchema.normalizeInteractionContext(rawPreference);

    assert.strictEqual(normalized.visibility, 'private');
  });

  it('should treat isolated style requests as weak observations (Activity != Identity)', () => {
    const rawActivity = {
      source: 'quick_chat',
      type: 'activity',
      data: {
        verbosity_level: 'TL;DR'
      }
    };

    const normalized = styleSchema.normalizeInteractionContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.needs_review, true);
    assert.strictEqual(normalized.confidence, 'low');
  });
});