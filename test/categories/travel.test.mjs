import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTravelContext } from "../../src/categories/travel.mjs";

test("travel - explicit preferences preserve non-sensitive fields", () => {
  const rawInput = {
    source: "ExpediaApp",
    type: "preference",
    explicit: true,
    data: {
      tripStyle: "backpacking",
      preferredStayType: "hostel"
    }
  };

  const result = normalizeTravelContext(rawInput);
  assert.equal(result.category, "travel");
  assert.equal(result.confidence, "high");
  assert.equal(result.visibility, "private");
  assert.equal(result.preferences.tripStyle, "backpacking");
});

test("travel - rejects or filters out risky GPS data", () => {
  const rawInput = {
    source: "GreedyMapApp",
    type: "activity",
    explicit: false,
    data: {
      current_gps: "48.8566, 2.3522",
      destination: "Paris"
    }
  };

  const result = normalizeTravelContext(rawInput);
  assert.equal(result.status, "rejected");
  assert.equal(result.preciseLocation, undefined);
});
