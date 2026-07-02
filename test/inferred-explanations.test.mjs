import test from "node:test";
import assert from "node:assert/strict";
import { shapeContextProposal } from "../src/engine.mjs";

test("Engine maps fitness heart rate thresholds to friendly explanation text summaries (#232)", () => {
  const signalInput = {
    raw_signal: {
      type: "activity",
      category: "fitness",
      event_type: "workout_session",
      data: { workout_type: "cardio", duration: 30, heart_rate: 160 }
    }
  };

  const proposal = shapeContextProposal(signalInput);
  assert.match(proposal.context.summary, /Inferred fitness preference captured/);
  assert.match(proposal.context.summary, /30 minutes/);
  assert.match(proposal.context.summary, /160 BPM/);
});

test("Engine maps ride destination thresholds to friendly travel explanation summaries (#232)", () => {
  const signalInput = {
    raw_signal: {
      type: "activity",
      category: "travel",
      event_type: "location_lookup",
      data: { destination: "Paris" }
    }
  };

  const proposal = shapeContextProposal(signalInput);
  assert.match(proposal.context.summary, /Inferred travel interest triggered/);
  assert.match(proposal.context.summary, /Paris/);
});