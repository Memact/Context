import { describe, it } from 'node:test';
import assert from 'assert';
import * as professionalSchema from '../../src/categories/professional.mjs';

describe('Professional Category Schema & Normalization', () => {

  it('should export the required declarative schema fields', () => {
    assert.strictEqual(professionalSchema.category, 'professional');
    assert.ok(professionalSchema.contextFields);
    assert.ok(professionalSchema.rawInputExamples);
    assert.ok(professionalSchema.proposalOutputExamples);
  });

  it('should treat casual job views as weak observations to prevent false profile shifts', () => {
    const rawActivity = {
      source: 'job_board',
      type: 'activity',
      data: {
        action: 'view',
        viewed_role: 'Backend Engineer'
      }
    };

    const normalized = professionalSchema.normalizeProfessionalContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.confidence, 'low');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.visibility, 'private');
    assert.match(normalized.suggestion, /Are you looking to add this/);
  });

  it('should handle explicit durable professional preferences correctly', () => {
    const rawPreference = {
      source: 'career_profile',
      type: 'preference',
      explicit: true,
      data: {
        preferred_job_roles: ['DevOps Engineer'],
        work_environment: 'hybrid'
      }
    };

    const normalized = professionalSchema.normalizeProfessionalContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.visibility, 'private');
    assert.deepStrictEqual(normalized.data.preferred_job_roles, ['DevOps Engineer']);
    assert.strictEqual(normalized.data.work_environment, 'hybrid');
  });
});