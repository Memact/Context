import test from "node:test";
import assert from "node:assert/strict";
import {
  GAMING_SCHEMA,
  GAMING_PERMISSIONS,
  rawInputExamples,
  normalizedOutputExamples,
  normalizeGamingContext,
  generateWikiEntries
} from "../../src/categories/gaming.mjs";

test("gaming schema defines preferences, setup, and cadence", () => {
  assert.equal(GAMING_SCHEMA.category, "gaming");
  assert.ok(GAMING_SCHEMA.sections.preferences);
  assert.ok(GAMING_SCHEMA.sections.setup);
  assert.ok(GAMING_SCHEMA.sections.cadence);
});

test("gaming examples exist", () => {
  assert.equal(rawInputExamples.length, 2);
  assert.equal(normalizedOutputExamples.length, 1);
});

test("normalizes explicit gaming context into durable preferences", () => {
  const normalized = normalizeGamingContext({
    explicit_genres: ["RPG", "Action"],
    primary_input: "gamepad",
    play_style: "casual"
  });

  assert.equal(normalized.category, "gaming");
  assert.deepEqual(normalized.preferences.preferred_genres, ["RPG", "Action"]);
  assert.equal(normalized.setup.controller_setup, "gamepad");
  assert.equal(normalized.cadence.play_cadence, "casual");
  assert.equal(normalized.dropped_fields.length, 0);

  const wiki = generateWikiEntries(normalized);
  assert.equal(wiki.length, 3);
});

test("activity is not identity: single test play does not create durable interest", () => {
  const normalized = normalizeGamingContext({
    recent_play: "Strategy",
    session_duration_mins: 15 // Short session
  });

  assert.equal(normalized.preferences.preferred_genres, undefined);
  assert.ok(normalized.dropped_fields.includes("recent_play"));
  assert.equal(normalized.pending_approval_queue.length, 1);
  assert.equal(normalized.pending_approval_queue[0].field, "recent_play");
  
  const wiki = generateWikiEntries(normalized);
  assert.equal(wiki.length, 0); // No wiki entries should be generated for dropped fields
});

test("extended play creates durable interest", () => {
  const normalized = normalizeGamingContext({
    recent_play: "MMORPG",
    session_duration_mins: 150 // Long session (over 2 hours)
  });

  assert.deepEqual(normalized.preferences.preferred_genres, ["MMORPG"]);
  assert.equal(normalized.dropped_fields.length, 0);
  assert.equal(normalized.pending_approval_queue.length, 0);
});