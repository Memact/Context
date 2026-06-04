import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFitnessContext } from "../../src/categories/fitness.mjs";

test("fitness - valid explicit preference (NutriPlan Lite onboarding)", () => {
  const rawInput = {
    source: "NutriPlan Lite",
    type: "preference",
    explicit: true,
    data: {
      goal: "weight loss",
      dietary_preference: "vegetarian",
      allergies: ["peanuts", "shellfish"],
      activity_level: "moderate",
      preferred_workout_type: "yoga"
    }
  };

  const result = normalizeFitnessContext(rawInput);
  assert.equal(result.category, "fitness");
  assert.equal(result.observation_type, "explicit_preference");
  assert.equal(result.confidence, "high");
  assert.equal(result.is_identity_claim, true);
  assert.equal(result.needs_review, false);
  assert.deepEqual(result.preferences.allergies, ["peanuts", "shellfish"]);
});

test("fitness - unsafe/overconfident allergy inference", () => {
  // App infers allergy without explicit user consent
  const rawInput = {
    source: "NutriPlan Lite",
    type: "meal",
    explicit: false,
    data: {
      meal_type: "salad",
      allergies: ["gluten"]
    }
  };

  const result = normalizeFitnessContext(rawInput);
  assert.equal(result.status, "rejected");
  assert.match(result.reason, /Sensitive fields.*require explicit/);
});

test("fitness - one-off workouts stay weak (Activity is not identity)", () => {
  const rawInput = {
    source: "NutriPlan Lite",
    type: "activity",
    explicit: false,
    data: {
      workout_type: "cardio",
      duration: 30,
      heart_rate: 160 // extraneous detail should be dropped
    }
  };

  const result = normalizeFitnessContext(rawInput);
  assert.equal(result.observation_type, "weak_observation");
  assert.equal(result.is_identity_claim, false);
  assert.equal(result.confidence, "low");
  assert.equal(result.needs_review, true);
  assert.equal(result.observation, "Completed a cardio");
  assert.match(result.suggestion, /Would you like to add 'cardio'/);
});
