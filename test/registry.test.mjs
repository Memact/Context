import test from "node:test"
import assert from "node:assert/strict"
import { registry, CATEGORIES, normalizeFitnessContext, normalizeMusicContext } from "../src/engine.mjs"

test("registry lists categories", () => {
  const list = registry.listCategories()
  assert.ok(list.includes("fitness"))
  assert.ok(list.includes("music-streaming"))
  assert.equal(list.length, CATEGORIES.length)
})

test("registry detects sensitive fields", () => {
  const fitnessSensitive = registry.getSensitiveFields("fitness")
  assert.ok(fitnessSensitive.has("allergies"))
  assert.ok(fitnessSensitive.has("medical_restrictions"))
})

test("registry validates field values", () => {
  // Unknown category fails
  const res1 = registry.validateValue("unknown-cat", "some_field", "value")
  assert.equal(res1.ok, false)
  assert.ok(res1.error.includes("Unknown category"))

  // Valid category and field passes
  const res2 = registry.validateValue("fitness", "activity_level", "high")
  assert.equal(res2.ok, true)

  // Missing sensitive field value fails
  const res3 = registry.validateValue("fitness", "allergies", null)
  assert.equal(res3.ok, false)
  assert.ok(res3.error.includes("cannot be empty"))
})

test("legacy normalizeFitnessContext works", () => {
  const result = normalizeFitnessContext({
    source: "NutriPlan Lite",
    type: "preference",
    explicit: true,
    data: {
      goal: "weight loss",
      activity_level: "active"
    }
  })
  assert.ok(result)
  assert.equal(result.category, "fitness")
  assert.equal(result.preferences.goal, "weight loss")
  assert.equal(result.confidence, "high")
})
