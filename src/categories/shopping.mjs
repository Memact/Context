export const category = "shopping";

export const contextFields = {
  preferred_categories: "Stable product categories the user repeatedly chooses across multiple personal purchases.",
  disliked_categories: "Product categories the user consistently avoids or dismisses.",
  preferred_brands: "Brands repeatedly chosen across multiple shopping sessions.",
  disliked_brands: "Brands repeatedly avoided across multiple shopping sessions.",
  budget_range: "Estimated spend range inferred only after 3+ consistent signals, never from a single purchase.",
  preferred_format: "How the user prefers to shop: online, in-store, or both.",
  purchase_frequency: "How often the user shops in a durable way: occasional, regular, or frequent.",
  active_search_topics: "Topics the user is actively browsing right now.",
  cart_items: "Current cart contents or cart-like items that are temporary by nature.",
  viewed_products: "Recently viewed products that expire automatically after 30 days.",
  purchase_occasion: "Why the purchase is happening right now: personal, gift, emergency, shared, or unknown.",
  preferred_clothing_size: "Preferred clothing size",
  preferred_shoe_size: "Preferred shoe size",
};

export const sensitiveFieldRules = {
  abandoned_carts: {
    sensitive: true,
    permanent: false,
    approval_required: true,
    expires_after_days: 30
  },
  budget_inferences: {
    sensitive: true,
    permanent: false,
    approval_required: true,
    min_consistent_signals: 3
  },
  inferred_life_events: {
    sensitive: true,
    permanent: false,
    approval_required: true,
    expires_after_days: 90
  },
  repeated_mistakes: {
    sensitive: true,
    permanent: false,
    action: "drop"
  }
};

export const rawInputExamples = [
  {
  user_id: "u_456",
  purchases: ["baby monitor", "diaper bag", "prenatal vitamins"],
  inferred_segment: "new_parent",
  avg_order_value: 84.5,
  abandoned_carts: ["standing desk", "webcam"],
  preferred_categories: ["health", "baby"],
  last_search: "ergonomic chair",
  loyalty_tier: "gold",
  preferred_clothing_size: "M"
  },
  {
    user_id: "u_456",
    recent_purchases: ["luxury handbag","running shoes"],
    inferred_income_bracket: "high",
    browsed_categories: ["women", "accessories"],
    wishlisted: ["summer dress", "sandals"],
    gift_flag: true,
    brand_affinity: ["Zara", "H&M"],
    return_rate: 0.4,
    preferred_shoe_size: "8"
  }
];

export const normalizedOutputExamples = [
  {
    category: "shopping",
    durable_preferences: {
    preferred_categories: ["health"],
    disliked_categories: [],
    preferred_brands: [],
    disliked_brands: [],
    budget_range: null,
    preferred_format: "online",
    purchase_frequency: null,
    preferred_clothing_size: "M",
    preferred_shoe_size: null
  },
    temporary_intent: {
      active_search_topics: ["ergonomic chair"],
      cart_items: ["standing desk", "webcam"],
      viewed_products: [],
      purchase_occasion: "unknown"
    },
    pending_approval: {
      fields: ["inferred_life_events: new_parent", "abandoned_carts"],
      reason: "Life event and cart signals are temporary or high sensitivity. User approval is required before any Wiki entry is written."
    },
    dropped_fields: ["inferred_segment", "loyalty_tier"],
    drop_reason: "Demographic segmentation and loyalty tiers are app-internal labels, not user identity."
  },
  {
    category: "shopping",
    durable_preferences: {
    preferred_categories: ["accessories"],
    disliked_categories: [],
    preferred_brands: ["Zara", "H&M"],
    disliked_brands: [],
    budget_range: null,
    preferred_format: "online",
    purchase_frequency: null,
    preferred_clothing_size: null,
    preferred_shoe_size: "8"
    },
    temporary_intent: {
      active_search_topics: ["summer dress", "sandals"],
      cart_items: [],
      viewed_products: [],
      purchase_occasion: "gift"
    },
    pending_approval: {
      fields: [],
      reason: "Gift purchases must remain temporary and must not become permanent preferences."
    },
    dropped_fields: ["inferred_income_bracket", "return_rate"],
    drop_reason: "Single luxury purchase does not infer income. Return rate is not a user-facing identity trait."
  }
];

export const wikiEntryTemplates = [
  "You usually shop for {{preferred_categories}} and tend to favor {{preferred_brands}} when available.",
  "Based on your recent purchases, you typically shop in the {{budget_range}} range - you can update this any time.",
  "You've been browsing {{active_search_topics}} recently. This will clear automatically after 30 days.",
  "You purchased {{item}} as a gift. This has not been added to your personal preferences."
];

export const permissionSuggestions = {
  preferred_categories: "low",
  disliked_categories: "low",
  preferred_brands: "low",
  disliked_brands: "low",
  preferred_format: "low",
  purchase_frequency: "medium",
  active_search_topics: "medium",
  cart_items: "medium",
  viewed_products: "medium",
  purchase_occasion: "high",
  budget_range: "high",
  abandoned_carts: "high",
  budget_inferences: "high",
  inferred_life_events: "high",
  repeated_mistakes: "high",
  preferred_clothing_size: "medium",
  preferred_shoe_size: "medium"
};

export const careNotes = [
  "A single purchase is not a preference and must not become a permanent identity label.",
  "Gift, emergency, and shared-account purchases should stay isolated from durable shopping preferences.",
  "Do not infer income or budget range from a single item or a single order total.",
  "Abandoned carts are temporary signals and require approval before any Wiki entry is written.",
  "High-sensitivity life-event guesses such as new parent or moving must stay pending until the user approves them.",
  "Repeated mistakes, returns, and other app-internal labels should be dropped instead of surfaced."
];

const LIFE_EVENT_PATTERNS = [
  { event: "new_parent", pattern: /\b(baby|diaper|prenatal|stroller|nursery|bottle)\b/i },
  { event: "moving", pattern: /\b(moving|mover|boxes?|apartment|lease|relocat|housewarming)\b/i }
];

const FORMAT_OPTIONS = new Set(["online", "in-store", "both"]);
const PRODUCT_CATEGORY_BLOCKLIST = new Set([
  "women",
  "men",
  "kids",
  "children",
  "baby",
  "new_parent",
  "maternity",
  "pregnancy"
]);

const PURCHASE_OCCASIONS = new Set(["personal", "gift", "emergency", "shared", "unknown"]);

export function normalizeShoppingContext(rawInput = {}) {
  const input = isObject(rawInput) ? rawInput : {};
  const purchases = toUniqueList(input.purchases, input.recent_purchases);
  const preferredCategories = toUniqueList(input.preferred_categories, input.browsed_categories)
    .filter((value) => !PRODUCT_CATEGORY_BLOCKLIST.has(normalizeToken(value)));
  const preferredBrands = toUniqueList(input.preferred_brands, input.brand_affinity);
  const activeSearchTopics = toUniqueList(
    input.active_search_topics,
    input.last_search,
    input.wishlisted,
    input.searches
  );
  const cartItems = toUniqueList(input.cart_items, input.abandoned_carts);
  const viewedProducts = toUniqueList(input.viewed_products);
  const purchaseOccasion = normalizePurchaseOccasion(input);
  const inferredLifeEvent = inferLifeEvent(purchases, preferredCategories, activeSearchTopics, input);
  const budgetRange = inferBudgetRange(input.budget_signals || input.purchase_prices || input.order_totals);
  const droppedFields = collectDroppedFields(input, budgetRange);
  const pendingFields = [];

  if (inferredLifeEvent) {
    pendingFields.push(`inferred_life_events: ${inferredLifeEvent}`);
  }

  if (cartItems.length && Array.isArray(input.abandoned_carts) && input.abandoned_carts.length) {
    pendingFields.push("abandoned_carts");
  }

  return {
    category,
    durable_preferences: {
      preferred_categories: preferredCategories,
      disliked_categories: toUniqueList(input.disliked_categories),
      preferred_brands: preferredBrands,
      disliked_brands: toUniqueList(input.disliked_brands),
      budget_range: budgetRange,
      preferred_format: inferPreferredFormat(input),
      purchase_frequency: inferPurchaseFrequency(input),
      preferred_clothing_size: input.preferred_clothing_size ?? null,
      preferred_shoe_size: input.preferred_shoe_size ?? null
    },
    temporary_intent: {
      active_search_topics: activeSearchTopics,
      cart_items: cartItems,
      viewed_products: viewedProducts,
      purchase_occasion: purchaseOccasion
    },
    pending_approval: {
      fields: pendingFields,
      reason: pendingFields.length
        ? "Life event and cart signals are temporary or high sensitivity. User approval is required before any Wiki entry is written."
        : "No high-sensitivity fields detected."
    },
    dropped_fields: droppedFields,
    drop_reason: buildDropReason(droppedFields),
    validation: buildValidation(input, budgetRange)
  };
}

export function validateShoppingContext(candidate = {}, signals = {}) {
  if (candidate && candidate.budget_range) {
    const signalCount = Number(signals.budgetSignalCount ?? signals.signalCount ?? 0);
    if (signalCount < 3) {
      const error = new Error("single_purchase_overreach");
      error.field = "budget_range";
      error.sensitivity = "medium-high";
      throw error;
    }
  }

  return true;
}

function buildValidation(input = {}, budgetRange = null) {
  if (Object.hasOwn(input, "budget_range")) {
    try {
      validateShoppingContext({ budget_range: budgetRange || input.budget_range }, { budgetSignalCount: countBudgetSignals(input) });
    } catch (error) {
      return {
        status: "rejected",
        reason: error.message,
        field: error.field || "budget_range"
      };
    }
  }

  return {
    status: "ok"
  };
}

function countBudgetSignals(input = {}) {
  if (Array.isArray(input.budget_signals)) return input.budget_signals.filter((value) => Number.isFinite(Number(value))).length;
  if (Array.isArray(input.purchase_prices)) return input.purchase_prices.filter((value) => Number.isFinite(Number(value))).length;
  if (Array.isArray(input.order_totals)) return input.order_totals.filter((value) => Number.isFinite(Number(value))).length;
  return Number.isFinite(Number(input.avg_order_value)) ? 1 : 0;
}

function inferBudgetRange(signals = []) {
  const numericSignals = Array.isArray(signals)
    ? signals.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

  if (numericSignals.length < 3) return null;

  const min = Math.min(...numericSignals);
  const max = Math.max(...numericSignals);
  if ((max / Math.max(1, min)) > 3) return null;

  return {
    min: roundCurrency(min),
    max: roundCurrency(max),
    currency: "USD"
  };
}

function inferPreferredFormat(input = {}) {
  if (input.preferred_format && FORMAT_OPTIONS.has(String(input.preferred_format))) {
    return input.preferred_format;
  }

  if (typeof input.source === "string" && /store|retail|mall|in[- ]store/i.test(input.source)) {
    return "in-store";
  }

  return "online";
}

function inferPurchaseFrequency(input = {}) {
  const purchaseCount = Array.isArray(input.purchase_sessions)
    ? input.purchase_sessions.length
    : Array.isArray(input.purchase_history)
      ? input.purchase_history.length
      : 0;
  if (purchaseCount >= 9) return "frequent";
  if (purchaseCount >= 3) return "regular";
  if (purchaseCount >= 1) return "occasional";
  return null;
}

function normalizePurchaseOccasion(input = {}) {
  if (input.purchase_occasion && PURCHASE_OCCASIONS.has(String(input.purchase_occasion))) {
    return String(input.purchase_occasion);
  }
  if (input.gift_flag) return "gift";
  if (input.emergency_flag) return "emergency";
  if (input.shared_flag || input.shared_account) return "shared";
  return "unknown";
}

function inferLifeEvent(purchases = [], preferredCategories = [], activeSearchTopics = [], input = {}) {
  const text = [
    ...(Array.isArray(purchases) ? purchases : []),
    ...(Array.isArray(preferredCategories) ? preferredCategories : []),
    ...(Array.isArray(activeSearchTopics) ? activeSearchTopics : []),
    input.last_search,
    input.primary_need
  ]
    .filter(Boolean)
    .join(" ");

  const match = LIFE_EVENT_PATTERNS.find(({ pattern }) => pattern.test(text));
  return match ? match.event : null;
}

function collectDroppedFields(input = {}) {
  const dropped = [];
  for (const field of ["inferred_segment", "inferred_income_bracket", "return_rate", "loyalty_tier", "repeated_mistakes", "budget_inferences"]) {
    if (Object.hasOwn(input, field)) dropped.push(field);
  }
  return dropped;
}

function buildDropReason(droppedFields = []) {
  if (droppedFields.includes("inferred_income_bracket")) {
    return "Single luxury purchase does not infer income. Return rate is not a user-facing identity trait.";
  }
  return "Demographic segmentation and app-internal labels are not user identity.";
}

function toUniqueList(...values) {
  const items = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  });

  return [...new Set(items.filter(Boolean).map((value) => String(value)))];
}

function normalizeToken(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function roundCurrency(value) {
  return Math.round(Number(value));
}
