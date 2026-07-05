/**
 * Memact Context - Fitness Challenges Category (Declarative Schema)
 *
 * Models:
 * - daily step count goals
 * - active challenge streaks
 * - preferred challenge formats
 *
 * Product rule: Activity is not identity.
 * A single day/one-off report should not automatically become durable memory.
 */

export const category = "fitness-challenges";

export const FITNESS_CHALLENGES_SCHEMA = {
  category,
  description:
    "User-owned daily step goals and challenge progress (streaks) inferred from explicit settings and repeated reports. One-off activity should remain weak until reinforced.",

  product_rule:
    "Do not treat a single day of steps or a single challenge completion as permanent identity. Durable memory requires explicit preferences and/or repeated evidence."
  ,

  sections: {
    daily_step_goals: {
      description: "Durable goal settings for daily steps.",
      fields: {
        step_goal: {
          type: "number",
          description: "Target number of steps per day.",
          examples: ["8000", "10000"],
          sensitive: false
        },
        goal_unit: {
          type: "enum",
          values: ["steps"],
          sensitive: false
        },
        goal_start_date: {
          type: "string",
          description: "Optional ISO date the user started this goal.",
          sensitive: false
        }
      }
    },

    active_challenge_streaks: {
      description:
        "Temporary or semi-temporary progress signals. Streak durability requires reinforcement across days.",
      fields: {
        active_challenge_name: {
          type: "string",
          sensitive: false,
          description: "Name/id of the current challenge (e.g., '10k for 30 days')."
        },
        current_streak_days: {
          type: "number",
          sensitive: false,
          description: "Current consecutive days achieved for the active challenge."
        },
        streak_goal_steps: {
          type: "number",
          sensitive: false,
          description: "Step threshold used to determine streak success."
        },
        streak_last_achieved_date: {
          type: "string",
          sensitive: false,
          description: "Optional ISO date for last day where streak condition was met."
        },
        evidence_strength: {
          type: "enum",
          values: ["weak", "reinforced"],
          sensitive: false,
          description: "Whether the streak claim is based on weak or reinforced evidence."
        }
      }
    },

    preferred_challenge_formats: {
      description: "User preference for challenge type/structure. Generally durable.",
      fields: {
        preferred_formats: {
          type: "Array<String>",
          sensitive: false,
          description: "Accepted formats for future challenges.",
          examples: ["weekly", "daily", "milestones", "streak"]
        },
        preferred_coach_style: {
          type: "enum",
          values: ["gentle", "standard", "tough"],
          sensitive: false,
          description: "Optional motivational style preference."
        }
      }
    },

    sensitive_signals: {
      description:
        "Signals that should require explicit user approval before becoming durable memory.",
      fields: {
        medical_constraints: {
          type: "Array<String>",
          sensitive: true,
          scope: "temporary",
          requires_explicit_confirmation: true,
          description:
            "Optional constraints (e.g., doctor advised activity restrictions)."
        }
      }
    }
  }
};

export const FITNESS_CHALLENGES_PERMISSIONS = [
  {
    scope: "fitness-challenges:goals",
    description: "Read and write step goals.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "fitness-challenges:preferences",
    description: "Read and write preferred challenge formats.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "fitness-challenges:streaks",
    description: "Read and write active challenge progress (streaks).",
    sensitivity: "medium",
    default_granted: false,
    first_write_requires_confirmation: true
  }
];

const ALLOWED_FORMATS = new Set(["daily", "weekly", "milestones", "streak", "step_goal"]);
const ALLOWED_COACH_STYLES = new Set(["gentle", "standard", "tough"]);

/**
 * Example wiki templates.
 */
export const wikiEntryTemplates = [
  "Your daily step goal is **[step_goal]** steps.",
  "You are on a **[current_streak_days]-day** streak for **[active_challenge_name]** (threshold: **[streak_goal_steps]** steps).",
  "You prefer **[preferred_formats]** challenge formats."
];

export const rawInputExamples = [
  {
    user_id: "u_123",
    source: "StepApp",
    type: "step_goal",
    explicit: true,
    data: {
      step_goal: 10000,
      goal_unit: "steps",
      goal_start_date: "2026-01-01"
    }
  },
  {
    user_id: "u_123",
    source: "StepApp",
    type: "challenge",
    explicit: false,
    data: {
      active_challenge_name: "10k for 30 days",
      current_streak_days: 1,
      streak_goal_steps: 10000,
      streak_last_achieved_date: "2026-01-01",
      evidence_strength: "weak"
    }
  },
  {
    user_id: "u_123",
    source: "StepApp",
    type: "preference",
    explicit: true,
    data: {
      preferred_formats: ["daily", "streak"],
      preferred_coach_style: "tough"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "fitness-challenges",
    stable_preferences: {
      daily_step_goals: {
        step_goal: 10000,
        goal_unit: "steps",
        goal_start_date: "2026-01-01"
      },
      preferred_challenge_formats: {
        preferred_formats: ["daily", "streak"],
        preferred_coach_style: "tough"
      }
    },
    active_challenge_streaks: {
      active_challenge_name: undefined,
      current_streak_days: undefined,
      streak_goal_steps: undefined,
      streak_last_achieved_date: undefined,
      evidence_strength: undefined
    }
  },
  {
    category: "fitness-challenges",
    stable_preferences: {
      daily_step_goals: {},
      preferred_challenge_formats: {}
    },
    active_challenge_streaks: {
      active_challenge_name: "10k for 30 days",
      current_streak_days: 1,
      streak_goal_steps: 10000,
      streak_last_achieved_date: "2026-01-01",
      evidence_strength: "weak"
    },
    needs_review: true
  }
];

export function normalizeFitnessChallengesContext(rawInput = {}) {
  const input = isPlainObject(rawInput) ? rawInput : {};
  const { source, type, explicit = false, data = {} } = input;

  const pending_approval_queue = [];
  const dropped_fields = [];

  const stable_preferences = {
    daily_step_goals: {},
    preferred_challenge_formats: {}
  };

  const active_challenge_streaks = {
    active_challenge_name: undefined,
    current_streak_days: undefined,
    streak_goal_steps: undefined,
    streak_last_achieved_date: undefined,
    evidence_strength: undefined
  };

  const needs_review_flags = [];

  // ---- Sensitive constraints (require explicit consent) ----
  if (Array.isArray(data?.medical_constraints) && data.medical_constraints.length) {
    if (!explicit) {
      pending_approval_queue.push({
        field: "medical_constraints",
        value: normalizeStringArray(data.medical_constraints),
        sensitive: true,
        scope: "temporary",
        source: source || "app_signal",
        requires_explicit_confirmation: true
      });
      needs_review_flags.push("medical_constraints_require_review");
    } else {
      pending_approval_queue.push({
        field: "medical_constraints",
        value: normalizeStringArray(data.medical_constraints),
        sensitive: true,
        scope: "temporary",
        source: source || "user_explicit",
        requires_explicit_confirmation: false
      });
    }
  }

  // ---- type normalization / aliases ----
  const normalizedType = normalizeType(type, data);

  if (normalizedType === "step_goal") {
    const step_goal = normalizeFiniteNumber(data.step_goal ?? data.daily_step_goal ?? data.steps_goal);
    if (step_goal !== null) {
      stable_preferences.daily_step_goals.step_goal = step_goal;
      stable_preferences.daily_step_goals.goal_unit = normalizeEnum(data.goal_unit ?? "steps", new Set(["steps"])) || "steps";
      const start = normalizeIsoDate(data.goal_start_date ?? data.start_date);
      if (start) stable_preferences.daily_step_goals.goal_start_date = start;
    }
  }

  if (normalizedType === "preference") {
    const formatsRaw =
      data.preferred_formats ?? data.formats ?? data.challenge_formats ?? data.preferred_format;

    const preferred_formats = normalizeFormats(formatsRaw);
    if (preferred_formats.length) {
      stable_preferences.preferred_challenge_formats.preferred_formats = preferred_formats;
    }

    const coach = normalizeEnum(data.preferred_coach_style ?? data.coach_style, ALLOWED_COACH_STYLES);
    if (coach) stable_preferences.preferred_challenge_formats.preferred_coach_style = coach;
  }

  if (normalizedType === "challenge") {
    const name = normalizeString(data.active_challenge_name ?? data.challenge_name ?? data.challenge);
    const streakDays = normalizeNonNegativeInteger(data.current_streak_days ?? data.streak_days ?? data.streak);
    const goalSteps = normalizeFiniteNumber(data.streak_goal_steps ?? data.goal_steps ?? data.threshold_steps);
    const lastDate = normalizeIsoDate(data.streak_last_achieved_date ?? data.last_achieved_date ?? data.last_date);
    const strength = normalizeEnum(data.evidence_strength ?? (data.evidence === "weak" ? "weak" : "reinforced"), new Set(["weak", "reinforced"]));

    active_challenge_streaks.active_challenge_name = name || undefined;
    active_challenge_streaks.current_streak_days = streakDays;
    active_challenge_streaks.streak_goal_steps = goalSteps;
    active_challenge_streaks.streak_last_achieved_date = lastDate;
    active_challenge_streaks.evidence_strength = strength || undefined;

    // Evidence rule: streak claims should be reviewed if weak.
    // Reinforced streaks are more durable.
    if (!explicit && active_challenge_streaks.evidence_strength === "weak") {
      needs_review_flags.push("weak_streak_needs_review");
    }

    // If the user claims a streak from a single day, treat as weak.
    if (!explicit && Number(active_challenge_streaks.current_streak_days) <= 1) {
      needs_review_flags.push("single_day_streak_is_weak");
    }
  }

  // Remove empty objects for cleanliness.
  if (Object.keys(stable_preferences.daily_step_goals).length === 0) {
    stable_preferences.daily_step_goals = {};
  }
  if (Object.keys(stable_preferences.preferred_challenge_formats).length === 0) {
    stable_preferences.preferred_challenge_formats = {};
  }

  // If fields were not recognized and are present, track dropped.
  for (const key of Object.keys(data || {})) {
    if (
      [
        "step_goal",
        "daily_step_goal",
        "steps_goal",
        "goal_unit",
        "goal_start_date",
        "start_date",
        "preferred_formats",
        "formats",
        "challenge_formats",
        "preferred_format",
        "preferred_coach_style",
        "coach_style",
        "active_challenge_name",
        "challenge_name",
        "challenge",
        "current_streak_days",
        "streak_days",
        "streak",
        "streak_goal_steps",
        "goal_steps",
        "threshold_steps",
        "streak_last_achieved_date",
        "last_achieved_date",
        "last_date",
        "evidence_strength",
        "evidence",
        "medical_constraints"
      ].includes(key)
    ) continue;

    // Unknown key: drop it.
    dropped_fields.push(key);
  }

  const needs_review = needs_review_flags.length > 0;

  return {
    category,
    stable_preferences,
    active_challenge_streaks,

    pending_approval_queue: pending_approval_queue.length ? pending_approval_queue : undefined,
    dropped_fields: unique(dropped_fields),

    needs_review: needs_review || undefined,
    source: source || undefined,

    // lightweight audit object to support tests and debugging
    validation: {
      ok: true,
      reason: needs_review ? "requires_user_review" : "ok",
      needs_review_flags
    }
  };
}

export function validateFitnessChallengesContext(input = {}) {
  const normalized = normalizeFitnessChallengesContext(input);
  const issues = [];

  const stepGoal = normalized?.stable_preferences?.daily_step_goals?.step_goal;
  if (stepGoal !== undefined && typeof stepGoal !== "number") {
    issues.push({ field: "step_goal", reason: "invalid_type" });
  }

  const formats = normalized?.stable_preferences?.preferred_challenge_formats?.preferred_formats;
  if (formats !== undefined && !Array.isArray(formats)) {
    issues.push({ field: "preferred_formats", reason: "invalid_type" });
  }

  const evidenceStrength = normalized?.active_challenge_streaks?.evidence_strength;
  if (evidenceStrength !== undefined && !["weak", "reinforced"].includes(evidenceStrength)) {
    issues.push({ field: "evidence_strength", reason: "invalid_enum" });
  }

  // Evidence rule: evidence_strength should be validated even if normalization
  // is permissive. If the caller provided an invalid value, normalized.evidence_strength
  // might become undefined; detect that case explicitly.
  if (input && input.type === "challenge" && input.explicit === false) {
    const rawEvidence = input?.data?.evidence_strength ?? input?.data?.evidence ?? input?.evidence_strength;
    if (rawEvidence !== undefined && rawEvidence !== null) {
      const normalizedEvidence = evidenceStrength;
      const allowed = new Set(["weak", "reinforced"]);
      const rawNorm = String(rawEvidence).trim().toLowerCase();
      if (!allowed.has(rawNorm) && normalizedEvidence === undefined) {
        issues.push({ field: "evidence_strength", reason: "invalid_enum" });
      }
    }
  }

  if (issues.length) {
    return { ok: false, reason: "validation_failed", issues };
  }

  return { ok: true };
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = [];
  const stable = normalizedContext?.stable_preferences || {};

  const stepGoal = stable?.daily_step_goals?.step_goal;
  if (typeof stepGoal === "number") {
    proposals.push({
      id: "wiki_step_goal",
      type: "preference",
      sub_type: "daily_step_goal",
      proposed_text: `Your daily step goal is **${stepGoal}** steps.`,
      confidence: 0.82,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  }

  const streak = normalizedContext?.active_challenge_streaks || {};
  if (streak?.active_challenge_name && typeof streak?.current_streak_days === "number") {
    proposals.push({
      id: "wiki_active_streak",
      type: "activity",
      sub_type: "active_challenge_streak",
      proposed_text: `You are on a **${streak.current_streak_days}-day** streak for **${streak.active_challenge_name}**.`,
      confidence: streak.evidence_strength === "reinforced" ? 0.70 : 0.40,
      requires_user_confirmation: streak.evidence_strength !== "reinforced",
      actions: ["approve", "edit", "reject", "delete"]
    });
  }

  const formats = stable?.preferred_challenge_formats?.preferred_formats;
  if (Array.isArray(formats) && formats.length) {
    proposals.push({
      id: "wiki_preferred_formats",
      type: "preference",
      sub_type: "preferred_challenge_formats",
      proposed_text: `You prefer **${formats.join(", ")}** challenge formats.`,
      confidence: 0.78,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  }

  return proposals;
}

// ------------------- Helpers -------------------

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeFiniteNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeNonNegativeInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0) return undefined;
  return Math.floor(n);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => normalizeString(v)).filter(Boolean);
}

function normalizeIsoDate(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  // Accept YYYY-MM-DD and ISO strings.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

function normalizeEnum(value, allowedSet) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim().toLowerCase();
  return allowedSet.has(s) ? s : null;
}

function normalizeFormats(value) {
  const arr = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = [];
  for (const v of arr) {
    const s = String(v).trim().toLowerCase();
    if (ALLOWED_FORMATS.has(s)) normalized.push(s);
    else if (s === "10k" || s === "10000") normalized.push("step_goal");
  }
  return unique(normalized);
}

function normalizeType(type, data) {
  const t = String(type || "").trim().toLowerCase();
  if (t) return t;

  // Alias-based inference
  if (data && (data.step_goal !== undefined || data.daily_step_goal !== undefined || data.steps_goal !== undefined)) return "step_goal";
  if (data && (data.preferred_formats || data.challenge_formats || data.preferred_coach_style)) return "preference";
  if (data && (data.active_challenge_name || data.current_streak_days !== undefined)) return "challenge";
  return "context";
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

