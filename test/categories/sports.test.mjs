import test from "node:test"
import assert from "node:assert/strict"

import {
  SPORTS_PERMISSIONS,
  SPORTS_SCHEMA,
  generateWikiEntries,
  normalizeSportsContext,
  normalizedOutputExamples,
  rawInputExamples,
  validateSportsContext,
  wikiEntryTemplates
} from "../../src/categories/sports.mjs"

test("sports schema separates stable preferences, activity and sensitive signals", () => {
  assert.equal(SPORTS_SCHEMA.category, "sports")

  assert.ok(SPORTS_SCHEMA.sections.stable_preferences)
  assert.ok(SPORTS_SCHEMA.sections.current_activity)
  assert.ok(SPORTS_SCHEMA.sections.sensitive_signals)

  assert.equal(
    SPORTS_SCHEMA.sections.sensitive_signals.fields.injuries.sensitive,
    true
  )
})

test("sports examples exist", () => {
  assert.equal(rawInputExamples.length, 2)
  assert.equal(normalizedOutputExamples.length, 2)

  assert.ok(rawInputExamples[0].favourite_sport)
  assert.ok(rawInputExamples[1].plays)
})

test("favorite sports normalize safely", () => {
  const normalized = normalizeSportsContext({
    favourite_sport: "Football",
    favourite_team: "Manchester United",
    favourite_league: "Premier League",
    cadence: "Weekly"
  })

  assert.equal(normalized.category, "sports")

  assert.deepEqual(normalized.stable_preferences, {
    favorite_sports: ["football"],
    favorite_teams: ["manchester united"],
    favorite_leagues: ["premier league"],
    playing_cadence: "weekly"
  })
})

test("recent activity remains temporary", () => {
  const normalized = normalizeSportsContext({
    last_played: "Football"
  })

  assert.deepEqual(
    normalized.current_activity.recently_played,
    ["football"]
  )

  const wiki = generateWikiEntries(normalized)

  assert.ok(
    wiki.some((entry) => entry.type === "activity")
  )
})

test("injuries require pending approval", () => {
  const normalized = normalizeSportsContext({
    injuries: ["Knee Injury"]
  })

  assert.equal(normalized.pending_approval_queue.length, 1)

  assert.equal(
    normalized.pending_approval_queue[0].field,
    "injuries"
  )

  assert.equal(
    normalized.stable_preferences.injuries,
    undefined
  )
})

test("overconfident fields are dropped", () => {
  const normalized = normalizeSportsContext({
    fan_score: 0.95,
    predicted_favorite_team: "Barcelona"
  })

  assert.deepEqual(
    normalized.dropped_fields.sort(),
    ["fan_score", "predicted_favorite_team"]
  )

  assert.equal(normalized.validation.ok, false)
  assert.equal(
    normalized.validation.reason,
    "overconfident_inference"
  )
})

test("sports permissions follow tiered sensitivity", () => {
  const scopes = Object.fromEntries(
    SPORTS_PERMISSIONS.map(permission => [
      permission.scope,
      permission
    ])
  )

  assert.equal(
    scopes["sports:preferences"].sensitivity,
    "low"
  )

  assert.equal(
    scopes["sports:preferences"].default_granted,
    true
  )

  assert.equal(
    scopes["sports:activity"].sensitivity,
    "medium"
  )

  assert.equal(
    scopes["sports:signals"].sensitivity,
    "high"
  )

  assert.equal(
    scopes["sports:signals"].requires_explicit_wiki_approval,
    true
  )
})

test("wiki templates remain user friendly", () => {
  assert.ok(
    wikiEntryTemplates.some(template =>
      template.includes("favourite")
    )
  )

  assert.ok(
    wikiEntryTemplates.every(template =>
      !/obsessed|addicted|fanatic/i.test(template)
    )
  )
})

test("validation helper detects unsafe inference", () => {
  const validation = validateSportsContext({
    fan_score: 0.95
  })

  assert.equal(validation.ok, false)

  assert.equal(
    validation.reason,
    "overconfident_inference"
  )
})