import test from "node:test";
import assert from "node:assert/strict";
import { provenanceTracker } from "../src/provenance-tracker.mjs";
import { matchContextFields, rankContextNodes } from "../src/context-matcher.mjs";

test("provenance-tracker - registers and cleanups read queries correctly", () => {
  provenanceTracker.clear();

  // Register query
  provenanceTracker.registerQuery("q1", ["favorite_genres"], ["Indie Pop", "Rock"]);
  assert.equal(provenanceTracker.getQueries().length, 1);
  
  const query = provenanceTracker.getQueries()[0];
  assert.equal(query.queryId, "q1");
  assert.deepEqual(query.fields, ["favorite_genres"]);
  assert.deepEqual(query.values, ["indie pop", "rock"]); // lowercased

  // Test cleanup
  const oldTime = Date.now() - 700000; // 11 mins ago
  provenanceTracker.registerQuery("q_old", ["skipped_styles"], ["Jazz"], oldTime);
  assert.equal(provenanceTracker.getQueries().length, 2);

  provenanceTracker.cleanup(600000); // 10 mins threshold
  assert.equal(provenanceTracker.getQueries().length, 1);
  assert.equal(provenanceTracker.getQueries()[0].queryId, "q1");
});

test("provenance-tracker - detects recommendation loop correctly", () => {
  provenanceTracker.clear();
  provenanceTracker.registerQuery("q1", ["music-streaming.favorite_genres", "favorite_artists"], ["Diljit Dosanjh", "Indie Pop"]);

  // 1. Matches field path exactly
  const claim1 = { field_path: "music-streaming.favorite_genres", value: "Jazz" };
  assert.ok(provenanceTracker.detectRecommendationLoop(claim1));

  // 2. Matches category/field subset
  const claim2 = { category: "favorite_artists", value: "Aritjit" };
  assert.ok(provenanceTracker.detectRecommendationLoop(claim2));

  // 3. Matches value exactly
  const claim3 = { field_path: "some.other.field", value: "Diljit Dosanjh" };
  assert.ok(provenanceTracker.detectRecommendationLoop(claim3));

  // 4. Matches array value
  const claim4 = { field_path: "some.other.field", value: ["Rock", "Indie Pop"] };
  assert.ok(provenanceTracker.detectRecommendationLoop(claim4));

  // 5. Does not match organic claim
  const claim5 = { field_path: "shopping.budget", value: "$$" };
  assert.ok(!provenanceTracker.detectRecommendationLoop(claim5));
});

test("context-matcher - dampens scoreMemory score when recommendation loop detected", () => {
  provenanceTracker.clear();

  const developerMemories = [
    {
      field_path: "music-streaming.favorite_genres",
      value: "Indie Pop",
      category: "music-streaming"
    }
  ];

  // Under normal organic conditions
  const normalResults = matchContextFields(["what is my favorite music"], developerMemories, { threshold: 0.05 });
  const normalScore = normalResults[0].candidates[0].score;
  assert.ok(normalScore > 0);

  // When recommendation read occurred recently
  provenanceTracker.registerQuery("read1", ["music-streaming.favorite_genres"], ["Indie Pop"]);
  const loopResults = matchContextFields(["what is my favorite music"], developerMemories, { threshold: 0.05 });
  const loopScore = loopResults[0].candidates[0].score;

  // The loop score should be dampened (default dampening is 0.4x)
  assert.ok(loopScore < normalScore, "Loop score must be strictly less than normal score");
  assert.equal(loopScore, Number((normalScore * 0.4).toFixed(3)));
  assert.ok(loopResults[0].candidates[0].reasons.includes("feedback loop dampening applied"));
});

test("context-matcher - dampens rankContextNodes score when recommendation loop detected", () => {
  provenanceTracker.clear();

  const developerMemories = [
    {
      field_path: "music-streaming.favorite_genres",
      value: "Indie Pop",
      category: "music-streaming"
    }
  ];

  const taskContext = { task: "Recommend music playlist" };

  // Normal ranking
  const normalRank = rankContextNodes(taskContext, developerMemories, { threshold: 0.01 });
  const normalScore = normalRank[0].score;
  assert.ok(normalScore > 0);

  // Recommendation loop active
  provenanceTracker.registerQuery("read1", ["music-streaming.favorite_genres"], ["Indie Pop"]);
  const loopRank = rankContextNodes(taskContext, developerMemories, { threshold: 0.01 });
  const loopScore = loopRank[0].score;

  assert.ok(loopScore < normalScore, "Ranked loop score must be strictly less than normal score");
  assert.equal(loopScore, Number((normalScore * 0.4).toFixed(3)));
  assert.ok(loopRank[0].reasons.includes("feedback loop dampening applied"));
});
// Trigger fresh commit change for GitHub PR verification.
