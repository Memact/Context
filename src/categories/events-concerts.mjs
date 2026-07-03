/**
 * Memact Context - Events & Concerts Category
 * 
 * Important product rule: Activity is not identity. 
 * A single concert attended should not become a permanent claim about preferred venues or budgets.
 */

export const category = "events-concerts";

// Fields specifically requested in Issue #65
export const contextFields = [
  "preferred_venues",
  "ticket_price_range",
  "preferred_days",
  "favorite_genres",
  "seating_preference"
];

export const DURABLE_PREFERENCES = new Set(contextFields);

/**
 * Normalizes a live event or preference submission into a Memact context payload.
 */
export function normalizeEventsConcertsContext(input) {
  if (!input || !input.data) return null;

  const { source, type, data, explicit = false } = input;

  // Handle Activity (e.g., bought a ticket / attended a show)
  if (type === "activity") {
    const venueName = data.venue || "a venue";
    const summary = `Attended a live event at ${venueName}`;
    
    return {
      category,
      source,
      observation_type: "weak_observation",
      confidence: "low",
      is_identity_claim: false,
      visibility: "private",
      observation: summary,
      suggestion: `You recently attended an event at ${venueName}. Do you want to add this to your preferred venues?`,
      needs_review: true
    };
  }

  // Handle Explicit or Inferred Preferences
  if (type === "preference") {
    const preferences = {};
    for (const [k, v] of Object.entries(data)) {
      if (DURABLE_PREFERENCES.has(k)) {
        preferences[k] = v;
      }
    }

    return {
      category,
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      is_identity_claim: explicit,
      visibility: "private",
      data: preferences,
      suggestion: explicit ? null : `Would you like to save these live event preferences?`,
      needs_review: !explicit
    };
  }

  return {
    category,
    source,
    observation_type: "unknown",
    confidence: "low"
  };
}

export const rawInputExamples = {
  explicit_preference: {
    source: "TicketMaster Profile",
    type: "preference",
    explicit: true,
    data: {
      preferred_venues: ["Red Rocks Amphitheatre", "The Gorge"],
      ticket_price_range: "$50-$150",
      preferred_days: ["Friday", "Saturday"]
    }
  },
  activity_event: {
    source: "BandsInTown",
    type: "activity",
    explicit: false,
    data: {
      venue: "Local Arena",
      event_type: "Rock Concert"
    }
  }
};

export const proposalOutputExamples = {
  explicit_preference_result: normalizeEventsConcertsContext(rawInputExamples.explicit_preference),
  activity_event_result: normalizeEventsConcertsContext(rawInputExamples.activity_event)
};