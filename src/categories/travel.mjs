/**
 * Memact Context - Travel Category
 * 
 * Core Rule: Activity is not identity. 
 * Exact GPS/locations are dropped. One-off searches are weak observations.
 */

export const SENSITIVE_FIELDS = new Set([
  "current_gps",
  "exact_location",
  "passenger_id",
  "passport_number"
]);

export const DURABLE_PREFERENCES = new Set([
  "tripStyle",
  "preferredStayType",
  "budgetRangeSignal",
  "transportationModes",
  "destinationInterests"
]);

export function normalizeTravelContext(input) {
  if (!input || !input.data) return null;

  const { source, type, data, explicit = false } = input;

  // 1. Privacy Safety Check (Drop exact locations/sensitive data)
  const hasSensitive = Object.keys(data).some(key => SENSITIVE_FIELDS.has(key));
  
  // Clean data copy without sensitive leakage
  const cleanedData = { ...data };
  SENSITIVE_FIELDS.forEach(field => delete cleanedData[field]);

  if (hasSensitive && !explicit) {
    return {
      category: "travel",
      source,
      status: "rejected",
      reason: "Sensitive location tracking or personal IDs require explicit user consent."
    };
  }

  // 2. Activity / One-off signals handling
  if (type === "activity") {
    return {
      category: "travel",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility:"private",
      is_identity_claim: false,
      observation: `Interacted with travel system${data.destination ? ` for ${data.destination}` : ""}`,
      suggestion: generateUserReadableSuggestion(type, cleanedData),
      needs_review: true
    };
  }

  // 3. Preference handling
  if (type === "preference") {
    const preferences = {};
    for (const [k, v] of Object.entries(cleanedData)) {
      if (DURABLE_PREFERENCES.has(k)) {
        preferences[k] = v;
      }
    }

    return {
      category: "travel",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      preferences,
      suggestion: explicit ? null : generateUserReadableSuggestion("preference", cleanedData),
      needs_review: !explicit
    };
  }

  return { category: "travel", source, observation_type: "unknown", confidence: "low" };
}

export function generateUserReadableSuggestion(type, data) {
  if (type === "activity" && data.preferredStayType) {
    return `You recently searched for ${data.preferredStayType}s. Save this as your travel preference?`;
  }
  if (data.tripStyle) {
    return `Set your default travel style to '${data.tripStyle}'?`;
  }
  return "Would you like to update your travel preferences based on recent activity?";
}
