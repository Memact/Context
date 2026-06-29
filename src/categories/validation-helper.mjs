/**
 * Shared validation decorator to highlight overconfident app inferences
 * before they are presented to the user.
 */
export function checkOverconfidentInferences(rawInput = {}, overconfidentFields = new Set()) {
  const validation_issues = [];
  const dropped_fields = [];
  
  const raw = rawInput !== null && typeof rawInput === "object" && !Array.isArray(rawInput) ? rawInput : {};

  for (const field of overconfidentFields) {
    if (Object.hasOwn(raw, field)) {
      dropped_fields.push(field);
      validation_issues.push({
        field,
        reason: "overconfident_inference"
      });
    }
  }

  return { validation_issues, dropped_fields };
}