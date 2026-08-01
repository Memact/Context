# Distributed Sync Architecture for Schema Compilers & Tooling (Design)

This document defines an architecture for **distributed syncing** of **Schema Compilers & Tooling** artifacts across multiple Memact nodes.

It is designed to:
- keep schema/tooling propagation **zero-trust**
- ensure **deterministic** and **verifiable** compilation outputs
- support **hybrid distribution**: trusted builders + P2P fallback
- align conceptually with the repo’s **CAP v1** (cryptographic handshake + signed/enveloped responses + TTL + permissions)

---

## 1. Goals
1. **Safety**: nodes must not accept artifacts that fail verification (hash mismatch, incompatible contract versions, or invalid manifests).
2. **Consistency**: all nodes converge to the same compiled output given the same schema source + compiler toolchain version.
3. **Privacy-by-design**: permissions and redistribution rules must be enforced at the protocol level.
4. **Resilience**: tolerate partial updates, partitions, and concurrent node upgrades.
5. **Operational practicality**: provide clear lifecycle: discovery → manifest acquisition → artifact acquisition → verification → activation.

---

## 2. Non-Goals
- Not a full blockchain / consensus design.
- Not a full PKI implementation; signatures are optional but recommended.
- Not a user-context data replication layer (this document focuses on schema/tooling artifacts).

---

## 3. Artifact Types

### 3.1 Schema Source Package (immutable)
A versioned bundle containing the declarative schema definition(s) and any compilation configuration.

Example identifiers:
- `schema-src:<category>:<schema_version>`
- or `schema-src:<category>:<schema_source_hash>`

### 3.2 Manifest
A small signed/hashed document describing what to compile and the expected output hashes.

Fields (conceptual):
- `manifest_version`
- `category`
- `schema_source_hash`
- `compiler_toolchain_version`
- `runtime_api_contract_version`
- `artifact_hashes`: validator/normalizer/policy/templates
- `build_metadata` (optional)

### 3.3 Compiled Artifacts (content-addressed)
Deterministically produced outputs that implement:
- `validator` for input validation
- `normalizer` for canonicalization
- `permission-policy` extracted from schema definitions
- `wiki-templates` / any code generation tooling outputs

Each artifact is stored and referenced by **content hash**.

---

## 4. Hybrid Distribution Topology (Trusted Builders + P2P Fallback)

### 4.1 Trusted Builders
A small set of builder nodes publish verified manifests and artifacts.
- Builders are treated as *high-trust sources*.
- Nodes prefer builders for new manifests.

### 4.2 P2P Fallback
If builders are unavailable or slow:
- nodes can query peers for manifests/artifacts.
- peers are still untrusted unless verification succeeds.

### 4.3 Trust Rules
Trust is never “implicit”. Trust only helps with **routing and prioritization**.
All peers—trusted builders or not—must pass:
- manifest hash verification
- artifact content hash verification
- contract compatibility checks
- optional deterministic recompile checks

---

## 5. Protocol Model (CAP-aligned)

Use a CAP-like request/response pattern:

### 5.1 Request Envelope
All sync requests MUST:
- include cryptographic headers (CAP-style)
- be signed and time-bound

Request intent examples:
- `intent: "sync_schema_compiler_artifacts"`

### 5.2 Response Envelope
All responses MUST:
- be wrapped in a CAP-like `cap-packet.v1` envelope
- specify:
  - `expires_at`
  - `permissions.retention` (e.g., ephemeral vs durable cache)
  - `permissions.redistribution` (e.g., whether forwarding is allowed)

The `payload` contains manifests and/or artifacts.

---

## 6. Verification Pipeline (mandatory)
For every manifest/artifact a node receives:

1. **Manifest integrity**
   - verify manifest hash matches what was requested/advertised
2. **Artifact integrity**
   - verify artifact content hash matches manifest references
3. **Contract compatibility**
   - verify `runtime_api_contract_version` and `compiler_contract_version` are compatible
4. **Optional deterministic recompile** (recommended for critical updates)
   - if node has the schema source + toolchain, recompile and compare output hashes

If any step fails:
- reject the artifact
- do not activate
- optionally quarantine/penalize the peer for non-compliance (P2P scoring)

---

## 7. Sync Lifecycle

### 7.1 Discovery
Maintain a local index cache:
- per category: latest stable manifest hash, and/or a small window of known versions

Update index:
- request manifests from trusted builders first
- use P2P fallback if needed

### 7.2 Plan Dependencies
Compute a dependency closure:
- need schema source? (if recompile is desired)
- need manifest? 
- need specific artifact hashes?

### 7.3 Acquire Manifests First
- fetch manifest(s)
- verify manifest before requesting referenced artifacts

### 7.4 Acquire Artifacts
- fetch only artifacts required by manifest

### 7.5 Activate Atomically
- activate the toolchain runtime only when all artifacts verify
- keep previous version until the new version proves compatible

### 7.6 Garbage Collect
- apply `retention` permissions from response envelopes
- expire caches after TTL windows

---

## 8. Dependency Graph & Compilation Boundaries

Recommended boundaries:
- category-level schema compilation is modular
- compiled outputs are pure and do not depend on user context

This enables:
- partial updates
- faster verification
- fewer invalidations across the graph

---

## 9. Security & Privacy Controls
- Sync of schema/tooling artifacts must be treated as **policy-relevant**, not user-data replication.
- Protocol responses must include:
  - time-bound access (TTL)
  - retention/distribution permissions
- Redistribution rules must be enforced via `permissions.redistribution`.

---

## 10. Operational Behaviors

### 10.1 Boot
- load local indexes
- prefetch “latest stable” manifests for configured categories

### 10.2 Background Reconciliation
- periodically check for manifest hash updates
- reconcile and activate safely

### 10.3 Observability
Log:
- manifest transitions (hash A → hash B)
- verification failures (reason codes)
- activation success/failure
- peer non-compliance events (P2P scoring)

---

## 11. Proposed CLI/Automation Hooks (next implementation step)
- `memact-context schema index update`
- `memact-context schema manifest fetch --category <cat> --manifest <hash>`
- `memact-context schema artifacts fetch --manifest <hash>`
- `memact-context schema verify --manifest <hash>`
- `memact-context schema activate --manifest <hash>`

---

## Appendix A: Example Message Shapes (Conceptual)

### A1 Request
- Intent: sync schema compiler artifacts
- Query: required manifest hashes and categories

### A2 Response
- CAP envelope: `cap-packet.v1`
- Payload: list of `{ packet_id, category, data }` where data includes:
  - manifest JSON or
  - artifact bundle with content hash

---

## Summary
This design enables distributed syncing of schema compiler tooling artifacts using:
- manifest-first acquisition
- content-addressed verification
- CAP-aligned zero-trust, TTL, and permission envelopes
- hybrid distribution (trusted builders + P2P fallback)
- atomic activation with deterministic verification options

