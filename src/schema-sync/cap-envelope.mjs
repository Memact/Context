/**
 * CAP-like envelope helpers for schema-sync messages.
 * This is a lightweight local contract; transport/auth is expected to be handled
 * by the caller.
 */

export function buildCapRequest({ intent, query, request_id }) {
  return {
    schema_version: "cap-request.v1",
    request_id: request_id || `req_${cryptoRandomId()}`,
    intent,
    query: query || {}
  };
}

export function buildCapPacket({ response_to, status = "success", granted_at, expires_at, permissions, payload }) {
  return {
    schema_version: "cap-packet.v1",
    response_to,
    status,
    granted_at: granted_at || new Date().toISOString(),
    expires_at: expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    permissions: permissions || {
      retention: "ephemeral",
      redistribution: false
    },
    payload: payload || []
  };
}

function cryptoRandomId() {
  // Avoid importing crypto here to keep browser bundling simple; used only for IDs.
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

