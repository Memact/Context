/**
 * Memact Context - Video Streaming Category
 */

export const STREAMING_PREFERENCES = new Set([
  "favorite_genres",
  "preferred_languages",
  "frequent_creators_or_channels",
  "preferred_content_length"
]);

export function normalizeVideoStreamingContext(input) {
  if (!input || !input.data) return null;

  const { source, type, data, explicit = false } = input;

  // Handle temporary background viewing activity (Weak Signal)
  if (type === "activity") {
    return {
      category: "video-streaming",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      is_identity_claim: false,
      observation: `Watched content${data.genre ? ` in ${data.genre}` : ""}`,
      needs_review: true,
      suggestion: "You've been watching videos in this category. Would you like to add it to your profile?"
    };
  }

  // Handle profile preferences
  if (type === "preference") {
    const preferences = {};
    for (const [k, v] of Object.entries(data)) {
      if (STREAMING_PREFERENCES.has(k)) {
        preferences[k] = v;
      }
    }

    // Evaluate risk metrics (e.g., potential shared family accounts / profile swapping)
    const hasSharedProfileRisk = data.completion_rate < 0.5 || data.abrupt_stop === true;

    return {
      category: "video-streaming",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: hasSharedProfileRisk ? "low" : (explicit ? "high" : "medium"),
      is_identity_claim: explicit && !hasSharedProfileRisk,
      preferences,
      needs_review: !explicit || hasSharedProfileRisk
    };
  }

  return { category: "video-streaming", source, observation_type: "unknown", confidence: "low" };
}