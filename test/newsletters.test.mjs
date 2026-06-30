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
} from "../src/categories/newsletters.mjs";

test("category is newsletters", () => {
  assert.equal(category, "newsletters");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential newsletter fields", () => {
  assert.ok("preferred_topics" in contextFields);
  assert.ok("delivery_frequency" in contextFields);
});

test("raw input examples exist", () => {
  assert.ok(rawInputExamples.length > 0);
});

test("normalized outputs match raw input count", () => {
  assert.equal(
    normalizedOutputExamples.length,
    rawInputExamples.length
  );
});

test("normalized outputs have required fields", () => {
  for (const output of normalizedOutputExamples) {
    assert.ok("preferred_topics" in output);
    assert.ok("delivery_frequency" in output);
  }
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

test("permission suggestions exist", () => {
  assert.ok("preferred_topics" in permissionSuggestions);
  assert.ok("delivery_frequency" in permissionSuggestions);
});

test("delivery frequency marked as low sensitivity", () => {
  assert.equal(
    permissionSuggestions.delivery_frequency,
    "low"
  );
});

test("care notes exist", () => {
  assert.ok(careNotes.length > 0);
});

test("care notes warn against permanent preference assumptions", () => {
  const hasPreferenceWarning = careNotes.some((note) =>
    note.toLowerCase().includes("interest") ||
    note.toLowerCase().includes("preference")
  );

  assert.ok(hasPreferenceWarning);
});

test("care notes reinforce activity is not identity", () => {
  const hasIdentityWarning = careNotes.some((note) =>
    note.toLowerCase().includes("identity")
  );

  assert.ok(hasIdentityWarning);
});