export const category = "ai-assistants";

export const contextFields = {
  explicit_preferences: "Preferences the user directly stated (e.g., 'I prefer TypeScript'). Stronger signal than inferred patterns.",
  inferred_usage_patterns: "Patterns observed from repeated assistant usage without an explicit user statement. Requires multi-session evidence.",
  preferred_response_style: "Response style observed or stated (e.g., concise, detailed, step-by-step, bullet points).",
  preferred_coding_languages: "Programming languages the user works with across multiple sessions.",
  recurring_project_context: "Project types, domains, or roles the user returns to repeatedly.",
  formatting_preferences: "Preferred response formats (markdown, plain text, code blocks, tables).",
  explanation_depth: "Observed or stated preference for explanation depth (beginner, intermediate, expert).",
  tools_and_frameworks: "Tools, libraries, or frameworks mentioned across multiple sessions.",
  explicitly_marked_context: "Things the user explicitly asked the assistant to remember.",
  explicitly_excluded_context: "Things the user explicitly said should not be remembered.",
  temporary_query_context: "One-off queries that should not influence long-term user context."
};

export const SENSITIVE_TOPIC_RULES = {
  sensitive_keywords: [
    "mental health", "therapy", "therapist", "depression", "anxiety", "grief",
    "trauma", "suicide", "self-harm", "addiction", "substance abuse",
    "divorce", "breakup", "relationship problem", "abuse",
    "debt", "bankruptcy", "financial crisis",
    "diagnosis", "illness", "cancer", "chronic pain",
    "religion", "faith", "prayer",
    "politics", "election", "political belief",
    "immigration", "legal status"
  ],
  isSensitive(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return SENSITIVE_TOPIC_RULES.sensitive_keywords.some(keyword => lower.includes(keyword));
  }
};

const MIN_INFERRED_SESSIONS = 3;

export function normalizeAssistantActivity(rawActivity = []) {
  const records = Array.isArray(rawActivity) ? rawActivity : [];

  const explicitPreferences = {};
  const explicitlyMarkedContext = [];
  const explicitlyExcludedContext = [];
  const languageSessionDates = {};
  const toolSessionDates = {};
  const projectDomainDates = {};
  const responseStyleCounts = {};
  const explanationDepthCounts = {};
  const formattingCounts = {};
  const temporaryContext = [];

  records.forEach(record => {
    const sessionDate = record.occurred_at
      ? new Date(record.occurred_at).toISOString().slice(0, 10)
      : null;

    switch (record.event_type) {
      case "explicit_preference": {
        const key = record.preference_key || "general";
        if (!explicitPreferences[key]) {
          explicitPreferences[key] = {
            key,
            value: record.value,
            confidence: 1.0,
            source: "explicit_user_statement",
            occurred_at: record.occurred_at || null
          };
        }
        break;
      }

      case "explicit_memory_request": {
        const isSensitive = SENSITIVE_TOPIC_RULES.isSensitive(record.content || "");
        explicitlyMarkedContext.push({
          content: record.content || "",
          occurred_at: record.occurred_at || new Date().toISOString(),
          requires_user_confirmation: isSensitive
        });
        break;
      }

      case "explicit_exclusion_request": {
        explicitlyExcludedContext.push({
          content: record.content || "",
          occurred_at: record.occurred_at || new Date().toISOString()
        });
        break;
      }

      case "code_block": {
        if (record.language && sessionDate) {
          const lang = record.language.toLowerCase();
          languageSessionDates[lang] = languageSessionDates[lang] || new Set();
          languageSessionDates[lang].add(sessionDate);
        }
        break;
      }

      case "tool_mention": {
        if (record.tool && sessionDate) {
          const tool = record.tool.toLowerCase();
          toolSessionDates[tool] = toolSessionDates[tool] || new Set();
          toolSessionDates[tool].add(sessionDate);
        }
        break;
      }

      case "project_context": {
        if (record.domain && sessionDate) {
          const domain = record.domain.toLowerCase();
          projectDomainDates[domain] = projectDomainDates[domain] || new Set();
          projectDomainDates[domain].add(sessionDate);
        }
        break;
      }

      case "response_style_signal": {
        if (record.style) {
          const style = record.style.toLowerCase();
          responseStyleCounts[style] = (responseStyleCounts[style] || 0) + 1;
        }
        break;
      }

      case "explanation_depth_signal": {
        if (record.depth) {
          const depth = record.depth.toLowerCase();
          explanationDepthCounts[depth] = (explanationDepthCounts[depth] || 0) + 1;
        }
        break;
      }

      case "formatting_signal": {
        if (record.format) {
          const format = record.format.toLowerCase();
          formattingCounts[format] = (formattingCounts[format] || 0) + 1;
        }
        break;
      }

      case "query":
      case "single_query": {
        const isSensitive = SENSITIVE_TOPIC_RULES.isSensitive(record.topic || record.content || "");
        temporaryContext.push({
          topic: record.topic || record.content || "unknown",
          occurred_at: record.occurred_at || new Date().toISOString(),
          sensitive: isSensitive,
          requires_user_confirmation: isSensitive
        });
        break;
      }
    }
  });

  const preferred_coding_languages = Object.entries(languageSessionDates)
    .filter(([, dates]) => dates.size >= MIN_INFERRED_SESSIONS)
    .map(([language, dates]) => ({
      language,
      session_count: dates.size,
      confidence: parseFloat(Math.min(0.9, 0.5 + dates.size * 0.1).toFixed(2)),
      source: "inferred_usage_pattern"
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const tools_and_frameworks = Object.entries(toolSessionDates)
    .filter(([, dates]) => dates.size >= MIN_INFERRED_SESSIONS)
    .map(([tool, dates]) => ({
      tool,
      session_count: dates.size,
      confidence: parseFloat(Math.min(0.9, 0.5 + dates.size * 0.1).toFixed(2)),
      source: "inferred_usage_pattern"
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const recurring_project_context = Object.entries(projectDomainDates)
    .filter(([, dates]) => dates.size >= 2)
    .map(([domain, dates]) => ({
      domain,
      session_count: dates.size,
      confidence: parseFloat(Math.min(0.85, 0.4 + dates.size * 0.12).toFixed(2)),
      source: "inferred_usage_pattern"
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const preferred_response_style = Object.entries(responseStyleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([style]) => style)[0] || null;

  const explanation_depth = Object.entries(explanationDepthCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([depth]) => depth)[0] || null;

  const formatting_preferences = Object.entries(formattingCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([format]) => format);

  return {
    category: "ai-assistants",
    explicit_preferences: Object.values(explicitPreferences),
    inferred_usage_patterns: {
      preferred_coding_languages,
      tools_and_frameworks,
      recurring_project_context,
      preferred_response_style,
      explanation_depth,
      formatting_preferences
    },
    explicitly_marked_context: explicitlyMarkedContext,
    explicitly_excluded_context: explicitlyExcludedContext,
    temporary_context: temporaryContext
  };
}

export function generateWikiEntries(normalizedContext) {
  const proposals = [];

  normalizedContext.explicit_preferences.forEach(pref => {
    proposals.push({
      id: `wiki_explicit_${pref.key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      type: "preference",
      sub_type: "explicit",
      proposed_text: buildExplicitPreferenceText(pref),
      raw_source_summary: "Directly stated by user.",
      confidence: 1.0,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  normalizedContext.inferred_usage_patterns.preferred_coding_languages.forEach(lang => {
    proposals.push({
      id: `wiki_inferred_lang_${lang.language.replace(/[^a-z0-9]+/g, "_")}`,
      type: "usage_pattern",
      sub_type: "coding_language",
      proposed_text: `Often writes ${lang.language} code across sessions.`,
      raw_source_summary: `Code blocks observed in ${lang.session_count} sessions.`,
      confidence: lang.confidence,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  normalizedContext.inferred_usage_patterns.tools_and_frameworks.forEach(tool => {
    proposals.push({
      id: `wiki_inferred_tool_${tool.tool.replace(/[^a-z0-9]+/g, "_")}`,
      type: "usage_pattern",
      sub_type: "tool",
      proposed_text: `Frequently works with ${tool.tool}.`,
      raw_source_summary: `Tool mentioned across ${tool.session_count} sessions.`,
      confidence: tool.confidence,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  normalizedContext.inferred_usage_patterns.recurring_project_context.forEach(ctx => {
    proposals.push({
      id: `wiki_inferred_project_${ctx.domain.replace(/[^a-z0-9]+/g, "_")}`,
      type: "usage_pattern",
      sub_type: "project_context",
      proposed_text: `Often brings ${ctx.domain} context to assistant sessions.`,
      raw_source_summary: `Project domain mentioned across ${ctx.session_count} sessions.`,
      confidence: ctx.confidence,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  if (normalizedContext.inferred_usage_patterns.preferred_response_style) {
    const style = normalizedContext.inferred_usage_patterns.preferred_response_style;
    proposals.push({
      id: "wiki_pref_response_style",
      type: "preference",
      sub_type: "response_style",
      proposed_text: `Tends to prefer ${style} responses.`,
      raw_source_summary: "Inferred from repeated interaction style signals.",
      confidence: 0.75,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  }

  normalizedContext.explicitly_marked_context.forEach((item, index) => {
    proposals.push({
      id: `wiki_marked_${index}`,
      type: "explicit_memory",
      sub_type: "user_marked",
      proposed_text: item.content,
      raw_source_summary: "Explicitly marked by user for remembering.",
      confidence: 1.0,
      requires_user_confirmation: item.requires_user_confirmation,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  return proposals;
}

function buildExplicitPreferenceText(pref) {
  const templates = {
    coding_language: `Prefers ${pref.value} for coding.`,
    response_style: `Prefers ${pref.value} responses.`,
    explanation_depth: `Prefers ${pref.value}-level explanations.`,
    formatting: `Prefers ${pref.value} formatting.`
  };
  return templates[pref.key] || `Has stated a preference: ${pref.value} (${pref.key}).`;
}

export const rawInputExamples = [
  {
    event_type: "explicit_preference",
    preference_key: "coding_language",
    value: "TypeScript",
    occurred_at: "2026-05-01T10:00:00Z"
  },
  {
    event_type: "code_block",
    language: "python",
    occurred_at: "2026-05-01T10:05:00Z"
  },
  {
    event_type: "explicit_memory_request",
    content: "I work on a fintech SaaS platform focused on payments",
    occurred_at: "2026-05-01T10:10:00Z"
  },
  {
    event_type: "query",
    topic: "grief counseling resources",
    occurred_at: "2026-05-01T10:15:00Z"
  }
];

export const normalizedOutputExamples = [
  {
    category: "ai-assistants",
    explicit_preferences: [
      {
        key: "coding_language",
        value: "TypeScript",
        confidence: 1.0,
        source: "explicit_user_statement",
        occurred_at: "2026-05-01T10:00:00Z"
      }
    ],
    inferred_usage_patterns: {
      preferred_coding_languages: [],
      tools_and_frameworks: [],
      recurring_project_context: [],
      preferred_response_style: null,
      explanation_depth: null,
      formatting_preferences: []
    },
    explicitly_marked_context: [
      {
        content: "I work on a fintech SaaS platform focused on payments",
        occurred_at: "2026-05-01T10:10:00Z",
        requires_user_confirmation: false
      }
    ],
    explicitly_excluded_context: [],
    temporary_context: [
      {
        topic: "grief counseling resources",
        occurred_at: "2026-05-01T10:15:00Z",
        sensitive: true,
        requires_user_confirmation: true
      }
    ]
  }
];

export const wikiEntryTemplates = [
  "Prefers {{explicit_preference_value}} for {{explicit_preference_key}}.",
  "Often writes {{preferred_coding_language}} code across sessions.",
  "Frequently works with {{tool_or_framework}}.",
  "Has noted: {{explicitly_marked_context}}"
];

export const permissionSuggestions = {
  explicit_preferences: "low",
  preferred_response_style: "low",
  formatting_preferences: "low",
  preferred_coding_languages: "low",
  tools_and_frameworks: "medium",
  recurring_project_context: "medium",
  explicitly_marked_context: "high",
  raw_conversation_history: "high"
};

export const careNotes = [
  "Do not expose raw conversation content or message history by default.",
  "Sensitive one-off queries (mental health, personal struggles, health concerns) must not become permanent context.",
  "Explicit user preferences always override inferred usage patterns.",
  "Inferred patterns require repeated evidence across multiple sessions, not a single interaction.",
  "Do not infer emotional state, mental health condition, or personal life details from assistant queries.",
  "Explicitly excluded context must be honored and must not surface in any proposal.",
  "Assistant memory should be inspectable: users can see, edit, approve, and delete any proposed context."
];
