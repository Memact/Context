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
/**
 * Cleanup job that scans an array of context items and filters out expired ones.
 * @param {Array} contextList - The array of context objects/proposals
 * @param {string|Date} [now] - Optional reference time for testing overrides
 * @returns {Array} - The filtered list containing only unexpired contexts
 */
export function cleanupExpiredContext(contextList = [], now = new Date()) {
  const referenceTime = new Date(now).getTime();
  
  return (Array.isArray(contextList) ? contextList : []).filter((item) => {
    if (!item.temporary || !item.ttl) return true; // Keep permanent entries or those without a shelf life
    
    const expiryTime = new Date(item.ttl).getTime();
    return expiryTime > referenceTime; // Keep only if expiry is in the future
  });
}

/**
 * Intelligently merges context and promotes a temporary item to permanent 
 * if matching repeated patterns are tracked.
 * @param {Object} currentContext - The active context proposal/record
 * @param {Array} historicalContexts - Past context items to evaluate patterns against
 * @param {Object} options - Threshold requirements (e.g., match count)
 * @returns {Object} - Updated or promoted context object
 */
export function mergeContext(currentContext = {}, historicalContexts = [], options = {}) {
  if (!currentContext.temporary) return currentContext; // Already permanent

  const minMatchesToPromote = options.minMatchesToPromote ?? 2;
  const currentTitle = (currentContext.title || "").toLowerCase().trim();
  const currentCategory = currentContext.category;

  // Track historical matching entries matching the same profile category/title context
  const matchingHistory = historicalContexts.filter((pastItem) => {
    const pastTitle = (pastItem.title || "").toLowerCase().trim();
    return pastItem.category === currentCategory && 
           (pastTitle.includes(currentTitle) || currentTitle.includes(pastTitle));
  });

  // Promote to permanent if repeated patterns clear our target threshold threshold 
  if (matchingHistory.length >= minMatchesToPromote) {
    return {
      ...currentContext,
      temporary: false,
      ttl: null,
      confidence: Math.min(1.0, (currentContext.confidence || 0.5) + 0.2), // Promote structural confidence score
      lifecycle_events: [
        ...(Array.isArray(currentContext.lifecycle_events) ? currentContext.lifecycle_events : []),
        {
          action: "promote",
          state: currentContext.lifecycle_state || "permanent",
          occurred_at: new Date().toISOString(),
          reason: `Pattern repeated ${matchingHistory.length} times in history. Promoted to permanent context.`,
        }
      ]
    };
  }

  return currentContext;
}