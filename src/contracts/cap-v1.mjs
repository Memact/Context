/**
 * Context Access Protocol (CAP) v1 - Core Schemas and Validators
 */

export const CAP_VERSIONS = Object.freeze({
  REQUEST: "cap-request.v1",
  PACKET: "cap-packet.v1"
});

export const CAP_REQUIRED_HEADERS = Object.freeze([
  "x-cap-node-id",
  "x-cap-timestamp",
  "x-cap-signature"
]);

/**
 * Validates the structure of an incoming CAP v1 Request.
 */
export function validateCapRequest(payload = {}) {
  const errors = [];

  if (payload.schema_version !== CAP_VERSIONS.REQUEST) {
    errors.push("Invalid or missing schema_version. Expected 'cap-request.v1'.");
  }
  if (!payload.request_id || typeof payload.request_id !== "string") {
    errors.push("Missing or invalid 'request_id'.");
  }
  if (!payload.intent || payload.intent.length < 10) {
    errors.push("A clear 'intent' (min 10 chars) is required for audit logs.");
  }
  if (!payload.query || !Array.isArray(payload.query.categories)) {
    errors.push("Query must include an array of requested 'categories'.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Constructs a secure CAP v1 Response Envelope (Packet).
 */
export function buildCapPacket(requestId, matchedPayload = [], options = {}) {
  const now = new Date();
  const expires = new Date(now.getTime() + (options.ttlMs || 24 * 60 * 60 * 1000)); // Default 24h TTL

  return {
    schema_version: CAP_VERSIONS.PACKET,
    response_to: requestId,
    status: matchedPayload.length > 0 ? "success" : "no_match",
    granted_at: now.toISOString(),
    expires_at: expires.toISOString(),
    permissions: {
      retention: options.retention || "ephemeral",
      redistribution: options.redistribution || false
    },
    payload: matchedPayload
  };
}