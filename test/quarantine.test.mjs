import { describe, it } from 'node:test';
import assert from 'assert';
import { processIngestionPipeline } from '../src/quarantine.mjs'; // Adjust path if needed

describe('Anomalous Context Quarantine (Compromised States)', () => {
  const historicalContext = [
    { id: 'h1', category: 'tech_stack', value: 'MERN' },
    { id: 'h2', category: 'hobby', value: 'competitive_programming' },
    { id: 'h3', category: 'hobby', value: 'open_source' }
  ];

  it('should quarantine highly contradictory data bursts and accelerate decay to 7 days', () => {
    const incomingClaims = [
      { id: 'i1', category: 'hobby', value: 'knitting' },
      { id: 'i2', category: 'interest', value: 'toddler_toys' } // Completely new category
    ];

    const result = processIngestionPipeline(incomingClaims, historicalContext);

    // 'knitting' heavily conflicts with established tech hobbies -> should quarantine
    const knittingClaim = result.find(c => c.value === 'knitting');
    assert.strictEqual(knittingClaim.status, 'quarantined');
    assert.strictEqual(knittingClaim.decay_days, 7, 'Quarantined claims must decay in 7 days');
    assert.ok(knittingClaim.deviation_score > 0.8, 'Deviation score must exceed 80%');

    // 'toddler_toys' is in a new category -> moderate deviation (exploration), stays active
    const toysClaim = result.find(c => c.value === 'toddler_toys');
    assert.strictEqual(toysClaim.status, 'active');
    assert.strictEqual(toysClaim.decay_days, 90);
  });

  it('should actively merge data that perfectly aligns with the historical matrix', () => {
    const incomingClaims = [
      { id: 'i3', category: 'tech_stack', value: 'MERN' }
    ];

    const result = processIngestionPipeline(incomingClaims, historicalContext);
    assert.strictEqual(result[0].status, 'active');
    assert.strictEqual(result[0].decay_days, 90);
    assert.strictEqual(result[0].deviation_score, 0);
  });
});