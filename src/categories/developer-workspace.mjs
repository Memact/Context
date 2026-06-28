/**
 * Developer Workspace & IDE Preferences Category
 * Models user coding environments and generation habits while enforcing strict secret-scrubbing.
 */

export const developerWorkspace = {
  id: 'developer_workspace',
  name: 'Developer Workspace & IDE Preferences',
  description: 'Tracks preferred programming languages, frameworks, and AI code generation styles.',
  
  // Context Fields
  schema: {
    primary_languages: {
      type: 'array',
      items: { type: 'string' },
      description: 'Languages the user frequently writes in (e.g., ["JavaScript", "Python"]).'
    },
    preferred_frameworks: {
      type: 'array',
      items: { type: 'string' },
      description: 'Frameworks the user frequently utilizes (e.g., ["React", "Express"]).'
    },
    code_generation_style: {
      type: 'string',
      enum: ['comments_only', 'full_snippets', 'pseudocode_first', 'unknown'],
      description: 'How the user prefers the AI to return code.'
    }
  },

  // The "Smart" Rules & Guardrails
  guardrails: {
    // Threshold Normalization: Require multiple occurrences to establish identity
    activityIsNotIdentity: (events) => {
      const languageCounts = {};
      events.forEach(event => {
        if (event.language) {
          languageCounts[event.language] = (languageCounts[event.language] || 0) + 1;
        }
      });
      // Only normalize as a primary language if seen in more than 3 distinct sessions
      return Object.keys(languageCounts).filter(lang => languageCounts[lang] >= 3);
    },

    // Security Guardrail: Scrub secrets and proprietary code
    scrubSecrets: (rawContext) => {
      // Very basic regex to catch potential keys (AWS, generic API keys, etc.)
      const secretRegex = /(?:api[_-]?key|secret[_-]?key|token|password)[\s=:]+['"]?[a-zA-Z0-9\-_]{16,}['"]?/gi;
      let sanitizedContext = rawContext;
      if (typeof rawContext === 'string') {
        sanitizedContext = rawContext.replace(secretRegex, '[REDACTED_SECRET]');
      }
      return sanitizedContext;
    }
  },

  // Example Raw Events (Input)
  examples: [
    {
      type: 'ide_interaction',
      timestamp: '2026-06-28T10:00:00Z',
      payload: {
        action: 'code_generation_request',
        prompt: 'Generate a React component for a login form, but just give me the pseudocode first.',
        detected_language: 'JavaScript',
        detected_framework: 'React',
        raw_code_snippet: 'const API_KEY = "my_dummy_secret_key_1234567890";' // Should be scrubbed
      }
    }
  ],

  // Normalized Notebook Entry (Output)
  notebookTemplates: [
    {
      entry_type: 'preference',
      content: 'User prefers building in JavaScript and React. They prefer receiving pseudocode before full implementation.',
      visibility: 'private'
    }
  ]
};

export default developerWorkspace;