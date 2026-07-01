import test from "node:test"
import assert from "node:assert/strict"

import {
  transitionClaimState,
  rollbackClaimState,
  canRollbackClaim,
  getClaimRollbackDepth,
  CLAIM_LIFECYCLE_STATES,
  CLAIM_VISIBILITY,
} from "../src/lifecycle.mjs"

function newClaim() {
  return {
    id: "claim-1",
    status: CLAIM_LIFECYCLE_STATES.PENDING,
    visibility: CLAIM_VISIBILITY.PRIVATE,
    revoked_at: null,
    lifecycle_history: [
      { action: "created", from_status: null, to_status: CLAIM_LIFECYCLE_STATES.PENDING, occurred_at: "2026-01-01T00:00:00.000Z", reason: "system_generated" },
    ],
  }
}

// --- depth helpers ------------------------------------------------------------

test("a freshly created claim has nothing to roll back", () => {
  const claim = newClaim()
  assert.equal(canRollbackClaim(claim), false)
  assert.equal(getClaimRollbackDepth(claim), 0)
  // Rolling back a floor claim is a no-op (returns it unchanged).
  assert.deepEqual(rollbackClaimState(claim), claim)
})

test("depth tracks the number of live forward transitions", () => {
  let claim = transitionClaimState(newClaim(), "approve")
  assert.equal(getClaimRollbackDepth(claim), 1)
  claim = transitionClaimState(claim, "hide")
  assert.equal(getClaimRollbackDepth(claim), 2)
})

// --- single-step rollback restores prior status + flags ----------------------

test("rollback reverses approval and restores previous flags", () => {
  const claim = transitionClaimState(newClaim(), "approve")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(claim.visibility, CLAIM_VISIBILITY.SHARED)

  const rolled = rollbackClaimState(claim, { reason: "user_undo" })
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(rolled.visibility, CLAIM_VISIBILITY.PRIVATE)
  assert.equal(rolled.revoked_at, null)
  assert.equal(rolled.last_action, "rollback")
})

test("rollback reverses a rejection and clears the revocation flag", () => {
  const claim = transitionClaimState(newClaim(), "reject")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.REJECTED)
  assert.ok(claim.revoked_at)

  const rolled = rollbackClaimState(claim)
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(rolled.visibility, CLAIM_VISIBILITY.PRIVATE)
  assert.equal(rolled.revoked_at, null, "revocation flag must be restored to pre-rejection state")
})

test("rollback restores an intermediate flag snapshot (approve -> hide undone)", () => {
  let claim = transitionClaimState(newClaim(), "approve")
  claim = transitionClaimState(claim, "hide")
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.HIDDEN)
  assert.ok(claim.revoked_at)

  const rolled = rollbackClaimState(claim)
  // The state before "hide" was approved + shared + not revoked.
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(rolled.visibility, CLAIM_VISIBILITY.SHARED)
  assert.equal(rolled.revoked_at, null)
})

// --- history is preserved, never corrupted -----------------------------------

test("rollback never mutates or drops historical entries", () => {
  let claim = transitionClaimState(newClaim(), "approve")
  claim = transitionClaimState(claim, "hide")
  const historyBefore = JSON.parse(JSON.stringify(claim.lifecycle_history))

  const rolled = rollbackClaimState(claim)
  // Original entries are untouched and still present in order.
  assert.deepEqual(rolled.lifecycle_history.slice(0, historyBefore.length), historyBefore)
  // A rollback entry was appended recording what it reversed.
  const last = rolled.lifecycle_history.at(-1)
  assert.equal(last.action, "rollback")
  assert.equal(last.to_status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(last.rolled_back_steps, 1)
  assert.equal(last.rolled_back_to_action, "hide")
})

// --- multi-step rollback ------------------------------------------------------

test("rollback can walk back multiple steps at once", () => {
  let claim = transitionClaimState(newClaim(), "approve")
  claim = transitionClaimState(claim, "hide")
  claim = transitionClaimState(claim, "unhide")

  const rolled = rollbackClaimState(claim, { steps: 3 })
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(rolled.visibility, CLAIM_VISIBILITY.PRIVATE)
  assert.equal(rolled.revoked_at, null)
})

test("requesting more steps than available rolls back to creation, not past it", () => {
  const claim = transitionClaimState(newClaim(), "approve")
  const rolled = rollbackClaimState(claim, { steps: 99 })
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(getClaimRollbackDepth(rolled), 0, "nothing left to roll back")
})

// --- rollbacks compose: stepping backward one at a time ----------------------

test("successive single rollbacks unwind the claim transition by transition", () => {
  let claim = transitionClaimState(newClaim(), "approve")
  claim = transitionClaimState(claim, "hide")
  assert.equal(getClaimRollbackDepth(claim), 2)

  claim = rollbackClaimState(claim) // undo hide
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.APPROVED)
  assert.equal(getClaimRollbackDepth(claim), 1)

  claim = rollbackClaimState(claim) // undo approve
  assert.equal(claim.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(getClaimRollbackDepth(claim), 0)

  // Fully unwound: another rollback is a no-op.
  const again = rollbackClaimState(claim)
  assert.equal(again.status, CLAIM_LIFECYCLE_STATES.PENDING)
})

// --- legacy entries without flag snapshots -----------------------------------

test("rollback derives flags for legacy history entries lacking snapshots", () => {
  const legacy = {
    status: CLAIM_LIFECYCLE_STATES.APPROVED,
    visibility: CLAIM_VISIBILITY.SHARED,
    revoked_at: null,
    lifecycle_history: [
      { action: "created", from_status: null, to_status: CLAIM_LIFECYCLE_STATES.PENDING },
      // No from_visibility / from_revoked_at snapshot on this old entry.
      { action: "approve", from_status: CLAIM_LIFECYCLE_STATES.PENDING, to_status: CLAIM_LIFECYCLE_STATES.APPROVED },
    ],
  }
  const rolled = rollbackClaimState(legacy)
  assert.equal(rolled.status, CLAIM_LIFECYCLE_STATES.PENDING)
  assert.equal(rolled.visibility, CLAIM_VISIBILITY.PRIVATE)
})
