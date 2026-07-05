export const category = "movies-tv";

export const contextFields = {
  preferred_genres:
    "Preferred video genres (e.g. sci-fi, comedy, thriller, documentary)",
  watching_time_slots:
    "Preferred time slots for watching (e.g. weekday evenings, weekend afternoons)",
  subscribed_services:
    "Video streaming services the user is subscribed to (e.g. Netflix, Prime Video, Disney+)",
};

export const rawInputExamples = [
  {
    source: "netflix.com",
    genre: "sci-fi",
    time_slot: "weekday evenings",
    service: "Netflix",
  },
  {
    source: "primevideo.com",
    genre: "comedy",
    time_slot: "weekend afternoons",
    service: "Prime Video",
  },
  {
    source: "hotstar.com",
    genre: "thriller",
    time_slot: "late nights",
    service: "Disney+",
  },
];

export const normalizedOutputExamples = [
  {
    category: "movies-tv",
    preferred_genres: ["sci-fi"],
    watching_time_slots: ["weekday evenings"],
    subscribed_services: ["Netflix"],
  },
  {
    category: "movies-tv",
    preferred_genres: ["comedy"],
    watching_time_slots: ["weekend afternoons"],
    subscribed_services: ["Prime Video"],
  },
  {
    category: "movies-tv",
    preferred_genres: ["thriller"],
    watching_time_slots: ["late nights"],
    subscribed_services: ["Disney+"],
  },
];

export const wikiEntryTemplates = [
  "Prefers {{preferred_genres}} movies and shows.",
  "Usually watches during {{watching_time_slots}}.",
  "Subscribed to {{subscribed_services}}.",
];

export const permissionSuggestions = {
  preferred_genres: "low",
  watching_time_slots: "medium",
  subscribed_services: "medium",
};

export const careNotes = [
  "Do not treat a single movie watch as a stable genre preference.",
  "Watching a genre once does not mean the user prefers it.",
  "Subscription status may change; do not treat it as permanent.",
  "Watching time slots should not be inferred from a single session.",
  "Temporary viewing interests should not become long-term preferences.",
];