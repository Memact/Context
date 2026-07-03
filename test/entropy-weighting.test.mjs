import { describe, it } from 'node:test';
import assert from 'assert';
import { applyEntropyWeighting } from '../src/entropy-weighting.mjs'; // Adjust path if needed

describe('Contextual Echo-Chamber Prevention via Entropy Weighting', () => {

  it('should penalize high-frequency but low-consistency noise (Echo Chamber Prevention)', () => {
    const mockClaims = [{
      id: 'music_1',
      category: 'music',
      value: 'lo-fi_beats',
      frequency: 400,
      consistency: 0.1 // Binge listened over 2 days, then dropped
    }];

    const result = applyEntropyWeighting(mockClaims);
    
    // Log10(400) is ~2.6. Scaled freq = 10 * (1 + 2.6) = 36. 
    // 36 * 0.1 (consistency) = 3.6 -> Should fall to 'low' confidence despite 400 frequency.
    assert.strictEqual(result[0].confidence, 'low', 'High-frequency noise must be penalized');
    assert.ok(result[0].entropy_score < 5, 'Entropy score must be heavily capped');
  });

  it('should preserve and reward low-frequency but highly consistent habits (Diversity)', () => {
    const mockClaims = [{
      id: 'music_2',
      category: 'music',
      value: 'classic_rock',
      frequency: 5,
      consistency: 1.0 // Listened every Sunday strictly for 5 weeks
    }];

    const result = applyEntropyWeighting(mockClaims);
    
    // Log10(5) is ~0.69. Scaled freq = 10 * (1 + 0.69) = 16.9.
    // 16.9 * 1.0 (consistency) = 16.9 -> Should reach 'high' confidence with just 5 frequency.
    assert.strictEqual(result[0].confidence, 'high', 'Consistent low-frequency habits must be preserved');
    assert.ok(result[0].entropy_score > 15, 'Entropy score must exceed high confidence threshold');
  });

  it('should handle standard inputs without crashing', () => {
    const mockClaims = [{ id: 'test_1', value: 'random', frequency: 1, consistency: 0.8 }];
    const result = applyEntropyWeighting(mockClaims);
    assert.strictEqual(result[0].confidence, 'medium');
  });

});