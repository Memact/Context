import assert from "assert";
import test from "node:test";

import { compileSchema } from "../../src/schema-sync/compiler-contract.mjs";
import { makeArtifactPush, makeManifestAnnounce } from "../../src/schema-sync/sync-protocol.mjs";
import { InMemoryReconciliationStore } from "../../src/schema-sync/reconciliation-store.mjs";
import { FITNESS_CHALLENGES_SCHEMA } from "../../src/categories/fitness-challenges.mjs";

function nodeScopesFitness() {
  return ["fitness-challenges:goals", "fitness-challenges:preferences", "fitness-challenges:streaks"];
}

function nodeScopesFitnessNoSensitive() {
  // Enforcer model will redact sensitive sections unless caller has category namespace scopes.
  return ["fitness-challenges:goals", "fitness-challenges:preferences"];
}

test("schema-sync - produces deterministic artifact_id for same compiler input", () => {
  const opts = {
    compiler_version: "0.1.0",
    output_schema_version: "fitness-challenges.output.v1",
    source_ref: "src/categories/fitness-challenges.mjs",
    dependencies: []
  };

  const r1 = compileSchema(FITNESS_CHALLENGES_SCHEMA, opts);
  const r2 = compileSchema(FITNESS_CHALLENGES_SCHEMA, opts);

  assert.strictEqual(r1.artifact.artifact_id, r2.artifact.artifact_id);
});

test("schema-sync - is idempotent when applying same push message twice", () => {
  const { artifact, manifest } = compileSchema(FITNESS_CHALLENGES_SCHEMA, {
    compiler_version: "0.1.0",
    output_schema_version: "fitness-challenges.output.v1",
    source_ref: "src/categories/fitness-challenges.mjs",
    dependencies: []
  });

  const node = new InMemoryReconciliationStore({ node_id: "node_X", scopes: nodeScopesFitness() });

  const msgAnn = makeManifestAnnounce({
    message_id: "m1",
    node_id: "node_X",
    manifest,
    artifact_id: artifact.artifact_id
  });
  const msgPush = makeArtifactPush({ message_id: "m2", node_id: "node_X", artifact });

  assert.deepStrictEqual(node.applyMessage(msgAnn), { ok: true, kind: "manifest" });

  const first = node.applyMessage(msgPush);
  const second = node.applyMessage(msgPush);

  assert.strictEqual(first.ok, true);
  assert.deepStrictEqual(second, { ok: true, skipped: true });

  const stored = node.getArtifact(artifact.artifact_id);
  assert.ok(stored);
});

test("schema-sync - redacts sensitive field metadata when caller lacks category namespace scopes", () => {
  const { artifact, manifest } = compileSchema(FITNESS_CHALLENGES_SCHEMA, {
    compiler_version: "0.1.0",
    output_schema_version: "fitness-challenges.output.v1",
    source_ref: "src/categories/fitness-challenges.mjs",
    dependencies: []
  });

  const node = new InMemoryReconciliationStore({ node_id: "node_Y", scopes: nodeScopesFitnessNoSensitive() });

  const msgAnn = makeManifestAnnounce({
    message_id: "a1",
    node_id: "node_Y",
    manifest,
    artifact_id: artifact.artifact_id
  });
  const msgPush = makeArtifactPush({ message_id: "p1", node_id: "node_Y", artifact });

  assert.deepStrictEqual(node.applyMessage(msgAnn), { ok: true, kind: "manifest" });

  const applied = node.applyMessage(msgPush);
  assert.strictEqual(applied.ok, true);

  const stored = node.getArtifact(artifact.artifact_id);
  assert.ok(stored);

  const medical = stored?.compiled_output?.definition?.sections?.sensitive_signals?.fields?.medical_constraints;
  assert.ok(medical, "expected medical_constraints field to exist after redaction");

  assert.strictEqual(medical.redacted, true);
});

