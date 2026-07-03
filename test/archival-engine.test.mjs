// test/archival-engine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { processSemanticRollup } from '../src/archival-engine.mjs';

test('🗄️ Semantic Archival Engine & Context Compression', async (t) => {
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const recentDate = new Date();

    await t.test('Should compress 100 redundant, stale nodes into ONE high-value archival node', () => {
        // Generate 100 fake low-confidence claims from 2 years ago
        const staleClaims = Array.from({ length: 100 }).map(() => ({
            category: 'location',
            value: 'coffee_shop',
            timestamp: twoYearsAgo.toISOString(),
            confidence: 0.2
        }));

        const result = processSemanticRollup(staleClaims);

        // Verify Hot Storage is empty
        assert.strictEqual(result.hot.length, 0);
        
        // Verify 100 nodes were purged from hot memory
        assert.strictEqual(result.purgedCount, 100);
        
        // Verify they were compressed into exactly ONE cold storage node
        assert.strictEqual(result.cold.length, 1);
        
        // Verify the semantic meaning and metrics survived the compression
        assert.strictEqual(result.cold[0].type, 'historical_habit');
        assert.match(result.cold[0].summary, /frequent_location_coffee_shop/);
        assert.strictEqual(result.cold[0].originalNodeCount, 100);
        assert.strictEqual(result.cold[0].confidence, 0.85);
    });

    await t.test('Should keep recent or high-confidence claims in HOT storage', () => {
        const claims = [
            { category: 'activity', value: 'coding', timestamp: recentDate.toISOString(), confidence: 0.9 },
            { category: 'location', value: 'gym', timestamp: recentDate.toISOString(), confidence: 0.8 }
        ];

        const result = processSemanticRollup(claims);

        assert.strictEqual(result.hot.length, 2);
        assert.strictEqual(result.cold.length, 0);
        assert.strictEqual(result.purgedCount, 0);
    });
});