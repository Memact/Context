export const STOP_WORDS = new Set(["a", "an", "and", "app", "can", "for", "from", "get", "of", "the", "to", "use", "user", "with"]);
export const HIGH_SENSITIVITY_PREFIXES = ["identity", "diet.allergy"];

export const contextMatchingExamples = Object.freeze([
  { app_field: "food restrictions", memact_fields: ["diet.preference", "diet.allergy"] },
  { app_field: "workout goal", memact_fields: ["fitness.goal"] },
  { app_field: "preferred name", memact_fields: ["identity.preferred_name"] },
  { app_field: "learning goals", memact_fields: ["education.learning_goals"] },
  { app_field: "budget range", memact_fields: ["shopping.budget"] },
  { app_field: "dietary preferences", memact_fields: ["diet.preference"] },
  { app_field: "dietary restrictions", memact_fields: ["diet.allergy"] },
  { app_field: "food allergies", memact_fields: ["diet.allergy"] },
  { app_field: "workout setup", memact_fields: ["fitness.goal"] },
  { app_field: "fitness objective", memact_fields: ["fitness.goal"] },
  { app_field: "learning style", memact_fields: ["learning.study_style"] },
  { app_field: "study schedule", memact_fields: ["learning.schedule"] },
  { app_field: "display name", memact_fields: ["identity.preferred_name"] },
  { app_field: "username", memact_fields: ["identity.preferred_username"] },
  { app_field: "laptop budget", memact_fields: ["shopping.laptop.budget"] },
  { app_field: "purchase budget", memact_fields: ["shopping.budget"] },
  { app_field: "budget limit", memact_fields: ["shopping.budget"] }
]);

export function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
}
export function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(normalize).filter(Boolean))];
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

export const SYNONYM_TRIE = new SynonymTrie();