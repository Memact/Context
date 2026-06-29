import { resolveSchemaLifecycleState, schemaLifecycleLabel } from "./lifecycle.mjs";
export { buildMissingContextFields, contextGoalTemplates, groupContextEntry, suggestContextGoal } from "./context-goals.mjs";
export { LocalContextMatcher, SemanticContextMatcher, createContextMatcher, matchContextFields, rankContextNodes, CrossCategoryRelevanceRanker } from "./context-matcher.mjs";

const DEFAULT_MIN_SUPPORT = 3;
const DEFAULT_MIN_MEANINGFUL_SCORE = 0.38;
const DEFAULT_MIN_WEIGHTED_SUPPORT = 1.15;
const DEFAULT_MIN_COHESION = 0.05;
const DEFAULT_MAX_SCHEMAS = 8;

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "before",
  "being",
  "can",
  "com",
  "did",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "into",
  "just",
  "like",
  "not",
  "now",
  "off",
  "once",
  "only",
  "page",
  "that",
  "the",
  "then",
  "this",
  "through",
  "toward",
  "was",
  "were",
  "what",
  "when",
  "where",
  "while",
  "with",
  "your",
]);

const LOW_SIGNAL_TERMS = new Set([
  "account",
  "admin",
  "billing",
  "dashboard",
  "example",
  "home",
  "login",
  "meaningful",
  "page",
  "privacy",
  "profile",
  "settings",
  "signin",
  "signup",
  "source",
  "specific",
  "repeated",
  "activity",
]);

const MUSIC_FIELD_SPECS = [
  { output: "favorite_genres", aliases: ["favorite_genres", "preferred_genres", "liked_genres", "genres"] },
  { output: "disliked_genres", aliases: ["disliked_genres", "skipped_genres", "blocked_genres"] },
  { output: "frequent_artists", aliases: ["frequent_artists", "repeated_artists", "favorite_artists", "artists"] },
  { output: "skipped_artists", aliases: ["skipped_artists", "blocked_artists", "ignored_artists"] },
  { output: "playlist_themes", aliases: ["playlist_themes", "playlist_theme", "mix_theme"] },
  { output: "listening_moods", aliases: ["listening_moods", "mood_tags", "listening_mood"] },
  { output: "discovery_preferences", aliases: ["discovery_preferences", "discovery_mode", "new_music_preference"] },
  { output: "explicit_preferences", aliases: ["explicit_preferences", "direct_preferences", "user_preferences"] },
];

const MUSIC_SENSITIVE_KEYS = new Set([
  "inferred_mood",
  "mood_inference",
  "mental_health",
  "health_condition",
  "diagnosis",
  "religion",
  "politics",
  "sexuality",
  "gender_identity",
  "race",
  "ethnicity",
  "age",
  "location",
]);

const COGNITIVE_DIMENSIONS = {
  action: [
    "apply",
    "build",
    "change",
    "choose",
    "create",
    "debug",
    "decide",
    "finish",
    "fix",
    "launch",
    "learn",
    "make",
    "plan",
    "practice",
    "prepare",
    "prove",
    "publish",
    "ship",
    "solve",
    "start",
    "work",
  ],
  evaluation: [
    "accepted",
    "behind",
    "better",
    "compare",
    "deadline",
    "fail",
    "grade",
    "judge",
    "rank",
    "ready",
    "rejected",
    "score",
    "test",
    "value",
    "worth",
  ],
  identity: [
    "become",
    "career",
    "confidence",
    "founder",
    "future",
    "identity",
    "life",
    "myself",
    "person",
    "self",
  ],
  affect: [
    "anxiety",
    "burnout",
    "feel",
    "fear",
    "focus",
    "guilt",
    "happy",
    "obsessed",
    "overwhelmed",
    "pressure",
    "stress",
    "tired",
  ],
  social: [
    "audience",
    "followers",
    "friends",
    "likes",
    "people",
    "public",
    "recognition",
    "share",
    "social",
    "views",
  ],
};

export function detectSchemas(inferenceOutput, options = {}) {
  const minSupport = Number(options.minSupport ?? DEFAULT_MIN_SUPPORT);
  const minimumMeaningfulScore = Number(options.minimumMeaningfulScore ?? DEFAULT_MIN_MEANINGFUL_SCORE);
  const minWeightedSupport = Number(options.minWeightedSupport ?? DEFAULT_MIN_WEIGHTED_SUPPORT);
  const minCohesion = Number(options.minCohesion ?? DEFAULT_MIN_COHESION);
  const maxSchemas = Number(options.maxSchemas ?? DEFAULT_MAX_SCHEMAS);
  const records = (Array.isArray(inferenceOutput?.records) ? inferenceOutput.records : [])
    .filter((record) => record.meaningful !== false)
    .filter((record) => Number(record.meaningful_score ?? 1) >= minimumMeaningfulScore)
    .map(profileRecord);

  const themeCounts = countThemes(records);
  const schemas = induceSchemas(records, {
    minSupport,
    minWeightedSupport,
    minCohesion,
    maxSchemas,
  });

  return {
    schema_version: "memact.schema.v0",
    generated_at: new Date().toISOString(),
    source: {
      inference_schema_version: inferenceOutput?.schema_version ?? null,
      inferred_record_count: Array.isArray(inferenceOutput?.records) ? inferenceOutput.records.length : 0,
      meaningful_record_count: records.length,
    },
    formation_mode: "evidence_induced",
    min_support: minSupport,
    minimum_meaningful_score: minimumMeaningfulScore,
    min_weighted_support: minWeightedSupport,
    min_cohesion: minCohesion,
    theme_counts: themeCounts,
    schemas,
    schema_network: buildSchemaNetwork(schemas),
    formation_principle: "Virtual cognitive schemas are induced from repeated meaningful activity, co-occurring concepts, cognitive dimensions, source spread, and time. They are not selected from a fixed topic taxonomy.",
  };
}

export function formSchemaPackets(records = [], options = {}) {
  const groups = groupByCategory(records)
  return Object.values(groups)
    .map((group) => createSchemaPacket(group, options))
    .filter((packet) => packet.confidence >= Number(options.minConfidence ?? 0.2))
}

export function groupByCategory(records = []) {
  return (Array.isArray(records) ? records : []).reduce((groups, record) => {
    const category = record.category || record.evidence?.category || inferRecordCategory(record)
    groups[category] ||= []
    groups[category].push(record)
    return groups
  }, {})
}

export function inferSchemaType(record = {}) {
  const themes = Array.isArray(record.canonical_themes) ? record.canonical_themes : []
  const category = (record.category || "").toLowerCase()
  // If the record explicitly declares its category as music, prefer that.
  if (category === "music") return "music_preferences"
  const text = `${category} ${themes.join(" ")} ${record.evidence?.title || ""}`.toLowerCase()
  // Anchor on word boundaries and accept common plural forms to avoid substring false-positives
  if (/\b(?:music|songs?|playlists?|artists?|albums?|tracks?|genres?|listening)\b/.test(text)) return "music_preferences"
  if (/reading|article|summary|scroll|finish|completion/.test(text)) return "reading_preferences"
  if (/\b(shopping|shop|commerce|product|products)\b/.test(text)) return "shopping"
  if (/learn|study|tutorial|course/.test(text)) return "learning"
  if (/research|paper|source|documentation|api/.test(text)) return "research"
  if (/focus|attention|load/.test(text)) return "attention"
  if (/video|audio|media/.test(text)) return "media"
  if (/code|developer|debug|github/.test(text)) return "developer_work"
  if (/assistant|chat/.test(text)) return "ai_assistant_usage"
  if (/\b(productivity|task|tasks|work|doc|docs)\b/.test(text)) return "productivity"
  if (/fitness|workout|nutrition|diet|exercise/.test(text)) return "fitness"
  if (/\b(language|spanish|japanese|french|german|duolingo|vocabulary|fluent)\b/.test(text)) return "language_learning_preferences"
  if (/\b(game|gaming|play|rpg|mmo|console|steam|xbox|playstation)\b/.test(text)) return "gaming_preferences"
  if (/\b(smart home|thermostat|lighting|automation|bulb|temperature)\b/.test(text)) return "smart_home_preferences"
  if (/prefer|like|choice/.test(text)) return "preferences"
  return "context"
}

export function createSchemaPacket(group = [], options = {}) {
  const records = Array.isArray(group) ? group : []
  const category = records[0]?.category || records[0]?.evidence?.category || inferRecordCategory(records[0])
  const schemaType = options.schemaType || inferSchemaType(records[0] || {})
  const confidence = round(records.reduce((sum, record) => sum + Number(record.meaningful_score || 0.5), 0) / Math.max(1, records.length))
  const readingAttributes = schemaType === "reading_preferences" ? buildReadingAttributes(records) : {}
  const musicAttributes = schemaType === "music_preferences" ? buildMusicAttributes(records) : {}
  const productivityAttributes = schemaType === "productivity" ? buildProductivityAttributes(records) : {}
  return {
    schema_version: "memact.schema_packet.v0",
    packet_id: `schema_${slug(`${category}_${schemaType}_${records.length}`)}`,
    category,
    schema_type: schemaType,
    sub_schema: inferSubSchema(records),
    confidence,
    attributes: {
      record_count: records.length,
      themes: unique(records.flatMap((record) => record.canonical_themes || [])),
      ...readingAttributes,
      ...musicAttributes,
      ...productivityAttributes
    },
    sources: records.flatMap((record) => record.sources || []),
    created_at: new Date().toISOString()
  }
}

// --- Context Poisoning Mitigation ---------------------------------------------
// Default limits used to isolate oversized / suspicious contributions before
// they are ever shaped into a memory proposal.
export const DEFAULT_PAYLOAD_LIMITS = Object.freeze({
  maxFieldLength: 4000, // longest single string value allowed
  maxTotalTextLength: 20000, // combined length of all text in the payload
  maxFields: 200, // total number of object keys across the payload
  maxDepth: 8, // deepest nesting allowed before we stop trusting the shape
})

// Signature rules that flag prompt-injection attempts, embedded system
// commands, script/markup injection and SQL injection inside contributed text.
const PAYLOAD_INJECTION_RULES = Object.freeze([
  { id: "prompt_instruction_override", category: "prompt_injection", pattern: /\b(ignore|disregard|forget|override)\b[\s\S]{0,40}\b(previous|prior|earlier|above|all|your)\b[\s\S]{0,24}\b(instruction|instructions|prompt|prompts|context|rule|rules|directive)/i },
  { id: "prompt_role_override", category: "prompt_injection", pattern: /\b(you are now|act as|pretend to be|from now on you|roleplay as)\b/i },
  { id: "prompt_jailbreak", category: "prompt_injection", pattern: /\b(system prompt|developer mode|jailbreak|do anything now|dan mode|without restrictions?)\b/i },
  { id: "chat_template_delimiter", category: "prompt_injection", pattern: /<\|?\s*(im_start|im_end|system|assistant|endoftext)\s*\|?>/i },
  { id: "shell_destructive_command", category: "system_command", pattern: /(^|[^a-z])(rm\s+-rf|sudo\s+\S|chmod\s+[0-7]{3}|mkfs\b|dd\s+if=|shutdown\b|reboot\b|:\(\)\s*\{\s*:\|)/i },
  { id: "remote_code_execution", category: "system_command", pattern: /\b(curl|wget|fetch)\b[\s\S]{0,80}\|\s*(sh|bash|zsh|python\d?)\b/i },
  { id: "code_eval", category: "system_command", pattern: /\b(eval|exec|execfile|system|popen|child_process|subprocess)\s*\(/i },
  { id: "command_chaining", category: "system_command", pattern: /(;|&&|\|\||`|\$\()\s*(rm|cat|curl|wget|nc|ncat|bash|sh|powershell|certutil)\b/i },
  { id: "script_markup_injection", category: "script_injection", pattern: /<\s*script\b|javascript:\s*\S|data:text\/html|on(error|load|click|mouseover)\s*=/i },
  { id: "sql_injection", category: "sql_injection", pattern: /\b(drop\s+table|truncate\s+table|union\s+select|insert\s+into|delete\s+from)\b|\bor\s+1\s*=\s*1\b|'\s*or\s*'/i },
])

const HIGH_RISK_CATEGORIES = new Set(["prompt_injection", "system_command", "script_injection", "sql_injection"])

function snippetForPattern(text, pattern) {
  const match = pattern.exec(text)
  if (!match) return ""
  const start = Math.max(0, match.index - 12)
  return String(text.slice(start, match.index + match[0].length + 12)).replace(/\s+/g, " ").trim().slice(0, 120)
}

export function verifyContextPayload(input = {}, options = {}) {
  const limits = { ...DEFAULT_PAYLOAD_LIMITS, ...(options.limits || {}) }
  const violations = []
  const texts = []
  let fieldCount = 0

  const visit = (value, depth) => {
    if (depth > limits.maxDepth) {
      violations.push({ rule: "max_depth_exceeded", category: "excessive_payload", detail: `nesting depth exceeds ${limits.maxDepth}` })
      return
    }
    if (typeof value === "string") {
      texts.push(value)
      if (value.length > limits.maxFieldLength) {
        violations.push({ rule: "max_field_length_exceeded", category: "excessive_payload", detail: `field length ${value.length} exceeds ${limits.maxFieldLength}` })
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1))
      return
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        fieldCount += 1
        texts.push(String(key))
        visit(item, depth + 1)
      }
    }
  }

  visit(input, 0)

  if (fieldCount > limits.maxFields) {
    violations.push({ rule: "max_fields_exceeded", category: "excessive_payload", detail: `field count ${fieldCount} exceeds ${limits.maxFields}` })
  }
  const combinedLength = texts.reduce((sum, text) => sum + text.length, 0)
  if (combinedLength > limits.maxTotalTextLength) {
    violations.push({ rule: "max_total_length_exceeded", category: "excessive_payload", detail: `combined text length ${combinedLength} exceeds ${limits.maxTotalTextLength}` })
  }

  for (const text of texts) {
    for (const rule of PAYLOAD_INJECTION_RULES) {
      if (rule.pattern.test(text)) {
        violations.push({ rule: rule.id, category: rule.category, detail: snippetForPattern(text, rule.pattern) })
      }
    }
  }

  const categories = unique(violations.map((violation) => violation.category))
  const safe = violations.length === 0
  const riskLevel = safe ? "none" : categories.some((category) => HIGH_RISK_CATEGORIES.has(category)) ? "high" : "elevated"

  return {
    schema_version: "memact.payload_verification.v0",
    safe,
    risk_level: riskLevel,
    violation_categories: categories,
    violations,
    inspected: { field_count: fieldCount, text_length: combinedLength },
    checked_at: new Date().toISOString(),
  }
}

function buildQuarantinedProposal(category, verification) {
  const now = new Date().toISOString()
  return {
    schema_version: "memact.context_proposal.v0",
    input_kind: "quarantined",
    category,
    title: `Quarantined ${category} contribution`,
    // The suspicious text is isolated and never echoed back into the proposal.
    context: { isolated: true, reason: "context_poisoning_suspected" },
    confidence: 0,
    quarantined: true,
    poison_report: verification,
    status: "rejected",
    visibility: "private",
    revoked_at: now,
    lifecycle_history: [{
      action: "quarantined",
      from_status: null,
      to_status: "rejected",
      occurred_at: now,
      reason: `payload_verification_failed:${verification.violation_categories.join(",") || "unknown"}`
    }],
    user_action_required: true,
    source_trail: [],
    guardrails: [
      "Suspicious contribution isolated; raw text is not stored or proposed.",
      "Activity is not identity.",
      "Do not expose raw private data by default.",
      "User must explicitly review before any quarantined contribution is reconsidered."
    ],
    created_at: now,
    updated_at: now
  }
}

// --- Claim Classes (Intent, Habit, Preference, Identity) ----------------------
// Different classes of context carry distinct validation and lifetime rules.
// A claim_class can be declared explicitly on a submission/schema, or inferred
// from the evidence. Each class has its own lifetime (TTL), confidence floor,
// and evidence requirements that the engine enforces.
export const CLAIM_CLASSES = Object.freeze({
  INTENT: "intent", // short-lived task goals
  HABIT: "habit", // inferred repeated observations
  PREFERENCE: "preference", // explicit user statements
  IDENTITY: "identity", // stable core details
})

const DAY_MS = 24 * 60 * 60 * 1000

export const CLAIM_CLASS_SPECS = Object.freeze({
  [CLAIM_CLASSES.INTENT]: Object.freeze({
    description: "Short-lived task goal",
    lifetime: "short",
    ttl_ms: DAY_MS, // expires quickly; intents are transient
    min_confidence: 0.3,
    requires_explicit_statement: false,
    requires_repeated_evidence: false,
    decays: true,
  }),
  [CLAIM_CLASSES.HABIT]: Object.freeze({
    description: "Inferred repeated observation",
    lifetime: "medium",
    ttl_ms: 30 * DAY_MS,
    min_confidence: 0.4,
    min_support: 3, // habits must be backed by repeated evidence
    requires_explicit_statement: false,
    requires_repeated_evidence: true,
    decays: true,
  }),
  [CLAIM_CLASSES.PREFERENCE]: Object.freeze({
    description: "Explicit user statement",
    lifetime: "long",
    ttl_ms: 180 * DAY_MS,
    min_confidence: 0.5,
    requires_explicit_statement: true, // preferences come from the user directly
    requires_repeated_evidence: false,
    decays: false,
  }),
  [CLAIM_CLASSES.IDENTITY]: Object.freeze({
    description: "Stable core detail",
    lifetime: "persistent",
    ttl_ms: null, // identity claims do not auto-expire
    min_confidence: 0.6,
    requires_explicit_statement: true, // identity must be user-confirmed
    requires_repeated_evidence: false,
    decays: false,
  }),
})

const IDENTITY_MARKERS = /\b(my name is|i am a|i'?m a|i live in|i was born|my (date of birth|birthday|hometown|nationality|occupation) is)\b/i
const IDENTITY_KEYS = /\b(full_?name|first_?name|last_?name|date_of_birth|birth_?day|hometown|home_?town|nationality|gender|occupation|address)\b/i
const PREFERENCE_MARKERS = /\b(i (prefer|like|love|enjoy|hate|dislike|don'?t like|always|never|usually)|my favou?rite|i'?d rather)\b/i
const INTENT_MARKERS = /\b(want to|plan to|going to|trying to|intend to|my goal|todo|to-do|deadline|due|reminder|book a|sign up for)\b/i

export function normalizeClaimClass(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return Object.values(CLAIM_CLASSES).includes(normalized) ? normalized : null
}

export function getClaimClassSpec(claimClass) {
  return CLAIM_CLASS_SPECS[normalizeClaimClass(claimClass) || CLAIM_CLASSES.INTENT]
}

function claimSubmissionText(submission = {}) {
  const parts = [
    submission.title,
    submission.summary,
    submission.event_type,
    JSON.stringify(submission.context || {}),
    JSON.stringify(submission.value || {}),
    JSON.stringify(submission.payload || submission.evidence || {}),
  ]
  return parts.filter(Boolean).join(" ")
}

export function inferClaimClass(submission = {}) {
  const declared = normalizeClaimClass(submission.claim_class)
  if (declared) return declared

  const text = claimSubmissionText(submission)
  if (IDENTITY_MARKERS.test(text) || IDENTITY_KEYS.test(text)) return CLAIM_CLASSES.IDENTITY

  const explicit = submission.explicit === true || submission.kind === "explicit_statement"
  if (explicit || PREFERENCE_MARKERS.test(text)) return CLAIM_CLASSES.PREFERENCE

  if (INTENT_MARKERS.test(text)) return CLAIM_CLASSES.INTENT

  // Inferred (non-explicit) observations default to habit candidates.
  return CLAIM_CLASSES.HABIT
}

function claimSupportCount(submission = {}) {
  if (Number.isFinite(Number(submission.support))) return Number(submission.support)
  if (Array.isArray(submission.source_trail)) return submission.source_trail.length
  if (Array.isArray(submission.sources)) return submission.sources.length
  if (Array.isArray(submission.observations)) return submission.observations.length
  return submission.kind === "raw_signal" ? 1 : 0
}

function isExplicitSubmission(submission = {}) {
  if (submission.explicit === true) return true
  if (submission.kind === "explicit_statement") return true
  // First-person statements ("I prefer…", "my name is…") are explicit by nature.
  const text = claimSubmissionText(submission)
  if (PREFERENCE_MARKERS.test(text) || IDENTITY_MARKERS.test(text)) return true
  const trail = Array.isArray(submission.source_trail) ? submission.source_trail : []
  return trail.some((entry) => /user|explicit|stated|statement/i.test(JSON.stringify(entry || {})))
}

/**
 * Enforce the validation rules attached to a claim class.
 * Returns a verdict rather than throwing so the proposal can still be surfaced
 * to the user for review when it does not yet meet the bar.
 */
export function validateClaimClass(submission = {}, options = {}) {
  const claimClass = normalizeClaimClass(options.claim_class ?? submission.claim_class) || inferClaimClass(submission)
  const spec = CLAIM_CLASS_SPECS[claimClass]
  const confidence = Number(options.confidence ?? submission.confidence ?? 0)
  const support = claimSupportCount(submission)
  const violations = []

  if (confidence < spec.min_confidence) {
    violations.push({ rule: "min_confidence", detail: `confidence ${round(confidence)} below ${spec.min_confidence} required for ${claimClass}` })
  }
  if (spec.requires_repeated_evidence && support < (spec.min_support ?? 2)) {
    violations.push({ rule: "insufficient_support", detail: `${claimClass} needs >= ${spec.min_support ?? 2} observations, found ${support}` })
  }
  if (spec.requires_explicit_statement && !isExplicitSubmission(submission)) {
    violations.push({ rule: "requires_explicit_statement", detail: `${claimClass} must come from an explicit user statement` })
  }

  return {
    claim_class: claimClass,
    valid: violations.length === 0,
    requires_confirmation: spec.requires_explicit_statement && !isExplicitSubmission(submission),
    violations,
  }
}

export function shapeContextProposal(input = {}, options = {}) {
  const submission = normalizeContextInput(input)
  const category = submission.category || options.category || "general"

  // Reject/isolate poisoned contributions before they are shaped into memory.
  const verification = verifyContextPayload(submission, options)
  if (!verification.safe) {
    return buildQuarantinedProposal(category, verification)
  }

  const sourceTrail = buildContextSourceTrail(submission)
  const confidence = submission.kind === "raw_signal" ? 0.35 : sourceTrail.length ? 0.7 : 0.55
  const context = submission.kind === "raw_signal"
    ? contextFromSignal(submission)
    : sanitizeContextObject(submission.context || submission.value || {})

  const resolvedConfidence = round(Number(submission.confidence ?? confidence))
  const claimClass = normalizeClaimClass(options.claim_class ?? submission.claim_class) || inferClaimClass(submission)
  const classSpec = CLAIM_CLASS_SPECS[claimClass]
  const classValidation = validateClaimClass(submission, { claim_class: claimClass, confidence: resolvedConfidence })

  return {
    schema_version: "memact.context_proposal.v0",
    input_kind: submission.kind,
    category,
    title: String(submission.title || context.title || `Possible ${category} context`).trim().slice(0, 160),
    context,
    confidence: resolvedConfidence,

    // Payload passed verification; record the clean verdict for auditability.
    poison_report: verification,

    // Claim class: distinct validation + lifetime per context class.
    claim_class: claimClass,
    claim_class_profile: {
      description: classSpec.description,
      lifetime: classSpec.lifetime,
      ttl_ms: classSpec.ttl_ms,
      decays: classSpec.decays,
    },
    class_validation: classValidation,

    // NEW: Robust Claim Lifecycle Base State
    status: "pending",
    visibility: "private",
    revoked_at: null,
    lifecycle_history: [{
      action: "created",
      from_status: null,
      to_status: "pending",
      occurred_at: new Date().toISOString(),
      reason: "system_generated"
    }],

    user_action_required: true,
    source_trail: sourceTrail,
    guardrails: [
      "Activity is not identity.",
      "User must be able to accept, edit, reject, or delete this before it becomes memory.",
      "Do not expose raw private data by default.",
      "Every user decision is reversible. Hidden or rejected claims retain local privacy state."
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function shapeContextProposals(inputs = [], options = {}) {
  return (Array.isArray(inputs) ? inputs : [inputs]).map((input) => shapeContextProposal(input, options))
}

function normalizeContextInput(input = {}) {
  const raw = input.raw_signal || input.signal || input.activity_signal
  if (raw && typeof raw === "object") {
    return {
      ...raw,
      kind: "raw_signal",
      category: raw.category || input.category
    }
  }
  return {
    ...input,
    kind: input.kind || input.input_kind || "context_proposal"
  }
}

function contextFromSignal(signal = {}) {
  const eventType = String(signal.event_type || signal.type || "activity").slice(0, 80)
  const category = String(signal.category || "general").slice(0, 80)
  return {
    title: `Possible ${category} context`,
    summary: `Raw ${eventType} signal needs review before it becomes memory.`,
    signal_type: eventType,
    evidence: sanitizeContextObject(signal.payload || signal.evidence || {}),
    review_note: "Activity is not identity. Treat this as weak evidence until the user accepts or edits it."
  }
}

function buildContextSourceTrail(input = {}) {
  if (Array.isArray(input.source_trail)) return input.source_trail.slice(0, 20).map(sanitizeContextObject)
  if (input.kind === "raw_signal") {
    return [{
      type: "raw_signal",
      event_type: String(input.event_type || input.type || "activity").slice(0, 80),
      evidence: sanitizeContextObject(input.payload || input.evidence || {})
    }]
  }
  if (input.evidence) return [{ type: "app_evidence", evidence: sanitizeContextValue(input.evidence) }]
  return []
}

function sanitizeContextObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/password|secret|token|api[_-]?key|credential|otp/i.test(key))
    .map(([key, item]) => [String(key).slice(0, 80), sanitizeContextValue(item)]))
}

function sanitizeContextValue(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitizeContextValue)
  if (typeof value === "object") return sanitizeContextObject(value)
  return String(value).slice(0, 1000)
}

function inferSubSchema(records = []) {
  const text = records.map((record) => `${record.source_label || ""} ${record.evidence?.title || ""} ${(record.canonical_themes || []).join(" ")}`).join(" ").toLowerCase()
  if (/favorite_genre|preferred_genre|liked_genre|genre/.test(text)) return "music_genre_preference"
  if (/artist|artist preference|frequent_artist|repeated_artist/.test(text)) return "music_artist_preference"
  if (/playlist|mix_theme/.test(text)) return "music_playlist_theme"
  if (/discovery|new music/.test(text)) return "music_discovery_preference"
  if (/mood|listening mood/.test(text)) return "music_listening_mood"
  if (/music|song|track|album|playlist|artist|genre/.test(text)) return "music_preferences"
  if (/summary_detail_preference|summary expanded/.test(text)) return "summary_style_preference"
  if (/quick_summary_preference|summary collapsed/.test(text)) return "summary_style_preference"
  if (/long_read|short_read/.test(text)) return "article_length_preference"
  if (/skipped_topic|topic skipped/.test(text)) return "skipped_topics"
  if (/high_engagement|low_engagement|scroll/.test(text)) return "engagement_pattern"
  if (/discount|coupon|sale|price|deal/.test(text)) return "discount"
  if (/source|citation|reference/.test(text)) return "sources"
  if (/task|todo|deadline/.test(text)) return "tasks"
  if (/focus|interrupt|overload/.test(text)) return "attention_load"
  const productivitySubSchema = inferProductivitySubSchema(text)
  if (productivitySubSchema) return productivitySubSchema
  return "general"
}

function inferProductivitySubSchema(text = "") {
  if (/kanban|time-blocking|organization/.test(text)) return "organization_style"
  if (/calendar|meeting/.test(text)) return "calendar_habits"
  return null
}

function buildProductivityAttributes(records = []) {
  const styles = unique(records.map((record) => record.evidence?.organization_style).filter(Boolean))
  const projectAreas = unique(records.map((record) => record.evidence?.project_area).filter(Boolean))
  const focusPreferences = unique(records.map((record) => record.evidence?.focus_preference).filter(Boolean))
  const calendarHabits = unique(records.map((record) => record.evidence?.calendar_habit).filter(Boolean))
  return {
    preferred_organization_styles: styles,
    recurring_project_areas: projectAreas,
    focus_time_preferences: focusPreferences,
    calendar_habits: calendarHabits
  }
}

function buildReadingAttributes(records = []) {
  const topics = unique(records.map((record) => record.evidence?.article_topic).filter(Boolean))
  const skippedTopics = unique(records
    .filter((record) => (record.canonical_themes || []).includes("skipped_topic"))
    .map((record) => record.evidence?.article_topic)
    .filter(Boolean))
  const scrollDepths = records.map((record) => Number(record.evidence?.scroll_depth || 0)).filter((value) => value > 0)
  const finishCount = records.filter((record) => (record.canonical_themes || []).includes("completion")).length
  const longReads = records.filter((record) => (record.canonical_themes || []).includes("long_read")).length
  const shortReads = records.filter((record) => (record.canonical_themes || []).includes("short_read")).length
  const detailSignals = records.filter((record) => (record.canonical_themes || []).includes("summary_detail_preference")).length
  const quickSignals = records.filter((record) => (record.canonical_themes || []).includes("quick_summary_preference")).length
  return {
    preferred_topics: topics.filter((topic) => !skippedTopics.includes(topic)),
    skipped_topics: skippedTopics,
    average_scroll_depth: scrollDepths.length ? round(scrollDepths.reduce((sum, value) => sum + value, 0) / scrollDepths.length) : 0,
    finish_rate: records.length ? round(finishCount / records.length) : 0,
    preferred_article_length: longReads > shortReads ? "long" : shortReads > longReads ? "short" : "unknown",
    preferred_summary_style: detailSignals > quickSignals ? "deep_dive" : quickSignals > detailSignals ? "quick_brief" : "unknown",
    repeat_topics: topics.filter((topic) => records.filter((record) => record.evidence?.article_topic === topic).length > 1),
    engagement_pattern: scrollDepths.some((value) => value >= 75) ? "high_scroll_depth" : scrollDepths.some((value) => value < 35) ? "low_scroll_depth" : "unknown"
  }
}

function buildMusicAttributes(records = []) {
  const attributes = {}
  for (const spec of MUSIC_FIELD_SPECS) {
    attributes[spec.output] = collectEvidenceValues(records, spec.aliases)
  }

  // Sensitive keys are flagged for review when the app provided a meaningful value.
  // We do NOT flag keys that are present but empty (empty string/empty array/empty object).
  // This avoids false positives where an app includes a key name for schema reasons
  // but does not provide identifying information (e.g. an empty `location` placeholder).
  const sensitiveFieldsRaw = records.flatMap((record) => {
    const evidence = record.evidence || {}
    return Object.keys(evidence).filter((key) => {
      if (!MUSIC_SENSITIVE_KEYS.has(key)) return false
      const v = evidence[key]
      if (v === undefined || v === null) return false
      if (typeof v === "string") return v.trim() !== ""
      if (Array.isArray(v)) return v.length > 0
      if (typeof v === "object") return Object.keys(v).length > 0
      // numbers and booleans are considered meaningful when present
      return true
    })
  })
  const sensitiveFields = [...new Set(sensitiveFieldsRaw)]

  return {
    ...attributes,
    sensitive_fields: sensitiveFields,
    review_status: sensitiveFields.length ? "needs_review" : "safe_to_propose",
  }
}

function collectEvidenceValues(records = [], aliases = []) {
  return unique(records.flatMap((record) => aliases.flatMap((alias) => normalizeEvidenceValue(record.evidence?.[alias])))).filter(Boolean)
}

function normalizeEvidenceValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeEvidenceValue(item))
  }

  if (value === null || value === undefined || value === "") {
    return []
  }

  // Preserve string values verbatim (as single entries).
  // Splitting on commas can break legitimate names like "Earth, Wind & Fire".
  if (typeof value === "string") {
    return [value.trim()]
  }

  return [String(value)]
}

export function formatSchemaReport(result) {
  const lines = [
    "Memact Context Report",
    `Formation mode: ${result.formation_mode || "unknown"}`,
    `Inferred records: ${result.source.inferred_record_count}`,
    `Meaningful records: ${result.source.meaningful_record_count}`,
    `Minimum support: ${result.min_support}`,
    "",
    "Virtual Context Patterns",
  ];

  if (!result.schemas.length) {
    lines.push("No virtual cognitive schemas met the formation threshold.");
    return lines.join("\n");
  }

  result.schemas.forEach((schema, index) => {
    lines.push(`${index + 1}. ${schema.label}`);
    lines.push(`   state=${schema.state} support=${schema.support} weighted=${schema.weighted_support.toFixed(3)} confidence=${schema.confidence.toFixed(3)}`);
    lines.push(`   basis=${schema.formation_basis}`);
    lines.push(`   frame=${schema.core_interpretation}`);
  });

  return lines.join("\n");
}

function induceSchemas(records, thresholds) {
  const anchorCounts = countAnchors(records);
  const anchors = [...anchorCounts.entries()]
    .filter(([, count]) => count >= thresholds.minSupport)
    .map(([anchor]) => anchor)
    .filter((anchor) => !LOW_SIGNAL_TERMS.has(anchor));

  const candidates = anchors
    .map((anchor) => buildCandidate(anchor, records, thresholds))
    .filter(Boolean)
    .sort((a, b) =>
      b.confidence - a.confidence ||
      b.weighted_support - a.weighted_support ||
      b.support - a.support ||
      a.id.localeCompare(b.id)
    );

  return dedupeSchemas(candidates).slice(0, thresholds.maxSchemas);
}

function buildCandidate(anchor, records, thresholds) {
  const scoredRecords = records
    .map((record) => scoreRecordForAnchor(record, anchor))
    .filter((record) => record.schema_record_score > 0)
    .sort((a, b) => b.schema_record_score - a.schema_record_score || a.source_label.localeCompare(b.source_label));
  const support = scoredRecords.length;
  const weightedSupport = round(scoredRecords.reduce((sum, record) => sum + record.schema_record_score, 0), 4);
  const activeDayCount = countActiveDays(scoredRecords);
  const distinctSourceCount = countDistinctSources(scoredRecords);
  const concepts = topTerms(scoredRecords.flatMap((record) => record.concepts), 10);
  const repeatedConcepts = repeatedTerms(scoredRecords.flatMap((record) => record.concepts), 2);
  const cognitiveDimensions = unique(scoredRecords.flatMap((record) => record.cognitive_dimensions));
  const matchedThemes = topTerms(scoredRecords.flatMap((record) => record.themes), 8);
  const cohesion = round(averageCohesion(scoredRecords));

  if (
    support < thresholds.minSupport ||
    weightedSupport < thresholds.minWeightedSupport ||
    cohesion < thresholds.minCohesion ||
    !hasSchemaSubstance({ anchor, repeatedConcepts, cognitiveDimensions, distinctSourceCount })
  ) {
    return null;
  }

  const evidenceRecords = scoredRecords.slice(0, 10).map((record) => ({
    id: record.id,
    packet_id: record.packet_id,
    source_label: record.source_label,
    concepts: record.concepts,
    themes: record.themes,
    cognitive_dimensions: record.cognitive_dimensions,
    schema_record_score: record.schema_record_score,
    meaningful_score: record.meaningful_score,
    meaning_reasons: record.meaning_reasons,
    sources: record.sources,
  }));
  const repetition = Math.min(1, support / Math.max(thresholds.minSupport, 8));
  const sourceSpread = Math.min(1, distinctSourceCount / Math.max(2, Math.min(support, 4)));
  const timeSpread = Math.min(1, activeDayCount / Math.max(2, Math.min(support, 4)));
  const dimensionSpread = Math.min(1, cognitiveDimensions.length / 3);
  const conceptSpread = Math.min(1, repeatedConcepts.length / 5);
  const confidence = round(
    (repetition * 0.24) +
      (sourceSpread * 0.18) +
      (timeSpread * 0.12) +
      (cohesion * 0.18) +
      (dimensionSpread * 0.16) +
      (conceptSpread * 0.12)
  );
  const state = resolveSchemaLifecycleState({ support, confidence, activeDayCount, distinctSourceCount }, thresholds);
  const label = buildDynamicLabel(anchor, concepts, cognitiveDimensions);
  const coreInterpretation = buildCoreInterpretation(concepts, cognitiveDimensions);
  const actionTendency = buildActionTendency(concepts, cognitiveDimensions);
  const emotionalSignature = buildEmotionalSignature(cognitiveDimensions, concepts);
  const schemaGraph = buildVirtualSchemaGraph({
    id: `induced_${slug([anchor, ...concepts.slice(0, 3)].join("_"))}`,
    label,
    concepts,
    cognitiveDimensions,
    evidenceRecords,
    state,
    confidence,
  });

  return {
    id: `induced_${slug([anchor, ...concepts.slice(0, 3)].join("_"))}`,
    label,
    summary: `An induced virtual schema connecting ${concepts.slice(0, 5).join(", ")} across repeated meaningful activity.`,
    schema_kind: "virtual_cognitive_schema",
    formation_mode: "evidence_induced",
    virtual: true,
    cognitive_schema: true,
    core_interpretation: coreInterpretation,
    action_tendency: actionTendency,
    emotional_signature: emotionalSignature,
    state,
    lifecycle_state: state,
    state_label: schemaLifecycleLabel(state),
    anchor_concept: anchor,
    matched_themes: matchedThemes,
    matched_markers: concepts,
    marker_categories: cognitiveDimensions,
    support,
    weighted_support: weightedSupport,
    distinct_source_count: distinctSourceCount,
    active_day_count: activeDayCount,
    cohesion,
    confidence,
    nodes: schemaGraph.nodes,
    edges: schemaGraph.edges,
    schema_graph: schemaGraph,
    formation_basis: buildFormationBasis({
      support,
      weightedSupport,
      distinctSourceCount,
      activeDayCount,
      concepts,
      cognitiveDimensions,
      cohesion,
    }),
    formation_metrics: {
      support,
      weighted_support: weightedSupport,
      distinct_source_count: distinctSourceCount,
      active_day_count: activeDayCount,
      cohesion,
      repeated_concept_count: repeatedConcepts.length,
      cognitive_dimension_count: cognitiveDimensions.length,
      confidence,
    },
    virtual_schema_packet: {
      id: `schema_packet:induced_${slug([anchor, ...concepts.slice(0, 3)].join("_"))}`,
      type: "virtual_cognitive_schema_packet",
      label,
      formation_mode: "evidence_induced",
      lifecycle_state: state,
      core_interpretation: coreInterpretation,
      action_tendency: actionTendency,
      emotional_signature: emotionalSignature,
      matched_themes: matchedThemes,
      matched_markers: concepts,
      marker_categories: cognitiveDimensions,
      support,
      weighted_support: weightedSupport,
      cohesion,
      confidence,
      formation_metrics: {
        support,
        weighted_support: weightedSupport,
        distinct_source_count: distinctSourceCount,
        active_day_count: activeDayCount,
        cohesion,
        cognitive_dimensions: cognitiveDimensions,
      },
      evidence_packet_ids: evidenceRecords.map((record) => record.packet_id || `packet:${record.id}`),
      nodes: schemaGraph.nodes,
      edges: schemaGraph.edges,
    },
    evidence_records: evidenceRecords,
    claim_type: "virtual_cognitive_schema_signal",
    language_guardrail: "This is an induced virtual cognitive-schema signal from repeated evidence, not a diagnosis or causal certainty.",
  };
}

function profileRecord(record) {
  const text = collectRecordText(record);
  const tokens = tokenize(text);
  const themes = unique(record.canonical_themes ?? []);
  const concepts = unique([
    ...themes.map((theme) => normalize(theme).toLowerCase()),
    ...tokens.filter((token) => !LOW_SIGNAL_TERMS.has(token)),
    ...extractBigrams(tokens),
  ]).slice(0, 40);
  const cognitiveDimensions = detectCognitiveDimensions(text, concepts);
  return {
    id: record.id,
    packet_id: record.packet_id ?? null,
    source_label: normalize(record.source_label || record.evidence?.title || "meaning packet"),
    started_at: record.started_at,
    ended_at: record.ended_at,
    concepts,
    themes,
    cognitive_dimensions: cognitiveDimensions,
    meaningful_score: Number(record.meaningful_score ?? 0.58),
    meaning_reasons: record.meaning_reasons ?? [],
    sources: record.sources ?? [],
  };
}

function inferRecordCategory(record = {}) {
  const text = `${record.category || ""} ${record.source_label || ""} ${record.evidence?.title || ""} ${(record.canonical_themes || []).join(" ")}`.toLowerCase()
  if (/reading|article|summary|scroll|finish/.test(text)) return "reading"
  if (/\b(shopping|shop|commerce|product|products|discount|price)\b/.test(text)) return "shopping"
  if (/learn|study|tutorial|course/.test(text)) return "learning"
  if (/research|paper|source|documentation|api/.test(text)) return "research"
  if (/focus|attention|load/.test(text)) return "attention"
  if (/video|audio|media/.test(text)) return "media"
  if (/code|developer|debug|github/.test(text)) return "developer_work"
  if (/assistant|chat/.test(text)) return "ai_assistant_usage"
  if (/\b(productivity|task|tasks|work|doc|docs)\b/.test(text)) return "productivity"
  if (/fitness|workout|nutrition|diet|exercise/.test(text)) return "fitness"
  if (/\b(game|gaming|play|rpg|mmo|console|steam|xbox|playstation)\b/.test(text)) return "gaming"
  if (/\b(smart home|thermostat|lighting|automation|bulb|temperature)\b/.test(text)) return "smart_home"
  if (/prefer|like|choice/.test(text)) return "preferences"
  if (/\b(language|spanish|japanese|french|german|duolingo|vocabulary|fluent)\b/.test(text)) return "language_learning"
  return "general"
}

function scoreRecordForAnchor(record, anchor) {
  const conceptSet = new Set(record.concepts);
  if (!conceptSet.has(anchor)) {
    return { ...record, schema_record_score: 0 };
  }
  const conceptDensity = Math.min(1, record.concepts.length / 12);
  const dimensionScore = Math.min(1, record.cognitive_dimensions.length / 3);
  const sourceScore = Array.isArray(record.sources) && record.sources.length ? 0.08 : 0;
  const meaningfulScore = Number(record.meaningful_score ?? 0.58);
  const score = round(
    Math.min(1, 0.42 + (conceptDensity * 0.18) + (dimensionScore * 0.2) + (meaningfulScore * 0.12) + sourceScore)
  );
  return {
    ...record,
    schema_record_score: score,
  };
}

function hasSchemaSubstance({ anchor, repeatedConcepts, cognitiveDimensions, distinctSourceCount }) {
  const repeatedBeyondAnchor = repeatedConcepts.filter((term) => term !== anchor && !LOW_SIGNAL_TERMS.has(term));
  return cognitiveDimensions.length > 0 || (repeatedBeyondAnchor.length >= 2 && distinctSourceCount >= 2);
}

function buildDynamicLabel(anchor, concepts, cognitiveDimensions) {
  const labelConcepts = unique([anchor, ...concepts.filter((concept) => concept !== anchor)]).slice(0, 2);
  const dimension = cognitiveDimensions[0] ? `${titleCase(cognitiveDimensions[0])} frame` : "Repeated frame";
  return `${labelConcepts.map(titleCase).join(" / ")} ${dimension}`;
}

function buildCoreInterpretation(concepts, dimensions) {
  const conceptText = concepts.slice(0, 4).map(titleCase).join(", ");
  if (dimensions.length) {
    return `Memact sees ${conceptText} repeatedly appearing through ${dimensions.join(", ")} signals.`;
  }
  return `Memact sees ${conceptText} repeatedly appearing together across meaningful activity.`;
}

function buildActionTendency(concepts, dimensions) {
  if (dimensions.includes("action")) {
    return `move toward activity around ${concepts.slice(0, 3).join(", ")}`;
  }
  if (dimensions.includes("evaluation")) {
    return `judge or compare activity around ${concepts.slice(0, 3).join(", ")}`;
  }
  if (dimensions.includes("identity")) {
    return `connect ${concepts.slice(0, 3).join(", ")} to self-direction`;
  }
  return `revisit and connect ${concepts.slice(0, 3).join(", ")}`;
}

function buildEmotionalSignature(dimensions, concepts) {
  const output = [];
  if (dimensions.includes("affect")) output.push("emotion-linked");
  if (dimensions.includes("evaluation")) output.push("evaluation pressure");
  if (dimensions.includes("identity")) output.push("identity relevance");
  if (dimensions.includes("social")) output.push("social visibility");
  if (!output.length && concepts.length) output.push("repeated salience");
  return output;
}

function countAnchors(records) {
  const counts = new Map();
  records.forEach((record) => {
    unique(record.concepts).forEach((concept) => {
      counts.set(concept, (counts.get(concept) || 0) + 1);
    });
  });
  return counts;
}

function averageCohesion(records) {
  if (records.length <= 1) return 1;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      total += jaccard(records[i].concepts, records[j].concepts);
      pairs += 1;
    }
  }
  return pairs ? total / pairs : 0;
}

function jaccard(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (!union.size) return 0;
  let intersection = 0;
  leftSet.forEach((value) => {
    if (rightSet.has(value)) intersection += 1;
  });
  return intersection / union.size;
}

function dedupeSchemas(candidates) {
  const accepted = [];
  for (const candidate of candidates) {
    const duplicate = accepted.some((schema) => jaccard(schema.matched_markers, candidate.matched_markers) >= 0.72);
    if (!duplicate) accepted.push(candidate);
  }
  return accepted;
}

function buildSchemaNetwork(schemas) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addNode = (node) => {
    if (!node?.id || seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  };

  schemas.forEach((schema) => {
    const schemaId = `schema:${schema.id}`;
    addNode({
      id: schemaId,
      type: "virtual_cognitive_schema",
      label: schema.label,
      formation_mode: schema.formation_mode,
      state: schema.state,
      lifecycle_state: schema.lifecycle_state || schema.state,
      confidence: schema.confidence,
    });

    (schema.matched_markers ?? []).forEach((concept) => {
      const conceptId = `concept:${slug(concept)}`;
      addNode({ id: conceptId, type: "concept", label: concept });
      edges.push({ from: schemaId, to: conceptId, type: "contains_concept", weight: 1 });
    });

    (schema.marker_categories ?? []).forEach((dimension) => {
      const dimensionId = `dimension:${slug(dimension)}`;
      addNode({ id: dimensionId, type: "cognitive_dimension", label: dimension });
      edges.push({ from: schemaId, to: dimensionId, type: "has_cognitive_dimension", weight: 1 });
    });

    (schema.evidence_records ?? []).forEach((record) => {
      const packetId = record.packet_id || `packet:${record.id}`;
      addNode({
        id: packetId,
        type: "meaning_packet",
        label: record.source_label,
        score: Number(record.meaningful_score ?? 1),
      });
      edges.push({
        from: schemaId,
        to: packetId,
        type: "supported_by_packet",
        weight: Number(record.schema_record_score ?? record.meaningful_score ?? 1),
      });
    });
  });

  return { nodes, edges };
}

function buildVirtualSchemaGraph({ id, label, concepts, cognitiveDimensions, evidenceRecords, state, confidence }) {
  const schemaId = `schema:${id}`;
  const nodes = [
    {
      id: schemaId,
      type: "virtual_cognitive_schema",
      category: "schema",
      label,
      lifecycle_state: state,
      confidence,
    },
  ];
  const edges = [];
  const seen = new Set([schemaId]);
  const addNode = (node) => {
    if (!node?.id || seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  };

  concepts.slice(0, 12).forEach((concept) => {
    const conceptId = `concept:${slug(concept)}`;
    addNode({ id: conceptId, type: "concept", category: "schema_marker", label: concept });
    edges.push({ from: schemaId, to: conceptId, type: "contains_marker", category: "schema_structure", weight: 1 });
  });

  cognitiveDimensions.forEach((dimension) => {
    const dimensionId = `dimension:${slug(dimension)}`;
    addNode({ id: dimensionId, type: "cognitive_dimension", category: "schema_category", label: dimension });
    edges.push({ from: schemaId, to: dimensionId, type: "classified_as", category: "schema_classification", weight: 1 });
  });

  evidenceRecords.slice(0, 8).forEach((record) => {
    const packetId = record.packet_id || `packet:${record.id}`;
    addNode({
      id: packetId,
      type: "meaning_packet",
      category: "evidence",
      label: record.source_label,
      score: Number(record.meaningful_score ?? 1),
    });
    edges.push({
      from: packetId,
      to: schemaId,
      type: "supports_schema",
      category: "evidence_support",
      weight: Number(record.schema_record_score ?? record.meaningful_score ?? 1),
    });
  });

  return { nodes, edges };
}

function detectCognitiveDimensions(text, concepts) {
  const haystack = `${normalize(text).toLowerCase()} ${concepts.join(" ")}`;
  return Object.entries(COGNITIVE_DIMENSIONS)
    .filter(([, terms]) => terms.some((term) => hasPhrase(haystack, term)))
    .map(([dimension]) => dimension);
}

function collectRecordText(record) {
  const parts = [
    record.source_label,
    record.evidence?.title,
    record.evidence?.text_excerpt,
    ...(record.canonical_themes ?? []),
  ];
  (record.themes ?? []).forEach((theme) => {
    parts.push(theme.label, ...(theme.evidence_terms ?? []));
  });
  return parts.filter(Boolean).join(" ");
}

function extractBigrams(tokens) {
  const bigrams = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index];
    const right = tokens[index + 1];
    if (LOW_SIGNAL_TERMS.has(left) || LOW_SIGNAL_TERMS.has(right)) continue;
    bigrams.push(`${left} ${right}`);
  }
  return bigrams;
}

function tokenize(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^www\./, "").replace(/\.(com|org|net|io|ai)$/i, ""))
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function resolveSchemaState(metrics, thresholds) {
  if (
    metrics.support >= Math.max(thresholds.minSupport * 3, 8) &&
    metrics.confidence >= 0.7 &&
    metrics.activeDayCount >= 2
  ) {
    return "stable";
  }
  if (
    metrics.support >= Math.max(thresholds.minSupport * 2, 5) ||
    (metrics.confidence >= 0.56 && metrics.distinctSourceCount >= 2)
  ) {
    return "reinforced";
  }
  return "emerging";
}

function stateLabel(state) {
  return state === "stable"
    ? "Stable virtual schema"
    : state === "reinforced"
      ? "Reinforced virtual schema"
      : "Emerging virtual schema";
}

function buildFormationBasis({ support, weightedSupport, distinctSourceCount, activeDayCount, concepts, cognitiveDimensions, cohesion }) {
  return [
    `${support} supporting meaning packets`,
    `${weightedSupport.toFixed(2)} weighted support`,
    `${distinctSourceCount} distinct source${distinctSourceCount === 1 ? "" : "s"}`,
    `${activeDayCount} active day${activeDayCount === 1 ? "" : "s"}`,
    `cohesion ${cohesion.toFixed(2)}`,
    `concepts: ${concepts.slice(0, 6).join(", ")}`,
    `dimensions: ${cognitiveDimensions.join(", ") || "concept-only"}`,
  ].join("; ");
}

function countThemes(records) {
  return records.reduce((counts, record) => {
    (record.themes ?? []).forEach((theme) => {
      counts[theme] = (counts[theme] ?? 0) + 1;
    });
    return counts;
  }, {});
}

function countDistinctSources(records) {
  const sources = new Set();
  records.forEach((record) => {
    (record.sources ?? []).forEach((source) => {
      const key = source.url || source.domain || source.title;
      if (key) sources.add(key);
    });
  });
  return sources.size || (records.length ? 1 : 0);
}

function countActiveDays(records) {
  const days = new Set();
  records.forEach((record) => {
    const value = record.started_at || record.ended_at;
    const timestamp = Date.parse(value || "");
    if (Number.isFinite(timestamp)) {
      days.add(new Date(timestamp).toISOString().slice(0, 10));
    }
  });
  return days.size || (records.length ? 1 : 0);
}

function repeatedTerms(values, minCount) {
  return topTerms(values, 100).filter((term) => countValues(values).get(term) >= minCount);
}

function topTerms(values, limit = 8) {
  return [...countValues(values).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function countValues(values) {
  const counts = new Map();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const key = normalize(value).toLowerCase();
    if (!key || LOW_SIGNAL_TERMS.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function hasPhrase(text, phrase) {
  const haystack = normalize(text).toLowerCase();
  const needle = normalize(phrase).toLowerCase();
  if (!haystack || !needle) return false;
  if (/^[a-z0-9]+$/.test(needle)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, "i").test(haystack);
  }
  return haystack.includes(needle);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(normalize).filter(Boolean))];
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

function titleCase(value) {
  return normalize(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slug(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "schema";
}
