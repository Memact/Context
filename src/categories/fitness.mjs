/**
 * Memact Context - Fitness Category
 * 
 * Important product rule: Activity is not identity. 
 * A single workout, meal, skipped plan, or temporary diet choice should not become a permanent claim about the user.
 * 
 * NutriPlan Lite Compatibility:
 * This category supports onboarding fields like:
 * - goal
 * - dietary preference
 * - allergies or restrictions
 * - activity level
 * - preferred workout type
 */

// Sensitive or careful fields clearly marked
export const SENSITIVE_FIELDS = new Set([
  "allergies",
  "health_conditions",
  "body_metrics",
  "medical_restrictions"
]);

export const DURABLE_PREFERENCES = new Set([
  "goal",
  "dietary_preference",
  "activity_level",
  "preferred_workout_type",
  "equipment_available",
  "schedule_preference",
  "meal_planning_preference"
]);

/**
 * Normalizes a fitness event or preference submission into a Memact context payload.
 * 
 * @param {Object} input - Raw app input
 * @param {string} input.source - Source app (e.g., "NutriPlan Lite")
 * @param {string} input.type - "preference" | "activity" | "meal"
 * @param {Object} input.data - The event or preference payload
 * @param {boolean} input.explicit - Whether the user explicitly provided this in a form
 */
export function normalizeFitnessContext(input) {
  if (!input || !input.data) return null;

  const { source, type, data, explicit = false } = input;

  // 1. Safeguard Sensitive Data
  // Allergies/restrictions require explicit user-provided or user-approved memory.
  const hasSensitive = Object.keys(data).some(key => SENSITIVE_FIELDS.has(key));
  if (hasSensitive && !explicit) {
    return {
      category: "fitness",
      source,
      status: "rejected",
      reason: "Sensitive fields (like allergies) cannot be inferred from activity. They require explicit user consent."
    };
  }

  // 2. Handle Activity & Meals (Activity is not identity)
  if (type === "activity" || type === "meal") {
    // We do not preserve raw private details (like exact gps, heart rate, or exact calories) when a summary is enough.
    const summary = type === "activity" 
      ? `Completed a ${data.workout_type || 'workout'}`
      : `Logged a ${data.meal_type || 'meal'}`;

    return {
      category: "fitness",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      is_identity_claim: false,
      observation: summary,
      suggestion: generateUserReadableSuggestion(type, data),
      needs_review: true // Users decide what stays
    };
  }

  // 3. Handle Preferences (Onboarding)
  if (type === "preference") {
    const preferences = {};
    for (const [k, v] of Object.entries(data)) {
      if (DURABLE_PREFERENCES.has(k) || SENSITIVE_FIELDS.has(k)) {
        preferences[k] = v;
      }
    }

    return {
      category: "fitness",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      is_identity_claim: explicit, // Only true if user explicitly provided it
      preferences,
      suggestion: explicit ? null : generateUserReadableSuggestion("preference", data),
      needs_review: !explicit
    };
  }

  return {
    category: "fitness",
    source,
    observation_type: "unknown",
    confidence: "low"
  };
}

/**
 * Generates user-readable Wiki/memory suggestion templates.
 */
export function generateUserReadableSuggestion(type, data) {
  if (type === "activity" && data.workout_type) {
    return `You've recently completed a ${data.workout_type} workout. Would you like to add '${data.workout_type}' to your preferred workout types?`;
  }
  if (type === "meal" && data.diet_type) {
    return `You recently logged a ${data.diet_type} meal. Would you like to save '${data.diet_type}' as a dietary preference?`;
  }
  if (type === "preference" && data.goal) {
    return `Would you like to set your current fitness goal to '${data.goal}'?`;
  }
  return "Would you like to update your fitness memory based on recent activity?";
}

/**
 * Examples to serve as Documentation
 */
export const FITNESS_EXAMPLES = {
  rawAppInputs: {
    explicit_onboarding: {
      source: "NutriPlan Lite",
      type: "preference",
      explicit: true,
      data: {
        goal: "weight loss",
        dietary_preference: "vegetarian",
        allergies: ["peanuts"],
        activity_level: "moderate",
        preferred_workout_type: "yoga"
      }
    },
    inferred_allergy_unsafe: {
      source: "NutriPlan Lite",
      type: "activity",
      explicit: false,
      data: {
        workout_type: "strength",
        allergies: ["gluten"] // App inferred this because user skipped bread
      }
    },
    one_off_activity: {
      source: "NutriPlan Lite",
      type: "activity",
      explicit: false,
      data: {
        workout_type: "strength",
        duration: 45,
        avg_heart_rate: 150 // Should be dropped in summary
      }
    }
  },
  normalizedOutputs: {
    explicit_onboarding_result: {
      category: "fitness",
      source: "NutriPlan Lite",
      observation_type: "explicit_preference",
      confidence: "high",
      is_identity_claim: true,
      preferences: {
        goal: "weight loss",
        dietary_preference: "vegetarian",
        allergies: ["peanuts"],
        activity_level: "moderate",
        preferred_workout_type: "yoga"
      },
      suggestion: null,
      needs_review: false
    },
    one_off_activity_result: {
      category: "fitness",
      source: "NutriPlan Lite",
      observation_type: "weak_observation",
      confidence: "low",
      is_identity_claim: false,
      observation: "Completed a strength",
      suggestion: "You've recently completed a strength workout. Would you like to add 'strength' to your preferred workout types?",
      needs_review: true
    }
  }
};
