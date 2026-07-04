/**
 * Memact Context - Professional and Jobs Profile Category
 */

export const category = "professional";

export const contextFields = {
  preferred_job_roles: "Desired job titles or roles (e.g., Software Engineer, Product Manager)",
  core_skills: "List of established professional skills or technologies",
  work_environment: "Preferred work setup (remote, hybrid, on-site)",
  job_search_activity: "Recent job postings viewed or interacted with"
};

export function normalizeProfessionalContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Transient Signals: Casually viewing a job listing (Activity is not identity)
  if (type === "activity") {
    return {
      category: "professional",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Default Private for job search activity
      is_identity_claim: false,
      data: { ...data },
      suggestion: `You recently viewed a posting for ${data.viewed_role || 'a job'}. Are you looking to add this to your preferred roles?`,
      needs_review: true
    };
  }

  // Durable Preference Handling: Explicitly setting skills or work environments
  if (type === "preference") {
    return {
      category: "professional",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private", 
      is_identity_claim: explicit,
      data: { ...data },
      suggestion: explicit ? null : "Would you like to update your professional profile based on recent activity?",
      needs_review: !explicit
    };
  }

  return { category: "professional", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "linkedin.com",
    type: "preference",
    data: {
      preferred_job_roles: ["Frontend Developer", "UI Engineer"],
      core_skills: ["React", "TypeScript", "Figma"],
      work_environment: "remote"
    }
  },
  {
    source: "indeed.com",
    type: "activity",
    data: {
      action: "view",
      viewed_role: "Senior Data Scientist"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "professional",
    preferred_job_roles: ["Frontend Developer", "UI Engineer"],
    core_skills: ["React", "TypeScript", "Figma"],
    work_environment: "remote"
  }
];

export const proposalOutputExamples = [
  "Currently seeking roles as a {{preferred_job_roles}}.",
  "Proficient in {{core_skills}}.",
  "Prefers a {{work_environment}} work environment."
];