/**
 * Memact Context - Health and Vitality Category
 */

export const category = "health";

export const contextFields = {
  activity_log: { description:"General fitness or movement logs (e.g., walked, cycled)", 
                 variance_threshold_log: 0.40},
  sleep_session: { description: "Sleep tracking events and duration", variance_threshold_sleep: 150},
  hydration_log: { description:"Water intake logs", variance_threshold_hydration: 150},
  wellness_focus: {description: "General wellness goals (e.g., better sleep, active lifestyle)"}
};

function parseSleepToMinutes(sleepStr) {
  if (!sleepStr || typeof sleepStr !== 'string') return null;
  const hours = parseInt(sleepStr.match(/(\d+)\s*hour/)?.[1] || 0);
  const mins = parseInt(sleepStr.match(/(\d+)\s*minute/)?.[1] || 0);
  return (hours * 60) + mins;
}

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
  let discrepancyDetected = false;
  let customSuggestion = null;

  if (baseline) {
    // Evaluating Sleep Discrepancies
    if (cleanedData.sleep_session && baseline.avg_sleep_minutes) {
      const incomingMins = parseSleepToMinutes(cleanedData.sleep_session);
      if (incomingMins) {
        const variance = Math.abs(incomingMins - baseline.avg_sleep_minutes);
        if (variance > contextFields.sleep_session.variance_threshold_sleep) {
          discrepancyDetected = true;
          customSuggestion = "This sleep duration is a sharp deviation from your recent baseline cycle. Log as anomaly?";
        }
      }
    }
    if (cleanedData.duration_minutes && baseline.avg_activity_minutes) {
      const floor = baseline.avg_activity_minutes * contextFields.activity_log.variance_threshold_log;
      if (cleanedData.duration_minutes < floor) {
        discrepancyDetected = true;
        customSuggestion = "This activity session is significantly shorter than your typical logged intensity.";
      }
    }
  }

  // 2. Transient Activity Handling (Activity is not identity)
  if (type === "activity") {
    return {
      category: "health",
      source,
      observation_type: discrepancyDetected ? "anomaly_observation" : "weak_observation",
      confidence: discrepancyDetected ? "low" : "medium",
      visibility: "private", // Default visibility MUST be Private
      is_identity_claim: false,
      data: cleanedData,
      suggestion:customSuggestion || "You recently logged a health activity. Do you want to track this wellness goal?",
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
