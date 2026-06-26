import assert from 'assert';
import * as diningSchema from '../../src/categories/dining.mjs';

describe('Dining Category Schema & Normalization', () => {

  it('should export the required declarative schema fields', () => {
    assert.strictEqual(diningSchema.category, 'dining');
    assert.ok(diningSchema.contextFields);
    assert.ok(diningSchema.rawInputExamples);
    assert.ok(diningSchema.proposalOutputExamples);
  });

  it('should treat a single group dinner activity as a weak observation to avoid writing fake certainty', () => {
    const rawActivity = {
      source: 'expense_tracker',
      type: 'activity',
      data: {
        action: 'dine_out',
        cuisine_type: 'Seafood',
        context: 'group dinner'
      }
    };

    const normalized = diningSchema.normalizeDiningContext(rawActivity);

    assert.strictEqual(normalized.observation_type, 'weak_observation');
    assert.strictEqual(normalized.confidence, 'low');
    assert.strictEqual(normalized.is_identity_claim, false);
    assert.strictEqual(normalized.visibility, 'private');
    assert.match(normalized.suggestion, /Do you want to add this/);
  });

  it('should handle explicit durable dining preferences correctly', () => {
    const rawPreference = {
      source: 'food_delivery_profile',
      type: 'preference',
      explicit: true,
      data: {
        preferred_cuisines: ['Vegan', 'Thai'],
        dietary_restrictions: ['Dairy-Free'],
        dining_budget: '$$'
      }
    };

    const normalized = diningSchema.normalizeDiningContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.visibility, 'private');
    assert.deepStrictEqual(normalized.data.preferred_cuisines, ['Vegan', 'Thai']);
    assert.deepStrictEqual(normalized.data.dietary_restrictions, ['Dairy-Free']);
  });
});