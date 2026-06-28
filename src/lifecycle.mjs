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
        occurred_at: new Date().toISOString(),
        reason: options.reason || "user_action"
      }
    ]
  };
}
