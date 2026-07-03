import test from "node:test"
import assert from "node:assert/strict"

import {
  CLAIM_CLASSES,
  CLAIM_CLASS_SPECS,
  normalizeClaimClass,
  getClaimClassSpec,
  inferClaimClass,
  validateClaimClass,
  shapeContextProposal,
} from "../src/engine.mjs"

// --- class definitions --------------------------------------------------------

test("defines the four claim classes with distinct lifetimes", () => {
  assert.deepEqual(Object.values(CLAIM_CLASSES).sort(), ["habit", "identity", "intent", "preference"])
  assert.equal(CLAIM_CLASS_SPECS.intent.lifetime, "short")
  assert.equal(CLAIM_CLASS_SPECS.habit.lifetime, "medium")
  assert.equal(CLAIM_CLASS_SPECS.preference.lifetime, "long")
  assert.equal(CLAIM_CLASS_SPECS.identity.lifetime, "persistent")
  // Intents decay quickly, identity never auto-expires.
  assert.ok(CLAIM_CLASS_SPECS.intent.ttl_ms < CLAIM_CLASS_SPECS.habit.ttl_ms)
  assert.equal(CLAIM_CLASS_SPECS.identity.ttl_ms, null)
})

test("normalizeClaimClass accepts known classes and rejects others", () => {
  assert.equal(normalizeClaimClass("Identity"), "identity")
  assert.equal(normalizeClaimClass(" HABIT "), "habit")
  assert.equal(normalizeClaimClass("nonsense"), null)
  assert.equal(getClaimClassSpec("preference").requires_explicit_statement, true)
  assert.equal(getClaimClassSpec("bogus"), CLAIM_CLASS_SPECS.intent) // safe fallback
})

// --- inference ----------------------------------------------------------------

test("infers identity from stable core details", () => {
  assert.equal(inferClaimClass({ context: { full_name: "Ada Lovelace" } }), "identity")
  assert.equal(inferClaimClass({ title: "My name is Ada" }), "identity")
})

test("infers preference from explicit first-person statements", () => {
  assert.equal(inferClaimClass({ title: "I prefer dark roast coffee" }), "preference")
  assert.equal(inferClaimClass({ explicit: true, context: { theme: "dark" } }), "preference")
})

test("infers intent from short-lived goal language", () => {
  assert.equal(inferClaimClass({ title: "Want to book a dentist appointment" }), "intent")
})

test("defaults inferred observations to habit", () => {
  assert.equal(inferClaimClass({ raw_signal: { event_type: "played_song" }, kind: "raw_signal" }), "habit")
})

test("an explicitly declared claim_class wins over inference", () => {
  assert.equal(inferClaimClass({ claim_class: "intent", title: "I prefer tea" }), "intent")
})

// --- validation enforcement ---------------------------------------------------

test("habit requires repeated evidence", () => {
  const verdict = validateClaimClass({ claim_class: "habit", support: 1 }, { confidence: 0.6 })
  assert.equal(verdict.valid, false)
  assert.ok(verdict.violations.some((v) => v.rule === "insufficient_support"))

  const ok = validateClaimClass({ claim_class: "habit", support: 4 }, { confidence: 0.6 })
  assert.equal(ok.valid, true)
})

test("preference requires an explicit statement and confidence floor", () => {
  const inferred = validateClaimClass({ claim_class: "preference", context: { genre: "jazz" } }, { confidence: 0.8 })
  assert.equal(inferred.valid, false)
  assert.equal(inferred.requires_confirmation, true)

  const explicit = validateClaimClass({ claim_class: "preference", explicit: true }, { confidence: 0.8 })
  assert.equal(explicit.valid, true)
})

test("identity demands high confidence and confirmation", () => {
  const weak = validateClaimClass({ claim_class: "identity", explicit: true }, { confidence: 0.4 })
  assert.equal(weak.valid, false)
  assert.ok(weak.violations.some((v) => v.rule === "min_confidence"))

  const strong = validateClaimClass({ claim_class: "identity", explicit: true }, { confidence: 0.9 })
  assert.equal(strong.valid, true)
})

test("intent tolerates low confidence and no repeated evidence", () => {
  const verdict = validateClaimClass({ claim_class: "intent", support: 0 }, { confidence: 0.35 })
  assert.equal(verdict.valid, true)
})

// --- shapeContextProposal integration ----------------------------------------

test("proposals carry the resolved claim_class and lifetime profile", () => {
  const proposal = shapeContextProposal({
    raw_signal: { category: "music", event_type: "played_song", payload: { artist: "Nina Simone" } },
  })
  assert.equal(proposal.claim_class, "habit")
  assert.equal(proposal.claim_class_profile.lifetime, "medium")
  assert.equal(proposal.claim_class_profile.ttl_ms, CLAIM_CLASS_SPECS.habit.ttl_ms)
  assert.equal(typeof proposal.class_validation.valid, "boolean")
})

test("an explicit claim_class option overrides inference on the proposal", () => {
  const proposal = shapeContextProposal(
    { category: "tasks", context: { goal: "ship release" } },
    { claim_class: "intent" },
  )
  assert.equal(proposal.claim_class, "intent")
  assert.equal(proposal.claim_class_profile.lifetime, "short")
})

test("explicit preference proposal validates as a long-lived preference", () => {
  const proposal = shapeContextProposal({
    category: "coffee",
    title: "I prefer dark roast",
    context: { roast: "dark" },
    source_trail: [{ type: "app_evidence", evidence: ["user said so"] }],
  })
  assert.equal(proposal.claim_class, "preference")
  assert.equal(proposal.confidence, 0.7)
  assert.equal(proposal.class_validation.valid, true)
  assert.equal(proposal.claim_class_profile.decays, false)
})

test("identity inferred from a data field is flagged for confirmation", () => {
  const proposal = shapeContextProposal({
    category: "profile",
    context: { hometown: "Lisbon" },
  })
  assert.equal(proposal.claim_class, "identity")
  assert.equal(proposal.class_validation.requires_confirmation, true)
  assert.equal(proposal.class_validation.valid, false)
})
