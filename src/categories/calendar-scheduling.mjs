export const category = "calendar-scheduling";

export const contextFields = {
  preferred_meeting_buffers: "Durable preference for time between meetings, inferred only from repeated scheduling behavior or explicit settings.",
  avoided_meeting_days: "Days the user prefers to avoid for meetings, including weekends, when supported by explicit choice or repeated signals.",
  focus_time_windows: "Recurring blocks the user protects for deep work or no-meeting time.",
  preferred_meeting_length: "Typical meeting length preference, saved only when explicitly selected or repeatedly consistent.",
  scheduling_notes: "User-reviewable scheduling guidance that does not include private event content."
};

export const sensitiveFieldRules = {
  attendee_names: {
    sensitive: true,
    action: "drop",
    reason: "Attendee names are event details, not scheduling preferences."
  },
  attendee_emails: {
    sensitive: true,
    action: "drop",
    reason: "Attendee emails must not be copied into context memory."
  },
  meeting_title: {
    sensitive: true,
    action: "drop",
    reason: "Meeting titles can reveal private work or personal context."
  },
  event_description: {
    sensitive: true,
    action: "drop",
    reason: "Event descriptions can contain private content."
  },
  meeting_link: {
    sensitive: true,
    action: "drop",
    reason: "Meeting links are credentials or access paths."
  },
  exact_location: {
    sensitive: true,
    action: "drop",
    reason: "Exact locations are not needed for preference shaping."
  }
};

export const rawInputExamples = [
  {
    source: "CalFlow",
    type: "preference",
    explicit: true,
    data: {
      preferred_meeting_buffers: ["15 minutes after external calls"],
      avoided_meeting_days: ["Saturday", "Sunday"],
      focus_time_windows: ["weekday mornings before 11:00"],
      preferred_meeting_length: "25 minutes",
      meeting_title: "Q3 compensation planning"
    }
  },
  {
    source: "TeamCalendar",
    type: "activity",
    explicit: false,
    data: {
      rescheduled_from_day: "Friday",
      declined_weekend_meeting: true,
      added_buffer_minutes: 10,
      focus_block_created: "Tuesday 09:00-11:00",
      attendee_emails: ["teammate@example.com"],
      meeting_link: "https://meet.example/private"
    }
  }
];

export const normalizedOutputExamples = [
  {
    category,
    source: "CalFlow",
    observation_type: "explicit_preference",
    confidence: "high",
    visibility: "private",
    is_identity_claim: false,
    durable_preferences: {
      preferred_meeting_buffers: ["15 minutes after external calls"],
      avoided_meeting_days: ["Saturday", "Sunday"],
      focus_time_windows: ["weekday mornings before 11:00"],
      preferred_meeting_length: "25 minutes",
      scheduling_notes: []
    },
    pending_approval: {
      fields: [],
      reason: "Explicit scheduling preferences can be saved after user review."
    },
    dropped_fields: ["meeting_title"],
    needs_review: false
  },
  {
    category,
    source: "TeamCalendar",
    observation_type: "weak_observation",
    confidence: "low",
    visibility: "private",
    is_identity_claim: false,
    observation: "Adjusted scheduling around Friday, weekend meetings, buffers, and focus time.",
    durable_preferences: {
      preferred_meeting_buffers: [],
      avoided_meeting_days: [],
      focus_time_windows: [],
      preferred_meeting_length: null,
      scheduling_notes: []
    },
    temporary_signals: {
      possible_buffers: ["10 minutes"],
      possible_avoided_days: ["Friday", "Saturday", "Sunday"],
      possible_focus_time_windows: ["Tuesday 09:00-11:00"]
    },
    pending_approval: {
      fields: ["preferred_meeting_buffers", "avoided_meeting_days", "focus_time_windows"],
      reason: "One-off scheduling behavior stays temporary until the user approves it or repeated evidence appears."
    },
    dropped_fields: ["attendee_emails", "meeting_link"],
    needs_review: true
  }
];

export const wikiEntryTemplates = [
  "You usually prefer {{preferred_meeting_buffers}} between meetings.",
  "You prefer to avoid meetings on {{avoided_meeting_days}}.",
  "You tend to protect {{focus_time_windows}} for focused work.",
  "You usually prefer meetings around {{preferred_meeting_length}} when possible."
];

export const permissionSuggestions = {
  preferred_meeting_buffers: "low",
  avoided_meeting_days: "medium",
  focus_time_windows: "medium",
  preferred_meeting_length: "low",
  scheduling_notes: "medium",
  attendee_names: "high",
  attendee_emails: "high",
  meeting_title: "high",
  event_description: "high",
  meeting_link: "high",
  exact_location: "high"
};

export const careNotes = [
  "A declined meeting or one reschedule is not enough to create a durable scheduling preference.",
  "Meeting titles, attendees, links, notes, and exact locations should be dropped from context suggestions.",
  "Weekend avoidance can be proposed as a preference only when explicit or repeatedly supported.",
  "Focus time windows should describe availability patterns, not private event content."
];

const DURABLE_FIELDS = new Set([
  "preferred_meeting_buffers",
  "avoided_meeting_days",
  "focus_time_windows",
  "preferred_meeting_length",
  "scheduling_notes"
]);

const SENSITIVE_FIELDS = new Set(Object.keys(sensitiveFieldRules));
const WEEKEND_DAYS = ["Saturday", "Sunday"];

export function normalizeCalendarSchedulingContext(rawInput = {}) {
  if (!rawInput || !rawInput.data) return null;

  const { source, type, data, explicit = false } = rawInput;
  const droppedFields = collectDroppedFields(data);

  if (type === "preference") {
    return {
      category,
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: false,
      durable_preferences: buildDurablePreferences(data),
      pending_approval: {
        fields: explicit ? [] : Object.keys(buildDurablePreferences(data)).filter((field) => hasDurableValue(data[field])),
        reason: explicit
          ? "Explicit scheduling preferences can be saved after user review."
          : "Inferred scheduling preferences require user review before becoming memory."
      },
      dropped_fields: droppedFields,
      suggestion: explicit ? null : generateUserReadableSuggestion("preference", data),
      needs_review: !explicit
    };
  }

  if (type === "activity") {
    const temporarySignals = buildTemporarySignals(data);

    return {
      category,
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private",
      is_identity_claim: false,
      observation: summarizeSchedulingActivity(temporarySignals),
      durable_preferences: emptyDurablePreferences(),
      temporary_signals: temporarySignals,
      pending_approval: {
        fields: Object.entries(temporarySignals)
          .filter(([, value]) => Array.isArray(value) && value.length > 0)
          .map(([field]) => temporaryToDurableField(field)),
        reason: "One-off scheduling behavior stays temporary until the user approves it or repeated evidence appears."
      },
      dropped_fields: droppedFields,
      suggestion: generateUserReadableSuggestion("activity", data),
      needs_review: true
    };
  }

  return {
    category,
    source,
    observation_type: "unknown",
    confidence: "low",
    visibility: "private",
    dropped_fields: droppedFields,
    needs_review: true
  };
}

export function generateUserReadableSuggestion(type, data = {}) {
  if (type === "preference" && data.focus_time_windows) {
    return "Would you like to save this focus time window as a calendar preference?";
  }

  if (type === "preference" && data.avoided_meeting_days) {
    return "Would you like to save these avoided meeting days as a calendar preference?";
  }

  if (type === "activity" && data.declined_weekend_meeting) {
    return "You recently avoided a weekend meeting. Save weekends as avoided meeting days?";
  }

  if (type === "activity" && data.added_buffer_minutes) {
    return `You recently added a ${data.added_buffer_minutes}-minute buffer. Save this as a meeting buffer preference?`;
  }

  return "Would you like to update your calendar scheduling preferences based on this activity?";
}

function buildDurablePreferences(data = {}) {
  const preferences = emptyDurablePreferences();
  for (const [field, value] of Object.entries(data)) {
    if (!DURABLE_FIELDS.has(field) || !hasDurableValue(value)) continue;
    preferences[field] = field === "preferred_meeting_length" ? String(value) : toUniqueList(value);
  }
  return preferences;
}

function emptyDurablePreferences() {
  return {
    preferred_meeting_buffers: [],
    avoided_meeting_days: [],
    focus_time_windows: [],
    preferred_meeting_length: null,
    scheduling_notes: []
  };
}

function buildTemporarySignals(data = {}) {
  return {
    possible_buffers: data.added_buffer_minutes ? [`${data.added_buffer_minutes} minutes`] : toUniqueList(data.possible_buffers),
    possible_avoided_days: toUniqueList(
      data.rescheduled_from_day,
      data.declined_weekend_meeting ? WEEKEND_DAYS : [],
      data.possible_avoided_days
    ),
    possible_focus_time_windows: toUniqueList(data.focus_block_created, data.possible_focus_time_windows)
  };
}

function summarizeSchedulingActivity(temporarySignals = {}) {
  const parts = [];
  if (temporarySignals.possible_avoided_days?.length) parts.push("avoided days");
  if (temporarySignals.possible_buffers?.length) parts.push("buffers");
  if (temporarySignals.possible_focus_time_windows?.length) parts.push("focus time");
  if (!parts.length) return "Interacted with calendar scheduling.";
  return `Adjusted scheduling around ${parts.join(", ")}.`;
}

function temporaryToDurableField(field) {
  return {
    possible_buffers: "preferred_meeting_buffers",
    possible_avoided_days: "avoided_meeting_days",
    possible_focus_time_windows: "focus_time_windows"
  }[field] || field;
}

function collectDroppedFields(data = {}) {
  return Object.keys(data).filter((field) => SENSITIVE_FIELDS.has(field));
}

function hasDurableValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
}

function toUniqueList(...values) {
  const items = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  });

  return [...new Set(items.map((value) => String(value)))];
}
