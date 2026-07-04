/**
 * Memact Engine - Anomalous Context Quarantine
 * Isolates out-of-character data bursts to prevent core identity corruption.
 */

export function calculateDeviationScore(incomingClaim, historicalContext) {
  if (!historicalContext || historicalContext.length === 0) return 0; // No history, no anomaly

  // Find historical claims in the exact same category
  const categoryHistory = historicalContext.filter(c => c.category === incomingClaim.category);

  // If the category is completely new to the user, it's a moderate deviation (exploration), not an anomaly
  if (categoryHistory.length === 0) return 0.5;

  // If the category exists, check if the specific value aligns
  const exactMatch = categoryHistory.some(c => c.value === incomingClaim.value);
  if (exactMatch) return 0.0; // Perfect alignment with history

  // If the category is heavily established but the value is completely disjointed/contradictory
  // (e.g., historical 'competitive_programming' vs incoming 'knitting')
  return 0.9; 
}

export function processIngestionPipeline(incomingClaims, historicalContext) {
  return incomingClaims.map(claim => {
    const deviationScore = calculateDeviationScore(claim, historicalContext);
    
    // Threshold set by the issue requirements (> 80%)
    const isAnomalous = deviationScore > 0.8;

    return {
      ...claim,
      deviation_score: deviationScore,
      status: isAnomalous ? 'quarantined' : 'active',
      // Quarantined claims decay ~12x faster (7 days instead of 90)
      decay_days: isAnomalous ? 7 : 90 
    };
  });
}