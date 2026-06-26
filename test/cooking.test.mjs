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
} from "../src/categories/cooking.mjs";

test("category is cooking", () => {
  assert.equal(category, "cooking");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential cooking fields", () => {
  assert.ok("recipe_formats" in contextFields);
  assert.ok("cooking_level" in contextFields);
  assert.ok("cooking_styles" in contextFields);
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
    assert.ok("recipe_formats" in output);
    assert.ok("cooking_level" in output);
    assert.ok("cooking_styles" in output);
  }
});

test("all cooking levels are valid", () => {
  const validLevels = [
    "beginner",
    "intermediate",
    "advanced",
  ];

  for (const output of normalizedOutputExamples) {
    assert.ok(validLevels.includes(output.cooking_level));
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
  assert.ok("recipe_formats" in permissionSuggestions);
  assert.ok("cooking_level" in permissionSuggestions);
  assert.ok("cooking_styles" in permissionSuggestions);
});

test("cooking level marked as medium sensitivity", () => {
  assert.equal(permissionSuggestions.cooking_level, "medium");
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