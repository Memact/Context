/**
 * CAP v1 — Context Access Protocol request contract (`cap-request.v1`).
 *
 * A cap-request is the signed envelope a Memact node sends to ask another node
 * for context claims. It carries a cryptographic handshake (for authentication
 * and replay protection) and a query payload describing what is being asked for.
 *
 * See docs/cap-v1-rfc.md for the normative specification.
 */
import { validateAgainstSchema } from "./schema.mjs"

export const CAP_VERSION = "cap.v1"
export const CAP_REQUEST_SCHEMA_ID = "cap-request.v1"

// Signature algorithms a conforming node MUST support for the handshake.
export const CAP_SIGNATURE_ALGORITHMS = Object.freeze(["ed25519", "ecdsa-p256", "hmac-sha256"])

// Access scopes a request may ask for.
export const CAP_SCOPES = Object.freeze([
  "context.read",
  "context.read.sensitive",
  "claims.read",
  "claims.subscribe",
])

const HANDSHAKE_SCHEMA = Object.freeze({
  type: "object",
  required: ["algorithm", "public_key", "signature"],
  properties: {
    algorithm: { type: "string", enum: [...CAP_SIGNATURE_ALGORITHMS] },
    public_key: { type: "string", minLength: 16 },
    signature: { type: "string", minLength: 16 },
  },
})

const QUERY_SCHEMA = Object.freeze({
  type: "object",
  required: ["subject", "scopes"],
  properties: {
    subject: { type: "string", minLength: 1 },
    scopes: { type: "array", minItems: 1, items: { type: "string", enum: [...CAP_SCOPES] } },
    claim_classes: { type: "array", items: { type: "string", enum: ["intent", "habit", "preference", "identity"] } },
    categories: { type: "array", items: { type: "string" } },
    max_age_ms: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1 },
  },
})

// Cryptographic handshake headers carried alongside (or atop) the request body.
export const CAP_REQUEST_HEADERS = Object.freeze({
  type: "object",
  required: ["cap-version", "cap-node-id", "cap-timestamp", "cap-nonce", "cap-signature", "cap-signature-alg"],
  properties: {
    "cap-version": { type: "string", const: CAP_VERSION },
    "cap-node-id": { type: "string", minLength: 1 },
    "cap-timestamp": { type: "string", format: "iso-8601" },
    "cap-nonce": { type: "string", minLength: 8 },
    "cap-signature": { type: "string", minLength: 16 },
    "cap-signature-alg": { type: "string", enum: [...CAP_SIGNATURE_ALGORITHMS] },
    "cap-public-key": { type: "string" },
  },
})

export const CAP_REQUEST_V1_SCHEMA = Object.freeze({
  $id: CAP_REQUEST_SCHEMA_ID,
  version: CAP_VERSION,
  type: "object",
  required: ["schema", "request_id", "node_id", "issued_at", "nonce", "query", "handshake"],
  properties: {
    schema: { type: "string", const: CAP_REQUEST_SCHEMA_ID },
    request_id: { type: "string", minLength: 1 },
    node_id: { type: "string", minLength: 1 },
    issued_at: { type: "string", format: "iso-8601" },
    nonce: { type: "string", minLength: 8 },
    query: QUERY_SCHEMA,
    handshake: HANDSHAKE_SCHEMA,
  },
})

export function validateCapRequest(request) {
  const errors = validateAgainstSchema(request, CAP_REQUEST_V1_SCHEMA)
  return { valid: errors.length === 0, errors }
}
