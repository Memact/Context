import test from "node:test";
import assert from "node:assert/strict";
import { shapeContextProposal } from "../src/engine.mjs";
import { resolveSchemaLifecycleState } from "../src/lifecycle.mjs";
test("shapeContextProposal forces transient scopes when vacationMode option is enabled for dining and travel categories", () => {
  const rawSignal = {
    raw_signal: {
      category: "food-delivery",
      title: "Late night vacation dinner order",
      payload: { restaurant: "Beachside Bistro", items: ["Seafood Platter"] }
    }
  };

  const proposal = shapeContextProposal(rawSignal, { vacationMode: true });

  assert.equal(proposal.context.scope, "temporary_intent");
  assert.equal(proposal.context.transient, true);
  assert.equal(proposal.confidence <= 0.35, true);
  assert.ok(proposal.guardrails.some(g => g.includes("Vacation Mode Guardrail")));
});

test("resolveSchemaLifecycleState locks travel and dining schemas to emerging state when vacationMode is active", () => {
  const highSupportMetrics = {
    category: "travel",
    support: 12,
    confidence: 0.85,
    activeDayCount: 5,
    distinctSourceCount: 3
  };
  
  const thresholds = {
    minSupport: 2,
    vacationMode: true
  };

  const state = resolveSchemaLifecycleState(highSupportMetrics, thresholds);
  
  // Even with massive support metrics, it must remain emerging!
  assert.equal(state, "emerging");
});