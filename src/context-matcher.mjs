import { createHash } from "node:crypto";

const STOP_WORDS = new Set(["a", "an", "and", "app", "can", "for", "from", "get", "of", "the", "to", "use", "user", "with"]);
const HIGH_SENSITIVITY_PREFIXES = ["identity", "diet.allergy"];

const TRAVEL_LANGUAGE_PROMOTION_MAP = {
  "paris": "french",
  "france": "french",
  "tokyo": "japanese",
  "japan": "japanese",
  "berlin": "german",
  "germany": "german",
  "madrid": "spanish",
  "barcelona": "spanish",
  "spain": "spanish",
  "rome": "italian",
  "italy": "italian",
  "seoul": "korean",
  "korea": "korean"
};

const DEVELOPER_TOOL_TERMS = [
  "cursor",
  "github",
  "repository",
  "repo",
  "branch",
  "pull request",
  "commit",
  "merge",
  "vscode",
  "source control"
];

const FOOD_DELIVERY_DOMAIN = new Set(["food-delivery", "food_delivery", "fooddelivery", "shopping.food_delivery"]);
const HEALTH_FITNESS_DOMAIN = new Set(["health", "fitness", "health.fitness", "health_fitness", "healthfitness"]);

export const contextMatchingExamples = Object.freeze([
  { app_field: "food restrictions", memact_fields: ["diet.preference", "diet.allergy"], reason: "Food restriction onboarding can use approved diet preference and allergy memory." },
  { app_field: "workout goal", memact_fields: ["fitness.goal"], reason: "Fitness goal maps to accepted fitness goal memory." },
  { app_field: "preferred name", memact_fields: ["identity.preferred_name"], reason: "A preferred-name field should use explicit identity memory only." },
  { app_field: "learning goals", memact_fields: ["education.learning_goals"], reason: "Learning goals map to accepted education memory." },
  { app_field: "budget range", memact_fields: ["shopping.budget"], reason: "Budget range maps to accepted shopping budget memory." },
  { app_field: "dietary preferences", memact_fields: ["diet.preference"], reason: "Dietary preferences map to diet.preference memory." },
  { app_field: "dietary restrictions", memact_fields: ["diet.allergy"], reason: "Dietary restrictions map to diet.allergy memory." },
  { app_field: "food allergies", memact_fields: ["diet.allergy"], reason: "Food allergies map to diet.allergy memory." },
  { app_field: "workout setup", memact_fields: ["fitness.goal"], reason: "Workout setup maps to fitness.goal memory." },
  { app_field: "fitness objective", memact_fields: ["fitness.goal"], reason: "Fitness objective maps to fitness.goal memory." },
  { app_field: "learning style", memact_fields: ["learning.study_style"], reason: "Learning style maps to learning.study_style memory." },
  { app_field: "study schedule", memact_fields: ["learning.schedule"], reason: "Study schedule maps to learning.schedule memory." },
  { app_field: "display name", memact_fields: ["identity.preferred_name"], reason: "Display name maps to identity.preferred_name memory." },
  { app_field: "username", memact_fields: ["identity.preferred_username"], reason: "Username maps to identity.preferred_username memory." },
  { app_field: "laptop budget", memact_fields: ["shopping.laptop.budget"], reason: "Laptop budget maps to shopping.laptop.budget memory." },
  { app_field: "purchase budget", memact_fields: ["shopping.budget"], reason: "Purchase budget maps to shopping.budget memory." },
  { app_field: "budget limit", memact_fields: ["shopping.budget"], reason: "Budget limit maps to shopping.budget memory." },
  { app_field: "preferred format", memact_fields: ["learning.stable_preferences.preferred_format"], reason: "Preferred format maps to learning preferred format memory." },
  { app_field: "learning pace", memact_fields: ["learning.stable_preferences.preferred_pace"], reason: "Learning pace maps to learning preferred pace memory." },
  { app_field: "study pace", memact_fields: ["learning.stable_preferences.preferred_pace"], reason: "Study pace maps to learning preferred pace memory." },
  { app_field: "explanation style", memact_fields: ["learning.stable_preferences.explanation_style"], reason: "Explanation style maps to learning explanation style memory." },
  { app_field: "session length", memact_fields: ["learning.stable_preferences.session_length_preference"], reason: "Session length maps to learning session length preference memory." },
  { app_field: "active topics", memact_fields: ["learning.current_goals.active_topics"], reason: "Active topics maps to learning current goals active topics memory." },
  { app_field: "current difficulty", memact_fields: ["learning.current_goals.current_difficulty"], reason: "Current difficulty maps to learning current difficulty memory." },
  { app_field: "preferred categories", memact_fields: ["shopping.preferred_categories"], reason: "Preferred categories maps to shopping preferred categories memory." },
  { app_field: "disliked categories", memact_fields: ["shopping.disliked_categories"], reason: "Disliked categories maps to shopping disliked categories memory." },
  { app_field: "preferred brands", memact_fields: ["shopping.preferred_brands"], reason: "Preferred brands maps to shopping preferred brands memory." },
  { app_field: "shopping format", memact_fields: ["shopping.preferred_format"], reason: "Shopping format maps to shopping preferred format memory." },
  { app_field: "purchase frequency", memact_fields: ["shopping.purchase_frequency"], reason: "Purchase frequency maps to shopping purchase frequency memory." },
  { app_field: "spending range", memact_fields: ["shopping.budget"], reason: "Spending range maps to shopping budget memory." },
  { app_field: "price range", memact_fields: ["shopping.budget"], reason: "Price range maps to shopping budget memory." },
  { app_field: "fitness goal", memact_fields: ["fitness.goal"], reason: "Fitness goal maps to fitness goal memory." },
  { app_field: "activity level", memact_fields: ["fitness.activity_level"], reason: "Activity level maps to fitness activity level memory." },
  { app_field: "workout type", memact_fields: ["fitness.preferred_workout_type"], reason: "Workout type maps to fitness preferred workout type memory." },
  { app_field: "preferred workout", memact_fields: ["fitness.preferred_workout_type"], reason: "Preferred workout maps to fitness preferred workout type memory." },
  { app_field: "equipment available", memact_fields: ["fitness.equipment_available"], reason: "Equipment available maps to fitness equipment available memory." },
  { app_field: "dietary preference", memact_fields: ["diet.preference"], reason: "Dietary preference maps to diet.preference memory." },
  { app_field: "meal preference", memact_fields: ["diet.preference"], reason: "Meal preference maps to diet.preference memory." },
  { app_field: "food preference", memact_fields: ["diet.preference"], reason: "Food preference maps to diet.preference memory." },
  { app_field: "full name", memact_fields: ["identity.preferred_name"], reason: "Full name maps to identity preferred name memory." },
  { app_field: "handle", memact_fields: ["identity.preferred_username"], reason: "Handle maps to identity preferred username memory." },
  { app_field: "screen name", memact_fields: ["identity.preferred_username"], reason: "Screen name maps to identity preferred username memory." },
  { app_field: "profile name", memact_fields: ["identity.preferred_name"], reason: "Profile name maps to identity preferred name memory." },
  { app_field: "timezone", memact_fields: ["identity.timezone"], reason: "Timezone maps to identity timezone memory." },
  { app_field: "language preference", memact_fields: ["identity.language"], reason: "Language preference maps to identity language memory." }
]);

class SynonymTrieNode {
  constructor() {
    this.children = {};
    this.memactFields = [];
  }
}

class SynonymTrie {
  constructor() {
    this.root = new SynonymTrieNode();
    this.buildTrie();
  }

  phraseToStems(phrase) {
    return String(phrase || "")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map(word => stem(word));
  }

  buildTrie() {
    for (const example of contextMatchingExamples) {
      const stems = this.phraseToStems(example.app_field);
      if (stems.length === 0) continue;

      let currentNode = this.root;
      for (const stemToken of stems) {
        if (!currentNode.children[stemToken]) {
          currentNode.children[stemToken] = new SynonymTrieNode();
        }
        currentNode = currentNode.children[stemToken];
      }
      
      for (const field of example.memact_fields) {
        if (!currentNode.memactFields.includes(field)) {
          currentNode.memactFields.push(field);
        }
      }
    }
  }

  searchSynonyms(phrase) {
    const stems = this.phraseToStems(phrase);
    let currentNode = this.root;
    for (const stemToken of stems) {
      if (!currentNode.children[stemToken]) return [];
      currentNode = currentNode.children[stemToken];
    }
    return currentNode.memactFields;
  }
}

const SYNONYM_TRIE = new SynonymTrie();

export class LocalContextMatcher {
  constructor({ threshold = 0.12, minimumThreshold = null } = {}) {
    this.threshold = Number(threshold);
    const parsedMinimumThreshold = Number(minimumThreshold);
    this.minimumThreshold = Number.isFinite(parsedMinimumThreshold) ? parsedMinimumThreshold : null;
    this.kind = "local_keyword_overlap";
  }

  match(requestedContext = [], memoryRecords = []) {
    return matchContextFields(requestedContext, memoryRecords, { threshold: this.threshold, minimumThreshold: this.minimumThreshold });
  }
}

export class SemanticContextMatcher extends LocalContextMatcher {
  constructor(options = {}) {
    super(options);
    this.kind = "semantic_placeholder";
  }
}

export function createContextMatcher(options = {}) {
  return new LocalContextMatcher(options);
}

export function matchContextFields(requestedContext = [], memoryRecords = [], options = {}) {
  const baseThreshold = Number(options.threshold ?? 0.12);
  const requestedCategory = options.requestedCategory || null;
  const sessionMinimumThreshold = resolveMinimumThreshold(options, requestedCategory);

  return (Array.isArray(requestedContext) ? requestedContext : []).map((requestedItem) => {
    const requestText = requestToText(requestedItem);
    const requestTokens = tokens(requestText);
    const itemCategory = requestedItem?.category || requestedItem?.category_hint || requestedCategory || null;

    let itemThreshold = baseThreshold;
    if (requestTokens.size <= 1) {
      itemThreshold = baseThreshold + 0.08;
    } else if (requestTokens.size >= 3) {
      itemThreshold = Math.max(0.01, baseThreshold - 0.05);
    }
    if (sessionMinimumThreshold !== null) {
      itemThreshold = Math.max(itemThreshold, sessionMinimumThreshold);
    }
    
    const synonymFields = SYNONYM_TRIE.searchSynonyms(requestText).length > 0 
      ? SYNONYM_TRIE.searchSynonyms(requestText) 
      : SYNONYM_TRIE.searchSynonyms(requestedItem?.description || "");

    const candidates = (Array.isArray(memoryRecords) ? memoryRecords : [])
      .filter((memory) => {
        const confidence = memory && typeof memory.confidence === "number" ? memory.confidence : 1.0;
        return confidence >= 0.2;
      })
      .map((memory) => scoreMemory(requestText, requestTokens, synonymFields, memory, itemCategory))
      .filter((candidate) => candidate.score >= itemThreshold)
      .sort((left, right) => right.score - left.score || String(left.memory.field_path || "").localeCompare(String(right.memory.field_path || "")));
      
    return {
      requested: requestedItem,
      request_text: requestText,
      candidates
    };
  });
}

export function anonymizePrivateIdentities(text = "") {
  const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return String(text).replace(EMAIL_PATTERN, (match) => {
    return "anon_" + createHash("sha256").update(match.toLowerCase().trim()).digest("hex").slice(0, 12);
  });
}

function scoreMemory(requestText, requestTokens, synonymFields, memory = {}, requestedCategory = null) {
  const fieldPath = String(memory.field_path || memory.path || "");
  const category = String(memory.category || "").toLowerCase();

  if (isMediaPlaybackListeningHistoryBlocked(requestedCategory, requestText, memory)) {
    return {
      memory,
      score: 0,
      reasons: ["media playback/listening history blocked from professional workspace"],
      sensitivity: "low",
      requires_approval: false
    };
  }

  if (isPartitionedDomainConflict(requestedCategory, requestText, memory)) {
    return {
      memory,
      score: 0,
      reasons: ["cross-domain partition blocked"],
      sensitivity: "low",
      requires_approval: false
    };
  }

  if (isShoppingIntent(requestText, requestedCategory) && isDeveloperToolContext(memory)) {
    return {
      memory,
      score: 0,
      reasons: ["developer tool context suppressed for shopping query"],
      sensitivity: "low",
      requires_approval: false
    };
  }
  
  const rawValue = String(memory.value || "");
  const protectedValue = anonymizePrivateIdentities(rawValue);

  const searchable = [
    fieldPath,
    memory.category,
    memory.label,
    memory.title,
    memory.summary,
    protectedValue,
    ...(memory.themes || [])
  ].join(" ");
  
  const candidateTokens = tokens(searchable);
  let overlap = 0;
  for (const token of requestTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    } else {
      let bestFuzzy = 0;
      for (const candToken of candidateTokens) {
        const sim = jaroWinkler(token, candToken);
        if (sim > bestFuzzy) bestFuzzy = sim;
      }
      if (bestFuzzy >= 0.85) overlap += bestFuzzy;
    }
  }

  const lexical = requestTokens.size ? overlap / requestTokens.size : 0;
  const fieldPathSimilarity = pathSimilarity(fieldPath, [...requestTokens].join("."));
  const synonymBoost = synonymFields.includes(fieldPath) ? 0.78 : 0;

  // 💻 Issue #219: Developer Context Search Personalization Engine
  let developerSearchPersonalizationBoost = 0;
  if (category === "developer_work" || fieldPath.includes("developer")) {
    const technicalKeywords = [
      "code", "repo", "repository", "git", "github", "branch", "commit", 
      "compile", "debug", "test", "function", "validation", "schema", "program"
    ];
    
    const requestStr = String(requestText || "").toLowerCase();
    const isTechnicalSearchQuery = technicalKeywords.some(kw => requestStr.includes(kw));
    
    if (isTechnicalSearchQuery) {
      const workspaceCues = ["automation", "ai agent", "ml programs", "context", "mjs", "node"];
      const sharesActiveWorkspaceContext = workspaceCues.some(cue => 
        searchable.toLowerCase().includes(cue) || requestStr.includes(cue)
      );

      if (sharesActiveWorkspaceContext) {
        developerSearchPersonalizationBoost = 0.30;
      }
    }
  }
  
  // --- Contradiction Resolution Logic for Overlapping Claim Classes ---
  let crossDomainRelevance = 0;
  const relevanceReasons = [];
  
  if (requestedCategory && memory.category) {
    const normReqCat = String(requestedCategory).toLowerCase().trim();
    const normMemCat = String(memory.category).toLowerCase().trim();
    
    if (normReqCat === normMemCat) {
      crossDomainRelevance = 0.15;
      relevanceReasons.push("active context match");
      
      if (memory.scope === "temporary_intent") {
        crossDomainRelevance += 0.25;
        relevanceReasons.push("intent priority override");
      }
    } else if (memory.scope === "temporary_intent") {
      crossDomainRelevance = -0.30;
    }
  }

  let crossDomainRelevanceVector = 0;
  if (memory.relevance_vectors && requestedCategory) {
     if (memory.relevance_vectors[requestedCategory]) {
       crossDomainRelevanceVector = memory.relevance_vectors[requestedCategory];
       relevanceReasons.push(`Dynamic relevance to ${requestedCategory}: ${crossDomainRelevanceVector}`);
     }
  } else if (requestedCategory && String(requestedCategory).toLowerCase().trim() !== String(memory.category).toLowerCase().trim()) {
    if (lexical > 0.4) {
      crossDomainRelevanceVector = lexical * 0.5;
      relevanceReasons.push(`Soft semantic relevance to ${requestedCategory}`);
    }
  }

  const score = round(Math.max(0, Math.min(1, Math.max(lexical, fieldPathSimilarity, synonymBoost, crossDomainRelevanceVector, developerSearchPersonalizationBoost) + crossDomainRelevance)));
  
  const reasons = [];
  if (synonymBoost) reasons.push("example mapping");
  if (lexical) reasons.push("keyword overlap");
  if (fieldPathSimilarity) reasons.push("field path similarity");
  if (developerSearchPersonalizationBoost > 0) reasons.push("developer workspace search match");
  if (relevanceReasons.length) reasons.push(...relevanceReasons);

  const isHighSensitivity = HIGH_SENSITIVITY_PREFIXES.some(prefix => 
    fieldPath.startsWith(prefix)
  );

  const sensitivity = isHighSensitivity ? "high" : "low";

  return {
    memory,
    score,
    reasons: reasons.length ? reasons : ["weak fallback match"],
    sensitivity,
    requires_approval: sensitivity === "high" 
  };
}

function requestToText(item) {
  if (typeof item === "string") return item;
  return [item?.description, item?.field_hint, item?.category_hint, item?.name].filter(Boolean).join(" ");
}

function resolveMinimumThreshold(options = {}, requestedCategory = null) {
  const candidates = [
    options.minimumThreshold,
    options.minThreshold,
    options.minimumMatchingThreshold,
    options.session?.minimumThreshold,
    options.session?.minThreshold,
    options.session?.minimumMatchingThreshold,
    options.querySession?.minimumThreshold,
    options.querySession?.minThreshold,
    options.querySession?.minimumMatchingThreshold,
    options.query_session?.minimumThreshold,
    options.query_session?.min_threshold,
    options.query_session?.minimum_matching_threshold,
    options.sessionConfig?.minimumThreshold,
    options.sessionConfig?.minThreshold,
    options.sessionConfig?.minimumMatchingThreshold,
    options.session_config?.minimum_threshold,
    options.session_config?.min_threshold,
    options.session_config?.minimum_matching_threshold,
    ...(options.minimumThresholdByAppClass ? [options.minimumThresholdByAppClass[requestedCategory] ?? options.minimumThresholdByAppClass?.[String(requestedCategory || "").toLowerCase()] ?? options.minimumThresholdByAppClass?.default] : []),
    ...(options.minimumThresholdByCategory ? [options.minimumThresholdByCategory[requestedCategory] ?? options.minimumThresholdByCategory?.[String(requestedCategory || "").toLowerCase()] ?? options.minimumThresholdByCategory?.default] : []),
    ...(options.appClassMinimumThresholds ? [options.appClassMinimumThresholds[requestedCategory] ?? options.appClassMinimumThresholds?.[String(requestedCategory || "").toLowerCase()] ?? options.appClassMinimumThresholds?.default] : []),
    ...(options.minimumThresholdByRequestedCategory ? [options.minimumThresholdByRequestedCategory[requestedCategory] ?? options.minimumThresholdByRequestedCategory?.[String(requestedCategory || "").toLowerCase()] ?? options.minimumThresholdByRequestedCategory?.default] : [])
  ];

  for (const candidate of candidates) {
    const threshold = Number(candidate);
    if (Number.isFinite(threshold)) return threshold;
  }
  return null;
}

function isShoppingIntent(text = "", category = null, inferredCategories = null) {
  if (String(category || "").toLowerCase().trim() === "shopping") return true;
  if (inferredCategories instanceof Set && inferredCategories.has("shopping")) return true;
  return /\b(shopping|shop|retail|store|stores|commerce|buy|purchase|product|products|cart|checkout)\b/i.test(String(text || ""));
}

function isDeveloperToolContext(memory = {}) {
  const category = String(memory.category || "").toLowerCase().trim();
  if (category === "developer_work") return true;

  const searchable = [
    String(memory.field_path || memory.path || ""),
    memory.category,
    memory.label,
    memory.title,
    memory.summary,
    memory.value,
    ...(Array.isArray(memory.themes) ? memory.themes : [])
  ].join(" ").toLowerCase();

  return DEVELOPER_TOOL_TERMS.some((term) => searchable.includes(term));
}

function isMediaPlaybackListeningHistoryBlocked(requestedCategory, requestText, memory = {}) {
  const requested = normalizeDomainKey(requestedCategory);
  if (!requested) return false;
  const isWorkWorkspace = requested === "professional" || requested === "productivity";
  if (!isWorkWorkspace) return false;

  const text = String(requestText || "").toLowerCase();
  const memCategory = normalizeDomainKey(memory?.category || "");
  const fieldPath = String(memory?.field_path || memory?.path || "").toLowerCase();

  const isEntertainmentCategory =
    memCategory === "music-streaming" ||
    memCategory === "video-streaming" ||
    memCategory === "movies-tv" ||
    memCategory === "movie-booking";

  const playbackHints =
    /\b(listen|listening|play|playing|watch|watching|playback|stream|streaming|movie|movies|tv|episode|completion|watch_time|watchtime|completion_rate)\b/i.test(text) ||
    /\b(music-streaming|video-streaming|movies-tv|watch_time|completion|playback)\b/i.test(fieldPath);

  return isEntertainmentCategory || playbackHints;
}

function isPartitionedDomainConflict(requestedCategory, requestText, memory = {}, inferredCategories = null) {
  const queryDomains = new Set();
  const normalizedRequested = normalizeDomainKey(requestedCategory);
  if (normalizedRequested) queryDomains.add(normalizedRequested);

  if (inferredCategories instanceof Set) {
    for (const category of inferredCategories) {
      const normalized = normalizeDomainKey(category);
      if (normalized) queryDomains.add(normalized);
    }
  }

  const text = String(requestText || "").toLowerCase();
  if (/\b(food delivery|takeout|delivery order|restaurant|meal order|food order|eat out|zomato|swiggy|ubereats)\b/i.test(text)) {
    queryDomains.add("food-delivery");
  }
  if (/\b(health|fitness|wellness|medical|insurance|benefits|workout|exercise|gym|run)\b/i.test(text)) {
    queryDomains.add("health-fitness");
  }

  const memoryDomain = normalizeDomainKey(memory.category || memory.field_path || memory.path || "");
  if (!memoryDomain) return false;

  return (queryDomains.has("food-delivery") && HEALTH_FITNESS_DOMAIN.has(memoryDomain)) || 
         (queryDomains.has("health-fitness") && FOOD_DELIVERY_DOMAIN.has(memoryDomain));
}

function normalizeDomainKey(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
}

export function tokens(value) {
  const rawTokens = normalize(value).split(/[.\s_-]+/).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  return new Set(rawTokens.map((t) => stem(t)));
}

function pathSimilarity(left = "", right = "") {
  const leftParts = String(left).toLowerCase().split(/[.\s_-]+/).filter(Boolean).map((p) => stem(p));
  const rightParts = String(right).toLowerCase().split(/[.\s_-]+/).filter(Boolean).map((p) => stem(p));
  if (!leftParts.length || !rightParts.length) return 0;
  const rightSet = new Set(rightParts);
  let overlap = 0;
  for (const part of leftParts) {
    if (rightSet.has(part)) {
      overlap += 1;
    } else {
      let bestFuzzy = 0;
      for (const rPart of rightParts) {
        const sim = jaroWinkler(part, rPart);
        if (sim > bestFuzzy) bestFuzzy = sim;
      }
      if (bestFuzzy >= 0.85) overlap += bestFuzzy;
    }
  }
  return overlap / Math.max(leftParts.length, rightParts.length);
}

function round(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

export function stem(word) {
  if (typeof word !== "string") return "";
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("ing")) return w.slice(0, -3);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is") && !w.endsWith("as")) {
    if (w.endsWith("es")) {
      if (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("ches") || w.endsWith("shes")) return w.slice(0, -2);
      return w.slice(0, -1);
    }
    return w.slice(0, -1);
  }
  return w;
}

export function jaroWinkler(s1, s2) {
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(len2 - 1, i + matchWindow);
    for (let j = start; j <= end; j++) {
      if (!matches2[j] && s1[i] === s2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  let commonPrefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) commonPrefix++;
    else break;
  }
  return jaro + commonPrefix * 0.1 * (1 - jaro);
}

export function rankContextNodes(taskContext, memoryRecords = [], options = {}) {
  const taskText = typeof taskContext === "string" ? taskContext : (taskContext?.task || "");
  const taskLower = taskText.toLowerCase();
  const categoryHints = Array.isArray(taskContext?.category_hints) ? taskContext.category_hints : [];
  const weights = taskContext?.importance_weights || {};
  const taskTokens = tokens(taskText);
  
  const inferredCategories = new Set(categoryHints);
  const categoryKeywords = {
    "food": ["food", "diet", "allergy", "restaurant", "dinner", "lunch", "meal", "eat", "cooking"],
    "diet": ["diet", "preference", "allergy", "vegetarian", "vegan", "gluten", "food"],
    "fitness": ["fitness", "workout", "gym", "exercise", "run", "training", "sports"],
    "health": ["health", "wellness", "medical", "medicine", "insurance", "benefits", "clinic"],
    "shopping": ["shopping", "budget", "buy", "purchase", "price", "spend", "store", "laptop"],
    "learning": ["learning", "study", "course", "education", "tutorial", "exam"],
    "identity": ["identity", "name", "username", "profile", "language", "timezone"],
    "travel": ["travel", "trip", "location", "gps", "hotel", "flight", "destination"],
    "sports": ["sports", "game", "play", "football", "basketball", "tennis"]
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    for (const kw of keywords) {
      if (taskTokens.has(stem(kw))) inferredCategories.add(cat);
    }
  }

  const scored = (Array.isArray(memoryRecords) ? memoryRecords : []).map((memory) => {
    const fieldPath = String(memory.field_path || memory.path || "");
    const category = String(memory.category || "").toLowerCase();
    
    if (isPartitionedDomainConflict(null, taskText, memory, inferredCategories)) {
      return { memory, score: 0, reasons: ["cross-domain partition blocked"] };
    }
    if (isShoppingIntent(taskText, null, inferredCategories) && isDeveloperToolContext(memory)) {
      return { memory, score: 0, reasons: ["developer tool context suppressed for shopping query"] };
    }
    
    const searchable = [fieldPath, category, memory.label, memory.title, memory.summary, memory.value, ...(memory.themes || [])].join(" ");
    const candidateTokens = tokens(searchable);
    
    let overlap = 0;
    for (const token of taskTokens) {
      if (candidateTokens.has(token)) {
        overlap += 1;
      } else {
        let bestFuzzy = 0;
        for (const candToken of candidateTokens) {
          const sim = jaroWinkler(token, candToken);
          if (sim > bestFuzzy) bestFuzzy = sim;
        }
        if (bestFuzzy >= 0.85) overlap += bestFuzzy;
      }
    }
    const lexicalScore = taskTokens.size ? overlap / taskTokens.size : 0;

    let categoryMatchScore = 0;
    if (inferredCategories.has(category)) {
      categoryMatchScore = 0.5;
    } else if (fieldPath.split(".").some(part => inferredCategories.has(part))) {
      categoryMatchScore = 0.4;
    }

    let relevanceVectorScore = 0;
    if (memory.relevance_vectors) {
      for (const activeCat of inferredCategories) {
        if (memory.relevance_vectors[activeCat]) relevanceVectorScore = Math.max(relevanceVectorScore, memory.relevance_vectors[activeCat]);
      }
    }

    let customWeight = 1.0;
    if (weights[category]) customWeight = weights[category];
    for (const [key, wt] of Object.entries(weights)) {
      if (fieldPath.includes(key)) customWeight = Math.max(customWeight, wt);
    }

    let crossCategoryPromotionBoost = 0;
    const reasons = [];
    if (category === "learning") {
      for (const [destination, language] of Object.entries(TRAVEL_LANGUAGE_PROMOTION_MAP)) {
        if (taskLower.includes(destination)) {
          if (fieldPath.includes(language) || searchable.toLowerCase().includes(language)) {
            crossCategoryPromotionBoost = 0.35;
            reasons.push(`cross-category travel boost: ${destination} -> ${language}`);
            break;
          }
        }
      }
    }
  
    const rawScore = Math.max(lexicalScore, categoryMatchScore, relevanceVectorScore, crossCategoryPromotionBoost) * customWeight;
    const score = Number(Math.max(0, Math.min(1, rawScore)).toFixed(3));

    if (lexicalScore > 0) reasons.push("lexical overlap");
    if (categoryMatchScore > 0) reasons.push("category match");
    if (relevanceVectorScore > 0) reasons.push("relevance vector mapping");
    if (customWeight !== 1.0) reasons.push(`custom weight multiplier: ${customWeight}`);

    return { memory, score, reasons: reasons.length ? reasons : ["weak semantic fallback"] };
  });

  return scored
    .filter((candidate) => candidate.score >= (options.threshold ?? 0.10))
    .sort((left, right) => right.score - left.score || String(left.memory.field_path || "").localeCompare(String(right.memory.field_path || "")));
}

export class CrossCategoryRelevanceRanker {
  constructor(options = {}) { this.threshold = options.threshold ?? 0.10; }
  rank(taskContext, memoryRecords) { return rankContextNodes(taskContext, memoryRecords, { threshold: this.threshold }); }
}