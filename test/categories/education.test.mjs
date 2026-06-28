import assert from 'assert';
import * as educationSchema from '../../src/categories/education.mjs';

describe('Education Category Schema & Normalization', () => {

  it('should export the required declarative schema fields', () => {
    assert.strictEqual(educationSchema.category, 'education');
    assert.ok(educationSchema.contextFields);
    assert.ok(educationSchema.rawInputExamples);
    assert.ok(educationSchema.proposalOutputExamples);
  });

  it('should treat a single course search as a weak observation to prevent profile pollution', () => {
    const rawActivity = {
      source: 'learning_platform',
      type: 'activity',
      data: {
        action: 'search',
        course_query: 'Machine Learning Basics'
      }
    };

    const normalized = educationSchema.normalizeEducationContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.confidence, 'low');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.visibility, 'private');
    assert.match(normalized.suggestion, /Are you currently pursuing a certification/);
  });

  it('should handle explicit durable study preferences correctly', () => {
    const rawPreference = {
      source: 'user_profile',
      type: 'preference',
      explicit: true,
      data: {
        preferred_study_formats: ['coding sandboxes'],
        study_time_preferences: ['morning slots']
      }
    };

    const normalized = educationSchema.normalizeEducationContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.visibility, 'private');
    assert.deepStrictEqual(normalized.data.preferred_study_formats, ['coding sandboxes']);
  });
});