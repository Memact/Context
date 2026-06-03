export function inferProductivitySubSchema(text = "") {
  if (/kanban|time-blocking|organization/.test(text)) return "organization_style"
  if (/calendar|meeting/.test(text)) return "calendar_habits"
  return null
}

export function buildProductivityAttributes(records = []) {
  const styles = unique(records.map((record) => record.evidence?.organization_style).filter(Boolean))
  const projectAreas = unique(records.map((record) => record.evidence?.project_area).filter(Boolean))
  const focusPreferences = unique(records.map((record) => record.evidence?.focus_preference).filter(Boolean))
  const calendarHabits = unique(records.map((record) => record.evidence?.calendar_habit).filter(Boolean))
  return {
    preferred_organization_styles: styles,
    recurring_project_areas: projectAreas,
    focus_time_preferences: focusPreferences,
    calendar_habits: calendarHabits
  }
}

function unique(arr) {
  return [...new Set(arr)]
}
