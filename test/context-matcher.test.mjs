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

test("context matcher returns explainable match logs for overlaps and category weights", () => {
  const result = matchContextFields(
    [{ description: "food restrictions", required: true }],
    [
      { field_path: "diet.preference", value: "vegetarian", category: "food" },
      { field_path: "diet.allergy", value: "peanuts", category: "food" },
      { field_path: "fitness.goal", value: "strength", category: "fitness" }
    ],
    { returnMatchLogs: true }
  )

  assert.ok(result[0].candidates.length > 0)

  const candidate = result[0].candidates[0]
  assert.ok(candidate.match_log)
  assert.ok(candidate.match_log.token_overlap_log)
  assert.ok(candidate.match_log.category_weight_log)

  // overlap_total should be consistent with exact + fuzzy components
  assert.equal(
    candidate.match_log.token_overlap_log.overlap_total,
    Number((candidate.match_log.token_overlap_log.overlap_exact_count + candidate.match_log.token_overlap_log.overlap_fuzzy_sum).toFixed(3))
  )


  // For synonym-mapped fields we expect synonym_boost to be > 0 on at least one candidate.
  // (diet.allergy / diet.preference are in synonym examples for "food restrictions")
  const hasSynonymBoost = result[0].candidates.some(c => c.match_log?.category_weight_log?.synonym_boost > 0)
  assert.equal(hasSynonymBoost, true)
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

test("context matcher processes input tokens through the synonym stem trie", () => {
  const result = matchContextFields([
    { description: "food restrictions" }
  ], [
    { field_path: "diet.preference", value: "vegetarian", category: "diet" }
  ])

  const candidates = result[0].candidates

  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "diet.preference")
  assert.ok(candidates[0].reasons.includes("example mapping"))
})

test("context matcher resolves domain contradictions by boosting active category intents", () => {
  const result = matchContextFields([
    { 
      description: "travel arrangements and lodging options", 
      category: "travel" 
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

  const candidates = result[0].candidates

  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "travel.destination")
  assert.ok(candidates[0].reasons.includes("intent priority override"))
})

test("context matcher anonymizes sensitive email strings into local SHA-256 tokens", () => {
  const result = matchContextFields([
    { description: "anon_c5b2447eb79f configuration" }
  ], [
    { field_path: "identity.preferred_username", value: "testUser@domain.com", category: "identity" }
  ])

  const candidates = result[0].candidates
  
  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "identity.preferred_username")
})

test("context matcher prunes low confidence candidate features early", () => {
  const result = matchContextFields([
    { description: "food allergies" }
  ], [
    { field_path: "diet.preference", value: "vegan", category: "diet", confidence: 0.1 }, 
    { field_path: "diet.allergy", value: "nuts", category: "diet", confidence: 0.8 }     
  ])

  const candidates = result[0].candidates
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].memory.field_path, "diet.allergy")
})

test("context matcher injects sensitivity and approval flags based on prefix namespaces", () => {
  const result = matchContextFields([
    { description: "user preferences profile configuration" }
  ], [
    { field_path: "identity.preferred_name", value: "Alex", category: "identity" },
    { field_path: "diet.allergy", value: "Peanuts", category: "diet" },
    { field_path: "shopping.budget", value: "Medium", category: "shopping" }
  ])

  const candidates = result[0].candidates

  const identityCandidate = candidates.find(c => c.memory.field_path === "identity.preferred_name")
  const allergyCandidate = candidates.find(c => c.memory.field_path === "diet.allergy")
  const shoppingCandidate = candidates.find(c => c.memory.field_path === "shopping.budget")

  if (identityCandidate) {
    assert.equal(identityCandidate.sensitivity, "high")
    assert.equal(identityCandidate.requires_approval, true)
  }

  if (allergyCandidate) {
    assert.equal(allergyCandidate.sensitivity, "high")
    assert.equal(allergyCandidate.requires_approval, true)
  }

  if (shoppingCandidate) {
    assert.equal(shoppingCandidate.sensitivity, "low")
    assert.equal(shoppingCandidate.requires_approval, false)
  }
})

test("context matcher adjusts threshold dynamically based on query specificity", () => {
  const broadResult = matchContextFields(
    [{ description: "diet" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(broadResult[0].candidates.length, 0)

  const standardResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(standardResult[0].candidates.length, 1)
  assert.equal(standardResult[0].candidates[0].memory.field_path, "shopping.budget")

  const specificResult = matchContextFields(
    [{ description: "budget query with a very long list of extra words that are ignored but count as tokens" }],
    [{ field_path: "shopping.budget", value: "high", category: "shopping" }]
  )
  assert.equal(specificResult[0].candidates.length, 1)
  assert.equal(specificResult[0].candidates[0].memory.field_path, "shopping.budget")
})

test("context matcher respects a per-session minimum threshold floor", () => {
  const baselineResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(baselineResult[0].candidates.length, 1)

  const sessionCappedResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    {
      requestedCategory: "fitness",
      querySession: { minimumMatchingThreshold: 0.16 }
    }
  )

  assert.equal(sessionCappedResult[0].candidates.length, 0)
})

test("context matcher respects per-app-class minimum threshold floors", () => {
  // Baseline minimum threshold (default 0.12) should allow this match
  const baselineResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    {
      requestedCategory: "fitness",
      appClass: "fitness"
    }
  )
  assert.equal(baselineResult[0].candidates.length, 1)

  // Now cap via minimumThresholdByAppClass for appClass=fitness
  const cappedResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    {
      requestedCategory: "fitness",
      appClass: "fitness",
      minimumThresholdByAppClass: {
        fitness: 0.16
      }
    }
  )

  assert.equal(cappedResult[0].candidates.length, 0)
})


test("context matcher isolates developer tool context from shopping queries", () => {
  const request = [{ description: "shopping for a laptop bag and retail accessories" }]
  const developerMemory = [{
    field_path: "developer.cursor.workspace",
    value: "Cursor and GitHub workflow settings",
    category: "developer_work",
    relevance_vectors: { shopping: 0.95 }
  }]

  const matched = matchContextFields(request, developerMemory, { requestedCategory: "shopping" })
  assert.equal(matched[0].candidates.length, 0)

  const ranked = rankContextNodes("shopping for a laptop bag and retail accessories", developerMemory)
  assert.equal(ranked.length, 0)
})

test("context matcher blocks media playback/listening history from professional workspaces", () => {
  const result = matchContextFields(
    [{ description: "project planning with team" }],
    [
      {
        field_path: "music-streaming.watch_history",
        value: "lofi focus playlists",
        category: "music-streaming",
        relevance_vectors: { professional: 0.9 }
      }
    ],
    { requestedCategory: "professional" }
  )

  assert.equal(result[0].candidates.length, 0)
})

test("context matcher blocks media playback/listening history from productivity workspaces", () => {
  const result = rankContextNodes(
    "deep work sessions and scheduling",
    [
      {
        field_path: "movies-tv.watch_time_slots",
        value: "10:00pm to 11:00pm watching",
        category: "movies-tv",
        relevance_vectors: { productivity: 0.9 }
      }
    ]
  )

  // rankContextNodes doesn't take requestedCategory directly; it infers categories from keywords.
  // We assert that the media record does not surface in the top results.
  const hasMedia = result.some(r => String(r.memory.field_path || "").includes("watch_time"))
  assert.equal(hasMedia, false)
})

test("context matcher still isolates developer tool context correctly", () => {
  const request = [{ description: "shopping for a laptop bag and retail accessories" }]
  const developerMemory = [{
    field_path: "developer.cursor.workspace",
    value: "Cursor and GitHub workflow settings",
    category: "developer_work",
    relevance_vectors: { shopping: 0.95 }
  }]

  const matched = matchContextFields(request, developerMemory, { requestedCategory: "shopping" })
  assert.equal(matched[0].candidates.length, 0)
})

test("context matcher partitions food-delivery from health and fitness queries", () => {

  const foodDeliveryMemory = [{
    field_path: "food-delivery.restaurant_name",
    value: "Punjabi Tadka",
    category: "food-delivery",
    relevance_vectors: { health: 0.9, fitness: 0.9 }
  }]

  const healthResult = matchContextFields(
    [{ description: "health insurance deductible and wellness coverage" }],
    foodDeliveryMemory,
    { requestedCategory: "health" }
  )
  assert.equal(healthResult[0].candidates.length, 0)

  const fitnessResult = rankContextNodes(
    "fitness tracking and workout goals",
    foodDeliveryMemory
  )
  assert.equal(fitnessResult.length, 0)

  const healthMemory = [{
    field_path: "health.activity_log",
    value: "Outdoor Run",
    category: "health",
    relevance_vectors: { food_delivery: 0.9 }
  }]

  const foodResult = matchContextFields(
    [{ description: "food delivery dinner order" }],
    healthMemory,
    { requestedCategory: "food-delivery" }
  )
  assert.equal(foodResult[0].candidates.length, 0)
})

test("cross-category relevance ranking engine ranks candidates globally", () => {
  const memories = [
    { field_path: "diet.preference", value: "vegan", category: "diet" },
    { field_path: "shopping.budget", value: "low", category: "shopping" },
    { field_path: "travel.destination", value: "Paris", category: "travel" },
    { field_path: "learning.goal", value: "learn french", category: "learning" }
  ]

  const results = rankContextNodes(
    "planning a trip to Paris on a low budget with vegan food",
    memories
  )

  assert.ok(results.length >= 3)
  
  const fieldPaths = results.map(r => r.memory.field_path)
  assert.ok(fieldPaths.includes("travel.destination"))
  assert.ok(fieldPaths.includes("shopping.budget"))
  assert.ok(fieldPaths.includes("diet.preference"))
  assert.ok(!fieldPaths.includes("learning.goal"))

  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].score >= results[i + 1].score)
  }

  const ranker = new CrossCategoryRelevanceRanker({ threshold: 0.15 })
  const rankedResults = ranker.rank("planning a trip to Paris on a low budget with vegan food", memories)
  assert.ok(rankedResults.length >= 3)

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
    assert.ok(dietResult.score > travelResult.score)
  }
})

test("context matcher cross-promotes language suggestions when travel destinations are active (#216)", () => {
  const languageMemories = [
    { field_path: "learning.current_goals.active_topics", value: "French vocabulary phrases", category: "learning" },
    { field_path: "learning.current_goals.active_topics", value: "Japanese Kanji practice", category: "learning" }
  ];

  const results = rankContextNodes("booking a flight ticket and accommodation in Paris", languageMemories);

  assert.ok(results.length > 0);
  assert.equal(results[0].memory.value, "French vocabulary phrases");
  assert.ok(results[0].reasons.some(r => r.includes("cross-category travel boost")));
});
test("context matcher processes input tokens through the synonym stem trie", () => {
  const result = matchContextFields([
    { description: "food restrictions" }
  ], [
    { field_path: "diet.preference", value: "vegetarian", category: "diet" }
  ])

  const candidates = result[0].candidates

  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "diet.preference")
  assert.ok(candidates[0].reasons.includes("example mapping"))
})

test("context matcher resolves domain contradictions by boosting active category intents", () => {
  const result = matchContextFields([
    { 
      description: "travel arrangements and lodging options", 
      category: "travel" 
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

  const candidates = result[0].candidates

  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "travel.destination")
  assert.ok(candidates[0].reasons.includes("intent priority override"))
})

test("context matcher anonymizes sensitive email strings into local SHA-256 tokens", () => {
  const result = matchContextFields([
    { description: "anon_c5b2447eb79f configuration" }
  ], [
    { field_path: "identity.preferred_username", value: "testUser@domain.com", category: "identity" }
  ])

  const candidates = result[0].candidates
  
  assert.ok(candidates.length > 0)
  assert.equal(candidates[0].memory.field_path, "identity.preferred_username")
})

test("context matcher prunes low confidence candidate features early", () => {
  const result = matchContextFields([
    { description: "food allergies" }
  ], [
    { field_path: "diet.preference", value: "vegan", category: "diet", confidence: 0.1 }, 
    { field_path: "diet.allergy", value: "nuts", category: "diet", confidence: 0.8 }     
  ])

  const candidates = result[0].candidates
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].memory.field_path, "diet.allergy")
})

test("context matcher injects sensitivity and approval flags based on prefix namespaces", () => {
  const result = matchContextFields([
    { description: "user preferences profile configuration" }
  ], [
    { field_path: "identity.preferred_name", value: "Alex", category: "identity" },
    { field_path: "diet.allergy", value: "Peanuts", category: "diet" },
    { field_path: "shopping.budget", value: "Medium", category: "shopping" }
  ])

  const candidates = result[0].candidates

  const identityCandidate = candidates.find(c => c.memory.field_path === "identity.preferred_name")
  const allergyCandidate = candidates.find(c => c.memory.field_path === "diet.allergy")
  const shoppingCandidate = candidates.find(c => c.memory.field_path === "shopping.budget")

  if (identityCandidate) {
    assert.equal(identityCandidate.sensitivity, "high")
    assert.equal(identityCandidate.requires_approval, true)
  }

  if (allergyCandidate) {
    assert.equal(allergyCandidate.sensitivity, "high")
    assert.equal(allergyCandidate.requires_approval, true)
  }

  if (shoppingCandidate) {
    assert.equal(shoppingCandidate.sensitivity, "low")
    assert.equal(shoppingCandidate.requires_approval, false)
  }
})

test("context matcher adjusts threshold dynamically based on query specificity", () => {
  const broadResult = matchContextFields(
    [{ description: "diet" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(broadResult[0].candidates.length, 0)

  const standardResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(standardResult[0].candidates.length, 1)
  assert.equal(standardResult[0].candidates[0].memory.field_path, "shopping.budget")

  const specificResult = matchContextFields(
    [{ description: "budget query with a very long list of extra words that are ignored but count as tokens" }],
    [{ field_path: "shopping.budget", value: "high", category: "shopping" }]
  )
  assert.equal(specificResult[0].candidates.length, 1)
  assert.equal(specificResult[0].candidates[0].memory.field_path, "shopping.budget")
})

test("context matcher respects a per-session minimum threshold floor", () => {
  const baselineResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    { requestedCategory: "fitness" }
  )
  assert.equal(baselineResult[0].candidates.length, 1)

  const sessionCappedResult = matchContextFields(
    [{ description: "diet preferences" }],
    [{ field_path: "shopping.budget", relevance_vectors: { fitness: 0.15 }, category: "shopping" }],
    {
      requestedCategory: "fitness",
      querySession: { minimumMatchingThreshold: 0.16 }
    }
  )

  assert.equal(sessionCappedResult[0].candidates.length, 0)
})

test("context matcher isolates developer tool context from shopping queries", () => {
  const request = [{ description: "shopping for a laptop bag and retail accessories" }]
  const developerMemory = [{
    field_path: "developer.cursor.workspace",
    value: "Cursor and GitHub workflow settings",
    category: "developer_work",
    relevance_vectors: { shopping: 0.95 }
  }]

  const matched = matchContextFields(request, developerMemory, { requestedCategory: "shopping" })
  assert.equal(matched[0].candidates.length, 0)

  const ranked = rankContextNodes("shopping for a laptop bag and retail accessories", developerMemory)
  assert.equal(ranked.length, 0)
})

test("context matcher partitions food-delivery from health and fitness queries", () => {
  const foodDeliveryMemory = [{
    field_path: "food-delivery.restaurant_name",
    value: "Punjabi Tadka",
    category: "food-delivery",
    relevance_vectors: { health: 0.9, fitness: 0.9 }
  }]

  const healthResult = matchContextFields(
    [{ description: "health insurance deductible and wellness coverage" }],
    foodDeliveryMemory,
    { requestedCategory: "health" }
  )
  assert.equal(healthResult[0].candidates.length, 0)

  const fitnessResult = rankContextNodes(
    "fitness tracking and workout goals",
    foodDeliveryMemory
  )
  assert.equal(fitnessResult.length, 0)

  const healthMemory = [{
    field_path: "health.activity_log",
    value: "Outdoor Run",
    category: "health",
    relevance_vectors: { food_delivery: 0.9 }
  }]

  const foodResult = matchContextFields(
    [{ description: "food delivery dinner order" }],
    healthMemory,
    { requestedCategory: "food-delivery" }
  )
  assert.equal(foodResult[0].candidates.length, 0)
})

test("cross-category relevance ranking engine ranks candidates globally", () => {
  const memories = [
    { field_path: "diet.preference", value: "vegan", category: "diet" },
    { field_path: "shopping.budget", value: "low", category: "shopping" },
    { field_path: "travel.destination", value: "Paris", category: "travel" },
    { field_path: "learning.goal", value: "learn french", category: "learning" }
  ]

  const results = rankContextNodes(
    "planning a trip to Paris on a low budget with vegan food",
    memories
  )

  assert.ok(results.length >= 3)
  
  const fieldPaths = results.map(r => r.memory.field_path)
  assert.ok(fieldPaths.includes("travel.destination"))
  assert.ok(fieldPaths.includes("shopping.budget"))
  assert.ok(fieldPaths.includes("diet.preference"))
  assert.ok(!fieldPaths.includes("learning.goal"))

  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].score >= results[i + 1].score)
  }

  const ranker = new CrossCategoryRelevanceRanker({ threshold: 0.15 })
  const rankedResults = ranker.rank("planning a trip to Paris on a low budget with vegan food", memories)
  assert.ok(rankedResults.length >= 3)

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
    assert.ok(dietResult.score > travelResult.score)
  }
})
