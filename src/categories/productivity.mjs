/**
 * Memact Context - Productivity Category (Declarative Schema)
 */

export const category = "productivity";

export const contextFields = {
  task_name: "Name or title of the task",
  project_name: "Associated project or goal",
  tool_used: "App or software used (e.g., Notion, Jira, VSCode)",
  duration_minutes: "Time spent on the task",
  focus_level: "Self-reported or inferred focus level",
  is_collaborative: "Whether the task involved others",
};

export const sensitiveFieldRules = new Set([
  "proprietary_code",
  "confidential_client_data",
  "passwords",
  "internal_company_documents",
  "auth_tokens"
]);

export const rawInputExamples = [
  {
    source: "notion.so",
    title: "Q3 Roadmap Planning",
    workspace: "Acme Corp",
    time_spent: 45,
  },
  {
    source: "vscode",
    filename: "auth.ts",
    project: "Backend-V2",
    time_spent: 120,
  }
];

export const normalizedOutputExamples = [
  {
    category: "productivity",
    task_name: "Q3 Roadmap Planning",
    project_name: "Acme Corp",
    tool_used: "notion.so",
    duration_minutes: 45,
    is_collaborative: true,
  },
  {
    category: "productivity",
    task_name: "auth.ts",
    project_name: "Backend-V2",
    tool_used: "vscode",
    duration_minutes: 120,
    is_collaborative: false,
  }
];

export const proposalOutputExamples = [
  "Spent {{duration_minutes}} minutes working on {{task_name}} in {{tool_used}}.",
  "Contributed to {{project_name}} using {{tool_used}}."
];