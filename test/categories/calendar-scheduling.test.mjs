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
} from "../../src/categories/calendar-scheduling.mjs";

test("category is calendar-scheduling", () => {
  assert.equal(category, "calendar-scheduling");
});

test("context fields exist and are non-empty", () => {
  assert.ok(Object.keys(contextFields).length > 0);
});

test("context fields include essential calendar scheduling fields", () => {
  assert.ok("preferred_meeting_buffers" in contextFields);
  assert.ok("avoided_meeting_days" in contextFields);
  assert.ok("focus_time_windows" in contextFields);
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
    assert.ok("preferred_meeting_buffers" in output);
    assert.ok("avoided_meeting_days" in output);
    assert.ok("focus_time_windows" in output);
  }
});

test("normalized outputs drop private meeting details", () => {
  const droppedFields = normalizedOutputExamples.flatMap(
    (output) => output.dropped_fields
  );

  assert.ok(droppedFields.includes("meeting_title"));
  assert.ok(droppedFields.includes("attendee_emails"));
  assert.ok(droppedFields.includes("meeting_link"));
});

test("normalized outputs remain user-reviewable", () => {
  for (const output of normalizedOutputExamples) {
    assert.equal(output.needs_review, true);
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
  assert.ok("preferred_meeting_buffers" in permissionSuggestions);
  assert.ok("avoided_meeting_days" in permissionSuggestions);
  assert.ok("focus_time_windows" in permissionSuggestions);
});

test("private meeting fields are high sensitivity", () => {
  assert.equal(permissionSuggestions.meeting_title, "high");
  assert.equal(permissionSuggestions.attendee_emails, "high");
  assert.equal(permissionSuggestions.meeting_link, "high");
});

test("care notes exist", () => {
  assert.ok(careNotes.length > 0);
});

test("care notes warn against permanent preference assumptions", () => {
  const hasWarning = careNotes.some(
    (note) =>
      note.toLowerCase().includes("single") ||
      note.toLowerCase().includes("permanent")
  );

  assert.ok(hasWarning);
});
