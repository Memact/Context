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
} from "../src/categories/movies-tv.mjs";

test("category is movies-tv", () => {
  assert.equal(category, "movies-tv");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential movies-tv fields", () => {
  assert.ok("preferred_genres" in contextFields);
  assert.ok("watching_time_slots" in contextFields);
  assert.ok("subscribed_services" in contextFields);
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
    assert.ok("watching_time_slots" in output);
    assert.ok("subscribed_services" in output);
  }
});

test("wiki entry templates exist", () => {
  assert.ok(wikiEntryTemplates.length > 0);
});

test("wiki templates use placeholder format", () => {
  const hasPlaceholder = wikiEntryTemplates.some((t) => t.includes("{{"));
  assert.ok(hasPlaceholder);
});

test("permission suggestions exist", () => {
  assert.ok("preferred_genres" in permissionSuggestions);
  assert.ok("watching_time_slots" in permissionSuggestions);
  assert.ok("subscribed_services" in permissionSuggestions);
});

test("watching time slots marked as medium sensitivity", () => {
  assert.equal(permissionSuggestions.watching_time_slots, "medium");
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