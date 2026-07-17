# Context Access Protocol (CAP) v1 Specification

## 1. Abstract
The Context Access Protocol (CAP) v1 standardizes how distributed Memact nodes request, authenticate, and exchange user context data. It guarantees privacy-by-design through mandatory cryptographic handshakes, strict schema validation, and time-bound permission envelopes.

## 2. Cryptographic Handshake (Headers)
All CAP v1 requests MUST include the following HTTP headers to ensure payload integrity and node authenticity.

* `X-CAP-Node-ID`: The registered UUID of the requesting Memact node or third-party application.
* `X-CAP-Timestamp`: ISO 8601 timestamp of the request. Requests older than 300 seconds (5 minutes) MUST be rejected to prevent replay attacks.
* `X-CAP-Signature`: An Ed25519 cryptographic signature of the request payload and timestamp, signed by the requesting node's private key.

## 3. Request Schema: `cap-request.v1`
The requesting node must specify exactly what context it needs, why it needs it, and the query parameters.

{
  "schema_version": "cap-request.v1",
  "request_id": "req_8f7b3a2c",
  "intent": "Recommend personalized workout routines based on recent habit data.",
  "query": {
    "categories": ["fitness", "health"],
    "min_confidence": 0.6,
    "claim_classes": ["habit", "preference"],
    "max_age_days": 30
  }
}

## 4. Response Envelope: `cap-packet.v1`
The responding Memact core will wrap the matched context schemas in a standard `cap-packet.v1` envelope. This envelope explicitly declares the permissions and the TTL (Time-To-Live) of the shared data.

{
  "schema_version": "cap-packet.v1",
  "response_to": "req_8f7b3a2c",
  "status": "success",
  "granted_at": "2026-07-02T19:52:06Z",
  "expires_at": "2026-07-03T19:52:06Z",
  "permissions": {
    "retention": "ephemeral",
    "redistribution": false
  },
  "payload": [
    {
      "packet_id": "schema_fitness_habit_1",
      "category": "fitness",
      "data": { "preferred_workout_type": "yoga" }
    }
  ]
}

## 5. Security & Privacy Guardrails
1. **Zero-Trust Default:** If the `X-CAP-Signature` fails validation, the request must instantly abort with a `401 Unauthorized`.
2. **Data Minimization:** Only context claims that meet the `min_confidence` and `max_age_days` requested in the `cap-request.v1` schema will be returned.