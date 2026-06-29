# CAP v1 — Context Access Protocol RFC and Interface Standard

- **Status:** Draft
- **Protocol version:** `cap.v1`
- **Schemas:** [`cap-request.v1`](../src/contracts/cap-request.v1.mjs), [`cap-packet.v1`](../src/contracts/cap-packet.v1.mjs)
- **Reference implementation:** [`src/contracts/cap.mjs`](../src/contracts/cap.mjs)

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## 1. Motivation

The Context Access Protocol (CAP) standardizes how Memact nodes request and release context claims about a subject. CAP v1 fixes the payload schema, request parameters, cryptographic handshake, and response envelope so any two conforming nodes can interoperate without out-of-band agreement.

A CAP exchange is a single request/response round trip:

```
requesting node ──cap-request.v1──▶ responding node
requesting node ◀──cap-packet.v1── responding node
```

## 2. Cryptographic handshake

Every request **MUST** be authenticated. The requesting node signs the canonical request and transmits the handshake as headers (for transport-framed requests) or inside the request body's `handshake` object (for body-framed requests). Both carry equivalent information.

### 2.1 Handshake headers

| Header | Required | Description |
|--------|----------|-------------|
| `cap-version` | yes | MUST be the constant `cap.v1`. |
| `cap-node-id` | yes | Stable identifier of the requesting node. |
| `cap-timestamp` | yes | ISO-8601 issuance time; used for replay protection. |
| `cap-nonce` | yes | Unique per-request nonce (≥ 8 chars). |
| `cap-signature` | yes | Signature over the canonical request. |
| `cap-signature-alg` | yes | One of the supported algorithms (§2.2). |
| `cap-public-key` | no | Requester public key when not resolvable by `cap-node-id`. |

### 2.2 Signature algorithms

A conforming node **MUST** support: `ed25519`, `ecdsa-p256`, and `hmac-sha256`.

### 2.3 Replay protection

A responder **MUST** reject a request whose `cap-timestamp` is outside an acceptance window (default ±5 minutes) or whose `(cap-node-id, cap-nonce)` pair has already been seen within that window. The reference helper `isHandshakeFresh()` implements the timestamp check.

## 3. `cap-request.v1`

```jsonc
{
  "schema": "cap-request.v1",
  "request_id": "req_01H...",
  "node_id": "node-reader-app",
  "issued_at": "2026-06-29T12:00:00.000Z",
  "nonce": "9f2c7a1b3d4e5f60",
  "query": {
    "subject": "user-7",
    "scopes": ["context.read", "claims.read"],
    "claim_classes": ["preference", "identity"],
    "categories": ["music", "reading"],
    "max_age_ms": 2592000000,
    "limit": 50
  },
  "handshake": {
    "algorithm": "ed25519",
    "public_key": "ed25519:BASE64KEY...",
    "signature": "BASE64SIG..."
  }
}
```

### 3.1 Query payload

| Field | Required | Description |
|-------|----------|-------------|
| `subject` | yes | The subject (e.g. user) the claims are about. |
| `scopes` | yes | ≥ 1 of: `context.read`, `context.read.sensitive`, `claims.read`, `claims.subscribe`. |
| `claim_classes` | no | Filter by claim class: `intent`, `habit`, `preference`, `identity`. |
| `categories` | no | Filter by context category. |
| `max_age_ms` | no | Exclude claims older than this. |
| `limit` | no | Maximum claims to return (≥ 1). |

## 4. `cap-packet.v1`

The response envelope carries the access decision, the released claims, and the validity window.

```jsonc
{
  "schema": "cap-packet.v1",
  "packet_id": "pkt_01H...",
  "in_response_to": "req_01H...",
  "node_id": "node-context-store",
  "permissions": [
    { "scope": "context.read", "decision": "grant", "claim_classes": ["preference"] },
    { "scope": "context.read.sensitive", "decision": "deny", "reason": "subject_not_consented" }
  ],
  "claims": [ /* released claim objects */ ],
  "timestamps": {
    "issued_at": "2026-06-29T12:00:01.000Z",
    "expires_at": "2026-06-29T12:05:01.000Z",
    "generated_at": "2026-06-29T12:00:01.000Z"
  },
  "signature": {
    "algorithm": "ed25519",
    "public_key": "ed25519:BASE64KEY...",
    "signature": "BASE64SIG..."
  }
}
```

### 4.1 Permissions

Each entry pairs a requested `scope` with a `decision` of `grant` or `deny`. A responder **MUST** include a permission entry for every scope in the request. Denied scopes **SHOULD** carry a `reason`. The packet **MUST NOT** include claims for any scope that was denied.

### 4.2 Timestamps and validity

`timestamps.expires_at` **MUST** be strictly after `timestamps.issued_at`. A consumer **MUST** treat a packet as invalid once the current time reaches `expires_at` (`isCapPacketActive()` implements this window check).

### 4.3 Signature

The responder **MUST** sign the canonical packet so the requester can verify integrity and origin, using the same algorithm set as §2.2.

## 5. Conformance

An implementation is CAP v1 conformant if it:

1. Emits requests that pass `validateCapRequest()`.
2. Emits packets that pass `validateCapPacket()`.
3. Enforces the handshake freshness and replay rules of §2.3.
4. Honors the permissions / claims invariant of §4.1 and the validity window of §4.2.

The schema descriptors in `src/contracts/` are the machine-readable source of truth for this document; where prose and schema disagree, the schema governs.
