import { describe, it } from 'node:test';
import assert from 'assert';
import * as devSchema from '../../src/categories/developer-workspace.mjs';

describe('Developer Workspace Category Schema & Guardrails', () => {

  it('should strictly drop sensitive API keys and source code', () => {
    const rawActivity = {
      source: 'ide_tracker',
      type: 'activity',
      data: {
        primary_languages: ['JavaScript', 'Node.js'],
        api_key: 'sk-proj-xyz123',
        source_code: 'const db = connect("mongodb://admin:pass@localhost");',
        env_vars: 'PORT=3000'
      }
    };

    const normalized = devSchema.normalizeWorkspaceContext(rawActivity);

    // Safe metadata is kept
    assert.deepStrictEqual(normalized.data.primary_languages, ['JavaScript', 'Node.js']);
    
    // Sensitive data is ruthlessly dropped
    assert.strictEqual(normalized.data.api_key, undefined);
    assert.strictEqual(normalized.data.source_code, undefined);
    assert.strictEqual(normalized.data.env_vars, undefined);
  });

  it('should treat single file edits (activities) as weak observations (Activity != Identity)', () => {
    const rawActivity = {
      source: 'vscode_activity',
      type: 'activity',
      data: {
        primary_languages: ['Python'] // Just opened one Python file
      }
    };

    const normalized = devSchema.normalizeWorkspaceContext(rawActivity);

    // Verifying Threshold Normalization rules
    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.needs_review, true);
    assert.strictEqual(normalized.confidence, 'low');
  });

  it('should handle explicit IDE preferences with high confidence', () => {
    const rawPreference = {
      source: 'ai_coding_assistant',
      type: 'preference',
      explicit: true,
      data: {
        code_generation_style: 'comments_only',
        preferred_frameworks: ['React', 'Next.js']
      }
    };

    const normalized = devSchema.normalizeWorkspaceContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.confidence, 'high');
    assert.deepStrictEqual(normalized.data.preferred_frameworks, ['React', 'Next.js']);
  });
});