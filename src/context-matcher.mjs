const STOP_WORDS = new Set(["a", "an", "and", "app", "can", "for", "from", "get", "of", "the", "to", "use", "user", "with"])

export const contextMatchingExamples = Object.freeze([
  {
    app_field: "food restrictions",
    memact_fields: ["diet.preference", "diet.allergy"],
    reason: "Food restriction onboarding can use approved diet preference and allergy memory."
  },
  {
    app_field: "workout goal",
    memact_fields: ["fitness.goal"],
    reason: "Fitness goal maps to accepted fitness goal memory."
  },
  {
    app_field: "preferred name",
    memact_fields: ["identity.preferred_name"],
    reason: "A preferred-name field should use explicit identity memory only."
  },
  {
    app_field: "learning goals",
    memact_fields: ["education.learning_goals"],
    reason: "Learning goals map to accepted education memory."
  },
  {
    app_field: "budget range",
    memact_fields: ["shopping.budget"],
    reason: "Budget range maps to accepted shopping budget memory."
  }
])

const SYNONYM_FIELDS = Object.freeze(Object.fromEntries(
  contextMatchingExamples.map((example) => [normalize(example.app_field), example.memact_fields])
))

export class LocalContextMatcher {
  constructor({ threshold = 0.12 } = {}) {
    this.threshold = Number(threshold)
    this.kind = "local_keyword_overlap"
  }

  match(requestedContext = [], memoryRecords = []) {
    return matchContextFields(requestedContext, memoryRecords, { threshold: this.threshold })
  }
}

export class SemanticContextMatcher extends LocalContextMatcher {
  constructor(options = {}) {
    super(options)
    this.kind = "semantic_placeholder"
  }
}

export function createContextMatcher(options = {}) {
  return new LocalContextMatcher(options)
}

export function matchContextFields(requestedContext = [], memoryRecords = [], options = {}) {
  const threshold = Number(options.threshold ?? 0.12)
  return (Array.isArray(requestedContext) ? requestedContext : []).map((requestedItem) => {
    const requestText = requestToText(requestedItem)
    const requestTokens = tokens(requestText)
    const synonymFields = SYNONYM_FIELDS[normalize(requestText)] || SYNONYM_FIELDS[normalize(requestedItem?.description)] || []
    const candidates = (Array.isArray(memoryRecords) ? memoryRecords : [])
      .map((memory) => scoreMemory(requestTokens, synonymFields, memory))
      .filter((candidate) => candidate.score >= threshold)
      .sort((left, right) => right.score - left.score || String(left.memory.field_path || "").localeCompare(String(right.memory.field_path || "")))
    return {
      requested: requestedItem,
      request_text: requestText,
      candidates
    }
  })
}

function scoreMemory(requestTokens, synonymFields, memory = {}) {
  const fieldPath = String(memory.field_path || memory.path || "")
  const searchable = [
    fieldPath,
    memory.category,
    memory.label,
    memory.title,
    memory.summary,
    memory.value,
    ...(memory.themes || [])
  ].join(" ")
  const candidateTokens = tokens(searchable)
  let overlap = 0
  for (const token of requestTokens) {
    if (candidateTokens.has(token)) overlap += 1
  }
  const lexical = requestTokens.size ? overlap / requestTokens.size : 0
  const fieldPathSimilarity = pathSimilarity(fieldPath, [...requestTokens].join("."))
  const synonymBoost = synonymFields.includes(fieldPath) ? 0.78 : 0
  const score = round(Math.max(lexical, fieldPathSimilarity, synonymBoost))
  const reasons = []
  if (synonymBoost) reasons.push("example mapping")
  if (lexical) reasons.push("keyword overlap")
  if (fieldPathSimilarity) reasons.push("field path similarity")
  return {
    memory,
    score,
    reasons: reasons.length ? reasons : ["weak fallback match"]
  }
}

function requestToText(item) {
  if (typeof item === "string") return item
  return [item?.description, item?.field_hint, item?.category_hint, item?.name].filter(Boolean).join(" ")
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim()
}

function tokens(value) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))
}

function pathSimilarity(left = "", right = "") {
  const leftParts = String(left).toLowerCase().split(/[.\s_-]+/).filter(Boolean)
  const rightParts = String(right).toLowerCase().split(/[.\s_-]+/).filter(Boolean)
  if (!leftParts.length || !rightParts.length) return 0
  const rightSet = new Set(rightParts)
  const overlap = leftParts.filter((part) => rightSet.has(part)).length
  return overlap / Math.max(leftParts.length, rightParts.length)
}

function round(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3))
}
