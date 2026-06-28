import { strict as assert } from 'assert';
import { developerWorkspace } from '../../src/categories/developer-workspace.mjs';

describe('Developer Workspace Category Schema', () => {
  
  it('should have the correct schema ID and fields', () => {
    assert.equal(developerWorkspace.id, 'developer_workspace');
    assert.ok(developerWorkspace.schema.primary_languages);
    assert.ok(developerWorkspace.schema.preferred_frameworks);
    assert.ok(developerWorkspace.schema.code_generation_style);
  });

  it('should enforce threshold normalization (Activity is not Identity)', () => {
    const rawEvents = [
      { language: 'Python', type: 'script_run' },
      { language: 'JavaScript', type: 'script_run' },
      { language: 'JavaScript', type: 'script_run' },
      { language: 'JavaScript', type: 'script_run' }
    ];
    
    const normalizedLanguages = developerWorkspace.guardrails.activityIsNotIdentity(rawEvents);
    
    // JavaScript appeared 3 times (meets threshold), Python only 1 time (ignored)
    assert.deepEqual(normalizedLanguages, ['JavaScript']);
  });

it('should scrub secrets and proprietary API keys from raw context', () => {
    const maliciousPrompt = `
      Help me debug this python script.
      AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE"
      api_key: 'my_dummy_secret_key_1234567890'
    `;
    
    const sanitized = developerWorkspace.guardrails.scrubSecrets(maliciousPrompt);
    
    assert.ok(sanitized.includes('[REDACTED_SECRET]'));
    assert.equal(sanitized.includes('my_dummy_secret_key_1234567890'), false);
  });
});