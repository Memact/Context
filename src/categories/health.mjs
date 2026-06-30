/**
 * Memact Context - Health and Vitality Category
 */

export const category = "health";

export const contextFields = {
  activity_log: "General fitness or movement logs (e.g., walked, cycled)",
  sleep_session: "Sleep tracking events and duration",
  hydration_log: "Water intake logs",
  wellness_focus: "General wellness goals (e.g., better sleep, active lifestyle)"
};

// Strict Privacy Boundary: These must NEVER become durable memory by default
export const SENSITIVE_FIELDS = new Set([
  "heart_rate",
  "blood_pressure",
  "weight",
  "medical_diagnosis",
  "blood_sugar",
  "oxygen_saturation"
]);

export function normalizeHealthContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // 1. Strict Privacy Guardrails: Drop highly sensitive medical/vital data completely
  const cleanedData = { ...data };
  for (const key of Object.keys(cleanedData)) {
    if (SENSITIVE_FIELDS.has(key)) {
      delete cleanedData[key];
    }
  }

  // 2. Transient Activity Handling (Activity is not identity)
  if (type === "activity") {
    return {
      category: "health",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Default visibility MUST be Private
      is_identity_claim: false,
      data: cleanedData,
      suggestion: "You recently logged a health activity. Do you want to track this wellness goal?",
      needs_review: true
    };
  }

  // 3. Durable Preference Handling
  if (type === "preference") {
    return {
      category: "health",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private", // Default visibility MUST be Private
      is_identity_claim: explicit,
      data: cleanedData,
      suggestion: explicit ? null : "Update your wellness goals based on recent logs?",
      needs_review: !explicit
    };
  }

  return { category: "health", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "apple_health",
    type: "activity",
    data: {
      activity_log: "Outdoor Run",
      duration_minutes: 45,
      heart_rate: 155 // Should be dropped
    }
  },
  {
    source: "sleep_cycle",
    type: "activity",
    data: {
      sleep_session: "8 hours 12 minutes",
      quality: "good"
    }
  },
  {
    source: "water_minder",
    type: "activity",
    data: {
      hydration_log: "500ml"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "health",
    activity_log: "Outdoor Run",
    duration_minutes: 45
    // Note: heart_rate is intentionally omitted
  },
  {
    category: "health",
    sleep_session: "8 hours 12 minutes",
    quality: "good"
  }
];

export const proposalOutputExamples = [
  "Maintains an active lifestyle with {{activity_log}}.",
  "Regularly tracks sleep sessions.",
  "Actively monitors hydration levels."
];

export const permissionSuggestions = {
  activity_log: "medium",
  sleep_session: "high",
  hydration_log: "low",
  wellness_focus: "medium"
};