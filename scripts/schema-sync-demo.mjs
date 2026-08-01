import {
  compileSchema
} from "../src/schema-sync/compiler-contract.mjs";
import {
  makeManifestAnnounce,
  makeArtifactPush,
  makeArtifactPull,
  makeAck
} from "../src/schema-sync/sync-protocol.mjs";
import { InMemoryReconciliationStore } from "../src/schema-sync/reconciliation-store.mjs";
import { FITNESS_CHALLENGES_SCHEMA } from "../src/categories/fitness-challenges.mjs";

function nodeScopesForFitness() {
  return ["fitness-challenges:goals", "fitness-challenges:preferences", "fitness-challenges:streaks"]; 
}

function nodeScopesNoFitnessSensitive() {
  // Intentionally omit streaks scope; enforcer will redact sensitive sections.
  return ["fitness-challenges:goals", "fitness-challenges:preferences"]; 
}

const compilerVersion = "0.1.0";

const compile = compileSchema(FITNESS_CHALLENGES_SCHEMA, {
  compiler_version: compilerVersion,
  output_schema_version: "fitness-challenges.output.v1",
  source_ref: "src/categories/fitness-challenges.mjs",
  dependencies: []
});

const { manifest, artifact } = compile;

// Simulate two nodes: A can read everything, B lacks streaks scope.
const nodeA = new InMemoryReconciliationStore({ node_id: "node_A", scopes: nodeScopesForFitness() });
const nodeB = new InMemoryReconciliationStore({ node_id: "node_B", scopes: nodeScopesNoFitnessSensitive() });

const msgAnnounce = makeManifestAnnounce({
  message_id: "m1",
  node_id: "node_A",
  manifest,
  artifact_id: artifact.artifact_id
});

const msgPush = makeArtifactPush({
  message_id: "m2",
  node_id: "node_A",
  artifact
});

const msgPull = makeArtifactPull({
  message_id: "m3",
  node_id: "node_B",
  artifact_id: artifact.artifact_id
});

const msgAck = makeAck({
  message_id: "m4",
  node_id: "node_A",
  response_to_message_id: "m3",
  artifact_id: artifact.artifact_id
});

console.log("=== Compiled artifact ===");
console.log({ artifact_id: artifact.artifact_id });

console.log("\n=== Node A apply manifest + push ===");
console.log(nodeA.applyMessage(msgAnnounce));
console.log(nodeA.applyMessage(msgPush));

console.log("\n=== Node B apply manifest + pull record (simulated) ===");
console.log(nodeB.applyMessage(msgAnnounce));
console.log(nodeB.applyMessage(msgPull));
console.log("\n=== Node A ack pull ===");
console.log(nodeA.applyMessage(msgAck));

console.log("\n=== Node B receives push (will redact sensitive parts) ===");
console.log(nodeB.applyMessage(msgPush));

const bArtifact = nodeB.getArtifact(artifact.artifact_id);
console.log("\n=== Node B stored artifact ===");
console.log({ artifactId: artifact.artifact_id, hasDefinition: !!bArtifact, hasRedaction: !!bArtifact?.compiled_output?.definition?.sections?.sensitive_signals });

// Print whether sensitive field meta is redacted.
const redacted = bArtifact?.compiled_output?.definition?.sections?.sensitive_signals?.fields?.medical_constraints;
console.log("Redacted sensitive field meta:", redacted ? { sensitive: redacted.sensitive, redacted: redacted.redacted } : null);

