import { strict as assert } from 'assert';
import { interactionStyle } from '../../src/categories/interaction-style.mjs';

describe('Interaction Style Category Schema', () => {
  
  it('should have the correct schema ID and fields', () => {
    assert.equal(interactionStyle.id, 'interaction_style');
    assert.ok(interactionStyle.schema.preferred_tone);
    assert.ok(interactionStyle.schema.verbosity_level);
    assert.ok(interactionStyle.schema.proactive_suggestions);
  });

  it('should strictly scrub raw chat logs and emotional states (Ephemeral Scrubbing)', () => {
    const rawEvent = {
      type: 'interaction_feedback',
      payload: {
        inferred_tone: 'casual',
        explicit_preference: 'Keep it casual.',
        raw_chat_log: 'User: Hey, how are you? AI: I am functioning optimally. User: Keep it casual.',
        user_emotion: 'bored'
      }
    };
    
    const sanitizedEvent = interactionStyle.guardrails.ephemeralScrubbing(rawEvent);
    
    // Core preference should remain
    assert.equal(sanitizedEvent.payload.inferred_tone, 'casual');
    assert.equal(sanitizedEvent.payload.explicit_preference, 'Keep it casual.');
    
    // Privacy-sensitive fields MUST be undefined
    assert.equal(sanitizedEvent.payload.raw_chat_log, undefined);
    assert.equal(sanitizedEvent.payload.user_emotion, undefined);
  });

});