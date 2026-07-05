export const category = "book-reading";

export const contextFields = {
  preferred_genres:
    "Preferred book genres (e.g. sci-fi, history, mystery, fantasy)",
  average_reading_speed:
    "Average reading speed (e.g. slow, moderate, fast)",
  active_reading_lists:
    "Reading lists the user maintains (e.g. To Read, Currently Reading, Completed)",
};

export const rawInputExamples = [
  {
    source: "goodreads.com",
    genre: "sci-fi",
    reading_speed: "fast",
    list: "Currently Reading",
  },
  {
    source: "storygraph.com",
    genre: "history",
    reading_speed: "moderate",
    list: "To Read",
  },
  {
    source: "librarything.com",
    genre: "mystery",
    reading_speed: "slow",
    list: "Completed",
  },
];

export const normalizedOutputExamples = [
  {
    category: "book-reading",
    preferred_genres: ["sci-fi"],
    average_reading_speed: "fast",
    active_reading_lists: ["Currently Reading"],
  },
  {
    category: "book-reading",
    preferred_genres: ["history"],
    average_reading_speed: "moderate",
    active_reading_lists: ["To Read"],
  },
  {
    category: "book-reading",
    preferred_genres: ["mystery"],
    average_reading_speed: "slow",
    active_reading_lists: ["Completed"],
  },
];

export const wikiEntryTemplates = [
  "Prefers {{preferred_genres}} books.",
  "Reads at a {{average_reading_speed}} pace.",
  "Actively maintains the following reading lists: {{active_reading_lists}}.",
];

export const permissionSuggestions = {
  preferred_genres: "low",
  average_reading_speed: "medium",
  active_reading_lists: "low",
};

export const careNotes = [
  "Do not treat a single book read as a stable genre preference.",
  "Reading speed should not be inferred from a single session.",
  "A book added to a list does not confirm it was read or enjoyed.",
  "Temporary reading interests should not become permanent preferences.",
  "Genre preferences should only be saved after repeated explicit signals.",
];