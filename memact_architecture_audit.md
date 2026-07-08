# Memact Architecture Audit: Vision vs Code Stress Test

## Part 1 — Vision Understanding

**Summary of the Canonical Vision:**
Memact is designed as an open, provider-independent identity infrastructure where users own their identity address (e.g., `alice@memact.com`). The core philosophy is that applications are never the source of truth; instead, they *request* context, *contribute* observations, and *request* permission. Users decide what data is incorporated into their identity. This identity is dynamic and evolves over time based on declared facts, verified information, observations, evidence, confidence, and freshness.

The system operates via minimal protocols (CAP, CCP, CRP) which leave the heavy lifting of intelligence (storage, evidence ranking, temporal decay, permissions, approval flow) to the identity providers. Memact provides one such provider implementation. The open-source organization and all its repositories should naturally guide contributors to build and reinforce this exact provider-independent, user-controlled architecture.

---

## Part 2 — Repository Audit

### 1. Protocol
* **Expected responsibility:** Define the provider-independent specifications and RFC drafts for CAP, CCP, and CRP.
* **Current implementation:** Contains specifications, schema definitions for messages, and conformance checklists.
* **Alignment:** Strong. It correctly separates the interface from the implementation.
* **Missing capabilities:** Formal definition of provider discovery (WebFinger/Capability docs) and the temporal decay/confidence ranking math interfaces.
* **Architectural drift:** None observed.
* **Future work:** Finalize provider discovery and capability negotiation RFCs.

### 2. Access
* **Expected responsibility:** Gateway/server acting as a reference identity provider. Handles app registration, consent, and routes CAP/CCP protocol requests.
* **Current implementation:** Node.js server exposing basic `/v1/cap/request` and `/v1/contributions/propose` endpoints.
* **Alignment:** Moderate. It acts as a gateway but seems heavily tied to a centralized mindset based on open issues (e.g., "API credits", "Local Node Diagnostics").
* **Missing capabilities:** OAuth 2.0 / OIDC provider endpoints, WebFinger endpoint (`/.well-known/webfinger`), and dynamic capability document hosting. Native integration of the approval flow (routing to Notebook).
* **Architectural drift:** Risk of drifting into a traditional centralized API broker rather than a decentralized identity provider node, especially given "API credits" endpoints.
* **Future work:** Implement strictly standard WebFinger and OAuth/OIDC consent flows.

### 3. Context
* **Expected responsibility:** Schema registry defining categories, allowed fields, and sensitivity.
* **Current implementation:** Contains definitions and schemas for domains like `fitness.v1`, `shopping.v1`.
* **Alignment:** Strong. It successfully acts as a passive registry.
* **Missing capabilities:** Machine-readable compiler to generate Zod/TypeScript bindings for other repos. Formal sensitivity inheritance logic.
* **Architectural drift:** None observed.
* **Future work:** Automated schema scaffolding and dynamic overriding rules.

### 4. Memory
* **Expected responsibility:** Storage layer that keeps approved context, tracks evidence chains, decay, and review history.
* **Current implementation:** A basic JSON file store (`memory.json`) with AES-256-GCM encryption and a basic compaction daemon.
* **Alignment:** Poor/Partial. The vision requires robust tracking of evidence, confidence, and freshness decay. A flat JSON file with a custom daemon fundamentally fails to provide the relational structure needed for complex evidence graphs and temporal decay math.
* **Missing capabilities:** Relational/Graph engine for evidence chains. Temporal decay functions. Confidence ranking engine.
* **Architectural drift:** High. Relying on custom JSON file manipulation (like the recently merged compaction daemon) is an anti-pattern for a database that must rank complex, competing context claims.
* **Future work:** Migrate to SQLite or a Graph DB. Implement decay algorithms.

### 5. Contracts
* **Expected responsibility:** Validation shapes/functions used across protocols (no network/DB).
* **Current implementation:** Standalone schema validator functions.
* **Alignment:** Strong.
* **Missing capabilities:** Cross-category schema mapping validation, sensitivity inheritance rules.
* **Architectural drift:** None observed.
* **Future work:** Implement complex validation rules bridging multiple categories.

### 6. SDK
* **Expected responsibility:** Client library for developers to connect apps to user addresses via CAP/CCP.
* **Current implementation:** Basic JS/Node.js client. Currently lacks the ability to resolve identity addresses.
* **Alignment:** Poor. Developers cannot currently use it to connect to an arbitrary identity address (`alice@memact.com`) because discovery is missing.
* **Missing capabilities:** WebFinger resolution, capability document fetching, OAuth 2.0 client credentials flow, offline token verification.
* **Architectural drift:** Moderate. The SDK seems to be focusing heavily on React hooks and UI integrations before the core networking and discovery primitives are built.
* **Future work:** Implement `MemactClient.connect(identityAddress)` with WebFinger.

### 7. Notebook
* **Expected responsibility:** User interface for viewing, approving, editing context, and managing app permissions.
* **Current implementation:** Basic UI scaffolding.
* **Alignment:** Moderate.
* **Missing capabilities:** Complete OAuth approval flow UI, visualizers for evidence/confidence ranking, timeline replay.
* **Architectural drift:** None observed, but heavily underdeveloped.
* **Future work:** Interactive onboarding, data sharing scope visualizer, and approval queues.

---

## Part 3 — Feature Matrix

| Vision Component | Exists | Partial | Missing | Repository | Evidence |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Identity address** | | | X | Protocol / SDK | Open Issue SDK#49 explicitly states it is missing |
| **Provider discovery** | | | X | Access / SDK | SDK lacks `connect()`; Access lacks `.well-known` endpoints |
| **Provider abstraction** | | X | | Protocol | Specs exist, but SDK currently hardcodes or lacks dynamic resolution |
| **CAP** | | X | | Protocol / Access | Specs exist; Access has basic `/v1/cap/request` |
| **CCP** | | X | | Protocol / Access | Specs exist; Access has basic `/v1/contributions/propose` |
| **Permission flow** | | X | | Access / Notebook | Notebook lacks robust OAuth UI; Access relies on static keys |
| **Approval flow** | | X | | Notebook / Memory | Notebook has open issues for UI; Memory stores states but lacks dynamic queues |
| **Evidence model** | | X | | Memory | Memory README mentions evidence chains, but JSON store is too basic |
| **Confidence** | | | X | Memory | Open Issue Memory#40 (Explainable Context Rankers) |
| **Freshness** | | | X | Memory | No evidence of temporal decay implementation |
| **Temporal decay** | | | X | Memory | No evidence of decay implementation |
| **Ranking** | | | X | Memory | Open Issue Memory#40 |
| **Schemas** | X | | | Context / Contracts | Repositories exist and function as registries/validators |

---

## Part 4 — Gap Analysis

### Gap 1: Identity Address Resolution & Provider Discovery
* **Why it matters:** The core vision is provider-independence. If an app cannot dynamically resolve `alice@memact.com` to a provider's endpoint, the system is centralized and the vision fails.
* **What repository owns it:** `Protocol` (Spec), `Access` (Host), `SDK` (Client).
* **Dependencies:** None. This is Foundation.
* **Difficulty:** Hard
* **Priority:** Critical / Blocker

### Gap 2: Temporal Decay and Confidence Ranking Engine
* **Why it matters:** Identity evolves over time. A static fact database is just a CRM. Memact requires freshness and confidence decay to dynamically rank conflicting suggestions (e.g., old diet vs new diet).
* **What repository owns it:** `Memory`.
* **Dependencies:** Requires migrating Memory off simple JSON files to a relational/SQLite base.
* **Difficulty:** Hard
* **Priority:** High

### Gap 3: Standardized Permission & Approval Flow (OAuth 2.0 / OIDC)
* **Why it matters:** Users must decide what becomes part of their identity. Apps must explicitly request scopes. Without standard OAuth flows, the provider cannot securely delegate consent to the Notebook UI.
* **What repository owns it:** `Access` (Server) and `Notebook` (UI).
* **Dependencies:** Provider Discovery.
* **Difficulty:** Medium
* **Priority:** High

---

## Part 5 — Issue Generation

### Issue 1
**Title:** Implement WebFinger Identity Address Resolution and Discovery
**Background:** The core vision dictates that Memact is an open identity infrastructure. Apps must connect using an identity address (e.g., `alice@memact.com`), which requires dynamically discovering the identity provider.
**Problem:** The SDK currently cannot resolve identity addresses, preventing provider-independent integration.
**Acceptance Criteria:**
- SDK implements `MemactClient.connect(identityAddress)`
- SDK performs WebFinger lookup (`/.well-known/webfinger?resource=acct:...`)
- SDK fetches capability document.
**Repository:** `SDK`
**Labels:** `protocol-primitive`, `identity-address`, `enhancement`
**Difficulty:** Medium
**Dependencies:** None
**Estimated size:** 1 week
**Good First Issue:** No
**Protocol primitive:** Provider Discovery
**Milestone:** Foundation - Identity Address

### Issue 2
**Title:** Expose WebFinger and Capability Endpoints
**Background:** To support decentralized provider discovery, the reference provider must host standard discovery endpoints.
**Problem:** `Access` currently lacks `/.well-known/webfinger` and `/.well-known/memact-configuration`.
**Acceptance Criteria:**
- `GET /.well-known/webfinger` returns correct JRD link to the provider.
- `GET /.well-known/memact-configuration` returns provider capabilities and CAP/CCP endpoints.
**Repository:** `Access`
**Labels:** `protocol-primitive`, `discovery`, `enhancement`
**Difficulty:** Easy
**Dependencies:** None
**Estimated size:** 2 days
**Good First Issue:** Yes
**Protocol primitive:** Provider Discovery
**Milestone:** Foundation - Provider Discovery

### Issue 3
**Title:** Migrate Memory Storage to Relational SQL Engine (SQLite)
**Background:** Memory is responsible for evidence, confidence, and freshness decay.
**Problem:** The current encrypted JSON file implementation cannot efficiently query, rank, or calculate temporal decay on complex, conflicting evidence graphs.
**Acceptance Criteria:**
- Replace `memory.json` backend with SQLite.
- Maintain existing AES-256-GCM encryption at the DB level (e.g., SQLCipher) or application level.
- Migrate existing memory loading/saving tests to SQL models.
**Repository:** `Memory`
**Labels:** `architecture`, `storage`, `refactor`
**Difficulty:** Hard
**Dependencies:** None
**Estimated size:** 2 weeks
**Good First Issue:** No
**Protocol primitive:** Storage / Evidence
**Milestone:** Foundation - Memory

### Issue 4
**Title:** Implement Temporal Decay and Confidence Scoring Math
**Background:** Identity evolves. Older observations should naturally decay in confidence compared to fresh evidence.
**Problem:** Memory currently lacks the mathematical engines to decay facts or rank conflicting context based on freshness and app authority.
**Acceptance Criteria:**
- Define a decay function interface.
- Implement scoring that dynamically adjusts based on timestamp and evidence weight.
- Integrate into context retrieval queries.
**Repository:** `Memory`
**Labels:** `core-intelligence`, `math`, `enhancement`
**Difficulty:** Hard
**Dependencies:** Issue 3 (Migrate Memory Storage to SQL)
**Estimated size:** 2 weeks
**Good First Issue:** No
**Protocol primitive:** Freshness / Temporal Decay
**Milestone:** Foundation - Memory

### Issue 5
**Title:** Standardize OAuth 2.0 / OIDC Permission Flow
**Background:** Users must explicitly grant permissions to applications requesting context.
**Problem:** The current access gateway relies on static API keys rather than dynamic, user-consented OAuth flows routing through the Notebook interface.
**Acceptance Criteria:**
- `Access` implements standard Authorization Code Flow.
- Notebook handles the consent screen UI.
**Repository:** `Access` (and `Notebook`)
**Labels:** `security`, `protocol-primitive`, `enhancement`
**Difficulty:** Hard
**Dependencies:** Issue 2 (Capability Endpoints)
**Estimated size:** 3 weeks
**Good First Issue:** No
**Protocol primitive:** Permission Flow
**Milestone:** Foundation - Protocols

---

## Part 6 — Prioritization

**Milestone 1: Foundation - Identity Address & Discovery**
- Issue 1 (SDK): Implement WebFinger Identity Address Resolution
- Issue 2 (Access): Expose WebFinger and Capability Endpoints

**Milestone 2: Foundation - Memory & Intelligence**
- Issue 3 (Memory): Migrate Memory Storage to Relational SQL Engine
- Issue 4 (Memory): Implement Temporal Decay and Confidence Scoring Math

**Milestone 3: Foundation - Protocols & Consent**
- Issue 5 (Access/Notebook): Standardize OAuth 2.0 Permission Flow

---

## Part 7 — Dependency Graph

```text
[Issue 2: Access WebFinger] <------- (blocks) ------- [Issue 5: Access OAuth Flow]
                                                              ^
[Issue 1: SDK WebFinger Client] ------------------------------| (blocks e2e flow)

[Issue 3: Memory SQL Migration] <--- (blocks) ------- [Issue 4: Temporal Decay Math]
```
*Critical Path:* The most critical path is establishing Provider Discovery (Issues 1 & 2), as without this, the architecture is fundamentally centralized and fails the provider-independent vision. Following closely is the Memory SQL Migration (Issue 3), as evidence and decay cannot scale on flat JSON.

---

## Part 8 — Contributor Experience

**Evaluation:** Contributors currently see a massive list of issues in repositories like `SDK` and `Access` that focus heavily on adapters, UI hooks, and edge-cases (e.g. `[SSoC26] [Hard] Code Editor Preference Context Adapter`). They are being directed to build the roof before the foundation is poured.

**Recommendations:**
- **Issue Organization:** Pause or icebox adapter/UI issues until core primitives (Discovery, Auth, SQLite) are merged.
- **Milestones:** strictly enforce GitHub Milestones mapping to the architectural primitives (e.g., "M1: Identity Resolution").
- **Documentation:** Create an `ARCHITECTURE.md` in the root `.github` repo explicitly stating: "Do not build adapters until WebFinger and OAuth are complete."

---

## Part 9 — Future Architecture

**Drift Identification: `SDK`**
- **Explanation:** The `SDK` repo is drifting away from its core responsibility (network protocol client) towards front-end state management (merging React Hooks, UI adapters). This distracts from the missing core capability: network address resolution.
- **Correction:** Extract React specific logic into a separate package (e.g., `@memact/react`) or strictly enforce that the `SDK` core only handles CAP/CCP wire protocols, WebFinger, and HTTP fetching.

**Drift Identification: `Memory`**
- **Explanation:** `Memory` is drifting towards "reinventing the database" (e.g., custom JSON compaction daemons).
- **Correction:** Immediately adopt an off-the-shelf database engine (SQLite) so development effort can be spent on the *intelligence* (decay, confidence ranking) rather than file I/O and garbage collection.

---

## Part 10 — Final Scorecard

- **Vision Alignment:** 6/10 *(Conceptually aligned, practically missing the core decentralized link).*
- **Architecture:** 5/10 *(Storage layer is fundamentally flawed for the vision; gateway lacks standard Auth).*
- **Repository Responsibilities:** 8/10 *(Cleanly separated, but SDK is absorbing UI concerns).*
- **Protocol Readiness:** 4/10 *(Specs exist, implementation is entirely missing dynamic discovery).*
- **Developer Experience:** 5/10 *(SDK lacks the most basic connect flow).*
- **Documentation:** 7/10 *(Good conceptual docs, lacking strict contributor boundaries).*
- **Contributor Experience:** 4/10 *(Contributors are working on peripheral features instead of core blockers).*
- **Open Source Health:** 9/10 *(Very active, SSoC program is driving massive engagement).*
- **Implementation Completeness:** 3/10 *(Barebones scaffolding).*
- **Overall:** 5.6/10

**Conclusion:** Memact has a brilliant, clearly defined vision. However, current contributor velocity is misdirected at peripheral adapters and custom file I/O daemons. By redirecting the community to build WebFinger discovery, standard OAuth, and SQL-backed evidence tracking, the implementation can successfully realize the intended architecture.
