import test from "node:test";
import assert from "node:assert/strict";
import {
  category,
  contextFields,
  rawInputExamples,
  normalizedOutputExamples,
  wikiEntryTemplates,
  permissionSuggestions,
  careNotes,
  sensitiveFieldRules,
  normalizeShoppingContext,
  validateShoppingContext
} from "../../src/categories/shopping.mjs";

test("category is shopping", () => {
  assert.equal(category, "shopping");
});

test("schema separates durable and temporary sections", () => {
  assert.ok("preferred_categories" in contextFields);
  assert.ok("active_search_topics" in contextFields);
  assert.ok("purchase_occasion" in contextFields);
});

test("raw input examples exist and normalized outputs align", () => {
  assert.ok(rawInputExamples.length > 0);
  assert.equal(normalizedOutputExamples.length, rawInputExamples.length);
});

test("normalized example A keeps durable preferences and quarantines life events", () => {
  const output = normalizedOutputExamples[0];

  assert.deepEqual(output.durable_preferences.preferred_categories, ["health"]);
  assert.deepEqual(output.temporary_intent.active_search_topics, ["ergonomic chair"]);
  assert.deepEqual(output.temporary_intent.cart_items, ["standing desk", "webcam"]);
  assert.equal(output.temporary_intent.purchase_occasion, "unknown");
  assert.ok(output.pending_approval.fields.includes("inferred_life_events: new_parent"));
  assert.ok(output.pending_approval.fields.includes("abandoned_carts"));
  assert.deepEqual(output.dropped_fields, ["inferred_segment", "loyalty_tier"]);
});

test("normalized example B isolates gift purchases from durable preferences", () => {
  const output = normalizedOutputExamples[1];

  assert.deepEqual(output.durable_preferences.preferred_brands, ["Zara", "H&M"]);
  assert.deepEqual(output.durable_preferences.preferred_categories, ["accessories"]);
  assert.equal(output.temporary_intent.purchase_occasion, "gift");
  assert.deepEqual(output.dropped_fields, ["inferred_income_bracket", "return_rate"]);
});

test("wiki templates stay factual and user-readable", () => {
  assert.ok(wikiEntryTemplates.length >= 4);
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{preferred_categories}}")));
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{active_search_topics}}")));
  assert.ok(wikiEntryTemplates.every((template) => !/splurge|luxury buyer|budget shopper/i.test(template)));
});

test("permission suggestions match the tiered model", () => {
  assert.equal(permissionSuggestions.preferred_categories, "low");
  assert.equal(permissionSuggestions.active_search_topics, "medium");
  assert.equal(permissionSuggestions.purchase_occasion, "high");
  assert.equal(permissionSuggestions.budget_range, "high");
  assert.equal(permissionSuggestions.inferred_life_events, "high");
  assert.equal(sensitiveFieldRules.abandoned_carts.sensitive, true);
  assert.equal(sensitiveFieldRules.inferred_life_events.approval_required, true);
});

test("care notes warn about one-off overreach and sensitive labels", () => {
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("single purchase")));
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("gift")));
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("abandoned carts")));
});

test("single purchase budget overreach is rejected", () => {
  const normalized = normalizeShoppingContext({
    recent_purchases: ["luxury handbag"],
    purchase_prices: [800],
    gift_flag: false
  });

  assert.equal(normalized.temporary_intent.purchase_occasion, "unknown");
  assert.equal(normalized.durable_preferences.budget_range, null);
  assert.equal(normalized.validation.status, "ok");
  assert.throws(
    () => validateShoppingContext({ budget_range: { min: 500, max: 1000, currency: "USD" } }, { budgetSignalCount: 1 }),
    /single_purchase_overreach/
  );
});

test("budget inference stays gated until three consistent signals", () => {
  const normalized = normalizeShoppingContext({
    budget_signals: [79, 84, 88],
    purchases: ["notebook", "headphones", "desk lamp"]
  });

  assert.deepEqual(normalized.durable_preferences.budget_range, {
    min: 79,
    max: 88,
    currency: "USD"
  });
  assert.equal(normalized.validation.status, "ok");
});

test("shopping size preferences are normalized", () => {
  const normalized = normalizeShoppingContext({
    preferred_clothing_size: "M",
    preferred_shoe_size: "8"
  });

  assert.equal(
    normalized.durable_preferences.preferred_clothing_size,
    "M"
  );

  assert.equal(
    normalized.durable_preferences.preferred_shoe_size,
    "8"
  );
});