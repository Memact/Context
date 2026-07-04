/**
 * Memact Engine - Time-Decay Middleware
 * Recalculates confidence of context claims based on half-life (90 days).
 */

export function applyTimeDecay(contextArray, currentTimestamp = Date.now()) {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  return contextArray.map(claim => {
    // Clone to avoid mutating original data
    const updatedClaim = { ...claim };

    // Explicit Exemption: User-defined preferences NEVER decay
    if (updatedClaim.claim_type === 'explicit_preference') {
      return updatedClaim;
    }

    // Apply confidence degradation for stale inferred claims
    if (updatedClaim.last_observed) {
      const lastObservedTime = new Date(updatedClaim.last_observed).getTime();
      const ageInMs = currentTimestamp - lastObservedTime;

      // If older than 90 days, downgrade confidence to 'low'
      if (ageInMs > NINETY_DAYS_MS) {
        if (updatedClaim.confidence === 'medium' || updatedClaim.confidence === 'high') {
          updatedClaim.confidence = 'low';
        }
      }
    }

    return updatedClaim;
  });
}