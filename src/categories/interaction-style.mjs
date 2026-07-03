/**
 * Memact Context - Conversational Tone & Interaction Style Category
 */

export const category = "interaction-style";

export const contextFields = {
  preferred_tone: "String indicating desired tone (e.g., professional, casual, empathetic, concise)",
  verbosity_level: "String indicating detail level (e.g., detailed, bullet_points, TL;DR)",
  proactive_suggestions: "Boolean indicating if the AI should suggest follow-up actions autonomously"
};

// Strict Privacy Boundary: Raw chats and emotional states MUST NEVER be stored permanently.
export const SENSITIVE_FIELDS = new Set([
  "raw_chat_log",
  "user_emotion",
  "prompt_history",
  "conversation_transcript",
  "message_content"
]);

export function normalizeInteractionContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // 1. Ephemeral Scrubbing: Drop raw chat logs and emotional states completely
  const cleanedData = { ...data };
  for (const key of Object.keys(cleanedData)) {
    if (SENSITIVE_FIELDS.has(key)) {
      delete cleanedData[key];
    }
  }

  // 2. Transient Activity Handling (Activity != Identity)
  if (type === "activity") {
    return {
      category: "interaction-style",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private",
      is_identity_claim: false,
      data: cleanedData,
      suggestion: "You've been asking for shorter, casual responses recently. Should we update your default AI communication style?",
      needs_review: true
    };
  }

  // 3. Durable Preference Handling
  if (type === "preference") {
    return {
      category: "interaction-style",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      data: cleanedData,
      suggestion: explicit ? null : "Update your interaction style based on your system prompts?",
      needs_review: !explicit
    };
  }

  return { category: "interaction-style", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES & METADATA ---

export const rawInputExamples = [
  {
    source: "chat_interface",
    type: "activity",
    data: {
      preferred_tone: "casual",
      raw_chat_log: "Hey AI, make this super short and chill.", // Should be dropped
      user_emotion: "frustrated" // Should be dropped
    }
  },
  {
    source: "settings_panel",
    type: "preference",
    explicit: true,
    data: {
      preferred_tone: "professional",
      verbosity_level: "bullet_points",
      proactive_suggestions: true
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "interaction-style",
    preferred_tone: "casual"
    // Note: raw_chat_log and user_emotion are intentionally omitted
  },
  {
    category: "interaction-style",
    preferred_tone: "professional",
    verbosity_level: "bullet_points",
    proactive_suggestions: true
  }
];

export const proposalOutputExamples = [
  "Prefers a {{preferred_tone}} tone in AI responses.",
  "Expects information to be delivered as {{verbosity_level}}.",
  "Autonomous proactive suggestions are set to {{proactive_suggestions}}."
];

export const permissionSuggestions = {
  preferred_tone: "low",
  verbosity_level: "low",
  proactive_suggestions: "medium"
};