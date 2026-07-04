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
  
  // ✈️ Vacation Mode Guardrail for state graduation
  const isVacationModeActive = !!(thresholds.vacationMode || thresholds.options?.vacationMode || thresholds.session?.vacationMode);
  if (isVacationModeActive && metrics.category) {
    const targetTransientCategories = new Set(["travel", "location", "fitness", "food-delivery", "food_delivery", "dining"]);
    if (targetTransientCategories.has(String(metrics.category).toLowerCase().trim())) {
      // Force it to remain emerging; do not allow it to graduate to repeated or reinforced status
      return SCHEMA_LIFECYCLE_STATES.EMERGING;
    }
  }

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
