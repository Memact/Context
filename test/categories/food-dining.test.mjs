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
  normalizeFoodDiningContext,
  validateFoodDiningContext
} from "../../src/categories/food-dining.mjs";

test("category is food-dining", () => {
  assert.equal(category, "food-dining");
});

test("schema separates durable and temporary sections", () => {
  assert.ok("preferred_cuisines" in contextFields);
  assert.ok("dietary_preferences" in contextFields);
  assert.ok("active_cravings" in contextFields);
  assert.ok("order_occasion" in contextFields);
});

test("raw input examples exist and normalized outputs align", () => {
  assert.ok(rawInputExamples.length > 0);
  assert.equal(normalizedOutputExamples.length, rawInputExamples.length);
});

test("normalized example A keeps temporary intent isolated and drops medical inferences", () => {
  const output = normalizedOutputExamples[0];

  assert.deepEqual(output.durable_preferences.preferred_cuisines, ["Italian"]);
  assert.deepEqual(output.durable_preferences.dietary_preferences, []);
  assert.deepEqual(output.temporary_intent.active_cravings, ["late night pizza delivery"]);
  assert.deepEqual(output.temporary_intent.cart_items, ["2L Cola"]);
  assert.equal(output.temporary_intent.order_occasion, "party");
  assert.deepEqual(output.dropped_fields, ["inferred_health_goal"]);
});

test("normalized example B allows explicit dietary preferences to pass", () => {
  const output = normalizedOutputExamples[1];

  assert.deepEqual(output.durable_preferences.dietary_preferences, ["Vegan", "Dairy-Free"]);
  assert.deepEqual(output.durable_preferences.disliked_ingredients, ["cilantro"]);
  assert.equal(output.durable_preferences.spice_level, "high");
  assert.equal(output.temporary_intent.order_occasion, "unknown");
});

test("wiki templates stay factual and user-readable", () => {
  assert.ok(wikiEntryTemplates.length >= 4);
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{preferred_cuisines}}")));
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{dietary_preferences}}")));
  assert.ok(wikiEntryTemplates.every((template) => !/diabetic|weight loss|eating disorder/i.test(template)));
});

test("permission suggestions match the tiered model", () => {
  assert.equal(permissionSuggestions.preferred_cuisines, "low");
  assert.equal(permissionSuggestions.active_cravings, "low");
  assert.equal(permissionSuggestions.order_occasion, "high");
  assert.equal(permissionSuggestions.dietary_preferences, "high");
  assert.equal(permissionSuggestions.health_inferences, "high");
  assert.equal(sensitiveFieldRules.dietary_preferences.sensitive, true);
  assert.equal(sensitiveFieldRules.health_inferences.action, "drop");
});

test("care notes warn about one-off overreach and sensitive medical labels", () => {
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("single food order")));
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("group or party")));
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("medical conditions")));
});

test("inferred dietary overreach is rejected without explicit flag", () => {
  const normalized = normalizeFoodDiningContext({
    recent_orders: ["Tofu Salad"],
    dietary_tags: ["Vegan"],
    explicit_diet: false
  });

  assert.deepEqual(normalized.durable_preferences.dietary_preferences, []);
  assert.ok(normalized.pending_approval.fields.includes("inferred_dietary_preferences: Vegan"));
  assert.equal(normalized.validation.status, "rejected");
  
  assert.throws(
    () => validateFoodDiningContext({ dietary_preferences: ["Vegan"] }, { isExplicit: false }),
    /inferred_dietary_overreach/
  );
});

test("explicit dietary preferences are accepted", () => {
  const normalized = normalizeFoodDiningContext({
    dietary_tags: ["Gluten-Free"],
    explicit_diet: true
  });

  assert.deepEqual(normalized.durable_preferences.dietary_preferences, ["Gluten-Free"]);
  assert.equal(normalized.pending_approval.fields.length, 0);
  assert.equal(normalized.validation.status, "ok");
});

test("party sizes convert to order_occasion accurately", () => {
  const normalized = normalizeFoodDiningContext({
    party_size: 6
  });

  assert.equal(
    normalized.temporary_intent.order_occasion,
    "party"
  );
});