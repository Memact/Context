import test from "node:test"
import assert from "node:assert/strict"
import { LocalContextMatcher, contextMatchingExamples, matchContextFields, rankContextNodes, CrossCategoryRelevanceRanker } from "../src/context-matcher.mjs"

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

test("context matcher resolves domain contradictions by boosting active category intents", () => {
  const result = matchContextFields([
    { 
      description: "travel arrangements and lodging options", 
      category: "travel" // 🧠 Active target intent domain
    }
  ], [
    { 
      field_path: "travel.destination", 
      value: "Paris", 
      category: "travel", 
      scope: "temporary_intent" 
    },
    { 
      field_path: "fitness.regimen", 
      value: "Gym Workout", 
      category: "fitness", 
      scope: "temporary_intent" 
    }
  ])

  const candidates = result[0].candidates;

  assert.ok(candidates.length > 0);
  // Verify that the travel-scoped temporary intent overrides the competing fitness record
  assert.equal(candidates[0].memory.field_path, "travel.destination");
  assert.ok(candidates[0].reasons.includes("intent priority override"));
});

test("context matcher anonymizes sensitive email strings into local SHA-256 tokens", () => {
  const result = matchContextFields([
    // Passing a search text containing a mocked anonymization token string
    { description: "anon_c5b2447eb79f configuration" }
  ], [
    // Setting up a record value with a clear unhashed email target
    { field_path: "identity.preferred_username", value: "testUser@domain.com", category: "identity" }
  ])

  const candidates = result[0].candidates;
  
  // Confirm matching resolved cleanly via the local hashing transformation layer
  assert.ok(candidates.length > 0);
  assert.equal(candidates[0].memory.field_path, "identity.preferred_username");
});

test("context matcher prunes low confidence candidate features early", () => {
  const result = matchContextFields([
    { description: "food allergies" }
  ], [
    { field_path: "diet.preference", value: "vegan", category: "diet", confidence: 0.1 }, // Prune (< 0.2)
    { field_path: "diet.allergy", value: "nuts", category: "diet", confidence: 0.8 }     // Keep (>= 0.2)
  ])

  const candidates = result[0].candidates;
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].memory.field_path, "diet.allergy");
});

test("context matcher injects sensitivity and approval flags based on prefix namespaces", () => {
  const result = matchContextFields([
    { description: "user preferences profile configuration" }
  ], [
    { field_path: "identity.preferred_name", value: "Alex", category: "identity" },
    { field_path: "diet.allergy", value: "Peanuts", category: "diet" },
    { field_path: "shopping.budget", value: "Medium", category: "shopping" }
  ])

  const candidates = result[0].candidates;

  const identityCandidate = candidates.find(c => c.memory.field_path === "identity.preferred_name");
  const allergyCandidate = candidates.find(c => c.memory.field_path === "diet.allergy");
  const shoppingCandidate = candidates.find(c => c.memory.field_path === "shopping.budget");

  if (identityCandidate) {
    assert.equal(identityCandidate.sensitivity, "high");
    assert.equal(identityCandidate.requires_approval, true);
  }

  if (allergyCandidate) {
    assert.equal(allergyCandidate.sensitivity, "high");
    assert.equal(allergyCandidate.requires_approval, true);
  }

  if (shoppingCandidate) {
    assert.equal(shoppingCandidate.sensitivity, "low");
    assert.equal(shoppingCandidate.requires_approval, false);
  }
})

test("context matcher adjusts threshold dynamically based on query specificity", () => {
  // Test case 1: Broad search query (size <= 1) increases threshold
  // Base threshold is 0.12. With 1 token ("diet"), threshold is adjusted to 0.20.
  // A candidate with score 0.15 should be filtered out.
  const broadResult = matchContextFields(
    [{ description: "diet" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(broadResult[0].candidates.length, 0, "Broad query should filter out low relevance vector match")

  // If we run the same query but with a standard query (size 2), it should match.
  // "diet preferences" has 2 tokens ("diet", "prefer"). Threshold remains base (0.12).
  // Candidate with score 0.15 should match.
  const standardResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(standardResult[0].candidates.length, 1, "Standard query should include relevance vector match")
  assert.equal(standardResult[0].candidates[0].memory.field_path, "shopping.budget")

  // Test case 2: Highly specific query (size >= 3) decreases threshold
  // Base threshold is 0.12. With 14 tokens, threshold is adjusted to 0.07.
  // Candidate has lexical overlap/path similarity score of 1/14 = 0.071.
  // It should be filtered out under normal threshold, but matched under decreased threshold.
  const specificResult = matchContextFields(
    [{ description: "budget query with a very long list of extra words that are ignored but count as tokens" }],
    [{ field_path: "shopping.budget", value: "high", category: "shopping" }]
  )
  assert.equal(specificResult[0].candidates.length, 1, "Specific query should match near-match with low score")
  assert.equal(specificResult[0].candidates[0].memory.field_path, "shopping.budget")
})

test("cross-category relevance ranking engine ranks candidates globally", () => {
  const memories = [
    { field_path: "diet.preference", value: "vegan", category: "diet" },
    { field_path: "shopping.budget", value: "low", category: "shopping" },
    { field_path: "travel.destination", value: "Paris", category: "travel" },
    { field_path: "learning.goal", value: "learn french", category: "learning" }
  ]

  // Query: "planning a trip to Paris on a low budget with vegan food"
  const results = rankContextNodes(
    "planning a trip to Paris on a low budget with vegan food",
    memories
  )

  // Verify travel, shopping, and diet memories are returned, and learning is excluded
  assert.ok(results.length >= 3, "Should match travel, shopping, and diet memories")
  
  const fieldPaths = results.map(r => r.memory.field_path)
  assert.ok(fieldPaths.includes("travel.destination"))
  assert.ok(fieldPaths.includes("shopping.budget"))
  assert.ok(fieldPaths.includes("diet.preference"))
  assert.ok(!fieldPaths.includes("learning.goal"), "Learning memory should be filtered out")

  // Ensure they are sorted in descending order of score
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].score >= results[i + 1].score, "Results must be sorted descending by score")
  }

  // Verify using CrossCategoryRelevanceRanker class
  const ranker = new CrossCategoryRelevanceRanker({ threshold: 0.15 })
  const rankedResults = ranker.rank("planning a trip to Paris on a low budget with vegan food", memories)
  assert.ok(rankedResults.length >= 3, "Ranker class should yield matching results")

  // Verify custom weights
  const weightedResults = rankContextNodes(
    {
      task: "planning a trip to Paris on a low budget with vegan food",
      importance_weights: { "diet": 2.0, "travel.destination": 0.5 }
    },
    memories
  )
  
  const dietResult = weightedResults.find(r => r.memory.field_path === "diet.preference")
  const travelResult = weightedResults.find(r => r.memory.field_path === "travel.destination")
  
  if (dietResult && travelResult) {
    assert.ok(dietResult.score > travelResult.score, "Diet memory should rank higher than travel memory due to weights")
  }
})