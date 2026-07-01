import { createHash } from "node:crypto";
import { SYNONYM_TRIE, normalize, stem, STOP_WORDS, HIGH_SENSITIVITY_PREFIXES } from "./synonym-registry.mjs";

export { contextMatchingExamples } from "./synonym-registry.mjs";

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

  // Allow appClass-specific minimum threshold floors.
  const sessionMinimumThreshold = resolveMinimumThreshold(options, requestedCategory);


  return (Array.isArray(requestedContext) ? requestedContext : []).map((requestedItem) => {
    const requestText = requestToText(requestedItem);
    const requestTokens = tokens(requestText);
    const itemCategory = requestedItem?.category || requestedItem?.category_hint || requestedCategory || null;

    // Dynamic Threshold Adjustment based on query specificity
    let itemThreshold = baseThreshold;
    if (requestTokens.size <= 1) {
      itemThreshold = baseThreshold + 0.08;
    } else if (requestTokens.size >= 3) {
      itemThreshold = Math.max(0.01, baseThreshold - 0.05);
    }
    if (sessionMinimumThreshold !== null) {
      itemThreshold = Math.max(itemThreshold, sessionMinimumThreshold);
    }
    
    // 🔍 Extract target field rules out of our integrated Synonym Stem Trie
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

/**
 * Local cryptographic helper utility to mask private PII strings before scoring execution passes
 */
export function anonymizePrivateIdentities(text = "") {
  const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return String(text).replace(EMAIL_PATTERN, (match) => {
    return "anon_" + createHash("sha256").update(match.toLowerCase().trim()).digest("hex").slice(0, 12);
  });
}

function scoreMemory(requestText, requestTokens, synonymFields, memory = {}, requestedCategory = null) {
  const fieldPath = String(memory.field_path || memory.path || "");

  // Cross-domain privacy boundary:
  // Professional / productivity workspaces must not ingest entertainment playback or listening-history context.
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
  
  // Protect personal information before tokenizing
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
      if (bestFuzzy >= 0.85) {
        overlap += bestFuzzy;
      }
    }
  }

  const lexical = requestTokens.size ? overlap / requestTokens.size : 0;
  const fieldPathSimilarity = pathSimilarity(fieldPath, [...requestTokens].join("."));
  const synonymBoost = synonymFields.includes(fieldPath) ? 0.78 : 0;
  
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

  // Allow schemas to define cross-domain relevance vectors
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

  const score = round(Math.max(0, Math.min(1, Math.max(lexical, fieldPathSimilarity, synonymBoost, crossDomainRelevanceVector) + crossDomainRelevance)));
  
  const reasons = [];
  if (synonymBoost) reasons.push("example mapping");
  if (lexical) reasons.push("keyword overlap");
  if (fieldPathSimilarity) reasons.push("field path similarity");
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
  // Supports:
  // - global/session minimum threshold (existing behavior)
  // - per-app-class minimum threshold floors
  //   * options.minimumThresholdByAppClass / minimumThresholdByCategory
  //   * options.appClassMinimumThresholds
  //   * options.minimumThresholdByRequestedCategory

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

    // per-app-class floors
    ...(options.minimumThresholdByAppClass
      ? [
          options.minimumThresholdByAppClass[requestedCategory] ??
            options.minimumThresholdByAppClass?.[String(requestedCategory || "").toLowerCase()] ??
            options.minimumThresholdByAppClass?.[String(requestedCategory || "").trim()] ??
            options.minimumThresholdByAppClass?.default,
        ]
      : []),

    ...(options.minimumThresholdByCategory
      ? [
          options.minimumThresholdByCategory[requestedCategory] ??
            options.minimumThresholdByCategory?.[String(requestedCategory || "").toLowerCase()] ??
            options.minimumThresholdByCategory?.[String(requestedCategory || "").trim()] ??
            options.minimumThresholdByCategory?.default,
        ]
      : []),

    ...(options.appClassMinimumThresholds
      ? [
          options.appClassMinimumThresholds[requestedCategory] ??
            options.appClassMinimumThresholds?.[String(requestedCategory || "").toLowerCase()] ??
            options.appClassMinimumThresholds?.[String(requestedCategory || "").trim()] ??
            options.appClassMinimumThresholds?.default,
        ]
      : []),

    ...(options.minimumThresholdByRequestedCategory
      ? [
          options.minimumThresholdByRequestedCategory[requestedCategory] ??
            options.minimumThresholdByRequestedCategory?.[String(requestedCategory || "").toLowerCase()] ??
            options.minimumThresholdByRequestedCategory?.[String(requestedCategory || "").trim()] ??
            options.minimumThresholdByRequestedCategory?.default,
        ]
      : []),
  ];


  for (const candidate of candidates) {
    const threshold = Number(candidate);
    if (Number.isFinite(threshold)) {
      return threshold;
    }
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

  // Only gate workspaces intended for professional/prod productivity.
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

  const queryHasFoodDelivery = queryDomains.has("food-delivery");
  const queryHasHealthFitness = queryDomains.has("health-fitness");
  const memoryIsFoodDelivery = FOOD_DELIVERY_DOMAIN.has(memoryDomain);
  const memoryIsHealthFitness = HEALTH_FITNESS_DOMAIN.has(memoryDomain);

  return (queryHasFoodDelivery && memoryIsHealthFitness) || (queryHasHealthFitness && memoryIsFoodDelivery);
}

function normalizeDomainKey(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
}

// Convert input value into clean tokenized stems
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
    if (s1[i] === s2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  return jaro + commonPrefix * 0.1 * (1 - jaro);
}

export function rankContextNodes(taskContext, memoryRecords = [], options = {}) {
  const taskText = typeof taskContext === "string" ? taskContext : (taskContext?.task || "");
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
      if (taskTokens.has(stem(kw))) {
        inferredCategories.add(cat);
      }
    }
  }

  const scored = (Array.isArray(memoryRecords) ? memoryRecords : []).map((memory) => {
    const fieldPath = String(memory.field_path || memory.path || "");
    const category = String(memory.category || "").toLowerCase();
    if (isPartitionedDomainConflict(null, taskText, memory, inferredCategories)) {
      return {
        memory,
        score: 0,
        reasons: ["cross-domain partition blocked"]
      };
    }
    if (isShoppingIntent(taskText, null, inferredCategories) && isDeveloperToolContext(memory)) {
      return {
        memory,
        score: 0,
        reasons: ["developer tool context suppressed for shopping query"]
      };
    }
    
    const searchable = [
      fieldPath,
      category,
      memory.label,
      memory.title,
      memory.summary,
      memory.value,
      ...(memory.themes || [])
    ].join(" ");
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
        if (bestFuzzy >= 0.85) {
          overlap += bestFuzzy;
        }
      }
    }
    const lexicalScore = taskTokens.size ? overlap / taskTokens.size : 0;

    let categoryMatchScore = 0;
    if (inferredCategories.has(category)) {
      categoryMatchScore = 0.5;
    } else {
      const pathParts = fieldPath.split(".");
      if (pathParts.some(part => inferredCategories.has(part))) {
        categoryMatchScore = 0.4;
      }
    }

    let relevanceVectorScore = 0;
    if (memory.relevance_vectors) {
      for (const activeCat of inferredCategories) {
        if (memory.relevance_vectors[activeCat]) {
          relevanceVectorScore = Math.max(relevanceVectorScore, memory.relevance_vectors[activeCat]);
        }
      }
    }

    let customWeight = 1.0;
    if (weights[category]) {
      customWeight = weights[category];
    }
    for (const [key, wt] of Object.entries(weights)) {
      if (fieldPath.includes(key)) {
        customWeight = Math.max(customWeight, wt);
      }
    }

    const rawScore = Math.max(lexicalScore, categoryMatchScore, relevanceVectorScore) * customWeight;
    const score = Number(Math.max(0, Math.min(1, rawScore)).toFixed(3));

    const reasons = [];
    if (lexicalScore > 0) reasons.push("lexical overlap");
    if (categoryMatchScore > 0) reasons.push("category match");
    if (relevanceVectorScore > 0) reasons.push("relevance vector mapping");
    if (customWeight !== 1.0) reasons.push(`custom weight multiplier: ${customWeight}`);

    return {
      memory,
      score,
      reasons: reasons.length ? reasons : ["weak semantic fallback"]
    };
  });

  const threshold = options.threshold ?? 0.10;
  return scored
    .filter((candidate) => candidate.score >= threshold)
    .sort((left, right) => right.score - left.score || String(left.memory.field_path || "").localeCompare(String(right.memory.field_path || "")));
}

export class CrossCategoryRelevanceRanker {
  constructor(options = {}) {
    this.threshold = options.threshold ?? 0.10;
  }

  rank(taskContext, memoryRecords) {
    return rankContextNodes(taskContext, memoryRecords, { threshold: this.threshold });
  }
}

export class CollisionTree {
  constructor(name = "root") {
    this.name = name;
    this.children = new Map();
    this.priorityList = null;
  }

  setPriority(path, priorities) {
    const parts = typeof path === "string" ? path.split(".") : path;
    if (!parts || parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
      this.priorityList = priorities;
      return;
    }
    const [first, ...rest] = parts;
    if (!this.children.has(first)) {
      this.children.set(first, new CollisionTree(first));
    }
    this.children.get(first).setPriority(rest, priorities);
  }

  getPriority(path) {
    const parts = typeof path === "string" ? path.split(".") : path;
    let current = this;
    let bestPriority = this.priorityList;
    for (const part of parts) {
      if (current.children.has(part)) {
        current = current.children.get(part);
        if (current.priorityList !== null) {
          bestPriority = current.priorityList;
        }
      } else {
        break;
      }
    }
    return bestPriority;
  }
}

export function resolveOverwriteCollisions(writes = [], priorityTree = null, categoryWeights = {}) {
  const grouped = {};
  for (const write of writes) {
    const path = write.path;
    if (!grouped[path]) {
      grouped[path] = [];
    }
    grouped[path].push(write);
  }

  const resolved = {};
  const routedToCRP = [];

  for (const [path, pathWrites] of Object.entries(grouped)) {
    if (pathWrites.length === 1) {
      resolved[path] = pathWrites[0];
      continue;
    }

    let priorities = null;
    if (priorityTree) {
      priorities = priorityTree.getPriority(path);
    }

    let winningWrite = null;

    if (priorities && priorities.length > 0) {
      let bestIndex = Infinity;
      let candidates = [];
      for (const w of pathWrites) {
        const idx = priorities.indexOf(w.category);
        if (idx !== -1) {
          if (idx < bestIndex) {
            bestIndex = idx;
            candidates = [w];
          } else if (idx === bestIndex) {
            candidates.push(w);
          }
        }
      }
      if (candidates.length === 1) {
        winningWrite = candidates[0];
      } else if (candidates.length > 1) {
        winningWrite = resolveByWeights(candidates, categoryWeights);
      }
    }

    if (!winningWrite) {
      winningWrite = resolveByWeights(pathWrites, categoryWeights);
    }

    if (winningWrite) {
      resolved[path] = winningWrite;
    } else {
      routedToCRP.push({
        path,
        reason: "collision_unresolved",
        writes: pathWrites,
        route_to_crp: true
      });
    }
  }

  return {
    resolved,
    routedToCRP
  };
}

function resolveByWeights(writes, categoryWeights) {
  let maxWeight = -Infinity;
  let candidates = [];
  for (const w of writes) {
    const weight = categoryWeights[w.category] !== undefined ? categoryWeights[w.category] : 1.0;
    if (weight > maxWeight) {
      maxWeight = weight;
      candidates = [w];
    } else if (weight === maxWeight) {
      candidates.push(w);
    }
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  
  let maxConfidence = -Infinity;
  let confidenceCandidates = [];
  for (const w of candidates) {
    const conf = w.confidence !== undefined ? w.confidence : 1.0;
    if (conf > maxConfidence) {
      maxConfidence = conf;
      confidenceCandidates = [w];
    } else if (conf === maxConfidence) {
      confidenceCandidates.push(w);
    }
  }
  if (confidenceCandidates.length === 1) {
    return confidenceCandidates[0];
  }
  return null;
}