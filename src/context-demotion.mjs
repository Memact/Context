// Context demotion helpers extracted to avoid clutter in context-matcher.

import SeasonalDecayEngine from './seasonal/index.js';

const DEFAULT_MAX_ITERATIONS = 6;
const DEFAULT_CONFLICT_PENALTY = 0.18; // subtract confidence-scaled penalty
const DEFAULT_STABLE_EPSILON = 0.0001;
const DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION = 0.25;
const DEFAULT_SEASONAL_DEMOTION_FACTOR = 0.15; // Additional demotion for off-season content

// Initialize seasonal engine (lazy initialization)
let seasonalEngine = null;

function getSeasonalEngine() {
  if (!seasonalEngine) {
    seasonalEngine = new SeasonalDecayEngine();
  }
  return seasonalEngine;
}

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
  if (/(music|playlist|song|track|spotify|apple music)/i.test(combined)) return "music";
  if (/(reading|book|kindle|audiobook|pages)/i.test(combined)) return "reading";
  if (/(gaming|game|playstation|xbox|nintendo|steam)/i.test(combined)) return "gaming";
  return null;
}

function isDomainPairConflicting(domainA, domainB) {
  return (domainA === "food-delivery" && domainB === "health-fitness") ||
         (domainA === "health-fitness" && domainB === "food-delivery") ||
         (domainA === "music" && domainB === "reading") ||
         (domainA === "reading" && domainB === "music") ||
         (domainA === "gaming" && domainB === "reading") ||
         (domainA === "reading" && domainB === "gaming");
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
    if (lower === "music" || lower.includes("playlist") || lower.includes("song") || lower.includes("track")) keys.add("music");
    if (lower === "reading" || lower.includes("book") || lower.includes("kindle")) keys.add("reading");
    if (lower === "gaming" || lower.includes("game") || lower.includes("playstation") || lower.includes("xbox")) keys.add("gaming");
  }

  const text = String(requestText || "").toLowerCase();
  if (/\b(food delivery|takeout|delivery order|restaurant|meal order|food order|eat out|zomato|swiggy|ubereats)\b/i.test(text)) keys.add("food-delivery");
  if (/\b(health|fitness|wellness|medical|insurance|benefits|workout|exercise|gym|run)\b/i.test(text)) keys.add("health-fitness");
  if (/\b(music|playlist|song|track|spotify|apple music|listen|audio)\b/i.test(text)) keys.add("music");
  if (/\b(reading|book|kindle|audiobook|pages|read|novel)\b/i.test(text)) keys.add("reading");
  if (/\b(gaming|game|playstation|xbox|nintendo|steam|play|esports)\b/i.test(text)) keys.add("gaming");

  return keys;
}

export function resolveDemotionConfig(options = {}) {
  const cfg = {
    maxIterations: Number(options?.demotion?.maxIterations ?? DEFAULT_MAX_ITERATIONS),
    conflictPenalty: Number(options?.demotion?.conflictPenalty ?? DEFAULT_CONFLICT_PENALTY),
    stableEpsilon: Number(options?.demotion?.stableEpsilon ?? DEFAULT_STABLE_EPSILON),
    minConfidenceForConflictDemotion: Number(options?.demotion?.minConfidenceForConflictDemotion ?? DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION),
    seasonalDemotionFactor: Number(options?.demotion?.seasonalDemotionFactor ?? DEFAULT_SEASONAL_DEMOTION_FACTOR),
    enableSeasonalDemotion: options?.demotion?.enableSeasonalDemotion !== false
  };

  if (!Number.isFinite(cfg.maxIterations) || cfg.maxIterations < 1) cfg.maxIterations = DEFAULT_MAX_ITERATIONS;
  if (!Number.isFinite(cfg.conflictPenalty) || cfg.conflictPenalty < 0) cfg.conflictPenalty = DEFAULT_CONFLICT_PENALTY;
  if (!Number.isFinite(cfg.stableEpsilon) || cfg.stableEpsilon < 0) cfg.stableEpsilon = DEFAULT_STABLE_EPSILON;
  if (!Number.isFinite(cfg.minConfidenceForConflictDemotion) || cfg.minConfidenceForConflictDemotion < 0) cfg.minConfidenceForConflictDemotion = DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION;
  if (!Number.isFinite(cfg.seasonalDemotionFactor) || cfg.seasonalDemotionFactor < 0) cfg.seasonalDemotionFactor = DEFAULT_SEASONAL_DEMOTION_FACTOR;

  return cfg;
}

/**
 * Apply seasonal demotion to candidates based on seasonal relevance
 * @param {Array} candidates - Array of candidate objects
 * @param {Date|string} date - Date to calculate seasonal relevance for
 * @param {Object} options - Configuration options
 * @returns {Array} Candidates with seasonal demotion applied
 */
function applySeasonalDemotion(candidates, date = new Date(), options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates;
  if (!options.enableSeasonalDemotion) return candidates;

  const engine = getSeasonalEngine();
  const currentSeason = engine.getCurrentSeason(date);
  const seasonCoeff = engine.getCoefficient(currentSeason, date);
  const demotionFactor = options.seasonalDemotionFactor || DEFAULT_SEASONAL_DEMOTION_FACTOR;

  return candidates.map(candidate => {
    const memCategory = String(candidate.memory?.category || "").toLowerCase();
    const fieldPath = String(candidate.memory?.field_path || candidate.memory?.path || "").toLowerCase();
    const combined = `${memCategory} ${fieldPath}`;

    // Check if this candidate is music-related
    const isMusicRelated = /(music|playlist|song|track|spotify|apple music)/i.test(combined);
    const isReadingRelated = /(reading|book|kindle|audiobook|pages)/i.test(combined);
    const isGamingRelated = /(gaming|game|playstation|xbox|nintendo|steam)/i.test(combined);

    let seasonalRelevance = 1.0;
    let detectedSeason = null;
    let detectedEmoji = null;

    // If music-related, apply seasonal decay
    if (isMusicRelated) {
      // Try to extract genre from the memory
      let genre = null;
      if (candidate.memory?.genre) {
        genre = candidate.memory.genre;
      } else if (candidate.memory?.fields?.genre) {
        genre = candidate.memory.fields.genre;
      } else if (candidate.memory?.metadata?.genre) {
        genre = candidate.memory.metadata.genre;
      }

      if (genre) {
        const relevance = engine.getGenreRelevance(genre, date);
        seasonalRelevance = relevance.relevance;
        detectedSeason = relevance.season;
        detectedEmoji = relevance.emoji;
      } else {
        // No specific genre, use general seasonal coefficient
        seasonalRelevance = seasonCoeff.coefficient;
        detectedSeason = currentSeason;
        detectedEmoji = seasonCoeff.emoji;
      }
    } else if (isReadingRelated) {
      // Reading has seasonal patterns (more reading in winter, less in summer)
      const coeff = engine.getCoefficient(currentSeason, date);
      // Reading is boosted in winter, slightly demoted in summer
      if (currentSeason === 'winter' || currentSeason === 'holiday') {
        seasonalRelevance = Math.min(1.0, coeff.coefficient * 1.2);
      } else if (currentSeason === 'summer') {
        seasonalRelevance = Math.max(0.3, coeff.coefficient * 0.7);
      } else {
        seasonalRelevance = coeff.coefficient;
      }
      detectedSeason = currentSeason;
      detectedEmoji = coeff.emoji;
    } else if (isGamingRelated) {
      // Gaming has seasonal patterns (more gaming in winter, less in summer)
      const coeff = engine.getCoefficient(currentSeason, date);
      if (currentSeason === 'winter' || currentSeason === 'holiday') {
        seasonalRelevance = Math.min(1.0, coeff.coefficient * 1.1);
      } else if (currentSeason === 'summer') {
        seasonalRelevance = Math.max(0.4, coeff.coefficient * 0.8);
      } else {
        seasonalRelevance = coeff.coefficient;
      }
      detectedSeason = currentSeason;
      detectedEmoji = coeff.emoji;
    }

    // Apply seasonal demotion
    if (seasonalRelevance < 0.8) {
      const demotionAmount = (1 - seasonalRelevance) * demotionFactor;
      const before = candidate.score;
      const after = Math.max(0, before - demotionAmount);
      
      if (Math.abs(after - before) > 0.0001) {
        candidate.score = after;
        candidate.seasonal = {
          relevance: seasonalRelevance,
          season: detectedSeason,
          emoji: detectedEmoji,
          demotionApplied: demotionAmount,
          originalScore: before
        };
        candidate.reasons = Array.isArray(candidate.reasons) ? candidate.reasons : [];
        if (!candidate.reasons.includes("seasonal demotion")) candidate.reasons.push("seasonal demotion");
      }
    } else {
      // Track seasonal relevance even if no demotion applied
      candidate.seasonal = {
        relevance: seasonalRelevance,
        season: detectedSeason,
        emoji: detectedEmoji,
        demotionApplied: 0
      };
    }

    return candidate;
  });
}

/**
 * Get seasonal context for a candidate
 * @param {Object} candidate - Candidate object
 * @param {Date|string} date - Date to check
 * @returns {Object} Seasonal context info
 */
export function getSeasonalContext(candidate, date = new Date()) {
  const engine = getSeasonalEngine();
  const currentSeason = engine.getCurrentSeason(date);
  const seasonCoeff = engine.getCoefficient(currentSeason, date);

  const memCategory = String(candidate.memory?.category || "").toLowerCase();
  const fieldPath = String(candidate.memory?.field_path || candidate.memory?.path || "").toLowerCase();
  const combined = `${memCategory} ${fieldPath}`;

  const isMusicRelated = /(music|playlist|song|track|spotify|apple music)/i.test(combined);
  
  let genre = null;
  if (isMusicRelated) {
    if (candidate.memory?.genre) {
      genre = candidate.memory.genre;
    } else if (candidate.memory?.fields?.genre) {
      genre = candidate.memory.fields.genre;
    } else if (candidate.memory?.metadata?.genre) {
      genre = candidate.memory.metadata.genre;
    }
  }

  if (genre) {
    const relevance = engine.getGenreRelevance(genre, date);
    return {
      genre,
      currentSeason,
      seasonalRelevance: relevance.relevance,
      season: relevance.season,
      emoji: relevance.emoji,
      isCurrentSeason: relevance.isCurrentSeason,
      coefficient: seasonCoeff.coefficient
    };
  }

  return {
    currentSeason,
    seasonalRelevance: seasonCoeff.coefficient,
    emoji: seasonCoeff.emoji,
    isActive: seasonCoeff.isActive,
    coefficient: seasonCoeff.coefficient
  };
}

export function applyLowConfidenceDynamicDemotion({
  candidates,
  requestedCategory,
  requestText,
  threshold,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  conflictPenalty = DEFAULT_CONFLICT_PENALTY,
  stableEpsilon = DEFAULT_STABLE_EPSILON,
  minConfidenceForConflictDemotion = DEFAULT_MIN_CONFIDENCE_FOR_CONFLICT_DEMOTION,
  seasonalDemotionFactor = DEFAULT_SEASONAL_DEMOTION_FACTOR,
  enableSeasonalDemotion = true,
  date = new Date()
}) {
  if (!Array.isArray(candidates) || candidates.length <= 1) return candidates;

  // Work on a copy.
  const adjusted = candidates.map((c) => ({ ...c }));

  // Apply seasonal demotion first
  if (enableSeasonalDemotion) {
    const seasonalOptions = {
      enableSeasonalDemotion,
      seasonalDemotionFactor
    };
    // Apply seasonal demotion and update scores
    const seasonallyAdjusted = applySeasonalDemotion(adjusted, date, seasonalOptions);
    // Update adjusted with seasonal changes
    for (let i = 0; i < adjusted.length; i++) {
      adjusted[i].score = seasonallyAdjusted[i].score;
      adjusted[i].seasonal = seasonallyAdjusted[i].seasonal;
      if (seasonallyAdjusted[i].reasons) {
        adjusted[i].reasons = seasonallyAdjusted[i].reasons;
      }
    }
  }

  const requestedDomains = inferRequestedDomainKeys(requestText, requestedCategory);
  if (!requestedDomains.size) {
    // Still filter by threshold after seasonal demotion
    const filtered = adjusted.filter((c) => c.score >= threshold);
    filtered.sort((a, b) => b.score - a.score || String(a.memory.field_path || "").localeCompare(String(b.memory.field_path || "")));
    return filtered;
  }

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

    // Recompute indices mapping after sort
    domainByCandidate.length = 0;
    for (const c of adjusted) domainByCandidate.push(inferDomainKey(c.memory));
  }

  // Final threshold filter to ensure demoted nodes can drop out.
  const filtered = adjusted.filter((c) => c.score >= threshold);
  filtered.sort((a, b) => b.score - a.score || String(a.memory.field_path || "").localeCompare(String(b.memory.field_path || "")));

  // Add seasonal summary to the result
  const engine = getSeasonalEngine();
  const currentSeason = engine.getCurrentSeason(date);
  const seasonCoeff = engine.getCoefficient(currentSeason, date);
  
  // Attach seasonal metadata to the result
  filtered._seasonal = {
    currentSeason,
    emoji: seasonCoeff.emoji,
    coefficient: seasonCoeff.coefficient,
    isActive: seasonCoeff.isActive,
    timestamp: date.toISOString()
  };

  return filtered;
}

// Export seasonal utilities
export {
  getSeasonalEngine,
  applySeasonalDemotion,
  DEFAULT_SEASONAL_DEMOTION_FACTOR
};