/**
 * Memact Context - Dining and Restaurants Preferences Category
 */

export const category = "dining";

export const contextFields = {
  preferred_cuisines: "Favorite types of food or restaurants (e.g., Italian, Japanese, Vegan)",
  dietary_restrictions: "Allergies or strict diets (e.g., gluten-free, peanut allergy)",
  dining_budget: "Typical spending level for eating out (e.g., $, $$, $$$)"
};

// Dietary restrictions are highly sensitive and should be carefully managed
export const SENSITIVE_FIELDS = new Set([
  "dietary_restrictions"
]);

export function normalizeDiningContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Transient Signals: A single group dinner or trying a new place shouldn't override dietary rules
  if (type === "activity") {
    return {
      category: "dining",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", 
      is_identity_claim: false,
      data: { ...data },
      suggestion: `You recently dined at a ${data.cuisine_type || 'restaurant'}. Do you want to add this to your preferred cuisines?`,
      needs_review: true
    };
  }

  // Durable Preference Handling
  if (type === "preference") {
    return {
      category: "dining",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private", 
      is_identity_claim: explicit,
      data: { ...data },
      suggestion: explicit ? null : "Update your dining preferences based on recent choices?",
      needs_review: !explicit
    };
  }

  return { category: "dining", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "restaurant_reservation_app",
    type: "preference",
    data: {
      preferred_cuisines: ["Italian", "Japanese"],
      dietary_restrictions: ["Vegetarian"],
      dining_budget: "$$"
    }
  },
  {
    source: "payment_history",
    type: "activity",
    data: {
      action: "dine_out",
      cuisine_type: "Steakhouse",
      context: "group dinner"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "dining",
    preferred_cuisines: ["Italian", "Japanese"],
    dietary_restrictions: ["Vegetarian"],
    dining_budget: "$$"
  }
];

export const proposalOutputExamples = [
  "Prefers {{preferred_cuisines}} cuisines.",
  "Has specific dietary requirements: {{dietary_restrictions}}.",
  "Typically searches for {{dining_budget}} dining options."
];