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

  let normalizedResult;

  // Transient signals (Activity is not identity)
  if (type === "activity") {
    const isSkip = data.action === 'skip';
    
    normalizedResult = {
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
  else if (type === "preference") {
    normalizedResult = {
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
  } else {
    normalizedResult = { category: "music-streaming", source, observation_type: "unknown", confidence: "low" };
  }

  // --- NEW: Context Query Tracer ---
  // The issue specifically requests tracing for Spotify dynamic playlist queries
  if (source && source.toLowerCase().includes("spotify")) {
    const tracePayload = {
      event: "SPOTIFY_DYNAMIC_PLAYLIST_QUERY",
      timestamp: new Date().toISOString(),
      query_parameters: cleanedData,
      matching_weight: normalizedResult.confidence, 
      observation_type: normalizedResult.observation_type
    };
    
    // Outputting as a structured JSON string to stdout is standard for log ingestion 
    console.info(JSON.stringify(tracePayload));
  }

  return normalizedResult;
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

export const sensitiveFieldRules = {
  track_history: {
    sensitive: true,
    permanent: false,
    approval_required: true,
    expires_after_days: 7
  },
  biometric_response: {
    sensitive: true,
    permanent: false,
    action: "drop"
  },
  exact_gps_at_playback: {
    sensitive: true,
    permanent: false,
    action: "drop"
  },
  skipped_styles: {
    sensitive: true,
    permanent: false,
    approval_required: false,
    expires_after_days: 30
  }
};

export const permissionSuggestions = {
  favorite_genres: "low",
  favorite_artists: "low",
  listening_context: "low",
  skipped_styles: "medium",
  track_history: "high"
};

export const careNotes = [
  "A single listen or skip is not a preference and must not become a permanent identity label.",
  "Do not infer mood, emotional state, or mental health from listening patterns.",
  "Skipping a track is a weak signal and should not immediately blacklist a genre or artist.",
  "Listening context (e.g. sleep, focus) can be sensitive and must not be used to track daily routines without consent."
];
export const wikiEntryTemplates = [
  "Enjoys listening to {{favorite_genres}} music while focusing.",
  "Frequently listens to {{favorite_artists}} during workouts.",
  "Prefers to avoid {{skipped_styles}}."
];

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = [];
  const data = normalizedContext.data || normalizedContext.preferences || normalizedContext.attributes || normalizedContext;
  
  const genres = data.favorite_genres || data.preferred_genres;
  const artists = data.favorite_artists || data.frequent_artists;
  const skipped = data.skipped_styles || data.skipped_topics;

  if (genres && genres.length > 0) {
    proposals.push({
      id: "wiki_music_genres",
      type: "preference",
      sub_type: "genres",
      proposed_text: `Enjoys listening to ${genres.join(", ")} music while focusing.`,
      confidence: 0.8,
      requires_user_confirmation: false
    });
  }

  if (artists && artists.length > 0) {
    proposals.push({
      id: "wiki_music_artists",
      type: "preference",
      sub_type: "artists",
      proposed_text: `Frequently listens to ${artists.join(", ")} during workouts.`,
      confidence: 0.8,
      requires_user_confirmation: false
    });
  }

  if (skipped && skipped.length > 0) {
    proposals.push({
      id: "wiki_music_skipped",
      type: "preference",
      sub_type: "skipped_styles",
      proposed_text: `Prefers to avoid ${skipped.join(", ")}.`,
      confidence: 0.75,
      requires_user_confirmation: true
    });
  }

  return proposals;
}
