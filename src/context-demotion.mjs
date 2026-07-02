// Context demotion helpers extracted to avoid clutter in context-matcher.

const DEFAULT_MAX_ITERATIONS = 6;
const DEFAULT_CONFLICT_PENALTY = 0.18; // subtract confidence-scaled penalty
const DEFAULT_STABLE_EPSILON = 0.0001;
const DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION = 0.25;

function getConfidence(memory) {
  const c = memory && typeof memory.confidence === "number" ? memory.confidence : 1.0;
  if (!Number.isFinite(c)) return 1.0;
  return Math.max(0, Math.min(1, c));
}

function inferDomainKey(memory) {
  const memCategory = String(memory?.category || "").toLowerCase();
  const fieldPath = String(memory?.field_path || memory?.path || "").toLowerCase();
  const combined = `${memCategory} ${fieldPath}`;

  // domain keys aligned with existing hard gate in context-matcher
  if (/(food-delivery|food_delivery|fooddelivery|shopping\.food_delivery)/i.test(combined)) return "food-delivery";
  if (/(health|fitness|health\.fitness|health_fitness|healthfitness)/i.test(combined)) return "health-fitness";
  return null;
}

function isDomainPairConflicting(domainA, domainB) {
  return (domainA === "food-delivery" && domainB === "health-fitness") ||
         (domainA === "health-fitness" && domainB === "food-delivery");
}

function inferRequestedDomainKeys(requestText, requestedCategory) {
  const keys = new Set();
  const req = String(requestedCategory || "");
  if (req) {
    const lower = req.toLowerCase();
    if (lower.includes("food-delivery") || lower.includes("food_delivery") || lower.includes("fooddelivery")) keys.add("food-delivery");
    if (lower === "health" || lower === "fitness" || lower.includes("health-fitness") || lower.includes("health_fitness")) keys.add("health-fitness");
    if (lower.includes("healthfitness")) keys.add("health-fitness");
    if (lower === "food-delivery") keys.add("food-delivery");
    if (lower === "health-fitness") keys.add("health-fitness");
  }

  const text = String(requestText || "").toLowerCase();
  if (/\b(food delivery|takeout|delivery order|restaurant|meal order|food order|eat out|zomato|swiggy|ubereats)\b/i.test(text)) keys.add("food-delivery");
  if (/\b(health|fitness|wellness|medical|insurance|benefits|workout|exercise|gym|run)\b/i.test(text)) keys.add("health-fitness");

  return keys;
}

export function resolveDemotionConfig(options = {}) {
  const cfg = {
    maxIterations: Number(options?.demotion?.maxIterations ?? DEFAULT_MAX_ITERATIONS),
    conflictPenalty: Number(options?.demotion?.conflictPenalty ?? DEFAULT_CONFLICT_PENALTY),
    stableEpsilon: Number(options?.demotion?.stableEpsilon ?? DEFAULT_STABLE_EPSILON),
    minConfidenceForConflictDemotion: Number(options?.demotion?.minConfidenceForConflictDemotion ?? DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION)
  };

  if (!Number.isFinite(cfg.maxIterations) || cfg.maxIterations < 1) cfg.maxIterations = DEFAULT_MAX_ITERATIONS;
  if (!Number.isFinite(cfg.conflictPenalty) || cfg.conflictPenalty < 0) cfg.conflictPenalty = DEFAULT_CONFLICT_PENALTY;
  if (!Number.isFinite(cfg.stableEpsilon) || cfg.stableEpsilon < 0) cfg.stableEpsilon = DEFAULT_STABLE_EPSILON;
  if (!Number.isFinite(cfg.minConfidenceForConflictDemotion) || cfg.minConfidenceForConflictDemotion < 0) cfg.minConfidenceForConflictDemotion = DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION;

  return cfg;
}

export function applyLowConfidenceDynamicDemotion({
  candidates,
  requestedCategory,
  requestText,
  threshold,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  conflictPenalty = DEFAULT_CONFLICT_PENALTY,
  stableEpsilon = DEFAULT_STABLE_EPSILON,
  minConfidenceForConflictDemotion = DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION
}) {
  if (!Array.isArray(candidates) || candidates.length <= 1) return candidates;

  // Work on a copy.
  const adjusted = candidates.map((c) => ({ ...c }));

  const requestedDomains = inferRequestedDomainKeys(requestText, requestedCategory);
  if (!requestedDomains.size) return adjusted;

  // Precompute domains.
  const domainByCandidate = adjusted.map((c) => inferDomainKey(c.memory));

  let prevConflictedIdsKey = "";

  for (let iter = 0; iter < maxIterations; iter++) {
    const conflicted = new Set();

    // Determine which nodes are conflicted: candidates from one requested domain that
    // have a counterpart from the other requested conflicting domain.
    for (let i = 0; i < adjusted.length; i++) {
      const dA = domainByCandidate[i];
      if (!dA || !requestedDomains.has(dA)) continue;

      for (let j = i + 1; j < adjusted.length; j++) {
        const dB = domainByCandidate[j];
        if (!dB || !requestedDomains.has(dB)) continue;
        if (!isDomainPairConflicting(dA, dB)) continue;

        const ci = getConfidence(adjusted[i].memory);
        const cj = getConfidence(adjusted[j].memory);

        // If both below demotion confidence floor, still consider conflict,
        // but penalize the weaker one slightly less.
        const shouldDemoteI = ci >= minConfidenceForConflictDemotion;
        const shouldDemoteJ = cj >= minConfidenceForConflictDemotion;

        // Demote lower confidence candidate in the pair.
        if (ci === cj) {
          // tie-break by current score
          if (adjusted[i].score < adjusted[j].score) {
            if (shouldDemoteI) conflicted.add(i);
            if (!shouldDemoteJ) conflicted.add(j);
          } else {
            if (shouldDemoteJ) conflicted.add(j);
            if (!shouldDemoteI) conflicted.add(i);
          }
        } else if (ci < cj) {
          if (shouldDemoteI) conflicted.add(i);
          else if (shouldDemoteJ) conflicted.add(j);
        } else {
          if (shouldDemoteJ) conflicted.add(j);
          else if (shouldDemoteI) conflicted.add(i);
        }
      }
    }

    const conflictedIdsKey = Array.from(conflicted).sort((a, b) => a - b).join(",");
    if (conflicted.size === 0) break;
    if (prevConflictedIdsKey === conflictedIdsKey) {
      // stable conflict set
      break;
    }
    prevConflictedIdsKey = conflictedIdsKey;

    // Apply penalties.
    const delta = conflictPenalty * (1 / (iter + 1));
    for (const idx of conflicted) {
      const c = adjusted[idx];
      const conf = getConfidence(c.memory);
      const penalty = delta * (0.35 + 0.65 * conf); // stronger confidence => slightly stronger penalty
      const before = c.score;
      const after = Math.max(0, before - penalty);
      if (Math.abs(after - before) > stableEpsilon) {
        c.score = after;
        c.reasons = Array.isArray(c.reasons) ? c.reasons : [];
        if (!c.reasons.includes("conflict demotion")) c.reasons.push("conflict demotion");
      }
    }

    // Re-sort for next iteration stability.
    adjusted.sort((a, b) => b.score - a.score || String(a.memory.field_path || "").localeCompare(String(b.memory.field_path || "")));

    // Recompute indices mapping after sort by rebuilding domainByCandidate & mapping positions.
    // For stability & correctness, rerun loop by breaking and letting next iter recalc.
    // (Keeping this simple by breaking once we mutate sort order.)
    // Since we already check stable conflict set, this is fine.
    domainByCandidate.length = 0;
    for (const c of adjusted) domainByCandidate.push(inferDomainKey(c.memory));
  }

  // Final threshold filter to ensure demoted nodes can drop out.
  const filtered = adjusted.filter((c) => c.score >= threshold);
  filtered.sort((a, b) => b.score - a.score || String(a.memory.field_path || "").localeCompare(String(b.memory.field_path || "")));

  return filtered;
}

