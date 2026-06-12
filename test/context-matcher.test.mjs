import test from "node:test"
import assert from "node:assert/strict"
import { LocalContextMatcher, contextMatchingExamples, matchContextFields } from "../src/context-matcher.mjs"

test("context matcher maps food restrictions to diet memory examples", () => {
  const result = matchContextFields([
    { description: "food restrictions", required: true }
  ], [
    { field_path: "diet.preference", value: "vegetarian", category: "food" },
    { field_path: "diet.allergy", value: "peanuts", category: "food" },
    { field_path: "fitness.goal", value: "strength", category: "fitness" }
  ])

  assert.deepEqual(result[0].candidates.map((candidate) => candidate.memory.field_path), ["diet.allergy", "diet.preference"])
})

test("context matcher uses generic overlap beyond examples", () => {
  const matcher = new LocalContextMatcher()
  const result = matcher.match([
    { description: "preferred display username", required: false }
  ], [
    { field_path: "identity.preferred_username", value: "keepsloading", category: "identity" },
    { field_path: "shopping.budget", value: "low", category: "shopping" }
  ])
  assert.equal(result[0].candidates[0].memory.field_path, "identity.preferred_username")
})

test("context matching examples cover generic app fields", () => {
  assert.ok(contextMatchingExamples.some((example) => example.app_field === "workout goal"))
  assert.ok(contextMatchingExamples.some((example) => example.app_field === "budget range"))
})

test("context matcher stems words correctly", () => {
  const matcher = new LocalContextMatcher()
  const result = matcher.match([
    { description: "workout goals", required: false }
  ], [
    { field_path: "fitness.goal", value: "strength training", category: "fitness" },
    { field_path: "shopping.budget", value: "low", category: "shopping" }
  ])
  assert.equal(result[0].candidates[0].memory.field_path, "fitness.goal")
})

test("context matcher performs fuzzy matching on typographical errors", () => {
  const matcher = new LocalContextMatcher()
  const result = matcher.match([
    { description: "food alleries", required: false }
  ], [
    { field_path: "diet.allergy", value: "peanuts", category: "diet" },
    { field_path: "shopping.budget", value: "low", category: "shopping" }
  ])
  assert.equal(result[0].candidates[0].memory.field_path, "diet.allergy")
})

test("context matcher utilizes expanded synonym mappings", () => {
  const result1 = matchContextFields([
    { description: "dietary restrictions" }
  ], [
    { field_path: "diet.allergy", value: "dairy free", category: "diet" }
  ])
  assert.equal(result1[0].candidates[0].memory.field_path, "diet.allergy")

  const result2 = matchContextFields([
    { description: "laptop budget" }
  ], [
    { field_path: "shopping.laptop.budget", value: "high", category: "shopping" }
  ])
  assert.equal(result2[0].candidates[0].memory.field_path, "shopping.laptop.budget")
})

