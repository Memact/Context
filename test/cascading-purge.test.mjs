import { describe, it } from 'node:test';
import assert from 'assert';
import { cascadePurge } from '../src/categories/cascading-purge.mjs'; // Adjust path if needed

describe('Cascading Purge Engine (Right to be Forgotten)', () => {

  const mockContextGraph = [
    { id: 'c1', claim_type: 'explicit_preference', category: 'diet', value: 'vegan' },
    { id: 'c2', claim_type: 'inferred_preference', category: 'diet', value: 'almond_milk', parent_claim_id: ['c1'] },
    { id: 'c3', claim_type: 'inferred_preference', category: 'locations', value: 'vegan_bakery', parent_claim_id: ['c1'] },
    { id: 'c4', claim_type: 'inferred_preference', category: 'food', value: 'almond_croissant', parent_claim_id: ['c2', 'c3'] },
    { id: 'c5', claim_type: 'explicit_preference', category: 'health', value: 'marathon_runner' }, // Unrelated
    { id: 'c6', claim_type: 'inferred_preference', category: 'health', value: 'buys_running_shoes', parent_claim_id: ['c5'] }
  ];

  it('should delete a root explicit claim and recursively purge ALL derived inferred claims', () => {
    const result = cascadePurge('c1', mockContextGraph);
    
    // c1 (root), c2 & c3 (children), and c4 (grandchild) should be purged. 
    // c5 and c6 should remain.
    const remainingIds = result.map(c => c.id);
    assert.strictEqual(remainingIds.length, 2);
    assert.ok(remainingIds.includes('c5'));
    assert.ok(remainingIds.includes('c6'));
    
    assert.strictEqual(remainingIds.includes('c1'), false, 'Root node must be deleted');
    assert.strictEqual(remainingIds.includes('c4'), false, 'Deep grandchild nodes must be deleted');
  });

  it('should delete a mid-level inferred claim and purge its downstream dependents only', () => {
    const result = cascadePurge('c2', mockContextGraph);
    
    // Deleting c2 should purge c2 and its child c4. Root c1 and sibling c3 should survive.
    const remainingIds = result.map(c => c.id);
    assert.strictEqual(remainingIds.length, 4);
    assert.ok(remainingIds.includes('c1'));
    assert.ok(remainingIds.includes('c3'));
    assert.strictEqual(remainingIds.includes('c2'), false);
    assert.strictEqual(remainingIds.includes('c4'), false);
  });

  it('should return the graph unchanged if the target ID does not exist', () => {
    const result = cascadePurge('unknown_id', mockContextGraph);
    assert.strictEqual(result.length, mockContextGraph.length);
  });
});