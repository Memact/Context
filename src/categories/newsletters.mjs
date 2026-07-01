export const category = "newsletters";

export const contextFields = {
  preferred_topics:
    "Topics commonly followed through newsletters (e.g. technology, marketing, cooking)",
  delivery_frequency:
    "Preferred newsletter delivery frequency (e.g. daily, weekly, monthly)",
};

export const rawInputExamples = [
  {
    source: "substack.com",
    topic: "technology",
    frequency: "weekly",
  },
  {
    source: "beehiiv.com",
    topic: "marketing",
    frequency: "daily",
  },
  {
    source: "newsletter.example",
    topic: "cooking",
    frequency: "weekly",
  },
];

export const normalizedOutputExamples = [
  {
    category: "newsletters",
    preferred_topics: ["technology"],
    delivery_frequency: "weekly",
  },
  {
    category: "newsletters",
    preferred_topics: ["marketing"],
    delivery_frequency: "daily",
  },
  {
    category: "newsletters",
    preferred_topics: ["cooking"],
    delivery_frequency: "weekly",
  },
];

export const wikiEntryTemplates = [
  "Follows newsletters about {{preferred_topics}}.",
  "Prefers {{delivery_frequency}} newsletter delivery.",
  "Frequently reads newsletter content related to {{preferred_topics}}.",
];

export const permissionSuggestions = {
  preferred_topics: "medium",
  delivery_frequency: "low",
};

export const careNotes = [
  "Do not treat a single newsletter subscription as a permanent interest.",
  "Topics may reflect temporary research rather than long-term preferences.",
  "Newsletter reading activity is not identity.",
  "Interests and reading habits can change over time.",
];