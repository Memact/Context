/**
 * OAuth→Consent mapping contract for Schema Compilers & Tooling.
 *
 * This module is intentionally pure (no IO): it defines deterministic
 * mapping logic from provider/OAuth scopes to Context category permissions,
 * plus field-level write gating semantics.
 */

/**
 * @typedef {Object} ProviderToContextScopeRule
 * @property {string} provider_scope OAuth scope granted by the IdP/provider.
 * @property {string} context_scope Context scope defined by a category (e.g. "fitness-challenges:streaks").
 */

/**
 * @typedef {Object} ContextPermission
 * @property {string} scope Context scope id.
 * @property {string} sensitivity "low"|"medium"|"high"|string
 * @property {boolean} [default_granted]
 * @property {boolean} [first_write_requires_confirmation]
 */

/**
 * @typedef {Object} EffectiveContextPermission
 * @property {string} scope
 * @property {string} sensitivity
 * @property {boolean} allowed
 * @property {boolean} first_write_requires_confirmation
 */

/**
 * @typedef {Object} OAuthGrantInput
 * @property {string} user_id
 * @property {string} source Source system connected by OAuth.
 * @property {string} provider Provider name/id.
 * @property {string[]} granted_oauth_scopes Scopes actually granted by the user.
 * @property {string} consent_version A version/hash so tooling can audit mapping decisions.
 */

/**
 * @typedef {Object} MappingOutput
 * @property {string} consent_version
 * @property {string} user_id
 * @property {string} source
 * @property {string} provider
 * @property {EffectiveContextPermission[]} effective_context_permissions
 */

/**
 * @param {OAuthGrantInput} grant
 * @param {ProviderToContextScopeRule[]} mappingRules
 * @param {ContextPermission[]} contextPermissionsCatalog
 * @returns {MappingOutput}
 */
export function mapOauthGrantToContextPermissions(grant, mappingRules, contextPermissionsCatalog) {
  const granted = new Set(Array.isArray(grant?.granted_oauth_scopes) ? grant.granted_oauth_scopes : [])

  // Build a quick lookup of context permission metadata
  const permissionByScope = new Map(
    (Array.isArray(contextPermissionsCatalog) ? contextPermissionsCatalog : []).map((p) => [p.scope, p])
  )

  // Determine which Context scopes are granted based on OAuth scopes
  const grantedContextScopes = new Set()
  for (const rule of mappingRules || []) {
    if (rule?.provider_scope && rule?.context_scope && granted.has(rule.provider_scope)) {
      grantedContextScopes.add(rule.context_scope)
    }
  }

  // Create an effective permissions list for all known context scopes.
  const effective = []
  for (const ctxScope of permissionByScopeKeys(permissionByScope)) {
    const meta = permissionByScope.get(ctxScope)
    const allowed = grantedContextScopes.has(ctxScope) || Boolean(meta?.default_granted)

    effective.push({
      scope: ctxScope,
      sensitivity: meta?.sensitivity || "unknown",
      allowed,
      first_write_requires_confirmation: Boolean(meta?.first_write_requires_confirmation)
    })
  }

  return {
    consent_version: String(grant?.consent_version || ""),
    user_id: String(grant?.user_id || ""),
    source: String(grant?.source || ""),
    provider: String(grant?.provider || ""),
    effective_context_permissions: effective
  }
}

/**
 * Decide if a compiler output write should be routed to review for a given field.
 *
 * Compiler outputs in this repo already use the pattern:
 * - `pending_approval_queue`: items with `requires_explicit_confirmation`
 * - `needs_review`: boolean
 *
 * This helper provides a backend-agnostic check.
 *
 * @param {Object} params
 * @param {MappingOutput} params.mappingOutput
 * @param {string} params.required_context_scope
 * @param {"read"|"write"} params.operation
 * @param {boolean} params.is_first_write_for_that_scope
 * @returns {{allowed: boolean, requires_review: boolean}}
 */
export function canCompilerWriteWithConsent({
  mappingOutput,
  required_context_scope,
  operation,
  is_first_write_for_that_scope
}) {
  const perms = mappingOutput?.effective_context_permissions || []
  const perm = perms.find((p) => p.scope === required_context_scope)

  if (!perm) {
    return { allowed: false, requires_review: false }
  }

  if (operation === "write") {
    if (!perm.allowed) return { allowed: false, requires_review: false }
    if (perm.first_write_requires_confirmation && Boolean(is_first_write_for_that_scope)) {
      return { allowed: true, requires_review: true }
    }
    return { allowed: true, requires_review: false }
  }

  // reads are less strict: if permission is allowed, allow.
  if (operation === "read") {
    if (!perm.allowed) return { allowed: false, requires_review: false }
    return { allowed: true, requires_review: false }
  }

  return { allowed: false, requires_review: false }
}

function permissionByScopeKeys(map) {
  return Array.from(map.keys())
}

