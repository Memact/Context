/**
 * Memact Context - Developer Workspace & IDE Category
 */

export const category = "developer-workspace";

export const contextFields = {
  primary_languages: "Array of dominant programming languages (e.g., JavaScript, Python)",
  preferred_frameworks: "Array of heavily used frameworks (e.g., React, Express, Tailwind)",
  code_generation_style: "Preference for AI output (e.g., comments_only, full_snippets, pseudocode_first)"
};

// Strict Privacy Boundary: Absolutely NO proprietary code or secrets should enter durable memory
export const SENSITIVE_FIELDS = new Set([
  "source_code",
  "api_key",
  "secret",
  "credentials",
  "password",
  "env_vars",
  "db_connection_string",
  "aws_access_key"
]);

export function normalizeWorkspaceContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // 1. Strict Security Guardrails: Scrub any accidentally logged proprietary code or secrets
  const cleanedData = { ...data };
  for (const key of Object.keys(cleanedData)) {
    if (SENSITIVE_FIELDS.has(key)) {
      delete cleanedData[key];
    }
  }

  // 2. Threshold Normalization (Activity != Identity)
  // E.g., Opening a Python script once shouldn't overwrite the primary stack.
  if (type === "activity") {
    return {
      category: "developer-workspace",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Keep workspace details private by default
      is_identity_claim: false,
      data: cleanedData,
      suggestion: "You recently worked with a new language/framework. Should we update your primary stack?",
      needs_review: true
    };
  }

  // 3. Durable IDE Preference Handling
  if (type === "preference") {
    return {
      category: "developer-workspace",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      data: cleanedData,
      suggestion: explicit ? null : "Update your code generation style based on recent prompts?",
      needs_review: !explicit
    };
  }

  return { category: "developer-workspace", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "vscode_extension",
    type: "activity",
    data: {
      primary_languages: ["Python"],
      source_code: "def fetch_data(): return secret_key", // Should be dropped
      api_key: "sk-123456789" // Should be dropped
    }
  },
  {
    source: "cursor_ide",
    type: "preference",
    explicit: true,
    data: {
      code_generation_style: "full_snippets",
      preferred_frameworks: ["React", "Tailwind"]
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "developer-workspace",
    primary_languages: ["Python"]
    // Note: source_code and api_key are intentionally omitted
  },
  {
    category: "developer-workspace",
    code_generation_style: "full_snippets",
    preferred_frameworks: ["React", "Tailwind"]
  }
];

export const proposalOutputExamples = [
  "Primarily codes in {{primary_languages}}.",
  "Prefers working with {{preferred_frameworks}}.",
  "Expects AI to generate code using {{code_generation_style}} style."
];

export const permissionSuggestions = {
  primary_languages: "low",
  preferred_frameworks: "low",
  code_generation_style: "low"
};