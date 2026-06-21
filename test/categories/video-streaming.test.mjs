import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVideoStreamingContext } from "../../src/categories/video-streaming.mjs";

test("video-streaming - short-term/low completion views remain low confidence weak signals", () => {
  const rawInput = {
    source: "YouTubeApp",
    type: "preference",
    explicit: false,
    data: {
      favorite_genres: ["Documentary"],
      completion_rate: 0.2, // Low view time indicates weak interest or profile swap
      abrupt_stop: true
    }
  };

  const result = normalizeVideoStreamingContext(rawInput);
  assert.equal(result.category, "video-streaming");
  assert.equal(result.confidence, "low");
  assert.equal(result.needs_review, true);
});

test("video-streaming - high completion views correctly save preferences", () => {
  const rawInput = {
    source: "NetflixApp",
    type: "preference",
    explicit: true,
    data: {
      favorite_genres: ["Sci-Fi"],
      completion_rate: 0.9
    }
  };

  const result = normalizeVideoStreamingContext(rawInput);
  assert.equal(result.preferences.favorite_genres[0], "Sci-Fi");
  assert.equal(result.confidence, "high");
});