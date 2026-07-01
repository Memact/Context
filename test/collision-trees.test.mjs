import test from "node:test";
import assert from "node:assert/strict";

import { CollisionTree, resolveOverwriteCollisions } from "../src/engine.mjs";

test("CollisionTree setPriority and getPriority", () => {
  const tree = new CollisionTree();

  // Root fallback
  tree.setPriority("", ["general"]);
  assert.deepEqual(tree.getPriority(""), ["general"]);
  assert.deepEqual(tree.getPriority("any.path"), ["general"]);

  // Specific path
  tree.setPriority("diet", ["dining", "food-delivery"]);
  assert.deepEqual(tree.getPriority("diet"), ["dining", "food-delivery"]);
  assert.deepEqual(tree.getPriority("diet.allergy"), ["dining", "food-delivery"]);

  // Deeper path override
  tree.setPriority("diet.allergy", ["health", "dining"]);
  assert.deepEqual(tree.getPriority("diet.allergy"), ["health", "dining"]);
  assert.deepEqual(tree.getPriority("diet.preference"), ["dining", "food-delivery"]); // falls back to parent
});

test("resolveOverwriteCollisions - single write resolves trivially", () => {
  const writes = [
    { path: "diet.preference", category: "dining", value: "vegan", confidence: 0.8 }
  ];

  const result = resolveOverwriteCollisions(writes);
  assert.deepEqual(result.resolved["diet.preference"], writes[0]);
  assert.equal(result.routedToCRP.length, 0);
});

test("resolveOverwriteCollisions - resolved by PriorityTree specificity", () => {
  const tree = new CollisionTree();
  tree.setPriority("diet", ["dining", "food-delivery"]);

  const writes = [
    { path: "diet.preference", category: "food-delivery", value: "vegetarian", confidence: 0.7 },
    { path: "diet.preference", category: "dining", value: "vegan", confidence: 0.9 }
  ];

  const result = resolveOverwriteCollisions(writes, tree);
  assert.deepEqual(result.resolved["diet.preference"], writes[1]); // dining wins because of tree priority
  assert.equal(result.routedToCRP.length, 0);
});

test("resolveOverwriteCollisions - resolved by category weight fallback", () => {
  const writes = [
    { path: "shopping.budget", category: "fitness", value: "high", confidence: 0.8 },
    { path: "shopping.budget", category: "shopping", value: "low", confidence: 0.7 }
  ];

  const categoryWeights = {
    shopping: 2.0,
    fitness: 1.0
  };

  const result = resolveOverwriteCollisions(writes, null, categoryWeights);
  assert.deepEqual(result.resolved["shopping.budget"], writes[1]); // shopping wins because weight 2.0 > 1.0
  assert.equal(result.routedToCRP.length, 0);
});

test("resolveOverwriteCollisions - tie-break by confidence", () => {
  const writes = [
    { path: "sports.preferred", category: "sports", value: "football", confidence: 0.9 },
    { path: "sports.preferred", category: "gaming", value: "tennis", confidence: 0.6 }
  ];

  // Equal weights (or default to 1.0)
  const result = resolveOverwriteCollisions(writes);
  assert.deepEqual(result.resolved["sports.preferred"], writes[0]); // sports wins because confidence 0.9 > 0.6
  assert.equal(result.routedToCRP.length, 0);
});

test("resolveOverwriteCollisions - unresolved tie routes to CRP", () => {
  const writes = [
    { path: "music.genre", category: "music-streaming", value: "jazz", confidence: 0.8 },
    { path: "music.genre", category: "video-streaming", value: "rock", confidence: 0.8 }
  ];

  const result = resolveOverwriteCollisions(writes);
  assert.deepEqual(result.resolved, {});
  assert.equal(result.routedToCRP.length, 1);
  assert.equal(result.routedToCRP[0].path, "music.genre");
  assert.equal(result.routedToCRP[0].route_to_crp, true);
  assert.deepEqual(result.routedToCRP[0].writes, writes);
});
