/**
 * Schema Sync Protocol messages.
 *
 * This module only defines message shapes and normalization helpers.
 */

export const MESSAGE_TYPES = {
  MANIFEST_ANNOUNCE: "sync/manifest/announce",
  ARTIFACT_PUSH: "sync/artifact/push",
  ARTIFACT_PULL: "sync/artifact/pull",
  ACK: "sync/ack"
};

export function makeManifestAnnounce({ message_id, node_id, manifest, artifact_id }) {
  if (!message_id) throw new Error("message_id is required");
  if (!node_id) throw new Error("node_id is required");
  if (!manifest) throw new Error("manifest is required");
  return {
    message_type: MESSAGE_TYPES.MANIFEST_ANNOUNCE,
    message_id,
    node_id,
    at: new Date().toISOString(),
    artifact_id,
    manifest
  };
}

export function makeArtifactPush({ message_id, node_id, artifact }) {
  if (!message_id) throw new Error("message_id is required");
  if (!node_id) throw new Error("node_id is required");
  if (!artifact?.artifact_id) throw new Error("artifact.artifact_id is required");
  return {
    message_type: MESSAGE_TYPES.ARTIFACT_PUSH,
    message_id,
    node_id,
    at: new Date().toISOString(),
    artifact
  };
}

export function makeArtifactPull({ message_id, node_id, artifact_id }) {
  if (!message_id) throw new Error("message_id is required");
  if (!node_id) throw new Error("node_id is required");
  if (!artifact_id) throw new Error("artifact_id is required");
  return {
    message_type: MESSAGE_TYPES.ARTIFACT_PULL,
    message_id,
    node_id,
    at: new Date().toISOString(),
    artifact_id
  };
}

export function makeAck({ message_id, node_id, response_to_message_id, artifact_id }) {
  if (!message_id) throw new Error("message_id is required");
  if (!node_id) throw new Error("node_id is required");
  if (!response_to_message_id) throw new Error("response_to_message_id is required");
  return {
    message_type: MESSAGE_TYPES.ACK,
    message_id,
    node_id,
    at: new Date().toISOString(),
    response_to_message_id,
    artifact_id
  };
}

