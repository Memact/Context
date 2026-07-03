/**
 * Memact Context - Social and Messaging Category
 */

export const category = "social-messaging";

export const contextFields = {
  communication_tone: "Preferred tone (e.g., concise, detailed, informal, professional)",
  muted_notification_windows: "Time ranges where notifications should be suppressed",
  active_communities: "List of communities or groups the user actively engages in"
};

export function normalizeSocialContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // Social interactions (like single messages) are transient
  if (type === "activity") {
    return {
      category: "social-messaging",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private",
      is_identity_claim: false,
      data: { ...data },
      suggestion: "You've been messaging frequently in this group. Add to active communities?",
      needs_review: true
    };
  }

  // Durable preference handling (e.g., setting tone or mute windows)
  if (type === "preference") {
    return {
      category: "social-messaging",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      data: { ...data },
      suggestion: explicit ? null : "Update your notification preferences?",
      needs_review: !explicit
    };
  }

  return { category: "social-messaging", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES ---

export const rawInputExamples = [
  {
    source: "whatsapp.com",
    type: "preference",
    data: {
      communication_tone: "concise",
      muted_notification_windows: ["22:00-07:00"]
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "social-messaging",
    communication_tone: "concise",
    muted_notification_windows: ["22:00-07:00"]
  }
];

export const proposalOutputExamples = [
  "Prefers {{communication_tone}} communication.",
  "Mutes notifications during {{muted_notification_windows}}.",
  "Active member of {{active_communities}}."
];