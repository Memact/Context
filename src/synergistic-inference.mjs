/**
 * Memact Engine - Cross-Category Synergistic Inference
 * Generates high-value goals by finding temporal intersections across isolated categories.
 */

export function ContextSynthesizer(contextClaims) {
  if (!Array.isArray(contextClaims)) return [];

  const synthesizedGoals = [];

  // Filter high-confidence claims by category
  const healthClaims = contextClaims.filter(c => c.category === 'health' && c.confidence === 'high');
  const travelClaims = contextClaims.filter(c => c.category === 'travel' && c.confidence === 'high');

  // Rule 1: Marathon + Travel Intersection
  for (const health of healthClaims) {
    for (const travel of travelClaims) {
      // Check for temporal intersection on PRIVACY-BLURRED data only
      if (health.temporal_bucket && travel.temporal_bucket && health.temporal_bucket === travel.temporal_bucket) {
        
        if (health.semantic_activity === 'marathon_training' && travel.semantic_location) {
          synthesizedGoals.push({
            id: `syn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            claim_type: 'active_goal',
            category: 'synergy',
            value: 'event_participation',
            derived_from: [health.id, travel.id],
            confidence: 'high'
          });
        }
      }
    }
  }

  // Return the original graph + the newly synthesized goals
  return [...contextClaims, ...synthesizedGoals];
}