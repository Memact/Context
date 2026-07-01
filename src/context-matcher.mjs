import { createHash } from "node:crypto";

const STOP_WORDS = new Set(["a", "an", "and", "app", "can", "for", "from", "get", "of", "the", "to", "use", "user", "with"]);
const HIGH_SENSITIVITY_PREFIXES = ["identity", "diet.allergy"];

// 🌐 Issue #216: Cross-Category Travel Destination to Language Promotion Matrix
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

export const contextMatchingExamples = Object.freeze([
  // --- Core Food & Diet Synonyms ---
  { app_field: "food restrictions", memact_fields: ["diet.preference", "diet.allergy"], reason: "Food restriction onboarding can use approved diet preference and allergy memory." },
  { app_field: "dietary preferences", memact_fields: ["diet.preference"], reason: "Dietary preferences map to diet.preference memory." },
  { app_field: "dietary restrictions", memact_fields: ["diet.allergy"], reason: "Dietary restrictions map to diet.allergy memory." },
  { app_field: "food allergies", memact_fields: ["diet.allergy"], reason: "Food allergies map to diet.allergy memory." },
  { app_field: "dietary preference", memact_fields: ["diet.preference"], reason: "Dietary preference maps to diet.preference memory." },
  { app_field: "meal preference", memact_fields: ["diet.preference"], reason: "Meal preference maps to diet.preference memory." },
  { app_field: "food preference", memact_fields: ["diet.preference"], reason: "Food preference maps to diet.preference memory." },

  // --- Fitness & Workout Synonyms ---
  { app_field: "workout goal", memact_fields: ["fitness.goal"], reason: "Fitness goal maps to accepted fitness goal memory." },
  { app_field: "workout setup", memact_fields: ["fitness.goal"], reason: "Workout setup maps to fitness.goal memory." },
  { app_field: "fitness objective", memact_fields: ["fitness.goal"], reason: "Fitness objective maps to fitness.goal memory." },
  { app_field: "fitness goal", memact_fields: ["fitness.goal"], reason: "Fitness goal maps to fitness goal memory." },
  { app_field: "activity level", memact_fields: ["fitness.activity_level"], reason: "Activity level maps to fitness activity level memory." },
  { app_field: "workout type", memact_fields: ["fitness.preferred_workout_type"], reason: "Workout type maps to fitness preferred workout type memory." },
  { app_field: "preferred workout", memact_fields: ["fitness.preferred_workout_type"], reason: "Preferred workout maps to fitness preferred workout type memory." },
  { app_field: "equipment available", memact_fields: ["fitness.equipment_available"], reason: "Equipment available maps to fitness equipment available memory." },

  // --- Education & Learning Synonyms ---
  { app_field: "learning goals", memact_fields: ["education.learning_goals"], reason: "Learning goals map to accepted education memory." },
  { app_field: "learning style", memact_fields: ["learning.study_style"], reason: "Learning style maps to learning.study_style memory." },
  { app_field: "study schedule", memact_fields: ["learning.schedule"], reason: "Study schedule maps to learning.schedule memory." },
  { app_field: "preferred format", memact_fields: ["learning.stable_preferences.preferred_format"], reason: "Preferred format maps to learning preferred format memory." },
  { app_field: "learning pace", memact_fields: ["learning.stable_preferences.preferred_pace"], reason: "Learning pace maps to learning preferred pace memory." },
  { app_field: "study pace", memact_fields: ["learning.stable_preferences.preferred_pace"], reason: "Study pace maps to learning preferred pace memory." },
  { app_field: "explanation style", memact_fields: ["learning.stable_preferences.explanation_style"], reason: "Explanation style maps to learning explanation style memory." },
  { app_field: "session length", memact_fields: ["learning.stable_preferences.session_length_preference"], reason: "Session length maps to learning session length preference memory." },
  { app_field: "active topics", memact_fields: ["learning.current_goals.active_topics"], reason: "Active topics maps to learning current goals active topics memory." },
  { app_field: "current difficulty", memact_fields: ["learning.current_goals.current_difficulty"], reason: "Current difficulty maps to learning current difficulty memory." },

  // --- Shopping & Budget Synonyms ---
  { app_field: "budget range", memact_fields: ["shopping.budget"], reason: "Budget range maps to accepted shopping budget memory." },
  { app_field: "laptop budget", memact_fields: ["shopping.laptop.budget"], reason: "Laptop budget maps to shopping.laptop.budget memory." },
  { app_field: "purchase budget", memact_fields: ["shopping.budget"], reason: "Purchase budget maps to shopping.budget memory." },
  { app_field: "budget limit", memact_fields: ["shopping.budget"], reason: "Budget limit maps to shopping.budget memory." },
  { app_field: "preferred categories", memact_fields: ["shopping.preferred_categories"], reason: "Preferred categories maps to shopping preferred categories memory." },
  { app_field: "disliked categories", memact_fields: ["shopping.disliked_categories"], reason: "Disliked categories maps to shopping disliked categories memory." },
  { app_field: "preferred brands", memact_fields: ["shopping.preferred_brands"], reason: "Preferred brands maps to shopping preferred brands memory." },
  { app_field: "shopping format", memact_fields: ["shopping.preferred_format"], reason: "Shopping format maps to shopping preferred format memory." },
  { app_field: "purchase frequency", memact_fields: ["shopping.purchase_frequency"], reason: "Purchase frequency maps to shopping purchase frequency memory." },
  { app_field: "spending range", memact_fields: ["shopping.budget"], reason: "Spending range maps to shopping budget memory." },
  { app_field: "price range", memact_fields: ["shopping.budget"], reason: "Price range maps to shopping budget memory." },

  // --- Identity & Profile Synonyms ---
  { app_field: "preferred name", memact_fields: ["identity.preferred_name"], reason: "A preferred-name field should use explicit identity memory only." },
  { app_field: "display name", memact_fields: ["identity.preferred_name"], reason: "Display name maps to identity.preferred_name memory." },
  { app_field: "username", memact_fields: ["identity.preferred_username"], reason: "Username maps to identity.preferred_username memory." },
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
    return normalize(phrase).split(/\s+/).filter(Boolean).map(word => stem(word));
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
  constructor({ threshold = 0.12 } = {}) {
    this.threshold = Number(threshold);
    this.kind = "local_keyword_overlap";
  }

  match(requestedContext = [], memoryRecords = []) {
    return matchContextFields(requestedContext, memoryRecords, { threshold: this.threshold });
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
  const threshold = Number(options.threshold ?? 0.12);
  return (Array.isArray(requestedContext) ? requestedContext : []).map((requestedItem) => {
    const requestText = requestToText(requestedItem);
    const requestTokens = tokens(requestText);
    
    const synonymFields = SYNONYM_TRIE.searchSynonyms(requestText).length > 0 
      ? SYNONYM_TRIE.searchSynonyms(requestText) 
      : SYNONYM_TRIE.searchSynonyms(requestedItem?.description || "");

    const candidates = (Array.isArray(memoryRecords) ? memoryRecords : [])
      .map((memory) => scoreMemory(requestTokens, synonymFields, memory))
      .filter((candidate) => candidate.score >= threshold)
      .sort((left, right) => right.score - left.score || String(left.memory.field_path || "").localeCompare(String(right.memory.field_path || "")));
      
    return {
      requested: requestedItem,
      request_text: requestText,
      candidates
    };
  });
}

function scoreMemory(requestTokens, synonymFields, memory = {}) {
  const fieldPath = String(memory.field_path || memory.path || "");
  const searchable = [
    fieldPath, memory.category, memory.label, memory.title, memory.summary, memory.value, ...(memory.themes || [])
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
      if (bestFuzzy >= 0.85) {
        overlap += bestFuzzy;
      }
    }
  }
  const lexical = requestTokens.size ? overlap / requestTokens.size : 0;
  const fieldPathSimilarity = pathSimilarity(fieldPath, [...requestTokens].join("."));
  const synonymBoost = synonymFields.includes(fieldPath) ? 0.78 : 0;
  const score = round(Math.max(lexical, fieldPathSimilarity, synonymBoost));
  const reasons = [];
  if (synonymBoost) reasons.push("example mapping");
  if (lexical) reasons.push("keyword overlap");
  if (fieldPathSimilarity) reasons.push("field path similarity");
  return {
    memory,
    score,
    reasons: reasons.length ? reasons : ["weak fallback match"]
  };
}

function requestToText(item) {
  if (typeof item === "string") return item;
  return [item?.description, item?.field_hint, item?.category_hint, item?.name].filter(Boolean).join(" ");
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
      if (bestFuzzy >= 0.85) {
        overlap += bestFuzzy;
      }
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
      if (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("ches") || w.endsWith("shes")) {
        return w.slice(0, -2);
      }
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
  const prefixLimit = 4;
  let commonPrefix = 0;
  for (let i = 0; i < Math.min(prefixLimit, len1, len2); i++) {
    if (s1[i] === s2[i]) commonPrefix++;
    else break;
  }
  return jaro + commonPrefix * 0.1 * (1 - jaro);
}

// 🚀 Issue #216: Global Cross Category Ranker & Promotion Logic
export function rankContextNodes(taskContext, memoryRecords = [], options = {}) {
  const taskText = typeof taskContext === "string" ? taskContext : (taskContext?.task || "");
  const taskTokens = tokens(taskText);
  const taskLower = taskText.toLowerCase();

  const scored = (Array.isArray(memoryRecords) ? memoryRecords : []).map((memory) => {
    const fieldPath = String(memory.field_path || memory.path || "");
    const category = String(memory.category || "").toLowerCase();
    const searchable = [fieldPath, category, memory.label, memory.title, memory.summary, memory.value].join(" ");
    
    const candidateTokens = tokens(searchable);
    let overlap = 0;
    for (const token of taskTokens) {
      if (candidateTokens.has(token)) overlap += 1;
    }
    const lexicalScore = taskTokens.size ? overlap / taskTokens.size : 0;

    const reasons = [];
    if (lexicalScore > 0) reasons.push("lexical overlap");

    // 🚀 Issue #216: Cross-Category Promotion Engine (Travel -> Language Learning)
    let crossCategoryPromotionBoost = 0;
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

    const score = round(Math.max(lexicalScore, crossCategoryPromotionBoost));

    return {
      memory,
      score,
      reasons: reasons.length ? reasons : ["weak semantic fallback"]
    };
  });

  const threshold = options.threshold ?? 0.10;
  return scored
    .filter((candidate) => candidate.score >= threshold)
    .sort((left, right) => right.score - left.score);
}

export class CrossCategoryRelevanceRanker {
  constructor(options = {}) {
    this.threshold = options.threshold ?? 0.10;
  }
  rank(taskContext, memoryRecords) {
    return rankContextNodes(taskContext, memoryRecords, { threshold: this.threshold });
  }
}