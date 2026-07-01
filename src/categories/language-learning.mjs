export const category = "language_learning";

export const LANGUAGE_LEARNING_SCHEMA = {
  category: "language_learning",
  description: "User-owned language learning preferences covering target languages, daily goals, and streaks.",
  product_rule: "Activity is not identity. A single short lesson in a new language should not permanently label the user as a learner of that language. Consistent streaks or explicit settings establish a durable target language.",
  sections: {
    goals: {
      description: "Languages the user is actively trying to learn and their daily time commitment.",
      fields: {
        target_languages: {
          type: "Array<String>",
          sensitive: false
        },
        daily_duration_goal_mins: {
          type: "Number",
          sensitive: false
        }
      }
    },
    progress: {
      description: "Metrics tracking the user's consistency.",
      fields: {
        active_streak_days: {
          type: "Number",
          sensitive: false
        }
      }
    }
  }
};

export const LANGUAGE_LEARNING_PERMISSIONS = [
  {
    scope: "language_learning:goals",
    description: "Read and write target languages and daily study goals.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "language_learning:progress",
    description: "Read and write active learning streaks.",
    sensitivity: "low",
    default_granted: true
  }
];

export const wikiEntryTemplates = [
  "You are currently learning [languages].",
  "Your daily study goal is [duration] minutes.",
  "You are on a [streak]-day language learning streak!"
];

export const rawInputExamples = [
  {
    user_id: "lang_user_1",
    explicit_targets: ["Spanish", "Japanese"],
    daily_goal_mins: 15,
    current_streak: 12
  },
  {
    user_id: "lang_user_2",
    recent_lesson_language: "French",
    total_lessons_completed: 1 // Too few to be a durable interest
  }
];

export const normalizedOutputExamples = [
  {
    category: "language_learning",
    goals: {
      target_languages: ["Spanish", "Japanese"],
      daily_duration_goal_mins: 15
    },
    progress: {
      active_streak_days: 12
    },
    dropped_fields: [],
    pending_approval_queue: [],
    validation: { ok: true }
  }
];

export function normalizeLanguageLearningContext(rawInput = {}) {
  const raw = typeof rawInput === "object" && rawInput !== null ? rawInput : {};
  const goals = {};
  const progress = {};
  const pending_approval_queue = [];
  const dropped_fields = [];
  const validation_issues = [];

  // Target Languages
  if (Array.isArray(raw.explicit_targets) && raw.explicit_targets.length > 0) {
    goals.target_languages = raw.explicit_targets.map(String);
  } else if (raw.recent_lesson_language) {
    // "Activity is not identity" guardrail
    const totalLessons = Number(raw.total_lessons_completed || 0);
    if (totalLessons >= 3 || raw.current_streak >= 2) {
      goals.target_languages = [String(raw.recent_lesson_language)];
    } else {
      dropped_fields.push("recent_lesson_language");
      pending_approval_queue.push({
        field: "recent_lesson_language",
        value: String(raw.recent_lesson_language),
        reason: "A single lesson does not constitute a durable language learning commitment."
      });
    }
  }

  // Daily Goals
  if (raw.daily_goal_mins && !isNaN(raw.daily_goal_mins)) {
    goals.daily_duration_goal_mins = Number(raw.daily_goal_mins);
  }

  // Streaks
  if (raw.current_streak !== undefined && !isNaN(raw.current_streak)) {
    progress.active_streak_days = Number(raw.current_streak);
  }

  const drop_reason = dropped_fields.length ? "Activity is not identity. Single test lessons are dropped or held for explicit approval." : null;

  return {
    category: "language_learning",
    goals,
    progress,
    pending_approval_queue,
    dropped_fields,
    drop_reason,
    validation: validation_issues.length
      ? { ok: false, reason: "invalid_language_data", issues: validation_issues }
      : { ok: true }
  };
}

export function validateLanguageLearningContext(input = {}) {
  return normalizeLanguageLearningContext(input).validation;
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = [];
  const languages = normalizedContext.goals?.target_languages;
  const dailyGoal = normalizedContext.goals?.daily_duration_goal_mins;
  const streak = normalizedContext.progress?.active_streak_days;

  if (languages && languages.length > 0) {
    proposals.push({
      id: "wiki_language_targets",
      type: "preference",
      sub_type: "target_languages",
      proposed_text: `You are currently learning ${languages.join(", ")}.`,
      confidence: 0.85,
      requires_user_confirmation: false
    });
  }

  if (dailyGoal) {
    proposals.push({
      id: "wiki_language_goal",
      type: "preference",
      sub_type: "daily_goal",
      proposed_text: `Your daily study goal is ${dailyGoal} minutes.`,
      confidence: 0.8,
      requires_user_confirmation: false
    });
  }

  if (streak && streak > 1) {
    proposals.push({
      id: "wiki_language_streak",
      type: "progress",
      sub_type: "streak",
      proposed_text: `You are on a ${streak}-day language learning streak!`,
      confidence: 0.9,
      requires_user_confirmation: false
    });
  }

  return proposals;
}