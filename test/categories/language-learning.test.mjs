import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGE_LEARNING_SCHEMA,
  LANGUAGE_LEARNING_PERMISSIONS,
  rawInputExamples,
  normalizedOutputExamples,
  normalizeLanguageLearningContext,
  generateWikiEntries
} from "../../src/categories/language-learning.mjs";

test("language-learning schema defines goals and progress sections", () => {
  assert.equal(LANGUAGE_LEARNING_SCHEMA.category, "language_learning");
  assert.ok(LANGUAGE_LEARNING_SCHEMA.sections.goals);
  assert.ok(LANGUAGE_LEARNING_SCHEMA.sections.progress);
});

test("language-learning examples exist", () => {
  assert.equal(rawInputExamples.length, 2);
  assert.equal(normalizedOutputExamples.length, 1);
});

test("normalizes explicit language learning context", () => {
  const normalized = normalizeLanguageLearningContext({
    explicit_targets: ["Spanish", "French"],
    daily_goal_mins: 20,
    current_streak: 5
  });

  assert.equal(normalized.category, "language_learning");
  assert.deepEqual(normalized.goals.target_languages, ["Spanish", "French"]);
  assert.equal(normalized.goals.daily_duration_goal_mins, 20);
  assert.equal(normalized.progress.active_streak_days, 5);
  assert.equal(normalized.dropped_fields.length, 0);

  const wiki = generateWikiEntries(normalized);
  assert.equal(wiki.length, 3);
});

test("activity is not identity: single lesson drops language from durable goals", () => {
  const normalized = normalizeLanguageLearningContext({
    recent_lesson_language: "German",
    total_lessons_completed: 1, // Too few
    current_streak: 1
  });

  assert.equal(normalized.goals.target_languages, undefined);
  assert.ok(normalized.dropped_fields.includes("recent_lesson_language"));
  assert.equal(normalized.pending_approval_queue.length, 1);
});

test("repeated lessons solidify durable interest", () => {
  const normalized = normalizeLanguageLearningContext({
    recent_lesson_language: "Japanese",
    total_lessons_completed: 5, // Sufficient repetition
    current_streak: 3
  });

  assert.deepEqual(normalized.goals.target_languages, ["Japanese"]);
  assert.equal(normalized.progress.active_streak_days, 3);
  assert.equal(normalized.dropped_fields.length, 0);
});

test("dialect/locale hierarchy: explicit wins over activity hints", () => {
  const normalized = normalizeLanguageLearningContext({
    explicit_targets: ["Spanish"],
    daily_goal_mins: 10,
    current_streak: 2,

    explicit_locale: "en-US",
    activity_locale_hint: "en-GB",

    activity_dialect_hint: "British English"
  });

  assert.equal(normalized.goals.dialect_preferences.target_locale, "en-US");
  assert.ok(normalized.dropped_fields.length === 0 || !normalized.dropped_fields.includes("activity_locale_hint"));
  assert.equal(normalized.pending_approval_queue.length, 0);
});

test("dialect/locale hierarchy: activity hints are held for review", () => {
  const normalized = normalizeLanguageLearningContext({
    recent_lesson_language: "French",
    total_lessons_completed: 1,
    current_streak: 1,

    activity_locale_hint: "fr-FR",
    activity_dialect_hint: "Parisian French"
  });

  assert.equal(normalized.goals.dialect_preferences, undefined);
  assert.ok(normalized.pending_approval_queue.some((q) => q.field === "dialect_preferences"));
});
