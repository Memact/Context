import { describe, it } from 'node:test';
import assert from 'assert';
import { ContextSynthesizer } from '../src/synergistic-inference.mjs'; // Adjust path if needed

describe('Cross-Category Synergistic Inference Engine', () => {

  it('should generate an active_goal when Health and Travel claims share a blurred temporal_bucket', () => {
    const mockClaims = [
      { id: 'h1', category: 'health', semantic_activity: 'marathon_training', temporal_bucket: '2026_Q4', confidence: 'high' },
      { id: 't1', category: 'travel', semantic_location: 'Boston', temporal_bucket: '2026_Q4', confidence: 'high' },
      { id: 'u1', category: 'music', value: 'lo-fi', confidence: 'medium' }
    ];

    const result = ContextSynthesizer(mockClaims);
    
    // Should have original 3 claims + 1 synthesized goal
    assert.strictEqual(result.length, 4);
    
    const newGoal = result.find(c => c.category === 'synergy');
    assert.ok(newGoal, 'Synergistic goal should be created');
    assert.strictEqual(newGoal.value, 'event_participation');
    assert.strictEqual(newGoal.claim_type, 'active_goal');
    assert.deepStrictEqual(newGoal.derived_from, ['h1', 't1'], 'Must link to root privacy-blurred claims');
  });

  it('should NOT generate a goal if the temporal_buckets do not align', () => {
    const mockClaims = [
      { id: 'h1', category: 'health', semantic_activity: 'marathon_training', temporal_bucket: '2026_Q2', confidence: 'high' },
      { id: 't1', category: 'travel', semantic_location: 'Boston', temporal_bucket: '2026_Q4', confidence: 'high' }
    ];

    const result = ContextSynthesizer(mockClaims);
    assert.strictEqual(result.length, 2, 'No synergy goal should be created for mismatched timelines');
  });

  it('should only operate on high-confidence claims', () => {
    const mockClaims = [
      { id: 'h1', category: 'health', semantic_activity: 'marathon_training', temporal_bucket: '2026_Q4', confidence: 'low' },
      { id: 't1', category: 'travel', semantic_location: 'Boston', temporal_bucket: '2026_Q4', confidence: 'high' }
    ];

    const result = ContextSynthesizer(mockClaims);
    assert.strictEqual(result.length, 2, 'Should ignore low confidence health claims');
  });

});