/**
 * Conversational Tone & Interaction Style Category
 * Models user preferences for AI communication while strictly scrubbing raw chat logs.
 */

export const interactionStyle = {
  id: 'interaction_style',
  name: 'Conversational Tone & Interaction Style',
  description: 'Tracks how the user prefers the AI to communicate (tone, verbosity, proactiveness).',
  
  // Context Fields
  schema: {
    preferred_tone: {
      type: 'string',
      description: 'e.g., "professional", "casual", "empathetic", "concise"'
    },
    verbosity_level: {
      type: 'string',
      enum: ['detailed', 'bullet_points', 'TL;DR', 'unknown'],
      description: 'Preferred length and formatting of responses'
    },
    proactive_suggestions: {
      type: 'boolean',
      description: 'Does the user like the AI to suggest follow-up actions autonomously?'
    }
  },

  // The "Smart" Rules & Guardrails
  guardrails: {
    // Ephemeral Scrubbing: Never store raw chat logs or emotional states.
    ephemeralScrubbing: (rawEvent) => {
      // Create a shallow copy to avoid mutating the original object directly
      const sanitized = JSON.parse(JSON.stringify(rawEvent));
      
      if (sanitized.payload) {
        // Strictly delete private/ephemeral data
        delete sanitized.payload.raw_chat_log;
        delete sanitized.payload.user_emotion;
      }
      
      return sanitized;
    }
  },

  // Example Raw Events (Input)
  examples: [
    {
      type: 'user_feedback',
      timestamp: '2026-06-28T12:00:00Z',
      payload: {
        explicit_preference: 'Please give me shorter answers.',
        inferred_verbosity: 'TL;DR',
        raw_chat_log: 'User: Why is the sky blue? AI: [Long explanation] User: Please give me shorter answers.', // Will be scrubbed
        user_emotion: 'frustrated' // Will be scrubbed
      }
    }
  ],

  // Normalized Notebook Entry (Output)
  notebookTemplates: [
    {
      entry_type: 'preference',
      content: 'Preference: Casual Communication Style. User prefers TL;DR verbosity and concise responses.',
      visibility: 'private'
    }
  ]
};

export default interactionStyle;