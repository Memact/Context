export const contextGoalTemplates = Object.freeze([
  goalTemplate({
    id: "shopping_laptop",
    label: "Laptop shopping",
    group: "shopping",
    examples: ["laptop", "computer", "pc", "gaming", "work machine", "student laptop"],
    fields: [
      field("shopping.laptop.budget", "Budget range", "budget"),
      field("shopping.laptop.main_use", "Main use", "laptop_needs"),
      field("shopping.laptop.portability", "Portability", "laptop_needs"),
      field("shopping.laptop.specs", "Expected specs", "laptop_needs"),
      field("shopping.laptop.brands", "Brands", "brands")
    ]
  }),
  goalTemplate({
    id: "fitness_setup",
    label: "Fitness setup",
    group: "fitness",
    examples: ["fitness", "diet", "meal", "workout", "gym", "nutrition"],
    fields: [
      field("fitness.goal", "Fitness goal", "goals"),
      field("fitness.activity_level", "Activity level", "routine"),
      field("diet.preference", "Diet preference", "diet"),
      field("diet.allergy", "Food restrictions", "diet"),
      field("fitness.equipment", "Equipment", "routine")
    ]
  }),
  goalTemplate({
    id: "learning_setup",
    label: "Learning setup",
    group: "learning",
    examples: ["learn", "study", "course", "react", "exam", "tutorial"],
    fields: [
      field("learning.goal", "Learning goal", "goals"),
      field("learning.current_level", "Current level", "level"),
      field("learning.study_style", "Study style", "style"),
      field("learning.schedule", "Study schedule", "routine")
    ]
  }),
  goalTemplate({
    id: "identity_setup",
    label: "Identity basics",
    group: "identity",
    examples: ["name", "username", "language", "email", "profile"],
    fields: [
      field("identity.preferred_name", "Preferred name", "names"),
      field("identity.preferred_username", "Preferred username", "usernames"),
      field("identity.languages.read", "Languages you can read", "languages"),
      field("identity.languages.write", "Languages you can write", "languages"),
      field("identity.languages.speak", "Languages you can speak", "languages")
    ]
  })
])

export function suggestContextGoal(input = "", templates = contextGoalTemplates) {
  const text = normalize(input)
  if (!text) return null
  let best = null
  let bestScore = 0
  for (const template of templates) {
    const score = template.examples.reduce((sum, example) => sum + (text.includes(normalize(example)) ? 1 : 0), 0)
    if (score > bestScore) {
      best = template
      bestScore = score
    }
  }
  return best || templates[0] || null
}

export function buildMissingContextFields(goalInput = "", acceptedEntries = [], templates = contextGoalTemplates) {
  const template = suggestContextGoal(goalInput, templates)
  if (!template) return { goal: null, missing_fields: [], saved_fields: [] }
  const saved = new Map((Array.isArray(acceptedEntries) ? acceptedEntries : [])
    .filter((entry) => entry?.status === "accepted" || entry?.status === undefined)
    .map((entry) => [entry.field_path, entry]))
  const savedFields = []
  const missingFields = []
  for (const item of template.fields) {
    if (saved.has(item.field_path)) {
      savedFields.push(item)
    } else {
      missingFields.push(item)
    }
  }
  return {
    goal: template,
    missing_fields: missingFields,
    saved_fields: savedFields
  }
}

export function groupContextEntry(entry = {}) {
  return {
    group: entry.group || entry.category || inferGroupFromFieldPath(entry.field_path),
    subgroup: entry.subgroup || inferSubgroupFromFieldPath(entry.field_path)
  }
}

function goalTemplate(input) {
  return Object.freeze({
    ...input,
    fields: Object.freeze(input.fields.map((item) => Object.freeze(item))),
    examples: Object.freeze(input.examples)
  })
}

function field(fieldPath, label, subgroup) {
  return {
    field_path: fieldPath,
    label,
    subgroup,
    required: false
  }
}

function inferGroupFromFieldPath(fieldPath = "") {
  return String(fieldPath).split(".")[0] || "general"
}

function inferSubgroupFromFieldPath(fieldPath = "") {
  const parts = String(fieldPath).split(".")
  return parts.length > 2 ? parts[1] : "general"
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim()
}
