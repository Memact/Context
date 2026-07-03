import test from "node:test";
import assert from "node:assert/strict";
import { traceEvidenceLineage, shapeContextProposal } from "../src/engine.mjs";

test("Evidence lineage tracer correctly counts sessions and formats day spans (#228)", () => {
  const sampleTrail = [
    { type: "Duolingo", started_at: "2026-07-01T10:00:00.000Z" },
    { type: "Duolingo", started_at: "2026-07-01T15:00:00.000Z" },
    { type: "Duolingo", started_at: "2026-07-02T11:00:00.000Z" },
    { type: "Duolingo", started_at: "2026-07-03T09:00:00.000Z" }
  ];

  const traceString = traceEvidenceLineage(sampleTrail);
  assert.equal(traceString, "Based on 4 Duolingo sessions over 3 days.");
});

test("Context proposal output structure includes compiled evidence trace string (#228)", () => {
  const inputPayload = {
    category: "learning",
    source_trail: [
      { type: "Duolingo", started_at: "2026-07-01T10:00:00.000Z" }
    ]
  };

  const proposal = shapeContextProposal(inputPayload);
  assert.equal(proposal.evidence_trace, "Based on 1 Duolingo session over 1 day.");
});