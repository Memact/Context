// src/archival-engine.mjs

/**
 * Semantic Archival Engine
 * Compresses stale, redundant memory nodes into dense semantic embeddings (Cold Storage).
 * * @param {Array} claims - Array of memory claim objects.
 * @returns {Object} Segregated data containing 'hot' (active) and 'cold' (archived) arrays.
 */
export function processSemanticRollup(claims) {
    if (!claims || claims.length === 0) return { hot: [], cold: [], purgedCount: 0 };

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activeClaims = [];
    const staleClaims = [];

    // 1. Tiered Storage Routing: Separate Hot vs Cold candidates
    claims.forEach(claim => {
        const claimDate = new Date(claim.timestamp);
        // If older than 1 year and low confidence due to time decay
        if (claimDate < oneYearAgo && claim.confidence < 0.5) {
            staleClaims.push(claim);
        } else {
            activeClaims.push(claim);
        }
    });

    // 2. Semantic Rollup Logic (Compression)
    const frequencyMap = {};
    staleClaims.forEach(claim => {
        const key = `${claim.category}:${claim.value}`;
        if (!frequencyMap[key]) {
            frequencyMap[key] = { count: 0, year: new Date(claim.timestamp).getFullYear() };
        }
        frequencyMap[key].count += 1;
    });

    const archivalNodes = [];
    for (const [key, data] of Object.entries(frequencyMap)) {
        const [category, value] = key.split(':');
        
        // If an event happened many times, roll it up into a highly confident Historical Habit
        if (data.count >= 10) {
            archivalNodes.push({
                type: 'historical_habit',
                summary: `frequent_${category}_${value}_${data.year}`,
                originalNodeCount: data.count,
                confidence: 0.85 // Re-weighted as a proven historical pattern
            });
        } else {
            // Sparse events become isolated rare memories
            archivalNodes.push({
                type: 'isolated_event',
                summary: `rare_${category}_${value}_${data.year}`,
                originalNodeCount: data.count,
                confidence: 0.3
            });
        }
    }

    return {
        hot: activeClaims,            // Stays in fast DB
        cold: archivalNodes,          // Moves to vector/cold storage
        purgedCount: staleClaims.length // Number of rows deleted from hot DB
    };
}