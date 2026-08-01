import { filterArtifactForPermissions } from "./permission-enforcer.mjs";
import { MESSAGE_TYPES } from "./sync-protocol.mjs";

/**
 * In-memory reconciliation store.
 * In production this would be backed by persistent storage (DB/log).
 */
export class InMemoryReconciliationStore {
  constructor({ node_id, scopes = [] } = {}) {
    this.node_id = node_id || "node_unknown";
    this.scopes = scopes;

    this.applied_message_ids = new Set();
    this.manifests = new Map(); // artifact_id -> manifest
    this.artifacts = new Map(); // artifact_id -> artifact
    this.acks = new Map(); // response_to_message_id -> ack record
  }

  hasApplied(message_id) {
    return this.applied_message_ids.has(message_id);
  }

  applyMessage(message) {
    if (!message?.message_id) throw new Error("message.message_id is required");
    if (this.hasApplied(message.message_id)) {
      return { ok: true, skipped: true };
    }

    const t = message.message_type;
    if (!t) throw new Error("message.message_type is required");

    if (t === MESSAGE_TYPES.MANIFEST_ANNOUNCE) {
      this.applied_message_ids.add(message.message_id);
      const { artifact_id, manifest } = message;
      if (artifact_id && manifest) {
        this.manifests.set(artifact_id, manifest);
      }
      return { ok: true, kind: "manifest" };
    }

    if (t === MESSAGE_TYPES.ARTIFACT_PUSH) {
      this.applied_message_ids.add(message.message_id);
      const artifact = message.artifact;
      const artifact_id = artifact?.artifact_id;
      if (!artifact_id) throw new Error("artifact.artifact_id is required");

      const filtered = filterArtifactForPermissions({ artifact, scopes: this.scopes });
      if (!filtered.ok) {
        return { ok: false, reason: filtered.reason };
      }

      this.artifacts.set(artifact_id, filtered.artifact);
      return { ok: true, kind: "artifact" };
    }

    if (t === MESSAGE_TYPES.ARTIFACT_PULL) {
      // Pulls are typically handled by a node handler; store just records as applied.
      this.applied_message_ids.add(message.message_id);
      return { ok: true, kind: "pull_recorded" };
    }

    if (t === MESSAGE_TYPES.ACK) {
      this.applied_message_ids.add(message.message_id);
      this.acks.set(message.response_to_message_id, message);
      return { ok: true, kind: "ack" };
    }

    this.applied_message_ids.add(message.message_id);
    return { ok: true, kind: "unknown" };
  }

  getManifest(artifact_id) {
    return this.manifests.get(artifact_id) || null;
  }

  getArtifact(artifact_id) {
    return this.artifacts.get(artifact_id) || null;
  }

  resolveActiveArtifact(artifact_id) {
    return {
      manifest: this.getManifest(artifact_id),
      artifact: this.getArtifact(artifact_id)
    };
  }
}

