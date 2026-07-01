export const category = "calendar-scheduling";

export const contextFields = {
  preferred_meeting_buffers:
    "Preferred spacing between meetings (e.g. 10 minutes, 15 minutes, no back-to-back meetings)",
  avoided_meeting_days:
    "Days the user prefers to avoid for meetings, including weekends",
  focus_time_windows:
    "Recurring time windows the user protects for focused work or no-meeting time",
};

export const rawInputExamples = [
  {
    source: "calendar.example",
    buffer: "15 minutes",
    avoided_days: ["Saturday", "Sunday"],
    focus_window: "weekday mornings before 11:00",
    meeting_title: "Private client call",
  },
  {
    source: "work-calendar.example",
    buffer: "10 minutes",
    avoided_days: ["Friday"],
    focus_window: "Tuesday 09:00-11:00",
    attendee_emails: ["teammate@example.com"],
  },
  {
    source: "scheduler.example",
    buffer: "no back-to-back meetings",
    avoided_days: ["Sunday"],
    focus_window: "afternoons for deep work",
    meeting_link: "https://meet.example/private",
  },
];

export const normalizedOutputExamples = [
  {
    category: "calendar-scheduling",
    preferred_meeting_buffers: ["15 minutes"],
    avoided_meeting_days: ["Saturday", "Sunday"],
    focus_time_windows: ["weekday mornings before 11:00"],
    dropped_fields: ["meeting_title"],
    needs_review: true,
  },
  {
    category: "calendar-scheduling",
    preferred_meeting_buffers: ["10 minutes"],
    avoided_meeting_days: ["Friday"],
    focus_time_windows: ["Tuesday 09:00-11:00"],
    dropped_fields: ["attendee_emails"],
    needs_review: true,
  },
  {
    category: "calendar-scheduling",
    preferred_meeting_buffers: ["no back-to-back meetings"],
    avoided_meeting_days: ["Sunday"],
    focus_time_windows: ["afternoons for deep work"],
    dropped_fields: ["meeting_link"],
    needs_review: true,
  },
];

export const wikiEntryTemplates = [
  "Prefers {{preferred_meeting_buffers}} between meetings.",
  "Prefers to avoid meetings on {{avoided_meeting_days}}.",
  "Protects {{focus_time_windows}} for focused work.",
];

export const permissionSuggestions = {
  preferred_meeting_buffers: "low",
  avoided_meeting_days: "medium",
  focus_time_windows: "medium",
  meeting_title: "high",
  attendee_emails: "high",
  meeting_link: "high",
};

export const careNotes = [
  "Do not treat a single declined or moved meeting as a permanent scheduling preference.",
  "Meeting titles, attendee details, links, and private notes should not be stored as context.",
  "Weekend avoidance should stay reviewable unless the user explicitly confirms it.",
  "Focus windows describe availability patterns, not identity or productivity level.",
];
