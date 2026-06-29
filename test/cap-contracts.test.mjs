import test from "node:test"
import assert from "node:assert/strict"

import {
  CAP_VERSION,
  CAP_REQUEST_SCHEMA_ID,
  CAP_PACKET_SCHEMA_ID,
  CAP_SIGNATURE_ALGORITHMS,
  validateCapRequest,
  validateCapPacket,
  isCapPacketActive,
  buildCapHandshakeHeaders,
  validateCapHandshakeHeaders,
  isHandshakeFresh,
} from "../src/contracts/cap.mjs"

const SIG = "0123456789abcdef0123456789abcdef"

function validRequest(overrides = {}) {
  return {
    schema: CAP_REQUEST_SCHEMA_ID,
    request_id: "req_1",
    node_id: "node-reader",
    issued_at: "2026-06-29T12:00:00.000Z",
    nonce: "9f2c7a1b3d4e5f60",
    query: { subject: "user-7", scopes: ["context.read"], claim_classes: ["preference"] },
    handshake: { algorithm: "ed25519", public_key: SIG, signature: SIG },
    ...overrides,
  }
}

function validPacket(overrides = {}) {
  return {
    schema: CAP_PACKET_SCHEMA_ID,
    packet_id: "pkt_1",
    in_response_to: "req_1",
    node_id: "node-store",
    permissions: [{ scope: "context.read", decision: "grant", claim_classes: ["preference"] }],
    claims: [],
    timestamps: {
      issued_at: "2026-06-29T12:00:01.000Z",
      expires_at: "2026-06-29T12:05:01.000Z",
      generated_at: "2026-06-29T12:00:01.000Z",
    },
    signature: { algorithm: "ed25519", public_key: SIG, signature: SIG },
    ...overrides,
  }
}

// --- version + identifiers ----------------------------------------------------

test("protocol exposes stable version and schema ids", () => {
  assert.equal(CAP_VERSION, "cap.v1")
  assert.equal(CAP_REQUEST_SCHEMA_ID, "cap-request.v1")
  assert.equal(CAP_PACKET_SCHEMA_ID, "cap-packet.v1")
  assert.ok(CAP_SIGNATURE_ALGORITHMS.includes("ed25519"))
})

// --- cap-request.v1 -----------------------------------------------------------

test("a well-formed cap-request validates", () => {
  const { valid, errors } = validateCapRequest(validRequest())
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test("cap-request rejects a wrong schema tag", () => {
  const { valid, errors } = validateCapRequest(validRequest({ schema: "cap-request.v2" }))
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("schema")))
})

test("cap-request requires a non-empty scope list", () => {
  const { valid, errors } = validateCapRequest(validRequest({ query: { subject: "user-7", scopes: [] } }))
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("scopes")))
})

test("cap-request rejects an unknown scope", () => {
  const req = validRequest({ query: { subject: "user-7", scopes: ["context.write"] } })
  const { valid } = validateCapRequest(req)
  assert.equal(valid, false)
})

test("cap-request rejects an unsupported signature algorithm", () => {
  const req = validRequest({ handshake: { algorithm: "rsa-pkcs1", public_key: SIG, signature: SIG } })
  const { valid, errors } = validateCapRequest(req)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("algorithm")))
})

test("cap-request flags a malformed timestamp", () => {
  const { valid, errors } = validateCapRequest(validRequest({ issued_at: "yesterday" }))
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("issued_at")))
})

test("cap-request reports missing required fields", () => {
  const { valid, errors } = validateCapRequest({ schema: CAP_REQUEST_SCHEMA_ID })
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("request_id")))
  assert.ok(errors.some((e) => e.includes("handshake")))
})

// --- cap-packet.v1 ------------------------------------------------------------

test("a well-formed cap-packet validates", () => {
  const { valid, errors } = validateCapPacket(validPacket())
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test("cap-packet rejects an unknown permission decision", () => {
  const pkt = validPacket({ permissions: [{ scope: "context.read", decision: "maybe" }] })
  const { valid, errors } = validateCapPacket(pkt)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("decision")))
})

test("cap-packet enforces expires_at after issued_at", () => {
  const pkt = validPacket({
    timestamps: { issued_at: "2026-06-29T12:05:00.000Z", expires_at: "2026-06-29T12:00:00.000Z" },
  })
  const { valid, errors } = validateCapPacket(pkt)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => e.includes("expires_at must be after issued_at")))
})

test("isCapPacketActive respects the validity window", () => {
  const pkt = validPacket()
  assert.equal(isCapPacketActive(pkt, Date.parse("2026-06-29T12:01:00.000Z")), true)
  assert.equal(isCapPacketActive(pkt, Date.parse("2026-06-29T13:00:00.000Z")), false)
  assert.equal(isCapPacketActive(pkt, Date.parse("2026-06-29T11:00:00.000Z")), false)
})

// --- handshake headers --------------------------------------------------------

test("buildCapHandshakeHeaders produces a conformant header set", () => {
  const headers = buildCapHandshakeHeaders({
    nodeId: "node-reader",
    timestamp: "2026-06-29T12:00:00.000Z",
    nonce: "9f2c7a1b3d4e5f60",
    signature: SIG,
    publicKey: SIG,
  })
  assert.equal(headers["cap-version"], "cap.v1")
  const { valid, errors } = validateCapHandshakeHeaders(headers)
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test("handshake freshness guards against stale/replayed timestamps", () => {
  const now = Date.parse("2026-06-29T12:00:00.000Z")
  assert.equal(isHandshakeFresh("2026-06-29T12:02:00.000Z", now), true)
  assert.equal(isHandshakeFresh("2026-06-29T11:50:00.000Z", now), false) // 10 min old
  assert.equal(isHandshakeFresh("not-a-time", now), false)
})
