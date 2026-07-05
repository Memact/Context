import test from "node:test";
import assert from "node:assert/strict";

import {
  FITNESS_CHALLENGES_SCHEMA,
  wikiEntryTemplates,
  rawInputExamples,
  normalizedOutputExamples,
  FITNESS_CHALLENGES_PERMISSIONS,
  normalizeFitnessChallengesContext,
  validateFitnessChallengesContext,
  generateWikiEntries
} from "../../src/categories/fitness-challenges.mjs";

test("fitness-challenges - schema exports exist", () => {
  assert.equal(FITNESS_CHALLENGES_SCHEMA.category, "fitness-challenges");
  assert.ok(FITNESS_CHALLENGES_SCHEMA.sections.daily_step_goals);
  assert.ok(FITNESS_CHALLENGES_SCHEMA.sections.active_challenge_streaks);
  assert.ok(FITNESS_CHALLENGES_SCHEMA.sections.preferred_challenge_formats);
  assert.ok(
    FITNESS_CHALLENGES_SCHEMA.sections.sensitive_signals.fields.medical_constraints
      .requires_explicit_confirmation
  );
});

test("fitness-challenges - examples exist", () => {
  assert.ok(Array.isArray(rawInputExamples));
  assert.ok(rawInputExamples.length >= 2);
  assert.ok(Array.isArray(normalizedOutputExamples));
  assert.ok(normalizedOutputExamples.length >= 2);
});

test("fitness-challenges - step goal preference normalizes as durable", () => {
  const normalized = normalizeFitnessChallengesContext({
    source: "StepApp",
    type: "step_goal",
    explicit: true,
    data: {
      step_goal: 10000,
      goal_unit: "steps",
      goal_start_date: "2026-01-01"
    }
  });

  assert.equal(normalized.category, "fitness-challenges");
  assert.equal(normalized.stable_preferences.daily_step_goals.step_goal, 10000);
  assert.equal(normalized.stable_preferences.daily_step_goals.goal_unit, "steps");
  assert.equal(normalized.stable_preferences.daily_step_goals.goal_start_date, "2026-01-01");

  // Ensure streak not forced when not provided
  assert.equal(normalized.active_challenge_streaks.active_challenge_name, undefined);

  const wiki = generateWikiEntries(normalized);
  assert.ok(wiki.some((p) => p.id === "wiki_step_goal"));
});

test("fitness-challenges - weak single-day streak requires review (not durable)", () => {
  const normalized = normalizeFitnessChallengesContext({
    source: "StepApp",
    type: "challenge",
    explicit: false,
    data: {
      active_challenge_name: "10k for 30 days",
      current_streak_days: 1,
      streak_goal_steps: 10000,
      streak_last_achieved_date: "2026-01-01",
      evidence_strength: "weak"
    }
  });

  assert.equal(normalized.category, "fitness-challenges");
  assert.equal(normalized.active_challenge_streaks.active_challenge_name, "10k for 30 days");
  assert.equal(normalized.active_challenge_streaks.current_streak_days, 1);
  assert.equal(normalized.needs_review, true);

  const wiki = generateWikiEntries(normalized);
  assert.ok(wiki.some((p) => p.id === "wiki_active_streak"));
  const streakProposal = wiki.find((p) => p.id === "wiki_active_streak");
  assert.equal(streakProposal.requires_user_confirmation, true);
});

test("fitness-challenges - formats normalize and enforce allowed set", () => {
  const normalized = normalizeFitnessChallengesContext({
    source: "StepApp",
    type: "preference",
    explicit: true,
    data: {
      preferred_formats: ["daily", "streak", "unknown", "weekly"],
      preferred_coach_style: "tough"
    }
  });

  assert.deepEqual(normalized.stable_preferences.preferred_challenge_formats.preferred_formats.sort(), ["daily", "streak", "weekly"].sort());
  assert.equal(normalized.stable_preferences.preferred_challenge_formats.preferred_coach_style, "tough");
});

test("fitness-challenges - validator catches invalid enum", () => {
  const validation = validateFitnessChallengesContext({
    type: "challenge",
    explicit: false,
    data: {
      active_challenge_name: "Any",
      current_streak_days: 2,
      evidence_strength: "not-valid"
    }
  });

  assert.equal(validation.ok, false);
});

test("fitness-challenges - wiki templates are user friendly", () => {
  assert.ok(Array.isArray(wikiEntryTemplates));
  assert.ok(wikiEntryTemplates.length >= 2);
  assert.ok(wikiEntryTemplates.every((t) => !/addicted|obsessed|fanatic/i.test(t)));
});

test("fitness-challenges - permissions tier sensitivity exists", () => {
  const scopes = Object.fromEntries(
    FITNESS_CHALLENGES_PERMISSIONS.map((p) => [p.scope, p])
  );

  assert.equal(scopes["fitness-challenges:goals"].sensitivity, "low");
  assert.equal(scopes["fitness-challenges:preferences"].sensitivity, "low");
  assert.equal(scopes["fitness-challenges:streaks"].sensitivity, "medium");
});

