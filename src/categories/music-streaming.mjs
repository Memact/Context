/**
 * Memact Context - Music Streaming Category
 */

export const category = "music-streaming";

export const contextFields = {
  favorite_genres: "List of highly played genres",
  favorite_artists: "List of most played artists or composers",
  listening_context: "Situational listening habits (e.g., focus, workout, sleep)",
  skipped_styles: "Genres or artists explicitly disliked or frequently skipped",
  track_history: "Recent tracks played"
};

export const SENSITIVE_FIELDS = new Set([
  "exact_gps_at_playback",
  "biometric_response" 
]);

export function normalizeMusicContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Drop any sensitive fields (like exact GPS mapped to playback)
  const cleanedData = { ...data };
  SENSITIVE_FIELDS.forEach(field => delete cleanedData[field]);

  // Transient signals (Activity is not identity)
  // E.g., skipping a song once, or just casually clicking a playlist
  if (type === "activity") {
    const isSkip = data.action === 'skip';
    
    return {
      category: "music-streaming",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Default Private
      is_identity_claim: false,
      data: cleanedData,
      suggestion: isSkip 
        ? "You skipped this track. Do you want to avoid this style in the future?" 
        : `You recently listened to ${data.track || 'some music'}. Add this to your favorites?`,
      needs_review: true
    };
  }

  // Durable preference handling
  if (type === "preference") {
    return {
      category: "music-streaming",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private", // Default Private
      is_identity_claim: explicit,
      data: cleanedData,
      suggestion: explicit ? null : "Update your music preferences based on recent listening habits?",
      needs_review: !explicit
    };
  }

  return { category: "music-streaming", source, observation_type: "unknown", confidence: "low" };
}

// --- DECLARATIVE EXAMPLES ---

export const rawInputExamples = [
  {
    source: "spotify.com",
    type: "preference",
    data: {
      favorite_artists: ["Diljit Dosanjh", "Kishore Kumar"],
      favorite_genres: ["Bollywood", "Pop"],
      listening_context: "workout"
    }
  },
  {
    source: "applemusic.com",
    type: "activity",
    data: {
      action: "skip",
      track: "Heartbreak Kid",
      genre: "Indie"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "music-streaming",
    favorite_artists: ["Diljit Dosanjh", "Kishore Kumar"],
    favorite_genres: ["Bollywood", "Pop"],
    listening_context: "workout"
  }
];

export const proposalOutputExamples = [
  "Enjoys listening to {{favorite_genres}} music while focusing.",
  "Frequently listens to {{favorite_artists}} during workouts.",
  "Prefers to avoid {{skipped_styles}}."
];