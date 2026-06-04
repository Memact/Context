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
} from "../src/categories/food-delivery.mjs";

test("category is food-delivery", () => {
  assert.equal(category, "food-delivery");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential food delivery fields", () => {
  assert.ok("restaurant_name" in contextFields);
  assert.ok("items_ordered" in contextFields);
  assert.ok("platform" in contextFields);
  assert.ok("shared_order" in contextFields);
});

test("raw input examples exist", () => {
  assert.ok(rawInputExamples.length > 0);
});

test("normalized outputs match raw input count", () => {
  assert.equal(normalizedOutputExamples.length, rawInputExamples.length);
});

test("normalized outputs have required fields", () => {
  for (const output of normalizedOutputExamples) {
    assert.ok("restaurant_name" in output);
    assert.ok("items_ordered" in output);
    assert.ok("shared_order" in output);
    assert.ok("platform" in output);
  }
});

test("shared order is correctly flagged", () => {
  const sharedOrder = normalizedOutputExamples.find(
    (output) => output.shared_order === true
  );
  assert.ok(sharedOrder, "At least one shared order example should exist");
});

test("wiki entry templates exist", () => {
  assert.ok(wikiEntryTemplates.length > 0);
});

test("wiki templates use placeholder format", () => {
  const hasPlaceholder = wikiEntryTemplates.some((template) =>
    template.includes("{{")
  );
  assert.ok(hasPlaceholder);
});

test("permission suggestions exist for sensitive fields", () => {
  assert.ok("order_total" in permissionSuggestions);
  assert.ok("items_ordered" in permissionSuggestions);
});

test("order_total marked as high sensitivity", () => {
  assert.equal(permissionSuggestions.order_total, "high");
});

test("care notes warn against stable preference assumption", () => {
  assert.ok(careNotes.length > 0);
  const hasPreferenceWarning = careNotes.some((note) =>
    note.toLowerCase().includes("preference")
  );
  assert.ok(hasPreferenceWarning);
});

test("care notes warn about shared orders", () => {
  const hasSharedWarning = careNotes.some((note) =>
    note.toLowerCase().includes("shared")
  );
  assert.ok(hasSharedWarning);
});