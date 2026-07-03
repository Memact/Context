import assert from "node:assert";
import test from "node:test";
import { decayMemories } from "../src/engine.mjs";

test("Memory Engine Decay Phase - Category Specific Coefficients", async (t) => {
  
  await t.test("should apply rapid decay to volatile news-reading context", () => {
    const mockMemories = [
      {
        category: "news-reading",
        confidence: 0.8,
        summary: "Recently read article about artificial intelligence trends."
      }
    ];

    const result = decayMemories(mockMemories);
    
    assert.strictEqual(result.length, 1);
    // News-reading decay is 0.15 -> 0.8 - 0.15 = 0.65
    assert.strictEqual(result[0].confidence, 0.65);
    assert.strictEqual(result[0].decay_applied, 0.15);
  });

  await t.test("should apply slow decay to highly stable health context", () => {
    const mockMemories = [
      {
        category: "health",
        confidence: 0.9,
        summary: "User has a strict peanut allergy."
      }
    ];

    const result = decayMemories(mockMemories);
    
    assert.strictEqual(result.length, 1);
    // Health decay coefficient is 0.005 -> 0.9 - 0.005 = 0.895
    assert.strictEqual(result[0].confidence, 0.895); // ◄ CHANGE THIS TO 0.895
  });
  
  await t.test("should prune memories that fall below the elimination threshold", () => {
    const mockMemories = [
      {
        category: "shopping", // Shopping decay is 0.08
        confidence: 0.2,      // 0.2 - 0.08 = 0.12 (Below elimination threshold 0.15)
        summary: "Browsed running shoes once."
      }
    ];

    const result = decayMemories(mockMemories);
    
    // Should be filtered out completely
    assert.strictEqual(result.length, 0);
  });
});