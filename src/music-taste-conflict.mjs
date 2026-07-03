/**
 * Memact Engine — Music Taste Conflict Resolver (#202)
 *
 * Resolves contradictions between:
 *   - ACTIVE LISTENING ANALYTICS (media-playback source): what the user
 *     actually streams, inferred from play counts, completion rates, etc.
 *   - SELF-REPORTED BIO (social-community source): what the user claims to
 *     like in profile bios, Discord servers, social bios, etc.
 *
 * Architecture:
 *   1. sourceTypeWeight()       — maps source type to an observation weight
 *   2. normaliseGenres()        — lowercase + deduplicate genre arrays
 *   3. computeOverlap()         — Jaccard similarity between two genre sets
 *   4. computeConfidenceDelta() — signed confidence gap, positive = analytics leads
 *   5. detectMusicTasteConflict() — main entry point, returns a conflict report
 *      or null if no meaningful contradiction is detected
 */

// ---------------------------------------------------------------------------
// Source-type weight table
// Active listening carries higher evidential weight than stated preferences.
// ---------------------------------------------------------------------------
export const SOURCE_TYPE_WEIGHTS = Object.freeze({
  "media-playback":     0.90,   // Spotify streams, completion rate, repeat plays
  "listening-history":  0.90,   // alias
  "social-community":   0.55,   // Discord bio, Reddit flair, Twitter profile
  "self-reported":      0.55,   // alias for social / stated preference
  "explicit-preference": 0.75,  // user explicitly confirmed inside Memact
  "unknown":             0.30
});

// Minimum Jaccard overlap drop below which we consider it a contradiction.
// 1.0 = identical sets, 0.0 = completely disjoint.
const CONFLICT_OVERLAP_THRESHOLD = 0.35;

// Minimum absolute confidence delta to surface a contradiction suggestion.
const CONFLICT_DELTA_THRESHOLD = 0.20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the numeric observation weight for a given source type string.
 * @param {string} sourceType
 * @returns {number}
 */
export function sourceTypeWeight(sourceType = "") {
  const key = String(sourceType || "").toLowerCase().trim();
  return SOURCE_TYPE_WEIGHTS[key] ?? SOURCE_TYPE_WEIGHTS["unknown"];
}

/**
 * Normalise a genre list: lowercase, trim, deduplicate, sort.
 * Accepts a string (comma-separated) or an array.
 * @param {string|string[]} genres
 * @returns {string[]}
 */
export function normaliseGenres(genres) {
  const raw = Array.isArray(genres)
    ? genres
    : String(genres || "").split(/[,;|]+/);

  return [...new Set(
    raw
      .map(g => String(g || "").toLowerCase().trim())
      .filter(Boolean)
  )].sort();
}

/**
 * Jaccard similarity between two genre arrays (already normalised).
 * Returns a value in [0, 1]. 1 = identical, 0 = disjoint.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number}
 */
export function computeOverlap(a = [], b = []) {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const g of setA) {
    if (setB.has(g)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Compute the signed confidence delta between the two source claims.
 * Positive means the analytics source leads; negative means the stated source leads.
 *
 * delta = (analyticsConfidence * analyticsWeight) - (statedConfidence * statedWeight)
 *
 * @param {{ confidence?: number, source_type?: string }} analyticsClaim
 * @param {{ confidence?: number, source_type?: string }} statedClaim
 * @returns {number}  value in approximately [-1, 1]
 */
export function computeConfidenceDelta(analyticsClaim = {}, statedClaim = {}) {
  const analyticsConf = typeof analyticsClaim.confidence === "number"
    ? Math.max(0, Math.min(1, analyticsClaim.confidence))
    : 0.5;
  const statedConf = typeof statedClaim.confidence === "number"
    ? Math.max(0, Math.min(1, statedClaim.confidence))
    : 0.5;

  const analyticsWeight = sourceTypeWeight(analyticsClaim.source_type || "media-playback");
  const statedWeight    = sourceTypeWeight(statedClaim.source_type    || "social-community");

  return (analyticsConf * analyticsWeight) - (statedConf * statedWeight);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Detect and report a music taste conflict between a media-playback (listening
 * history) claim and a social-community (self-reported bio) claim.
 *
 * @param {object} analyticsClaim  — Memory record from Spotify / listening history
 *   @property {string|string[]} genres      — Inferred genres from streams
 *   @property {number}          [confidence]
 *   @property {string}          [source_type]  defaults to "media-playback"
 *   @property {string}          [source_label] human-readable source name (e.g. "Spotify")
 *
 * @param {object} statedClaim     — Memory record from Discord bio / social profile
 *   @property {string|string[]} genres      — Self-reported genre preferences
 *   @property {number}          [confidence]
 *   @property {string}          [source_type]   defaults to "social-community"
 *   @property {string}          [source_label]  human-readable source name (e.g. "Discord")
 *
 * @param {object} [options]
 *   @property {number} [overlapThreshold]  — Jaccard threshold below which conflict is raised (default 0.35)
 *   @property {number} [deltaThreshold]    — Min |delta| to surface the conflict (default 0.20)
 *
 * @returns {object|null}  A conflict report object, or null if no meaningful conflict detected.
 */
export function detectMusicTasteConflict(analyticsClaim = {}, statedClaim = {}, options = {}) {
  const overlapThreshold = typeof options.overlapThreshold === "number"
    ? options.overlapThreshold
    : CONFLICT_OVERLAP_THRESHOLD;

  const deltaThreshold = typeof options.deltaThreshold === "number"
    ? options.deltaThreshold
    : CONFLICT_DELTA_THRESHOLD;

  // Normalise genre lists from both sources
  const analyticsGenres = normaliseGenres(analyticsClaim.genres || []);
  const statedGenres    = normaliseGenres(statedClaim.genres    || []);

  // Cannot determine a conflict with no data on either side
  if (analyticsGenres.length === 0 && statedGenres.length === 0) return null;

  const overlap = computeOverlap(analyticsGenres, statedGenres);
  const delta   = computeConfidenceDelta(analyticsClaim, statedClaim);

  const analyticsSourceLabel = String(analyticsClaim.source_label || analyticsClaim.source_type || "listening history").trim();
  const statedSourceLabel    = String(statedClaim.source_label    || statedClaim.source_type    || "self-reported bio").trim();

  // Conflict exists when genre sets diverge AND confidence delta is significant
  const isConflict = overlap < overlapThreshold && Math.abs(delta) >= deltaThreshold;

  if (!isConflict) return null;

  // Genres present in analytics but not stated ("hidden" listening)
  const statedSet   = new Set(statedGenres);
  const analyticsSet = new Set(analyticsGenres);
  const onlyInAnalytics = analyticsGenres.filter(g => !statedSet.has(g));
  const onlyInStated    = statedGenres.filter(g => !analyticsSet.has(g));

  // The leading source is the one whose weighted confidence is higher
  const analyticsWeightedConf =
    (typeof analyticsClaim.confidence === "number" ? analyticsClaim.confidence : 0.5) *
    sourceTypeWeight(analyticsClaim.source_type || "media-playback");
  const statedWeightedConf =
    (typeof statedClaim.confidence === "number" ? statedClaim.confidence : 0.5) *
    sourceTypeWeight(statedClaim.source_type || "social-community");

  const leadingSource = analyticsWeightedConf >= statedWeightedConf
    ? analyticsSourceLabel
    : statedSourceLabel;

  return {
    conflict_type: "music_taste_contradiction",
    // Human-readable summary for the contradiction suggestion
    summary: `Your ${analyticsSourceLabel} listening history suggests different music tastes than what your ${statedSourceLabel} profile states. Which one better represents you?`,
    // Machine-readable details
    analytics_source: analyticsSourceLabel,
    stated_source:    statedSourceLabel,
    analytics_genres: analyticsGenres,
    stated_genres:    statedGenres,
    genres_only_in_analytics: onlyInAnalytics,
    genres_only_in_stated:    onlyInStated,
    overlap_score:            Number(overlap.toFixed(3)),
    confidence_delta:         Number(delta.toFixed(3)),
    leading_source:           leadingSource,
    // Lifecycle metadata for shapeContextProposal integration
    requires_user_review: true,
    suggested_lifecycle_action: "contradict",
    // Fields for the contradiction proposal surface
    contradiction_proposal: {
      field_path: "music.taste_conflict",
      category:   "music-streaming",
      sensitivity: "low",
      requires_approval: true,
      options: [
        {
          label: `Trust ${analyticsSourceLabel} (listening history)`,
          value: "analytics",
          genres: analyticsGenres,
          confidence: analyticsClaim.confidence ?? 0.5,
          source_weight: sourceTypeWeight(analyticsClaim.source_type || "media-playback")
        },
        {
          label: `Trust ${statedSourceLabel} (self-reported)`,
          value: "stated",
          genres: statedGenres,
          confidence: statedClaim.confidence ?? 0.5,
          source_weight: sourceTypeWeight(statedClaim.source_type || "social-community")
        }
      ]
    }
  };
}

/**
 * Resolve a previously detected music taste conflict based on the user's
 * chosen option ("analytics" or "stated"), returning the accepted genre list
 * and a resolution record for audit purposes.
 *
 * @param {object} conflictReport  — Result of detectMusicTasteConflict()
 * @param {"analytics"|"stated"} userChoice
 * @returns {object}  Resolution record with accepted_genres and lifecycle_action
 */
export function resolveMusicTasteConflict(conflictReport = {}, userChoice = "analytics") {
  if (!conflictReport || conflictReport.conflict_type !== "music_taste_contradiction") {
    throw new TypeError("resolveMusicTasteConflict: first argument must be a valid conflict report");
  }

  const choice = String(userChoice || "analytics").toLowerCase().trim();
  if (choice !== "analytics" && choice !== "stated") {
    throw new RangeError(`resolveMusicTasteConflict: userChoice must be "analytics" or "stated", got "${choice}"`);
  }

  const accepted_genres = choice === "analytics"
    ? conflictReport.analytics_genres
    : conflictReport.stated_genres;

  const rejected_source = choice === "analytics"
    ? conflictReport.stated_source
    : conflictReport.analytics_source;

  return {
    conflict_type:      conflictReport.conflict_type,
    resolution:         choice,
    accepted_genres,
    rejected_source,
    lifecycle_action:   "user_confirmed",
    resolved_at:        new Date().toISOString(),
    field_path:         "music.taste_preferences",
    category:           "music-streaming",
    requires_approval:  false,
    audit_summary:      `User resolved music taste conflict by trusting ${choice === "analytics" ? conflictReport.analytics_source : conflictReport.stated_source}. Rejected: ${rejected_source}.`
  };
}
