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

test("shapeContextProposal automatically drops raw coordinates and financial fields under boundary rules", () => {
  const signalWithSensitiveData = {
    raw_signal: {
      category: "travel",
      event_type: "location_ping",
      payload: {
        destination: "Central Terminal",
        latitude: 17.3850,
        longitude: 78.4867,
        ride_cost: 45.50,
        account_balance: 1500.00
      }
    }
  };

  const proposal = shapeContextProposal(signalWithSensitiveData);

  // Assert sensitive keys are removed from evidence payload
  assert.equal(proposal.context.evidence.latitude, undefined);
  assert.equal(proposal.context.evidence.longitude, undefined);
  assert.equal(proposal.context.evidence.account_balance, undefined);

  // Assert non-sensitive structural keys are retained
  assert.equal(proposal.context.evidence.destination, "Central Terminal");

  // Assert metadata tracking arrays record the filtering
  assert.equal(proposal.drop_reason, "sensitivity_boundary_restriction");
  assert.ok(proposal.dropped_fields.some(d => d.field === "latitude"));
  assert.ok(proposal.dropped_fields.some(d => d.field === "account_balance"));
});