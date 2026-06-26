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
  normalizeCalendarSchedulingContext,
  generateUserReadableSuggestion
} from "../../src/categories/calendar-scheduling.mjs";

test("category is calendar-scheduling", () => {
  assert.equal(category, "calendar-scheduling");
});

test("schema exposes meeting buffers, avoided days, and focus windows", () => {
  assert.ok("preferred_meeting_buffers" in contextFields);
  assert.ok("avoided_meeting_days" in contextFields);
  assert.ok("focus_time_windows" in contextFields);
});

test("examples exist and normalized outputs align", () => {
  assert.ok(rawInputExamples.length > 0);
  assert.equal(normalizedOutputExamples.length, rawInputExamples.length);
});

test("explicit preferences preserve scheduling fields and drop private event details", () => {
  const result = normalizeCalendarSchedulingContext(rawInputExamples[0]);

  assert.equal(result.category, "calendar-scheduling");
  assert.equal(result.observation_type, "explicit_preference");
  assert.equal(result.confidence, "high");
  assert.equal(result.visibility, "private");
  assert.equal(result.is_identity_claim, false);
  assert.deepEqual(result.durable_preferences.preferred_meeting_buffers, ["15 minutes after external calls"]);
  assert.deepEqual(result.durable_preferences.avoided_meeting_days, ["Saturday", "Sunday"]);
  assert.deepEqual(result.durable_preferences.focus_time_windows, ["weekday mornings before 11:00"]);
  assert.equal(result.durable_preferences.preferred_meeting_length, "25 minutes");
  assert.deepEqual(result.dropped_fields, ["meeting_title"]);
  assert.deepEqual(result.pending_approval.fields, []);
  assert.equal(result.needs_review, false);
});

test("one-off scheduling activity stays weak and user-reviewable", () => {
  const result = normalizeCalendarSchedulingContext(rawInputExamples[1]);

  assert.equal(result.observation_type, "weak_observation");
  assert.equal(result.confidence, "low");
  assert.equal(result.is_identity_claim, false);
  assert.deepEqual(result.durable_preferences.preferred_meeting_buffers, []);
  assert.deepEqual(result.durable_preferences.avoided_meeting_days, []);
  assert.deepEqual(result.durable_preferences.focus_time_windows, []);
  assert.deepEqual(result.temporary_signals.possible_buffers, ["10 minutes"]);
  assert.deepEqual(result.temporary_signals.possible_avoided_days, ["Friday", "Saturday", "Sunday"]);
  assert.deepEqual(result.temporary_signals.possible_focus_time_windows, ["Tuesday 09:00-11:00"]);
  assert.ok(result.pending_approval.fields.includes("preferred_meeting_buffers"));
  assert.ok(result.pending_approval.fields.includes("avoided_meeting_days"));
  assert.ok(result.pending_approval.fields.includes("focus_time_windows"));
  assert.deepEqual(result.dropped_fields, ["attendee_emails", "meeting_link"]);
  assert.equal(result.needs_review, true);
});

test("inferred preference requires review before memory", () => {
  const result = normalizeCalendarSchedulingContext({
    source: "CalendarBot",
    type: "preference",
    explicit: false,
    data: {
      focus_time_windows: ["Monday 09:00-11:00"],
      avoided_meeting_days: ["Friday"]
    }
  });

  assert.equal(result.observation_type, "inferred_preference");
  assert.equal(result.confidence, "medium");
  assert.deepEqual(result.pending_approval.fields, ["avoided_meeting_days", "focus_time_windows"]);
  assert.equal(result.needs_review, true);
  assert.match(result.suggestion, /focus time window|avoided meeting days/);
});

test("templates, permissions, and care notes reinforce safe context shaping", () => {
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{preferred_meeting_buffers}}")));
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{avoided_meeting_days}}")));
  assert.ok(wikiEntryTemplates.some((template) => template.includes("{{focus_time_windows}}")));
  assert.equal(permissionSuggestions.preferred_meeting_buffers, "low");
  assert.equal(permissionSuggestions.avoided_meeting_days, "medium");
  assert.equal(permissionSuggestions.focus_time_windows, "medium");
  assert.equal(permissionSuggestions.meeting_link, "high");
  assert.equal(sensitiveFieldRules.attendee_emails.action, "drop");
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("declined meeting")));
  assert.ok(careNotes.some((note) => note.toLowerCase().includes("meeting titles")));
});

test("suggestion text stays user-readable", () => {
  assert.match(
    generateUserReadableSuggestion("activity", { added_buffer_minutes: 15 }),
    /15-minute buffer/
  );
});
