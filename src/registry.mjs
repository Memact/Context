import { SENSITIVE_FIELDS as fitnessSensitive, DURABLE_PREFERENCES as fitnessDurable } from "./categories/fitness.mjs"

export const CATEGORIES = [
  "ai-assistants",
  "book-reading",
  "calendar-scheduling",
  "cooking",
  "creator-tools",
  "developer-workspace",
  "dining",
  "education",
  "events-concerts",
  "finance",
  "fitness-challenges",
  "fitness",
  "food-delivery",
  "food-dining",
  "gaming",
  "health",
  "interaction-style",
  "language-learning",
  "learning",
  "movie-booking",
  "movies-tv",
  "music-streaming",
  "news-articles",
  "news-reading",
  "newsletters",
  "productivity",
  "professional",
  "shopping",
  "smart-home",
  "social-messaging",
  "sports",
  "travel",
  "video-streaming",
  "weather-settings"
]

export class CategoryRegistry {
  constructor() {
    this.categories = new Set(CATEGORIES)
  }

  listCategories() {
    return Array.from(this.categories)
  }

  hasCategory(category) {
    const clean = String(category || "").replace(/\.v\d+$/, "").trim()
    return this.categories.has(clean)
  }

  getSensitiveFields(category) {
    const clean = String(category || "").replace(/\.v\d+$/, "").trim()
    if (clean === "fitness") {
      return fitnessSensitive
    }
    if (clean === "finance" || clean === "health") {
      return new Set(["*"]) // All fields in finance/health are treated as sensitive
    }
    return new Set()
  }

  getDurablePreferences(category) {
    const clean = String(category || "").replace(/\.v\d+$/, "").trim()
    if (clean === "fitness") {
      return fitnessDurable
    }
    return new Set()
  }

  validateValue(category, field, value) {
    if (!this.hasCategory(category)) {
      return { ok: false, error: `Unknown category: ${category}` }
    }
    if (!field || typeof field !== "string") {
      return { ok: false, error: "Field name is required" }
    }
    const cleanCat = category.replace(/\.v\d+$/, "")
    const sensitive = this.getSensitiveFields(cleanCat)
    if (sensitive.has(field) || sensitive.has("*")) {
      if (value === undefined || value === null) {
        return { ok: false, error: `Sensitive field ${field} cannot be empty` }
      }
    }
    return { ok: true }
  }
}

export const registry = new CategoryRegistry()
