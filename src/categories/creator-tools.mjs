export const category = "creator-tools";

export const contextFields = {
  preferred_export_formats: "List of file extensions or formats the user regularly exports (e.g., .mp4, .png, .pdf)",
  design_style_preferences: "General artistic styles detected, like minimalist, high-contrast, or dark-mode",
  recurring_project_types: "Types of projects built frequently (e.g., YouTube Shorts, podcasts, newsletter graphics)",
  preferred_templates: "Names or IDs of layouts used across multiple projects",
  publishing_cadence: "How often the creator publishes content (e.g., weekly, daily)",
  workflow_habits: "Frequently utilized shortcuts, tool tracks, or automation presets",
  collaboration_preferences: "Preferences regarding team editing, commenting, or sharing asset libraries",
  temporary_project_need: "Flags short-term resource gathering that shouldn't dictate long-term recommendations"
};

export const rawInputExamples = [
  {
    source: "figma.com",
    action: "export",
    file_details: { format: ".png", dimensions: "1920x1080", compression: "lossless" },
    style_tags: ["minimalist", "vector"],
    used_template: "None"
  },
  {
    source: "premiere-pro.app",
    action: "render",
    project_type: "short-form video",
    export_preset: "YouTube 1080p 29.97fps",
    duration_seconds: 58,
    is_frequent_format: true
  }
];

export const normalizedOutputExamples = [
  {
    category: "creator-tools",
    preferred_export_formats: [".png"],
    design_style_preferences: ["minimalist"],
    recurring_project_types: [], 
    preferred_templates: [],
    publishing_cadence: "unknown",
    workflow_habits: ["lossless compression preset"],
    collaboration_preferences: "unknown",
    temporary_project_need: false
  },
  {
    category: "creator-tools",
    preferred_export_formats: [".mp4"],
    design_style_preferences: [],
    recurring_project_types: ["Short-form Video"], 
    preferred_templates: [],
    publishing_cadence: "unknown",
    workflow_habits: ["YouTube 1080p standard render"],
    collaboration_preferences: "unknown",
    temporary_project_need: false
  }
];

export const wikiEntryTemplates = [
  "Often exports creative assets in {{preferred_export_formats}} formats.",
  "Often uses {{design_style_preferences}} style signals across approved workflows.",
  "Has repeated approved activity around {{recurring_project_types}} projects.",
  "May prefer {{preferred_templates}} templates when enough approved evidence supports it."
];

export const permissionSuggestions = {
  preferred_export_formats: "low",
  design_style_preferences: "low",
  recurring_project_types: "medium",
  workflow_habits: "low",
  publishing_cadence: "medium",
  preferred_templates: "medium"
};

export const careNotes = [
  "Do not expose private project names, client identifiers, or draft text files.",
  "Do not capture raw content values, unpublished scripts, or sensitive footage properties.",
  "Isolate temporary asset collections (e.g., specific stock photo searches for a one-off project) from long-term workflow styles.",
  "Differentiate between single exploratory assets and genuine multi-project template preferences."
];
