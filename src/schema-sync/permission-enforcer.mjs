import { registry } from "../registry.mjs";

/**
 * Enforce sensitive-section rules on schema artifacts.
 *
 * Current repo capability: CategoryRegistry can tell sensitive fields for a category.
 * We leverage that for artifact definitions that include category and sensitive field markers.
 */

export function getCategoryFromArtifact(artifact) {
  const def = artifact?.compiled_output?.definition || artifact?.definition;
  return def?.category;
}

export function filterArtifactForPermissions({ artifact, scopes = [] }) {
  const category = getCategoryFromArtifact(artifact);
  if (!category) return { ok: false, reason: "missing_category" };

  // If no scopes supplied, return sanitized failure.
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return { ok: false, reason: "no_scopes" };
  }

  // Simple model: if category is known, sensitive fields are blocked unless caller has
  // any scope that starts with `${category}:` or a wildcard.
  const sensitive = registry.getSensitiveFields(category);
  const hasWildcard = scopes.includes("*");
  if (hasWildcard) return { ok: true, artifact };

  // Caller must have at least one scope that matches the category namespace.
  const hasCategoryScope = scopes.some((s) => String(s).toLowerCase().startsWith(`${String(category).toLowerCase()}:`));
  if (!hasCategoryScope) {
    return { ok: false, reason: "scope_not_allowed" };
  }

  // If artifact includes a definition with sensitive_signals, we keep it but blank
  // sensitive fields unless caller scope indicates deeper approval.
  const def = artifact.compiled_output?.definition;
  const cloned = structuredClone(artifact);
  const defCloned = cloned.compiled_output.definition;

  if (defCloned?.sections?.sensitive_signals?.fields) {
    for (const [field, meta] of Object.entries(defCloned.sections.sensitive_signals.fields)) {
      if (meta?.sensitive) {
        defCloned.sections.sensitive_signals.fields[field] = {
          ...meta,
          description: meta.description,
          value: undefined,
          redacted: true
        };
      }
    }
  }

  return { ok: true, artifact: cloned, sensitive_fields: [...sensitive] };
}

