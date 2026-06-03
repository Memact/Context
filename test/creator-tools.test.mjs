import test from "node:test";
import assert from "node:assert/strict";
import {
  category,
  contextFields,
  rawInputExamples,
  normalizedOutputExamples,
  careNotes,
} from "../src/categories/creator-tools.mjs";

test("category is creator-tools", () => {
  assert.equal(category, "creator-tools");
});

test("schema minimizes overbroad private data collection", () => {
  assert.ok("preferred_export_formats" in contextFields);
  assert.ok("design_style_preferences" in contextFields);
  
  for (const output of normalizedOutputExamples) {
    assert.equal(output.client_name, undefined);
    assert.equal(output.raw_file_title, undefined);
  }
});

test("care notes explicitly guard unpublished client work", () => {
  const hasPrivacyGuard = careNotes.some(note => 
    note.toLowerCase().includes("private") || note.toLowerCase().includes("client")
  );
  assert.ok(hasPrivacyGuard);
});