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
} from "../src/categories/events-concerts.mjs";

test("category is events-concerts", () => {
  assert.equal(category, "events-concerts");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential concert fields", () => {
  assert.ok("preferred_venues" in contextFields);
  assert.ok("ticket_price_range" in contextFields);
  assert.ok("preferred_show_days" in contextFields);
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
    assert.ok("preferred_venues" in output);
    assert.ok("ticket_price_range" in output);
    assert.ok("preferred_show_days" in output);
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
  assert.ok("preferred_venues" in permissionSuggestions);
  assert.ok("ticket_price_range" in permissionSuggestions);
  assert.ok("preferred_show_days" in permissionSuggestions);
});

test("ticket price range has medium sensitivity", () => {
  assert.equal(
    permissionSuggestions.ticket_price_range,
    "medium"
  );
});

test("care notes exist", () => {
  assert.ok(careNotes.length > 0);
});

test("care notes warn against preference assumptions", () => {
  const hasPreferenceWarning = careNotes.some((note) =>
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