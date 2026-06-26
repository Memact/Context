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

test("context matcher injects sensitivity and approval flags based on prefix namespaces", () => {
  const result = matchContextFields([
    { description: "user preferences profile configuration" }
  ], [
    { field_path: "identity.preferred_name", value: "Alex", category: "identity" },
    { field_path: "diet.allergy", value: "Peanuts", category: "diet" },
    { field_path: "shopping.budget", value: "Medium", category: "shopping" }
  ])

  // Extract the graded candidates from the test run matches
  const candidates = result[0].candidates;

  const identityCandidate = candidates.find(c => c.memory.field_path === "identity.preferred_name");
  const allergyCandidate = candidates.find(c => c.memory.field_path === "diet.allergy");
  const shoppingCandidate = candidates.find(c => c.memory.field_path === "shopping.budget");

  // Verify High Sensitivity / Verification Tiers
  if (identityCandidate) {
    assert.equal(identityCandidate.sensitivity, "high");
    assert.equal(identityCandidate.requires_approval, true);
  }

  if (allergyCandidate) {
    assert.equal(allergyCandidate.sensitivity, "high");
    assert.equal(allergyCandidate.requires_approval, true);
  }

  // Verify Low Sensitivity / Automatic Bypass Tiers
  if (shoppingCandidate) {
    assert.equal(shoppingCandidate.sensitivity, "low");
    assert.equal(shoppingCandidate.requires_approval, false);
  }
})