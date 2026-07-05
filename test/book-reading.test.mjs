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
} from "../src/categories/book-reading.mjs";

test("category is book-reading", () => {
  assert.equal(category, "book-reading");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential book-reading fields", () => {
  assert.ok("preferred_genres" in contextFields);
  assert.ok("average_reading_speed" in contextFields);
  assert.ok("active_reading_lists" in contextFields);
});

test("raw input examples exist", () => {
  assert.ok(rawInputExamples.length > 0);
});

test("normalized outputs match raw input count", () => {
  assert.equal(normalizedOutputExamples.length, rawInputExamples.length);
});

test("normalized outputs have required fields", () => {
  for (const output of normalizedOutputExamples) {
    assert.ok("preferred_genres" in output);
    assert.ok("average_reading_speed" in output);
    assert.ok("active_reading_lists" in output);
  }
});

test("all reading speeds are valid", () => {
  const validSpeeds = ["slow", "moderate", "fast"];
  for (const output of normalizedOutputExamples) {
    assert.ok(validSpeeds.includes(output.average_reading_speed));
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
  assert.ok("preferred_genres" in permissionSuggestions);
  assert.ok("average_reading_speed" in permissionSuggestions);
  assert.ok("active_reading_lists" in permissionSuggestions);
});

test("reading speed marked as medium sensitivity", () => {
  assert.equal(permissionSuggestions.average_reading_speed, "medium");
});

test("care notes exist", () => {
  assert.ok(careNotes.length > 0);
});

test("care notes warn against preference assumptions", () => {
  const hasWarning = careNotes.some(
    (note) =>
      note.toLowerCase().includes("preference") ||
      note.toLowerCase().includes("single")
  );
  assert.ok(hasWarning);
});
