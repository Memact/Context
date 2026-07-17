/**
 * Memact Context - Food Delivery Category
 */

export const category = "food-delivery";

export const contextFields = {
  restaurant_name: "Name of the restaurant or food outlet",
  items_ordered: "List of food items ordered",
  cuisine_type: "Type of cuisine (e.g. Indian, Chinese, Italian)",
  order_total: "Total price of the order",
  delivery_time: "Estimated or actual delivery time in minutes",
  platform: "App used for ordering (e.g. Swiggy, Zomato, Uber Eats)",
  order_type: "Delivery or pickup",
  occasion: "Reason for order if known (e.g. late night, lunch, party)",
  shared_order: "Whether the order was shared with others",
};

// --- NEW PRIVACY GUARDRAILS FOR PR #44 ---

export const sensitiveFieldRules = new Set([
  "delivery_address",
  "exact_location",
  "credit_card_hash",
  "payment_details",
  "demographics"
]);

export const HIGH_SENSITIVITY_INFERENCES = new Set([
  "food_allergies",
  "dietary_restrictions",
  "health_conditions",
  "religious_restrictions"
]);

export function normalizeFoodDeliveryContext(input) {
  if (!input || !input.data) return null;

  const { source, type, data, explicit = false } = input;

  // 1. Strict Privacy Guardrails: Drop sensitive address/payment fields completely
  const cleanedData = { ...data };
  for (const key of Object.keys(cleanedData)) {
    if (sensitiveFieldRules.has(key)) {
      delete cleanedData[key];
    }
  }

  // 2. Quarantine High-Sensitivity Inferences (Allergies, religious restrictions)
  const hasHighSensitivity = Object.keys(cleanedData).some(key => HIGH_SENSITIVITY_INFERENCES.has(key));

  if (hasHighSensitivity && !explicit) {
    return {
      category: "food-delivery",
      source,
      observation_type: "quarantined_inference",
      confidence: "low",
      is_identity_claim: false,
      data: cleanedData,
      status: "pending_user_confirmation",
      needs_review: true,
      suggestion: "We noticed potential specific dietary requirements. Would you like to save these restrictions to your profile?"
    };
  }

  // 3. Standard Activity & Preference Handling
  return {
    category: "food-delivery",
    source,
    observation_type: type === "preference" ? (explicit ? "explicit_preference" : "inferred_preference") : "activity",
    confidence: explicit ? "high" : "medium",
    is_identity_claim: type === "preference" && explicit,
    data: cleanedData,
    status: "active",
    needs_review: !explicit
  };
}

// --- EXISTING EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "swiggy.com",
    items: ["Butter Chicken", "Naan", "Gulab Jamun"],
    restaurant: "Punjabi Tadka",
    total: 450,
    delivery_minutes: 35,
  },
  {
    source: "zomato.com",
    items: ["Margherita Pizza"],
    restaurant: "Pizza Hut",
    total: 299,
    delivery_minutes: 45,
  },
  {
    source: "zomato.com",
    items: ["Biryani"],
    restaurant: "Bawarchi",
    total: 180,
    delivery_minutes: 30,
    note: "ordered for office team",
  },
];

export const normalizedOutputExamples = [
  {
    category: "food-delivery",
    restaurant_name: "Punjabi Tadka",
    cuisine_type: "Indian",
    items_ordered: ["Butter Chicken", "Naan", "Gulab Jamun"],
    order_total: 450,
    delivery_time: 35,
    platform: "swiggy.com",
    shared_order: false,
    occasion: "unknown",
  },
  {
    category: "food-delivery",
    restaurant_name: "Pizza Hut",
    cuisine_type: "Italian",
    items_ordered: ["Margherita Pizza"],
    order_total: 299,
    delivery_time: 45,
    platform: "zomato.com",
    shared_order: false,
    occasion: "unknown",
  },
  {
    category: "food-delivery",
    restaurant_name: "Bawarchi",
    cuisine_type: "Indian",
    items_ordered: ["Biryani"],
    order_total: 180,
    delivery_time: 30,
    platform: "zomato.com",
    shared_order: true,
    occasion: "office",
  },
];

export const wikiEntryTemplates = [
  "Ordered {{items_ordered}} from {{restaurant_name}} via {{platform}}.",
  "Had {{cuisine_type}} food delivered in {{delivery_time}} minutes.",
  "Placed a food order totalling {{order_total}} from {{restaurant_name}}.",
];

export const permissionSuggestions = {
  restaurant_name: "low",
  items_ordered: "medium",
  order_total: "high",
  delivery_time: "low",
  platform: "low",
  shared_order: "medium",
  occasion: "medium",
};

export const careNotes = [
  "Do not treat a single order as a stable food preference.",
  "Shared orders should not be attributed to one user's taste.",
  "Temporary cravings and one-off orders must not build long-term preferences.",
  "Avoid inferring dietary restrictions from a single data point.",
  "late night orders may be situational, not habitual.",
  "Sensitive fields like exact locations and payment details must be explicitly dropped.",
  "High-sensitivity inferences like allergies require explicit manual consent."
];
