export const category = "food-dining";

export const contextFields = {
  preferred_cuisines: "Stable cuisine types the user repeatedly chooses or favorites.",
  favorite_restaurants: "Specific restaurants the user frequently orders from or saves.",
  dietary_preferences: "Explicit or highly consistent dietary habits (e.g., Vegan, Gluten-Free, Halal).",
  disliked_ingredients: "Ingredients the user consistently removes or avoids.",
  spice_level: "Preferred spice tolerance across multiple orders.",
  frequent_orders: "Specific items ordered repeatedly.",
  active_cravings: "Temporary desires or current session searches.",
  cart_items: "Current food items in a cart.",
  order_occasion: "Context of the current meal: solo, group, party, business, or unknown."
};

export const sensitiveFieldRules = {
  dietary_preferences: {
    sensitive: true,
    permanent: true,
    approval_required: true
  },
  health_inferences: {
    sensitive: true,
    permanent: false,
    action: "drop"
  },
  abandoned_carts: {
    sensitive: true,
    permanent: false,
    approval_required: true,
    expires_after_days: 1
  }
};

export const rawInputExamples = [
  {
    user_id: "u_789",
    recent_orders: ["Pepperoni Pizza", "Garlic Bread", "Wings"],
    search_queries: ["late night pizza delivery"],
    saved_restaurants: ["Joe's Pizza"],
    preferred_cuisines: ["Italian"],
    cart_items: ["2L Cola"],
    order_occasion: "party",
    inferred_health_goal: "weight_gain"
  },
  {
    user_id: "u_789",
    recent_orders: ["Vegan Buddha Bowl", "Tofu Scramble", "Avocado Toast"],
    dietary_tags: ["Vegan", "Dairy-Free"],
    spice_preference: "high",
    disliked_ingredients: ["cilantro"],
    explicit_diet: true,
    saved_recipes: ["Spicy Vegan Tofu"]
  }
];

export const normalizedOutputExamples = [
  {
    category: "food-dining",
    durable_preferences: {
      preferred_cuisines: ["Italian"],
      favorite_restaurants: ["Joe's Pizza"],
      dietary_preferences: [],
      disliked_ingredients: [],
      spice_level: null,
      frequent_orders: []
    },
    temporary_intent: {
      active_cravings: ["late night pizza delivery"],
      cart_items: ["2L Cola"],
      order_occasion: "party"
    },
    pending_approval: {
      fields: [],
      reason: "No high-sensitivity dietary fields detected."
    },
    dropped_fields: ["inferred_health_goal"],
    drop_reason: "Health and medical inferences must not be derived from food orders."
  },
  {
    category: "food-dining",
    durable_preferences: {
      preferred_cuisines: [],
      favorite_restaurants: [],
      dietary_preferences: ["Vegan", "Dairy-Free"],
      disliked_ingredients: ["cilantro"],
      spice_level: "high",
      frequent_orders: []
    },
    temporary_intent: {
      active_cravings: [],
      cart_items: [],
      order_occasion: "unknown"
    },
    pending_approval: {
      fields: [],
      reason: "Dietary preferences were explicitly stated."
    },
    dropped_fields: [],
    drop_reason: "No invalid fields detected."
  }
];

export const wikiEntryTemplates = [
  "You frequently enjoy {{preferred_cuisines}} cuisine.",
  "You have indicated a dietary preference for {{dietary_preferences}} food.",
  "You generally prefer your food with a {{spice_level}} spice level.",
  "You tend to avoid {{disliked_ingredients}} in your meals.",
  "You've been craving {{active_cravings}} recently. This will clear automatically."
];

export const permissionSuggestions = {
  preferred_cuisines: "low",
  favorite_restaurants: "low",
  frequent_orders: "low",
  active_cravings: "low",
  cart_items: "medium",
  spice_level: "medium",
  disliked_ingredients: "medium",
  order_occasion: "high",
  dietary_preferences: "high",
  health_inferences: "high"
};

export const careNotes = [
  "A single food order does not establish a permanent dietary restriction or preference.",
  "Group or party orders should stay isolated and must not pollute personal taste profiles.",
  "Do not infer medical conditions (e.g., diabetes, celiac disease, eating disorders) from food orders.",
  "Dietary preferences (Vegan, Kosher, Halal) can be highly sensitive and should require user approval if inferred rather than explicitly stated."
];

const OCCASION_OPTIONS = new Set(["solo", "group", "party", "business", "unknown"]);
const SPICE_LEVELS = new Set(["none", "mild", "medium", "high", "extra"]);

export function normalizeFoodDiningContext(rawInput = {}) {
  const input = isObject(rawInput) ? rawInput : {};
  
  const preferredCuisines = toUniqueList(input.preferred_cuisines, input.cuisines);
  const favoriteRestaurants = toUniqueList(input.saved_restaurants, input.favorite_restaurants);
  const dislikedIngredients = toUniqueList(input.disliked_ingredients, input.allergies);
  const frequentOrders = toUniqueList(input.frequent_orders);
  
  const activeCravings = toUniqueList(input.search_queries, input.active_cravings);
  const cartItems = toUniqueList(input.cart_items);
  const orderOccasion = normalizeOrderOccasion(input);
  
  const spiceLevel = inferSpiceLevel(input);
  
  // Dietary handling
  const dietaryTags = toUniqueList(input.dietary_tags, input.dietary_preferences);
  const isExplicitDiet = Boolean(input.explicit_diet);
  
  const droppedFields = collectDroppedFields(input);
  const pendingFields = [];

  // Gate inferred diets
  let approvedDietary = [];
  if (dietaryTags.length > 0) {
    if (isExplicitDiet) {
      approvedDietary = dietaryTags;
    } else {
      pendingFields.push(`inferred_dietary_preferences: ${dietaryTags.join(",")}`);
    }
  }

  return {
    category,
    durable_preferences: {
      preferred_cuisines: preferredCuisines,
      favorite_restaurants: favoriteRestaurants,
      dietary_preferences: approvedDietary,
      disliked_ingredients: dislikedIngredients,
      spice_level: spiceLevel,
      frequent_orders: frequentOrders
    },
    temporary_intent: {
      active_cravings: activeCravings,
      cart_items: cartItems,
      order_occasion: orderOccasion
    },
    pending_approval: {
      fields: pendingFields,
      reason: pendingFields.length
        ? "Inferred dietary preferences require user approval before becoming permanent."
        : isExplicitDiet ? "Dietary preferences were explicitly stated." : "No high-sensitivity dietary fields detected."
    },
    dropped_fields: droppedFields,
    drop_reason: buildDropReason(droppedFields),
    validation: buildValidation(input, isExplicitDiet, dietaryTags)
  };
}

export function validateFoodDiningContext(candidate = {}, signals = {}) {
  if (candidate.dietary_preferences && candidate.dietary_preferences.length > 0) {
    if (!signals.isExplicit) {
      const error = new Error("inferred_dietary_overreach");
      error.field = "dietary_preferences";
      error.sensitivity = "high";
      throw error;
    }
  }
  return true;
}

function buildValidation(input = {}, isExplicitDiet = false, dietaryTags = []) {
  if (dietaryTags.length > 0) {
    try {
      validateFoodDiningContext({ dietary_preferences: dietaryTags }, { isExplicit: isExplicitDiet });
    } catch (error) {
      return {
        status: "rejected",
        reason: error.message,
        field: error.field || "dietary_preferences"
      };
    }
  }
  return { status: "ok" };
}

function normalizeOrderOccasion(input = {}) {
  if (input.order_occasion && OCCASION_OPTIONS.has(String(input.order_occasion).toLowerCase())) {
    return String(input.order_occasion).toLowerCase();
  }
  if (input.group_order) return "group";
  if (input.party_size && Number(input.party_size) > 4) return "party";
  return "unknown";
}

function inferSpiceLevel(input = {}) {
  const normalized = String(input.spice_preference || input.spice_level).toLowerCase();
  if (SPICE_LEVELS.has(normalized)) return normalized;
  return null;
}

function collectDroppedFields(input = {}) {
  const dropped = [];
  for (const field of ["inferred_health_goal", "weight_loss_flag", "medical_condition", "calorie_tracking_mode"]) {
    if (Object.hasOwn(input, field)) dropped.push(field);
  }
  return dropped;
}

function buildDropReason(droppedFields = []) {
  if (droppedFields.length === 0) return "No invalid fields detected.";
  return "Health and medical inferences must not be derived from food orders.";
}

function toUniqueList(...values) {
  const items = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  });
  return [...new Set(items.filter(Boolean).map((value) => String(value)))];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}