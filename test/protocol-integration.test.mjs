import test from "node:test"
import assert from "node:assert/strict"

import {
  shapeContextProposal,
  shapeContextProposals,
  formSchemaPackets,
  detectSchemas,
  formatSchemaReport,
} from "../src/engine.mjs"
import {
  resolveSchemaLifecycleState,
  transitionSchemaLifecycle,
  transitionClaimState,
  SCHEMA_LIFECYCLE_STATES,
  CLAIM_LIFECYCLE_STATES,
  CLAIM_VISIBILITY,
} from "../src/lifecycle.mjs"
import { MemoryStore } from "../src/memory-store.mjs"

/**
 * E2E Hermetic Protocol Integration Suite
 *
 * Exercises the full Memact open-protocol lifecycle end to end inside a clean
 * sandbox: mock apps emit signals, signals are shaped into context proposals
 * (CAP - Context Approval Protocol), claims move through their approval lifecycle
 * (CCP - Claim/Context lifecycle Protocol), virtual schemas are induced and
 * resolved (CRP - Context Resolution Protocol), memory decays via TTL, and a
 * final audit pass asserts privacy and reversibility guarantees.
 *
 * The suite is hermetic: every test builds its own sandbox, performs no network
 * or filesystem I/O, and shares no mutable state with any other test.
 */

// --- Hermetic sandbox harness -------------------------------------------------

function createSandbox() {
  return {
    apps: new Map(),
    users: new Map(),
    memory: new MemoryStore(),
    signals: [],
  }
}

function registerApp(sandbox, appId, meta = {}) {
  const app = { app_id: appId, ...meta }
  sandbox.apps.set(appId, app)
  return app
}

function registerUser(sandbox, userId, meta = {}) {
  const user = { user_id: userId, ...meta }
  sandbox.users.set(userId, user)
  return user
}

function emitSignal(sandbox, appId, userId, signal) {
  assert.ok(sandbox.apps.has(appId), `unknown app ${appId}`)
  assert.ok(sandbox.users.has(userId), `unknown user ${userId}`)
  const envelope = { app_id: appId, user_id: userId, raw_signal: signal }
  sandbox.signals.push(envelope)
  return envelope
}

// --- 1. Mock apps + users + signals -> CAP proposals --------------------------

test("sandbox shapes raw app signals into pending context proposals", () => {
  const sandbox = createSandbox()
  registerApp(sandbox, "reader-app", { name: "Reader" })
  registerUser(sandbox, "user-1")

  emitSignal(sandbox, "reader-app", "user-1", {
    event_type: "article_completed",
    category: "reading",
    payload: { title: "Deep dives in distributed systems", words_read: 4200 },
  })

  const proposals = shapeContextProposals(sandbox.signals)
  assert.equal(proposals.length, 1)

  const [proposal] = proposals
  assert.equal(proposal.schema_version, "memact.context_proposal.v0")
  assert.equal(proposal.input_kind, "raw_signal")
  assert.equal(proposal.category, "reading")
  // Raw signals are weak evidence and must start unapproved/private.
  assert.equal(proposal.status, "pending")
  assert.equal(proposal.visibility, "private")
  assert.equal(proposal.user_action_required, true)
  assert.ok(proposal.confidence <= 0.4, "raw signal confidence must be weak")
})

test("CAP proposals always carry reversibility + privacy guardrails", () => {
  const proposal = shapeContextProposal({
    raw_signal: { event_type: "search", category: "shopping", payload: { query: "running shoes" } },
  })

  assert.ok(Array.isArray(proposal.guardrails) && proposal.guardrails.length >= 3)
  const joined = proposal.guardrails.join(" ").toLowerCase()
  assert.match(joined, /activity is not identity/)
  assert.match(joined, /accept|edit|reject|delete/)
  assert.match(joined, /reversible/)

  // Lifecycle history must be seeded so the claim is auditable from creation.
  assert.equal(proposal.lifecycle_history[0].to_status, "pending")
  assert.equal(proposal.lifecycle_history[0].from_status, null)
})

// --- 2. CCP: claim/context approval lifecycle ---------------------------------

test("CCP drives a proposal through approve -> hide -> unhide -> delete", () => {
  let claim = shapeContextProposal({
    raw_signal: { event_type: "purchase", category: "shopping", payload: { item: "headphones" } },
  })

  claim = transitionClaimState(claim, "approve")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.SHARED)
  assert.equal(claim.revoked_at, null)

  claim = transitionClaimState(claim, "hide", { reason: "user_paused_sharing" })
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.HIDDEN)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.PRIVATE)
  assert.ok(claim.revoked_at, "hiding must record a revocation timestamp")

  claim = transitionClaimState(claim, "unhide")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.SHARED)

  claim = transitionClaimState(claim, "delete")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.DELETED)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.PRIVATE)

  // Every transition is appended; the trail must be complete and ordered.
  const actions = claim.lifecycle_history.map((e) => e.action)
  assert.deepEqual(actions, ["created", "approve", "hide", "unhide", "delete"])
})

test("CCP rejection revokes sharing and stays private", () => {
  let claim = shapeContextProposal({ context: { note: "likes jazz" }, category: "music" })
  claim = transitionClaimState(claim, "reject", { reason: "not_accurate" })
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.REJECTED)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.PRIVATE)
  assert.ok(claim.revoked_at)
})

// --- 3. CRP: virtual schema induction + lifecycle resolution ------------------

test("CRP resolves schema lifecycle states from accumulated metrics", () => {
  const thresholds = { minSupport: 3 }

  assert.equal(
    resolveSchemaLifecycleState({ support: 1, confidence: 0.3 }, thresholds),
    SCHEMA_LIFECYCLE_STATES.EMERGING,
  )
  assert.equal(
    resolveSchemaLifecycleState({ support: 6, confidence: 0.6 }, thresholds),
    SCHEMA_LIFECYCLE_STATES.REPEATED,
  )
  assert.equal(
    resolveSchemaLifecycleState({ support: 9, confidence: 0.8, activeDayCount: 3 }, thresholds),
    SCHEMA_LIFECYCLE_STATES.REINFORCED,
  )
  // User and contradiction signals override accumulated support.
  assert.equal(
    resolveSchemaLifecycleState({ support: 9, confidence: 0.9, contradiction_count: 2 }, thresholds),
    SCHEMA_LIFECYCLE_STATES.CONTRADICTED,
  )
  assert.equal(
    resolveSchemaLifecycleState({ support: 9, confidence: 0.9, user_rejected: true }, thresholds),
    SCHEMA_LIFECYCLE_STATES.USER_REJECTED,
  )
})

test("CRP transitions a schema and preserves an append-only event log", () => {
  let schema = { id: "s1", lifecycle_state: SCHEMA_LIFECYCLE_STATES.EMERGING }
  schema = transitionSchemaLifecycle(schema, { action: "repeat", reason: "seen again" })
  assert.equal(schema.lifecycle_state, SCHEMA_LIFECYCLE_STATES.REPEATED)
  schema = transitionSchemaLifecycle(schema, { action: "reinforce" })
  assert.equal(schema.lifecycle_state, SCHEMA_LIFECYCLE_STATES.REINFORCED)
  schema = transitionSchemaLifecycle(schema, { action: "confirm", reason: "user accepted" })
  assert.equal(schema.lifecycle_state, SCHEMA_LIFECYCLE_STATES.USER_CONFIRMED)

  assert.deepEqual(
    schema.lifecycle_events.map((e) => e.action),
    ["repeat", "reinforce", "confirm"],
  )
  assert.ok(schema.state_label.length > 0)
})

test("CRP induces virtual schemas from repeated meaningful records", () => {
  // Repeated meaningful activity sharing a theme anchor across distinct,
  // co-occurring concepts and sources is what induces a virtual schema.
  const records = [
    { id: "r1", source_label: "YC founder interview about shipping MVPs", canonical_themes: ["startup"], sources: [{ domain: "youtube.com" }] },
    { id: "r2", source_label: "Search: how to launch product fast", canonical_themes: ["startup"], sources: [{ domain: "google.com" }] },
    { id: "r3", source_label: "Essay about proof before permission", canonical_themes: ["startup"], sources: [{ domain: "example.com" }] },
    { id: "r4", source_label: "Notes on validating an early startup idea", canonical_themes: ["startup"], sources: [{ domain: "substack.com" }] },
  ]

  const detection = detectSchemas({ schema_version: "memact.inference.v0", records })
  assert.equal(detection.schema_version, "memact.schema.v0")
  assert.ok(detection.schemas.length >= 1, "repeated evidence should induce a schema")

  // The human-readable report is part of the protocol surface; it must render.
  const report = formatSchemaReport(detection)
  assert.match(report, /Memact Context Report/)
  assert.match(report, /Virtual Context Patterns/)
})

// --- 4. Memory decay in a clean sandbox ---------------------------------------

test("memory decays after TTL and survives within TTL", async () => {
  const sandbox = createSandbox()
  sandbox.memory.save("ephemeral", { claim: "browsing late-night news" }, 40)
  sandbox.memory.save("durable", { claim: "prefers dark mode" }, 10_000)

  assert.deepEqual(sandbox.memory.get("ephemeral"), { claim: "browsing late-night news" })

  await new Promise((resolve) => setTimeout(resolve, 80))

  assert.equal(sandbox.memory.get("ephemeral"), null, "expired memory must decay")
  assert.deepEqual(sandbox.memory.get("durable"), { claim: "prefers dark mode" })
})

test("prune sweeps only expired entries", async () => {
  const sandbox = createSandbox()
  sandbox.memory.save("a", { v: 1 }, 5)
  sandbox.memory.save("b", { v: 2 }, 10_000)
  sandbox.memory.save("c", { v: 3 }) // no TTL -> permanent

  await new Promise((resolve) => setTimeout(resolve, 40))
  sandbox.memory.prune()

  assert.equal(sandbox.memory.get("a"), null)
  assert.deepEqual(sandbox.memory.get("b"), { v: 2 })
  assert.deepEqual(sandbox.memory.get("c"), { v: 3 })
})

// --- 5. Audit pass: privacy + reversibility guarantees ------------------------

test("audit: secrets in signal payloads are stripped before shaping", () => {
  const proposal = shapeContextProposal({
    raw_signal: {
      event_type: "login",
      category: "security",
      payload: {
        username: "ada",
        password: "hunter2",
        api_key: "sk-live-" + "123",
        session_token: "abc.def",
        otp: "000111",
      },
    },
  })

  const serialized = JSON.stringify(proposal)
  assert.doesNotMatch(serialized, /hunter2/, "passwords must not leak")
  assert.doesNotMatch(serialized, /sk-live-123/, "api keys must not leak")
  assert.doesNotMatch(serialized, /abc\.def/, "tokens must not leak")
  assert.doesNotMatch(serialized, /000111/, "otp must not leak")
  // Non-sensitive fields are retained.
  assert.match(serialized, /ada/)
})

test("audit: full E2E run leaves every memory reversible and no orphan sharing", () => {
  const sandbox = createSandbox()
  registerApp(sandbox, "news-app")
  registerApp(sandbox, "music-app")
  registerUser(sandbox, "user-7")

  emitSignal(sandbox, "news-app", "user-7", {
    event_type: "article_completed",
    category: "reading",
    payload: { title: "Protocol design" },
  })
  emitSignal(sandbox, "music-app", "user-7", {
    event_type: "track_liked",
    category: "music",
    payload: { artist: "Nina Simone" },
  })

  const claims = shapeContextProposals(sandbox.signals)
    .map((proposal, i) => transitionClaimState(proposal, i === 0 ? "approve" : "reject"))

  for (const claim of claims) {
    // Reversibility invariant: shared claims can be revoked; private ones stay private.
    if (claim.visibility === CLAIM_VISIBILITY.SHARED) {
      assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.APPROVED)
      const revoked = transitionClaimState(claim, "delete")
      assert.equal(revoked.visibility, CLAIM_VISIBILITY.PRIVATE)
      assert.ok(revoked.revoked_at)
    } else {
      assert.equal(claim.visibility, CLAIM_VISIBILITY.PRIVATE)
    }
    // Audit invariant: every claim has a complete, ordered history starting at creation.
    assert.equal(claim.lifecycle_history[0].action, "created")
  }
})
