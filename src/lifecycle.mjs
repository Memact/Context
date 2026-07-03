export const SCHEMA_LIFECYCLE_STATES = Object.freeze({
  EMERGING: "emerging",
  REPEATED: "repeated",
  REINFORCED: "reinforced",
  WEAKENED: "weakened",
  CONTRADICTED: "contradicted",
  USER_CONFIRMED: "user_confirmed",
  USER_REJECTED: "user_rejected",
  ARCHIVED: "archived",
});

export function resolveSchemaLifecycleState(metrics = {}, thresholds = {}) {
  if (metrics.user_rejected) return SCHEMA_LIFECYCLE_STATES.USER_REJECTED;
  if (metrics.user_confirmed) return SCHEMA_LIFECYCLE_STATES.USER_CONFIRMED;
  if (metrics.contradiction_count > 0) return SCHEMA_LIFECYCLE_STATES.CONTRADICTED;
  if (metrics.weakened) return SCHEMA_LIFECYCLE_STATES.WEAKENED;
  if (
    metrics.support >= Math.max(thresholds.minSupport * 3, 8) &&
    metrics.confidence >= 0.7 &&
    metrics.activeDayCount >= 2
  ) {
    return SCHEMA_LIFECYCLE_STATES.REINFORCED;
  }
  if (
    metrics.support >= Math.max(thresholds.minSupport * 2, 5) ||
    (metrics.confidence >= 0.56 && metrics.distinctSourceCount >= 2)
  ) {
    return SCHEMA_LIFECYCLE_STATES.REPEATED;
  }
  return SCHEMA_LIFECYCLE_STATES.EMERGING;
}

export function transitionSchemaLifecycle(schema = {}, event = {}) {
  const action = String(event.action || "").trim().toLowerCase();
  const map = {
    confirm: SCHEMA_LIFECYCLE_STATES.USER_CONFIRMED,
    reject: SCHEMA_LIFECYCLE_STATES.USER_REJECTED,
    weaken: SCHEMA_LIFECYCLE_STATES.WEAKENED,
    contradict: SCHEMA_LIFECYCLE_STATES.CONTRADICTED,
    archive: SCHEMA_LIFECYCLE_STATES.ARCHIVED,
    reinforce: SCHEMA_LIFECYCLE_STATES.REINFORCED,
    repeat: SCHEMA_LIFECYCLE_STATES.REPEATED,
  };
  const state = map[action] || schema.lifecycle_state || schema.state || SCHEMA_LIFECYCLE_STATES.EMERGING;
  return {
    ...schema,
    state,
    lifecycle_state: state,
    state_label: schemaLifecycleLabel(state),
    lifecycle_events: [
      ...(Array.isArray(schema.lifecycle_events) ? schema.lifecycle_events : []),
      {
        action: action || "noop",
        state,
        occurred_at: event.occurred_at || new Date().toISOString(),
        reason: String(event.reason || "").trim(),
      },
    ],
  };
}

export function schemaLifecycleLabel(state) {
  const labels = {
    [SCHEMA_LIFECYCLE_STATES.EMERGING]: "Emerging virtual schema",
    [SCHEMA_LIFECYCLE_STATES.REPEATED]: "Repeated virtual schema",
    [SCHEMA_LIFECYCLE_STATES.REINFORCED]: "Reinforced virtual schema",
    [SCHEMA_LIFECYCLE_STATES.WEAKENED]: "Weakened virtual schema",
    [SCHEMA_LIFECYCLE_STATES.CONTRADICTED]: "Contradicted virtual schema",
    [SCHEMA_LIFECYCLE_STATES.USER_CONFIRMED]: "User-confirmed virtual schema",
    [SCHEMA_LIFECYCLE_STATES.USER_REJECTED]: "User-rejected virtual schema",
    [SCHEMA_LIFECYCLE_STATES.ARCHIVED]: "Archived virtual schema",
  };
  return labels[state] || labels[SCHEMA_LIFECYCLE_STATES.EMERGING];
}
// --- Claim Lifecycle Expansion  ---

export const CLAIM_LIFECYCLE_STATES = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  HIDDEN: "hidden",
  ARCHIVED: "archived",
  DELETED: "deleted" // Soft-delete
});

export const CLAIM_VISIBILITY = Object.freeze({
  PRIVATE: "private",
  SHARED: "shared"
});

export function transitionClaimState(claim = {}, action = "", options = {}) {
  const currentStatus = claim.status || CLAIM_LIFECYCLE_STATES.PENDING;
  const currentVisibility = claim.visibility || CLAIM_VISIBILITY.PRIVATE;
  
  let nextStatus = currentStatus;
  let nextVisibility = currentVisibility;
  let revokedAt = claim.revoked_at || null;

  switch (action.trim().toLowerCase()) {
    case "approve":
      nextStatus = CLAIM_LIFECYCLE_STATES.APPROVED;
      nextVisibility = CLAIM_VISIBILITY.SHARED;
      revokedAt = null;
      break;
    case "reject":
      nextStatus = CLAIM_LIFECYCLE_STATES.REJECTED;
      nextVisibility = CLAIM_VISIBILITY.PRIVATE;
      revokedAt = new Date().toISOString();
      break;
    case "hide":
      // Allows user to temporarily hide an approved claim from third-party apps
      nextStatus = CLAIM_LIFECYCLE_STATES.HIDDEN;
      nextVisibility = CLAIM_VISIBILITY.PRIVATE;
      revokedAt = new Date().toISOString();
      break;
    case "unhide":
      // Revert a hidden claim back to approved state
      if (currentStatus === CLAIM_LIFECYCLE_STATES.HIDDEN) {
        nextStatus = CLAIM_LIFECYCLE_STATES.APPROVED;
        nextVisibility = CLAIM_VISIBILITY.SHARED;
        revokedAt = null;
      }
      break;
    case "edit":
      // Edits usually bump status back to approved if it was pending or hidden
      nextStatus = CLAIM_LIFECYCLE_STATES.APPROVED;
      nextVisibility = CLAIM_VISIBILITY.SHARED;
      revokedAt = null;
      break;
    case "delete":
      // Soft-delete to retain a hash of the observation preventing re-suggestion
      nextStatus = CLAIM_LIFECYCLE_STATES.DELETED;
      nextVisibility = CLAIM_VISIBILITY.PRIVATE;
      revokedAt = new Date().toISOString();
      break;
    default:
      break;
  }

  return {
    ...claim,
    status: nextStatus,
    visibility: nextVisibility,
    revoked_at: revokedAt,
    last_action: action.toLowerCase(),
    updated_at: new Date().toISOString(),
    lifecycle_history: [
      ...(Array.isArray(claim.lifecycle_history) ? claim.lifecycle_history : []),
      {
        action: action.toLowerCase(),
        from_status: currentStatus,
        to_status: nextStatus,
        // Snapshot the full flag set on both sides so the transition can be
        // reversed later without recomputing or corrupting the record.
        from_visibility: currentVisibility,
        to_visibility: nextVisibility,
        from_revoked_at: claim.revoked_at || null,
        to_revoked_at: revokedAt,
        occurred_at: new Date().toISOString(),
        reason: options.reason || "user_action"
      }
    ]
  };
}

// --- Reversible Suggestion Status Rollback Machine ----------------------------
// A state machine that walks backward through a claim's lifecycle_history,
// reversing approval/rejection status and restoring previously recorded flags
// (visibility, revocation) WITHOUT mutating or removing any historical entry.
// Every rollback is itself appended to the log, so the record stays intact and
// the machine can keep stepping backward (or a later rollback can undo it).

const ROLLBACK_ACTION = "rollback";

// Visibility/revocation derivable from status, used as a fallback for legacy
// history entries that predate the per-transition flag snapshots.
function deriveVisibilityForStatus(status) {
  return status === CLAIM_LIFECYCLE_STATES.APPROVED ? CLAIM_VISIBILITY.SHARED : CLAIM_VISIBILITY.PRIVATE;
}

function isCreationEntry(entry) {
  return !entry || entry.from_status === null || entry.from_status === undefined;
}

/**
 * Replays the history into the stack of forward transitions that are still
 * "live" — i.e. each rollback entry cancels the transitions it reversed. The
 * top of the returned stack is the most recent change that can be undone.
 */
function liveTransitionStack(history = []) {
  const stack = [];
  for (const entry of history) {
    if (isCreationEntry(entry)) continue; // creation is the floor, not reversible
    if (entry.action === ROLLBACK_ACTION) {
      const undone = Math.max(1, Number(entry.rolled_back_steps ?? 1));
      for (let i = 0; i < undone && stack.length; i += 1) stack.pop();
      continue;
    }
    stack.push(entry);
  }
  return stack;
}

/**
 * How many forward status changes can still be rolled back on this claim.
 */
export function getClaimRollbackDepth(claim = {}) {
  const history = Array.isArray(claim.lifecycle_history) ? claim.lifecycle_history : [];
  return liveTransitionStack(history).length;
}

export function canRollbackClaim(claim = {}) {
  return getClaimRollbackDepth(claim) > 0;
}

/**
 * Walk the claim's status backward by `options.steps` live transitions
 * (default 1), restoring the status and flags recorded before them. The
 * historical log is preserved and a `rollback` entry is appended.
 *
 * @param {object} claim   The claim/suggestion to roll back.
 * @param {object} options { steps?: number, reason?: string }
 * @returns {object} A new claim object; unchanged if there is nothing to undo.
 */
export function rollbackClaimState(claim = {}, options = {}) {
  const history = Array.isArray(claim.lifecycle_history) ? claim.lifecycle_history : [];
  const stack = liveTransitionStack(history);
  if (stack.length === 0) {
    return claim; // only creation (or empty) — cannot roll back past it
  }

  const requested = Number.isFinite(Number(options.steps)) ? Math.trunc(Number(options.steps)) : 1;
  const steps = Math.min(Math.max(1, requested), stack.length);

  // The transition whose "before" snapshot we restore to.
  const target = stack[stack.length - steps];
  const restoredStatus = target.from_status ?? CLAIM_LIFECYCLE_STATES.PENDING;
  const restoredVisibility = target.from_visibility ?? deriveVisibilityForStatus(restoredStatus);
  const restoredRevokedAt = Object.hasOwn(target, "from_revoked_at") ? target.from_revoked_at : (claim.revoked_at || null);

  const now = new Date().toISOString();
  return {
    ...claim,
    status: restoredStatus,
    visibility: restoredVisibility,
    revoked_at: restoredRevokedAt,
    last_action: ROLLBACK_ACTION,
    updated_at: now,
    lifecycle_history: [
      ...history,
      {
        action: ROLLBACK_ACTION,
        from_status: claim.status ?? null,
        to_status: restoredStatus,
        from_visibility: claim.visibility ?? null,
        to_visibility: restoredVisibility,
        from_revoked_at: claim.revoked_at || null,
        to_revoked_at: restoredRevokedAt,
        rolled_back_steps: steps,
        rolled_back_to_action: target.action,
        occurred_at: now,
        reason: options.reason || `rolled_back_${steps}_step${steps === 1 ? "" : "s"}`
      }
    ]
  };
}
