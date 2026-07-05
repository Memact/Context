/**
 * Memact Engine - Contextual Echo-Chamber Prevention
 * Applies entropy weighting (logarithmic scaling + consistency preservation).
 */

export function applyEntropyWeighting(contextClaims) {
  if (!Array.isArray(contextClaims)) return [];

  return contextClaims.map(claim => {
    // Default values if missing
    const freq = claim.frequency || 1;
    const consistency = claim.consistency || 0.1; 

    // Apply Logarithmic Scaling to prevent raw frequency domination
    // Formula: W = 10 * (1 + log10(frequency))
    const scaledFrequencyScore = 10 * (1 + Math.log10(freq));

    // Calculate final entropy score using long-term consistency
    const entropyScore = scaledFrequencyScore * consistency;

    // Determine confidence based on the penalized/rewarded score
    let confidence = 'low';
    if (entropyScore >= 15) {
      confidence = 'high';
    } else if (entropyScore >= 5) {
      confidence = 'medium';
    }

    return {
      ...claim,
      entropy_score: parseFloat(entropyScore.toFixed(2)),
      confidence
    };
  });
}