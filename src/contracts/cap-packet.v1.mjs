/**
 * CAP v1 — Context Access Protocol response contract (`cap-packet.v1`).
 *
 * A cap-packet is the signed response envelope a Memact node returns for a
 * cap-request. It carries the granted/denied permissions, the released claims,
 * and the timestamps (issuance + expiry) that bound the packet's validity.
 *
 * See docs/cap-v1-rfc.md for the normative specification.
 */
import { validateAgainstSchema } from "./schema.mjs"
import { CAP_VERSION, CAP_SIGNATURE_ALGORITHMS, CAP_SCOPES } from "./cap-request.v1.mjs"

export const CAP_PACKET_SCHEMA_ID = "cap-packet.v1"

export const CAP_PERMISSION_DECISIONS = Object.freeze(["grant", "deny"])

const PERMISSION_SCHEMA = Object.freeze({
  type: "object",
  required: ["scope", "decision"],
  properties: {
    scope: { type: "string", enum: [...CAP_SCOPES] },
    decision: { type: "string", enum: [...CAP_PERMISSION_DECISIONS] },
    claim_classes: { type: "array", items: { type: "string", enum: ["intent", "habit", "preference", "identity"] } },
    reason: { type: "string" },
  },
})

const TIMESTAMPS_SCHEMA = Object.freeze({
  type: "object",
  required: ["issued_at", "expires_at"],
  properties: {
    issued_at: { type: "string", format: "iso-8601" },
    expires_at: { type: "string", format: "iso-8601" },
    generated_at: { type: "string", format: "iso-8601" },
  },
})

const SIGNATURE_SCHEMA = Object.freeze({
  type: "object",
  required: ["algorithm", "public_key", "signature"],
  properties: {
    algorithm: { type: "string", enum: [...CAP_SIGNATURE_ALGORITHMS] },
    public_key: { type: "string", minLength: 16 },
    signature: { type: "string", minLength: 16 },
  },
})

export const CAP_PACKET_V1_SCHEMA = Object.freeze({
  $id: CAP_PACKET_SCHEMA_ID,
  version: CAP_VERSION,
  type: "object",
  required: ["schema", "packet_id", "in_response_to", "node_id", "permissions", "claims", "timestamps", "signature"],
  properties: {
    schema: { type: "string", const: CAP_PACKET_SCHEMA_ID },
    packet_id: { type: "string", minLength: 1 },
    in_response_to: { type: "string", minLength: 1 },
    node_id: { type: "string", minLength: 1 },
    permissions: { type: "array", items: PERMISSION_SCHEMA },
    claims: { type: "array" },
    timestamps: TIMESTAMPS_SCHEMA,
    signature: SIGNATURE_SCHEMA,
  },
})

export function validateCapPacket(packet) {
  const errors = validateAgainstSchema(packet, CAP_PACKET_V1_SCHEMA)

  // Cross-field invariant: expiry must come strictly after issuance.
  if (packet && packet.timestamps) {
    const { issued_at, expires_at } = packet.timestamps
    if (issued_at && expires_at && Date.parse(expires_at) <= Date.parse(issued_at)) {
      errors.push("timestamps: expires_at must be after issued_at")
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * True when the packet is currently within its validity window.
 */
export function isCapPacketActive(packet, nowMs = Date.now()) {
  const issuedAt = Date.parse(packet?.timestamps?.issued_at ?? "")
  const expiresAt = Date.parse(packet?.timestamps?.expires_at ?? "")
  return Number.isFinite(issuedAt) && Number.isFinite(expiresAt) && nowMs >= issuedAt && nowMs < expiresAt
}
