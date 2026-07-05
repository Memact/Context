/**
 * Memact Context - Weather and Local Settings Category
 */

export const category = "weather-settings";

export const contextFields = {
  temp_unit_scale: "Preferred temperature scale (Celsius, Fahrenheit)",
  alert_thresholds: "Severe weather alert sensitivity levels",
  briefing_delivery: "Daily weather briefing preferences (time, format)"
};

export function normalizeWeatherContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Weather settings are typically durable preferences, not transient activities
  if (type === "preference") {
    return {
      category: "weather-settings",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      data: { ...data },
      suggestion: explicit ? null : "Update your weather briefing settings?",
      needs_review: !explicit
    };
  }

  return { category: "weather-settings", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "weather_app",
    type: "preference",
    data: {
      temp_unit_scale: "Celsius",
      alert_thresholds: "moderate",
      briefing_delivery: "08:00 AM"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "weather-settings",
    temp_unit_scale: "Celsius",
    alert_thresholds: "moderate",
    briefing_delivery: "08:00 AM"
  }
];

export const proposalOutputExamples = [
  "Displays temperatures in {{temp_unit_scale}}.",
  "Set to receive severe weather alerts at {{alert_thresholds}} threshold.",
  "Receives daily weather briefings at {{briefing_delivery}}."
];