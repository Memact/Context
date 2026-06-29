/**
 * CAP v1 — Context Access Protocol, interface standard entry point.
 *
 * Re-exports the request/response contracts and provides helpers for building
 * and validating the cryptographic handshake headers that authenticate every
 * CAP exchange. This module is the public surface other Memact nodes import.
 *
 * Normative specification: docs/cap-v1-rfc.md
 */
import { validateAgainstSchema, isValidIso8601 } from "./schema.mjs"
import {
  CAP_VERSION,
  CAP_REQUEST_SCHEMA_ID,
  CAP_SIGNATURE_ALGORITHMS,
  CAP_SCOPES,
  CAP_REQUEST_HEADERS,
  CAP_REQUEST_V1_SCHEMA,
  validateCapRequest,
} from "./cap-request.v1.mjs"
import {
  CAP_PACKET_SCHEMA_ID,
  CAP_PERMISSION_DECISIONS,
  CAP_PACKET_V1_SCHEMA,
  validateCapPacket,
  isCapPacketActive,
} from "./cap-packet.v1.mjs"

export {
  CAP_VERSION,
  CAP_REQUEST_SCHEMA_ID,
  CAP_PACKET_SCHEMA_ID,
  CAP_SIGNATURE_ALGORITHMS,
  CAP_SCOPES,
  CAP_PERMISSION_DECISIONS,
  CAP_REQUEST_HEADERS,
  CAP_REQUEST_V1_SCHEMA,
  CAP_PACKET_V1_SCHEMA,
  validateCapRequest,
  validateCapPacket,
  isCapPacketActive,
}

/**
 * Assemble the canonical CAP handshake header set for a request.
 * The caller supplies the already-computed signature over the canonical
 * request; this helper only standardizes header naming and presence.
 */
export function buildCapHandshakeHeaders({ nodeId, timestamp, nonce, signature, algorithm = "ed25519", publicKey } = {}) {
  const headers = {
    "cap-version": CAP_VERSION,
    "cap-node-id": nodeId,
    "cap-timestamp": timestamp,
    "cap-nonce": nonce,
    "cap-signature": signature,
    "cap-signature-alg": algorithm,
  }
  if (publicKey) headers["cap-public-key"] = publicKey
  return headers
}

export function validateCapHandshakeHeaders(headers) {
  const errors = validateAgainstSchema(headers, CAP_REQUEST_HEADERS)
  return { valid: errors.length === 0, errors }
}

/**
 * Returns true if a request's handshake timestamp is fresh enough to accept,
 * guarding against replayed requests. `windowMs` defaults to 5 minutes.
 */
export function isHandshakeFresh(timestamp, nowMs = Date.now(), windowMs = 5 * 60 * 1000) {
  if (!isValidIso8601(timestamp)) return false
  const issued = Date.parse(timestamp)
  return Math.abs(nowMs - issued) <= windowMs
}
