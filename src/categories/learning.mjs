import { checkOverconfidentInferences } from "./validation-helper.mjs";

export const category = "learning";

const STABLE_PREFERRED_FORMATS = new Set(["text", "video", "quiz", "project", "mixed"]);
const STABLE_PREFERRED_PACES = new Set(["slow", "moderate", "fast", "self-directed"]);
const STABLE_EXPLANATION_STYLES = new Set(["conceptual", "example-first", "step-by-step", "visual", "socratic"]);
const SESSION_LENGTH_LABELS = new Set(["short", "medium", "long"]);

export const LEARNING_SCHEMA = {
  category: "learning",
  description: "User-owned learning preferences and current learning goals shaped from app context.",
  product_rule: "Learning context helps personalization without permanently labeling users by weak areas or temporary confusion.",
  sections: {
    stable_preferences: {
      description: "Long-lived user-owned learning preferences that describe how the user likes to learn.",
      fields: {
        preferred_format: {
          type: "enum",
          values: ["text", "video", "quiz", "project", "mixed"],
          sensitive: false
        },
        preferred_pace: {
          type: "enum",
          values: ["slow", "moderate", "fast", "self-directed"],
          sensitive: false
        },
        explanation_style: {
          type: "enum",
          values: ["conceptual", "example-first", "step-by-step", "visual", "socratic"],
          sensitive: false
        },
        session_length_preference: {
          type: "enum",
          values: ["short", "medium", "long"],
          description: "short (< 15 min), medium, or long (> 45 min)",
          sensitive: false
        }
      }
    },
    current_goals: {
      description: "Short-lived learning context tied to the current study goal or active session.",
      fields: {
        active_topics: {
          type: "Array<String>",
          sensitive: false
        },
        current_difficulty: {
          type: "Object",
          value_enum: ["beginner", "intermediate", "advanced"],
          sensitive: false
        },
        study_goals: {
          type: "String",
          sensitive: false
        },
        completed_lessons: {
          type: "Array<String>",
          sensitive: false
        },
        session_streak: {
          type: "Number",
          sensitive: false
        }
      }
    },
    sensitive_signals: {
      description: "Temporary signals that must never become permanent identity traits.",
      fields: {
        repeated_mistakes: {
          type: "Array<String>",
          sensitive: true,
          scope: "current_goal",
          expires_on_goal_completion: true
        },
        weak_areas: {
          type: "Array<String>",
          sensitive: true,
          scope: "current_goal",
          expires_on_goal_completion: true
        },
        confusion_signals: {
          type: "Array<Object>",
          sensitive: true,
          scope: "current_goal",
          expires_on_goal_completion: true
        }
      }
    }
  }
};

export const LEARNING_PERMISSIONS = [
  {
    scope: "learning:preferences",
    description: "Read and write stable learning preferences such as format, pace, and explanation style.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "learning:goals",
    description: "Read and write active topics and goals tied to the current learning objective.",
    sensitivity: "medium",
    default_granted: false,
    first_write_requires_confirmation: true
  },
  {
    scope: "learning:progress",
    description: "Read and write completed lessons and streaks for visible progress tracking.",
    sensitivity: "medium",
    default_granted: false,
    user_summary_before_approval: true
  },
  {
    scope: "learning:signals",
    description: "Read and write temporary struggle signals like repeated mistakes or confusion markers.",
    sensitivity: "high",
    default_granted: false,
    requires_explicit_wiki_approval: true,
    expires_on_goal_completion: true
  }
];

export const wikiEntryTemplates = [
  "You're currently working through **[topic]** as part of your goal to [study_goal]. You've completed [N] lessons so far and have been on a [streak]-day streak.",
  "You tend to learn best with [preferred_format] content at a [preferred_pace] pace, preferring [explanation_style] explanations.",
  "You've revisited **[topic]** a few times recently — you may want to spend more time here or try a different format."
];

export const rawInputExamples = [
  {
    user_id: "u_123",
    topics_viewed: ["React hooks", "useEffect", "closures"],
    quiz_scores: { closures: 0.4, useEffect: 0.9 },
    failed_cards: ["closure scope", "stale closures"],
    streak: 5,
    last_session_duration_mins: 22,
    preferred_card_type: "code-snippet",
    badge: "struggling-with-closures"
  },
  {
    user_id: "u_123",
    completed_videos: ["intro-to-sql", "joins-explained"],
    rewatched: ["joins-explained"],
    speed_setting: 1.5,
    enrolled_courses: ["SQL Mastery", "Data Eng Bootcamp"],
    dropout_risk_score: 0.7,
    next_recommended: "window-functions"
  }
];

export const normalizedOutputExamples = [
  {
    category: "learning",
    stable_preferences: {
      preferred_format: "quiz",
      explanation_style: "example-first"
    },
    current_goals: {
      active_topics: ["React hooks", "closures"],
      current_difficulty: { closures: "intermediate" },
      session_streak: 5
    },
    dropped_fields: ["badge", "failed_cards"],
    drop_reason: "Overconfident permanent labels. Retained as ephemeral signals only if user approves Wiki entry."
  },
  {
    category: "learning",
    stable_preferences: {
      preferred_pace: "fast",
      preferred_format: "video"
    },
    current_goals: {
      active_topics: ["SQL", "Data Engineering"],
      completed_lessons: ["intro-to-sql", "joins-explained"]
    },
    dropped_fields: ["dropout_risk_score"],
    drop_reason: "Model inference about user risk not surfaced to user without explicit consent."
  }
];

const OVERCONFIDENT_FIELDS = new Set(["badge", "dropout_risk_score"]);

export function normalizeLearningContext(rawInput = {}) {
  const raw = isObject(rawInput) ? rawInput : {};
  const stable_preferences = {};
  const current_goals = {};
  const pending_approval = [];
  
  // Use the newly implemented categorized validation helper decorator
  const { validation_issues, dropped_fields } = checkOverconfidentInferences(raw, OVERCONFIDENT_FIELDS);

  const preferredFormat = normalizePreferredFormat(raw);
  if (preferredFormat) stable_preferences.preferred_format = preferredFormat;

  const preferredPace = normalizePreferredPace(raw);
  if (preferredPace) stable_preferences.preferred_pace = preferredPace;

  const explanationStyle = normalizeExplanationStyle(raw);
  if (explanationStyle) stable_preferences.explanation_style = explanationStyle;

  const sessionLengthPreference = normalizeSessionLengthPreference(raw);
  if (sessionLengthPreference) stable_preferences.session_length_preference = sessionLengthPreference;

  const activeTopics = normalizeActiveTopics(raw);
  if (activeTopics.length) current_goals.active_topics = activeTopics;

  const currentDifficulty = normalizeCurrentDifficulty(raw);
  if (Object.keys(currentDifficulty).length) current_goals.current_difficulty = currentDifficulty;

  const studyGoals = normalizeStudyGoals(raw);
  if (studyGoals) current_goals.study_goals = studyGoals;

  const completedLessons = normalizeCompletedLessons(raw);
  if (completedLessons.length) current_goals.completed_lessons = completedLessons;

  const streak = normalizeSessionStreak(raw);
  if (streak !== null) current_goals.session_streak = streak;

  const repeatedMistakes = normalizeStringArray(raw.repeated_mistakes);
  if (repeatedMistakes.length) {
    pending_approval.push({
      field: "repeated_mistakes",
      value: repeatedMistakes,
      sensitive: true,
      scope: "current_goal",
      source: "app_signal",
      expires_on_goal_completion: true
    });
  }

  const weakAreas = normalizeStringArray(raw.weak_areas);
  if (weakAreas.length) {
    pending_approval.push({
      field: "weak_areas",
      value: weakAreas,
      sensitive: true,
      scope: "current_goal",
      source: "app_signal",
      expires_on_goal_completion: true
    });
  }

  const confusionSignals = normalizeConfusionSignalObjects(raw.confusion_signals);
  if (confusionSignals.length) {
    pending_approval.push({
      field: "confusion_signals",
      value: confusionSignals,
      sensitive: true,
      scope: "current_goal",
      source: "app_signal",
      expires_on_goal_completion: true
    });
  }

  if (Object.hasOwn(raw, "failed_cards")) dropped_fields.push("failed_cards");

  const drop_reason = buildDropReason(dropped_fields, validation_issues, pending_approval);

  return {
    category: "learning",
    stable_preferences,
    current_goals,
    pending_approval_queue: pending_approval,
    dropped_fields: unique(dropped_fields),
    drop_reason,
    validation: validation_issues.length
      ? { ok: false, reason: "overconfident_inference", issues: validation_issues }
      : { ok: true }
  };
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = []
  const stablePreferences = normalizedContext.stable_preferences || {}
  const currentGoals = normalizedContext.current_goals || {}
  const pendingApprovalQueue = Array.isArray(normalizedContext.pending_approval_queue)
    ? normalizedContext.pending_approval_queue
    : []

  if (Object.keys(stablePreferences).length) {
    proposals.push({
      id: "wiki_learning_preferences",
      type: "preference",
      sub_type: "learning_style",
      proposed_text: buildPreferenceText(stablePreferences),
      raw_source_summary: "Derived from repeated learning interaction patterns and explicit study settings.",
      confidence: 0.84,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    })
  }

  if (currentGoals.active_topics?.length || currentGoals.study_goals || currentGoals.completed_lessons?.length || currentGoals.session_streak !== undefined) {
    const topic = currentGoals.active_topics?.[0] || "your current topic"
    const lessonsCount = currentGoals.completed_lessons?.length ?? 0
    const streak = currentGoals.session_streak ?? 0

    proposals.push({
      id: `wiki_learning_goal_${slugify(topic)}`,
      type: "goal",
      sub_type: "active_learning_goal",
      proposed_text: buildGoalText(topic, currentGoals.study_goals, lessonsCount, streak),
      raw_source_summary: "Summarized from the current active topics, goal statements, and visible progress signals.",
      confidence: 0.8,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    })
  }

  pendingApprovalQueue.forEach((item, index) => {
    proposals.push({
      id: `wiki_learning_signal_${item.field}_${index}`,
      type: "progress",
      sub_type: item.field,
      proposed_text: buildProgressText(item),
      raw_source_summary: "Temporary learning signal held for user approval and not stored as a permanent trait.",
      confidence: 0.42,
      requires_user_confirmation: true,
      actions: ["approve", "edit", "reject", "delete"]
    })
  })

  return proposals
}

export function validateLearningContext(input = {}) {
  const normalized = normalizeLearningContext(input)
  return normalized.validation
}

function normalizePreferredFormat(raw) {
  if (STABLE_PREFERRED_FORMATS.has(raw.preferred_format)) return raw.preferred_format;
  if (raw.preferred_card_type === "code-snippet" || raw.preferred_card_type === "quiz") return "quiz";
  if (Array.isArray(raw.completed_videos) && raw.completed_videos.length) return "video";
  if (raw.content_type && STABLE_PREFERRED_FORMATS.has(raw.content_type)) return raw.content_type;
  return null;
}

function normalizePreferredPace(raw) {
  if (STABLE_PREFERRED_PACES.has(raw.preferred_pace)) return raw.preferred_pace;
  if (typeof raw.speed_setting === "number") {
    if (raw.speed_setting >= 1.25) return "fast";
    if (raw.speed_setting <= 0.85) return "slow";
    return "moderate";
  }
  return null;
}

function normalizeExplanationStyle(raw) {
  if (STABLE_EXPLANATION_STYLES.has(raw.explanation_style)) return raw.explanation_style;
  if (raw.preferred_card_type === "code-snippet") return "example-first";
  if (raw.preferred_card_type === "flashcard") return "step-by-step";
  return null;
}

function normalizeSessionLengthPreference(raw) {
  if (SESSION_LENGTH_LABELS.has(raw.session_length_preference)) return raw.session_length_preference;
  const minutes = Number(raw.last_session_duration_mins);
  if (!Number.isFinite(minutes)) return null;
  if (minutes < 15) return "short";
  if (minutes > 45) return "long";
  return null;
}

function normalizeActiveTopics(raw) {
  const topics = [];
  const quizScores = isObject(raw.quiz_scores) ? raw.quiz_scores : {};

  normalizeStringArray(raw.topics_viewed).forEach((topic) => {
    const normalized = normalizeTopicLabel(topic);
    const lowerTopic = topic.toLowerCase();
    const score = Number(quizScores[topic] ?? quizScores[normalized] ?? quizScores[lowerTopic]);
    if (Number.isFinite(score) && score > 0.8) return;
    topics.push(normalized);
  });

  normalizeStringArray(raw.enrolled_courses).forEach((course) => {
    const normalized = normalizeCourseTopic(course);
    if (normalized) topics.push(normalized);
  });

  if (typeof raw.next_recommended === "string") {
    topics.push(normalizeTopicLabel(raw.next_recommended));
  }

  return unique(topics.filter(Boolean));
}

function normalizeCurrentDifficulty(raw) {
  const difficulty = {};

  const quizScores = isObject(raw.quiz_scores) ? raw.quiz_scores : {};
  for (const [topic, scoreValue] of Object.entries(quizScores)) {
    const score = Number(scoreValue);
    if (!Number.isFinite(score) || score > 0.8) continue;
    difficulty[normalizeTopicLabel(topic)] = scoreToDifficulty(score);
  }

  normalizeStringArray(raw.failed_cards).forEach((card) => {
    const topic = normalizeTopicLabel(card);
    difficulty[topic] ||= "intermediate";
  });

  return difficulty;
}

function normalizeStudyGoals(raw) {
  if (typeof raw.study_goals === "string" && raw.study_goals.trim()) return raw.study_goals.trim();
  if (typeof raw.study_goal === "string" && raw.study_goal.trim()) return raw.study_goal.trim();
  if (typeof raw.goal === "string" && raw.goal.trim()) return raw.goal.trim();
  return null;
}

function normalizeCompletedLessons(raw) {
  const lessons = [];
  normalizeStringArray(raw.completed_lessons).forEach((lesson) => lessons.push(lesson));
  normalizeStringArray(raw.completed_videos).forEach((lesson) => lessons.push(lesson));
  return unique(lessons);
}

function normalizeConfusionSignalObjects(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const topic = typeof item.topic === "string" ? item.topic.trim() : "";
      const type = typeof item.type === "string" ? item.type.trim() : "";
      if (!topic && !type) return null;
      return {
        ...(topic ? { topic: normalizeTopicLabel(topic) } : {}),
        ...(type ? { type } : {})
      };
    })
    .filter(Boolean);
}

function normalizeSessionStreak(raw) {
  if (raw.session_streak !== undefined) return numberOrNull(raw.session_streak);
  if (raw.streak !== undefined) return numberOrNull(raw.streak);
  return null;
}

function normalizeCourseTopic(course) {
  const text = String(course || "").trim();
  if (!text) return null;

  if (/^sql\b/i.test(text)) return "SQL";
  if (/data\s+eng/i.test(text)) return "Data Engineering";
  if (/react\s+hooks?/i.test(text)) return "React hooks";
  if (/closures?/i.test(text)) return "closures";

  return normalizeTopicLabel(text.replace(/\b(mastery|bootcamp|course|tutorial|series)\b/gi, "").trim());
}

function normalizeTopicLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^sql\b/i.test(text)) return "SQL";
  if (/data\s+eng/i.test(text)) return "Data Engineering";
  if (/useeffect/i.test(text)) return "useEffect";
  if (/react hooks?/i.test(text)) return "React hooks";
  if (/closure/i.test(text)) return "closures";

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\bwindow functions?\b/i, "window functions")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreToDifficulty(score) {
  if (score < 0.35) return "beginner";
  if (score < 0.85) return "intermediate";
  return "advanced";
}

function buildPreferenceText(stablePreferences) {
  const format = stablePreferences.preferred_format;
  const pace = stablePreferences.preferred_pace;
  const style = stablePreferences.explanation_style;
  const sessionLength = formatSessionLength(stablePreferences.session_length_preference);

  if (format && pace && style && sessionLength) {
    return `You tend to learn best with ${format} content at a ${pace} pace, preferring ${style} explanations, and ${sessionLength}.`;
  }
  if (format && pace && style) {
    return `You tend to learn best with ${format} content at a ${pace} pace, preferring ${style} explanations.`;
  }
  if (format && style && sessionLength) {
    return `You tend to learn best with ${format} content, preferring ${style} explanations, and ${sessionLength}.`;
  }
  if (format && style) {
    return `You tend to learn best with ${format} content, preferring ${style} explanations.`;
  }
  if (format && pace && sessionLength) {
    return `You tend to learn best with ${format} content at a ${pace} pace, and ${sessionLength}.`;
  }
  if (format && pace) {
    return `You tend to learn best with ${format} content at a ${pace} pace.`;
  }
  if (pace && style && sessionLength) {
    return `You tend to learn best with a ${pace} pace, preferring ${style} explanations, and ${sessionLength}.`;
  }
  if (pace && style) {
    return `You tend to learn best with a ${pace} pace, preferring ${style} explanations.`;
  }
  if (format && sessionLength) {
    return `You tend to learn best with ${format} content and ${sessionLength}.`;
  }
  if (pace && sessionLength) {
    return `You tend to learn best with a ${pace} pace and ${sessionLength}.`;
  }
  if (style && sessionLength) {
    return `You tend to learn best with ${style} explanations and ${sessionLength}.`;
  }
  if (format) return `You tend to learn best with ${format} content.`;
  if (pace) return `You tend to learn best with a ${pace} pace.`;
  if (style) return `You tend to learn best with ${style} explanations.`;
  if (sessionLength) return `You tend to learn best with ${sessionLength}.`;
  return "You have not shared a clear learning preference yet.";
}

function formatSessionLength(length) {
  if (length === "short") return "short sessions";
  if (length === "medium") return "medium-length sessions";
  if (length === "long") return "long sessions";
  return null;
}

function buildGoalText(topic, studyGoal, lessonCount, streak) {
  const goalText = studyGoal ? ` as part of your goal to ${studyGoal}` : "";
  return `You're currently working through **${topic}**${goalText}. You've completed ${lessonCount} lessons so far and have been on a ${streak}-day streak.`;
}

function buildProgressText(item) {
  const topic = extractSignalTopic(item);
  return `You've revisited **${topic}** a few times recently — you may want to spend more time here or try a different format.`;
}

function extractSignalTopic(item) {
  const firstValue = Array.isArray(item.value) ? item.value[0] : null;
  if (typeof firstValue === "string" && firstValue.trim()) return normalizeTopicLabel(firstValue);
  if (isObject(firstValue) && typeof firstValue.topic === "string" && firstValue.topic.trim()) {
    return normalizeTopicLabel(firstValue.topic);
  }
  if (typeof item.topic === "string" && item.topic.trim()) return normalizeTopicLabel(item.topic);
  return "this topic";
}

function buildDropReason(droppedFields, validationIssues, pendingApproval) {
  if (validationIssues.some((issue) => issue.field === "dropout_risk_score")) {
    return "Model inference about user risk not surfaced to user without explicit consent.";
  }

  if (validationIssues.some((issue) => issue.field === "badge")) {
    return "Overconfident permanent labels. Retained as ephemeral signals only if user approves Wiki entry.";
  }

  if (pendingApproval.length) {
    return "Temporary learning signals were held for user approval and are not stored as permanent traits.";
  }

  if (droppedFields.length) {
    return "Non-permanent learning signals were dropped from the stored profile.";
  }

  return null;
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function unique(values) {
  return [...new Set(values)];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function slugify(value) {
  return String(value || "topic")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "topic";
}