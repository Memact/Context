/**
 * Memact Context - Education and Courses Category
 */

export const category = "education";

export const contextFields = {
  preferred_study_formats: "Format of learning (e.g., video lectures, coding sandboxes, quizzes)",
  study_time_preferences: "Time of day preferred for studying (e.g., morning slots, evening slots)",
  certification_goals: "Current certifications or degrees being pursued",
  course_history: "Recent courses viewed or enrolled in"
};

export function normalizeEducationContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Transient Signals: A single course search or casual browsing
  if (type === "activity") {
    return {
      category: "education",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Default Private
      is_identity_claim: false,
      data: { ...data },
      suggestion: `You recently searched for ${data.course_query || 'a course'}. Are you currently pursuing a certification in this area?`,
      needs_review: true
    };
  }

  // Durable Preference Handling
  if (type === "preference") {
    return {
      category: "education",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private", // Default Private
      is_identity_claim: explicit,
      data: { ...data },
      suggestion: explicit ? null : "Would you like to update your preferred study formats based on your recent activity?",
      needs_review: !explicit
    };
  }

  return { category: "education", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "coursera.org",
    type: "preference",
    data: {
      preferred_study_formats: ["video lectures", "quizzes"],
      study_time_preferences: ["evening slots"],
      certification_goals: ["AWS Certified Solutions Architect"]
    }
  },
  {
    source: "udemy.com",
    type: "activity",
    data: {
      action: "search",
      course_query: "Introduction to React"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "education",
    preferred_study_formats: ["video lectures", "quizzes"],
    study_time_preferences: ["evening slots"],
    certification_goals: ["AWS Certified Solutions Architect"]
  }
];

export const proposalOutputExamples = [
  "Currently pursuing {{certification_goals}}.",
  "Prefers to study using {{preferred_study_formats}} during {{study_time_preferences}}."
];