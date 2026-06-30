import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  compileOverlay,
  registerSchemaOverlay,
  clearSchemaOverlays,
  listSchemaOverlays,
  shapeContextProposal,
  withStrictValidation,
} from "../src/engine.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Always clear the registry before each test to ensure test isolation.
beforeEach(() => {
  clearSchemaOverlays();
});

// ---------------------------------------------------------------------------
// compileOverlay — unit tests
// ---------------------------------------------------------------------------

describe("compileOverlay", () => {
  test("compiles a valid definition and returns a validation function", () => {
    const validate = compileOverlay({
      beverage_likes: { type: "array", items: { type: "string" }, description: "Preferred beverages" },
    });
    assert.equal(typeof validate, "function");
  });

  test("throws TypeError when overlayDefinition is not a plain object", () => {
    assert.throws(() => compileOverlay(null), TypeError);
    assert.throws(() => compileOverlay([]), TypeError);
    assert.throws(() => compileOverlay("bad"), TypeError);
  });

  test("throws TypeError when a field spec is not a plain object", () => {
    assert.throws(
      () => compileOverlay({ beverage_likes: "string" }),
      TypeError,
      "expected TypeError for non-object spec"
    );
  });

  test("throws TypeError for unknown type", () => {
    assert.throws(
      () => compileOverlay({ count: { type: "integer" } }),
      TypeError,
      /unknown type/i
    );
  });

  test("throws TypeError when items is used on non-array type", () => {
    assert.throws(
      () => compileOverlay({ name: { type: "string", items: { type: "string" } } }),
      TypeError,
      /items.*only valid on type "array"/i
    );
  });

  test("throws TypeError for unknown items.type", () => {
    assert.throws(
      () => compileOverlay({ tags: { type: "array", items: { type: "integer" } } }),
      TypeError,
      /unknown items\.type/i
    );
  });

  test("compiled hook: valid context passes with no errors", () => {
    const validate = compileOverlay({
      beverage_likes: { type: "array", items: { type: "string" }, description: "Preferred beverages" },
      tip_preference: { type: "string" },
    });
    const result = validate({ beverage_likes: ["tea", "coffee"], tip_preference: "10%" });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("compiled hook: missing required field produces an error", () => {
    const validate = compileOverlay({
      beverage_likes: { type: "array", required: true, items: { type: "string" } },
    });
    const result = validate({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("beverage_likes")));
  });

  test("compiled hook: wrong top-level type produces an error", () => {
    const validate = compileOverlay({
      tip_preference: { type: "string" },
    });
    const result = validate({ tip_preference: 10 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("tip_preference")));
  });

  test("compiled hook: array with wrong item type produces an error", () => {
    const validate = compileOverlay({
      beverage_likes: { type: "array", items: { type: "string" } },
    });
    const result = validate({ beverage_likes: ["tea", 42] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("beverage_likes[1]")));
  });

  test("compiled hook: optional absent field is silently skipped", () => {
    const validate = compileOverlay({
      beverage_likes: { type: "array", items: { type: "string" } },
    });
    // beverage_likes is absent but not required — should be valid
    const result = validate({});
    assert.equal(result.valid, true);
  });

  test("compiled hook: non-object context coerces to {} and fails required check", () => {
    const validate = compileOverlay({
      tag: { type: "string", required: true },
    });
    const result = validate(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("tag")));
  });

  test("compiled hook: validates nested object properties", () => {
    const validate = compileOverlay({
      delivery_address: {
        type: "object",
        properties: {
          city: { type: "string", required: true },
          zipcode: { type: "string" }
        }
      }
    });

    const validResult = validate({
      delivery_address: { city: "New York", zipcode: "10001" }
    });
    assert.equal(validResult.valid, true);

    const invalidResult = validate({
      delivery_address: { zipcode: "10001" } // missing required city
    });
    assert.equal(invalidResult.valid, false);
    assert.ok(invalidResult.errors.some((e) => e.includes("delivery_address.city")));

    const wrongTypeResult = validate({
      delivery_address: { city: 12345 } // city is a number
    });
    assert.equal(wrongTypeResult.valid, false);
    assert.ok(wrongTypeResult.errors.some((e) => e.includes("delivery_address.city")));
  });

  test("compiled hook: validates nested array of objects", () => {
    const validate = compileOverlay({
      order_history: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_name: { type: "string", required: true },
            quantity: { type: "number" }
          }
        }
      }
    });

    const validResult = validate({
      order_history: [
        { item_name: "Pizza", quantity: 2 },
        { item_name: "Soda" }
      ]
    });
    assert.equal(validResult.valid, true);

    const invalidResult = validate({
      order_history: [
        { item_name: "Pizza", quantity: 2 },
        { quantity: 1 } // missing item_name
      ]
    });
    assert.equal(invalidResult.valid, false);
    assert.ok(invalidResult.errors.some((e) => e.includes("order_history[1].item_name")));

    const wrongTypeResult = validate({
      order_history: [
        { item_name: 123 } // wrong type
      ]
    });
    assert.equal(wrongTypeResult.valid, false);
    assert.ok(wrongTypeResult.errors.some((e) => e.includes("order_history[0].item_name")));
  });
});

// ---------------------------------------------------------------------------
// registerSchemaOverlay — unit tests
// ---------------------------------------------------------------------------

describe("registerSchemaOverlay", () => {
  test("registers a valid overlay without throwing", () => {
    assert.doesNotThrow(() =>
      registerSchemaOverlay("food-delivery", {
        beverage_likes: { type: "array", items: { type: "string" } },
      })
    );
  });

  test("throws TypeError when category is not a string", () => {
    assert.throws(
      () => registerSchemaOverlay(null, { f: { type: "string" } }),
      TypeError,
      /category must be a non-empty string/i
    );
  });

  test("throws TypeError when category is empty", () => {
    assert.throws(
      () => registerSchemaOverlay("", { f: { type: "string" } }),
      TypeError
    );
  });

  test("category matching is case-insensitive after trim", () => {
    registerSchemaOverlay("  Food-Delivery  ", {
      beverage_likes: { type: "array", items: { type: "string" } },
    });
    const overlays = listSchemaOverlays();
    assert.ok("food-delivery" in overlays, "should be normalised to lowercase with trim");
  });

  test("re-registering an overlay for the same category overwrites the previous one", () => {
    registerSchemaOverlay("food-delivery", { note: { type: "string" } });
    registerSchemaOverlay("food-delivery", { beverage_likes: { type: "array", items: { type: "string" } } });
    const overlays = listSchemaOverlays();
    assert.ok("beverage_likes" in overlays["food-delivery"].definition, "new definition should replace old one");
    assert.ok(!("note" in overlays["food-delivery"].definition), "old definition should be gone");
  });
});

// ---------------------------------------------------------------------------
// listSchemaOverlays / clearSchemaOverlays — unit tests
// ---------------------------------------------------------------------------

describe("listSchemaOverlays and clearSchemaOverlays", () => {
  test("listSchemaOverlays returns empty object when no overlays registered", () => {
    assert.deepEqual(listSchemaOverlays(), {});
  });

  test("listSchemaOverlays reflects registered overlays without exposing the hook function", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" } },
    });
    const list = listSchemaOverlays();
    assert.ok("food-delivery" in list);
    // Snapshots should expose the definition but not the compiled hook
    assert.ok("definition" in list["food-delivery"]);
    assert.equal(typeof list["food-delivery"].hook, "undefined", "hook should not be exposed");
  });

  test("clearSchemaOverlays removes all registered overlays", () => {
    registerSchemaOverlay("food-delivery", { beverage_likes: { type: "array", items: { type: "string" } } });
    registerSchemaOverlay("shopping", { size_preference: { type: "string" } });
    clearSchemaOverlays();
    assert.deepEqual(listSchemaOverlays(), {});
  });
});

// ---------------------------------------------------------------------------
// shapeContextProposal integration — overlay hook integration
// ---------------------------------------------------------------------------

describe("shapeContextProposal overlay integration", () => {
  test("proposal has status=pending when no overlay is registered", () => {
    const proposal = shapeContextProposal({
      category: "food-delivery",
      context: { restaurant_name: "Punjabi Tadka" },
    });
    assert.equal(proposal.status, "pending");
    assert.equal(proposal.overlay_errors, undefined);
  });

  test("proposal passes overlay validation and remains status=pending", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" } },
    });

    const proposal = shapeContextProposal({
      category: "food-delivery",
      context: { restaurant_name: "Punjabi Tadka", beverage_likes: ["mango lassi", "chai"] },
    });

    assert.equal(proposal.status, "pending");
    assert.equal(proposal.overlay_errors, undefined);
  });

  test("proposal fails overlay validation and gets status=overlay_invalid with overlay_errors", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" } },
    });

    // beverage_likes is a number instead of an array
    const proposal = shapeContextProposal({
      category: "food-delivery",
      context: { restaurant_name: "Punjabi Tadka", beverage_likes: 42 },
    });

    assert.equal(proposal.status, "overlay_invalid");
    assert.ok(Array.isArray(proposal.overlay_errors));
    assert.ok(proposal.overlay_errors.length > 0);
    assert.ok(proposal.overlay_errors.some((e) => e.includes("beverage_likes")));
  });

  test("required overlay field missing causes overlay_invalid status", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" }, required: true },
    });

    const proposal = shapeContextProposal({
      category: "food-delivery",
      context: { restaurant_name: "Punjabi Tadka" }, // beverage_likes absent
    });

    assert.equal(proposal.status, "overlay_invalid");
    assert.ok(proposal.overlay_errors.some((e) => e.includes("beverage_likes")));
  });

  test("overlay registered for different category does not affect another category proposal", () => {
    registerSchemaOverlay("shopping", {
      size_preference: { type: "string", required: true },
    });

    // food-delivery proposal should NOT be affected by the shopping overlay
    const proposal = shapeContextProposal({
      category: "food-delivery",
      context: { restaurant_name: "Punjabi Tadka" },
    });

    assert.equal(proposal.status, "pending");
    assert.equal(proposal.overlay_errors, undefined);
  });

  test("overlay is applied case-insensitively to the category in the proposal", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" }, required: true },
    });

    // Pass category with uppercase — should still match overlay
    const proposal = shapeContextProposal({
      category: "Food-Delivery",
      context: { restaurant_name: "Punjabi Tadka" }, // beverage_likes absent → should fail
    });

    assert.equal(proposal.status, "overlay_invalid");
  });

  test("raw_signal proposals run overlay against the shaped context object", () => {
    registerSchemaOverlay("food-delivery", {
      beverage_likes: { type: "array", items: { type: "string" } },
    });

    // Raw signal — context is built via contextFromSignal, so no custom fields present.
    // beverage_likes is optional so this should remain valid.
    const proposal = shapeContextProposal({
      category: "food-delivery",
      raw_signal: {
        category: "food-delivery",
        event_type: "order_placed",
        payload: { restaurant: "Punjabi Tadka" },
      },
    });

    assert.equal(proposal.status, "pending");
  });
});

// ---------------------------------------------------------------------------
// withStrictValidation — unit tests
// ---------------------------------------------------------------------------

describe("withStrictValidation", () => {
  test("passes validation on valid normalizer output structure", () => {
    const mockNormalizer = (input) => ({
      category: "fitness",
      stable_preferences: {
        goal: input.goal,
      },
      current_goals: {
        session_streak: input.streak,
      },
      validation: { ok: true }
    });

    const schema = {
      goal: { type: "string" },
      session_streak: { type: "number" }
    };

    const decorated = withStrictValidation(mockNormalizer, schema);
    const result = decorated({ goal: "weight loss", streak: 5 });

    assert.equal(result.validation.ok, true);
  });

  test("invalidates and records errors on invalid type in nested structure", () => {
    const mockNormalizer = (input) => ({
      category: "fitness",
      stable_preferences: {
        goal: input.goal,
      },
      current_goals: {
        session_streak: input.streak,
      },
      validation: { ok: true }
    });

    const schema = {
      goal: { type: "string" },
      session_streak: { type: "number" }
    };

    const decorated = withStrictValidation(mockNormalizer, schema);
    // passing streak as string "5" instead of number
    const result = decorated({ goal: "weight loss", streak: "5" });

    assert.equal(result.validation.ok, false);
    assert.equal(result.validation.reason, "schema_validation_failed");
    assert.ok(result.validation.issues.some((issue) => issue.field === "session_streak"));
  });

  test("invalidates and records errors on missing required nested fields", () => {
    const mockNormalizer = () => ({
      category: "fitness",
      stable_preferences: {},
      validation: { ok: true }
    });

    const schema = {
      goal: { type: "string", required: true }
    };

    const decorated = withStrictValidation(mockNormalizer, schema);
    const result = decorated({});

    assert.equal(result.validation.ok, false);
    assert.equal(result.validation.reason, "schema_validation_failed");
    assert.ok(result.validation.issues.some((issue) => issue.field === "goal"));
  });
});
