/**
 * Memact Engine - Context Conflict Resolution Engine
 * Resolves logical contradictions across overlapping categories.
 */

// 1. Observation Type Hierarchy (Explicit strictly overrides Inferred)
export const OBSERVATION_WEIGHTS = Object.freeze({
  "explicit_preference": 100,
  "inferred_preference": 50,
  "strong_observation": 30,
  "weak_observation": 10,
  "unknown": 0
});

// 2. Category Dominance Matrix (Specialized > General)
export const CATEGORY_DOMINANCE = Object.freeze({
  "identity": 100,
  "health": 90,
  "developer-workspace": 80,
  "academic-profile": 80,
  "diet": 70,
  "fitness": 70,
  "shopping": 50,
  "interaction-style": 40,
  "general": 10
});

/**
 * Resolves a conflict between two competing context claims.
 */
export function resolveContextConflict(claimA, claimB) {
  if (!claimA) return claimB;
  if (!claimB) return claimA;

  const weightA = OBSERVATION_WEIGHTS[claimA.observation_type] ?? 0;
  const weightB = OBSERVATION_WEIGHTS[claimB.observation_type] ?? 0;

  // Rule 1: Strict Explicit vs Inferred check
  if (weightA > weightB) return claimA;
  if (weightB > weightA) return claimB;

  // Rule 2: Category Dominance check
  const domA = CATEGORY_DOMINANCE[claimA.category] ?? 10;
  const domB = CATEGORY_DOMINANCE[claimB.category] ?? 10;

  if (domA > domB) return claimA;
  if (domB > domA) return claimB;

  // Rule 3: Tie-breaker (Fallback to confidence)
  const confA = typeof claimA.confidence === 'number' ? claimA.confidence : 0.5;
  const confB = typeof claimB.confidence === 'number' ? claimB.confidence : 0.5;

  if (confB > confA) return claimB;
  
  return claimA;
}