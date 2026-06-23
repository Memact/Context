export const category = "cooking";

export const contextFields = {
  recipe_formats:
    "Preferred recipe formats (e.g. video, text, image-based, step-by-step)",
  cooking_level:
    "Cooking experience level (e.g. beginner, intermediate, advanced)",
  cooking_styles:
    "Preferred cooking styles (e.g. baking, grilling, meal prep, stir-fry cooking)",
};

export const rawInputExamples = [
  {
    source: "youtube.com",
    format: "video",
    level: "beginner",
    style: "meal prep",
  },
  {
    source: "allrecipes.com",
    format: "text",
    level: "intermediate",
    style: "baking",
  },
  {
    source: "instagram.com",
    format: "step-by-step",
    level: "advanced",
    style: "grilling",
  },
];

export const normalizedOutputExamples = [
  {
    category: "cooking",
    recipe_formats: ["video"],
    cooking_level: "beginner",
    cooking_styles: ["meal prep"],
  },
  {
    category: "cooking",
    recipe_formats: ["text"],
    cooking_level: "intermediate",
    cooking_styles: ["baking"],
  },
  {
    category: "cooking",
    recipe_formats: ["step-by-step"],
    cooking_level: "advanced",
    cooking_styles: ["grilling"],
  },
];

export const wikiEntryTemplates = [
  "Prefers {{recipe_formats}} recipes.",
  "Cooking skill level is {{cooking_level}}.",
  "Frequently uses {{cooking_styles}} cooking styles.",
];

export const permissionSuggestions = {
  recipe_formats: "low",
  cooking_level: "medium",
  cooking_styles: "medium",
};

export const careNotes = [
  "Do not treat a single recipe view as a stable cooking preference.",
  "Watching cooking content does not imply cooking skill.",
  "Temporary cooking interests should not become long-term preferences.",
  "Cooking level should not be inferred from a single interaction.",
  "Recipe consumption and actual cooking behavior are different signals.",
];