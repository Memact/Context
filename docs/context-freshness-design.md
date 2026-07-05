# Context Freshness, Aging, & Decay (Design Proposal)

## Overview
Context is not a permanent truth. Real-world user preferences, habits, and situational intents are highly time-sensitive. A user who is "researching SUVs" in 2024 does not need their context profile to declare "prefers SUVs" in 2026. Without temporal awareness, a user's context profile decays into a cluttered list of historical artifacts.

This document proposes a system for Context Freshness and Automated Aging, integrating decay mathematics with our existing `MemoryStore` and `transitionClaimState` architectures, so Memact can fade out stale context while keeping long-term identities rock solid — without manual curation.

## Claim Classes & Decay Rates
Claims are categorized into "Classes," each with its own decay constant ($\lambda$). $\lambda$ is derived at runtime from a configurable half-life: $\lambda = \ln(2) / \text{halfLifeDays}$.

| Class | Example | Half-life (target) | $\lambda$ (derived) |
| :--- | :--- | :--- | :--- |
| **Intent** | "researching winter boots" | 7 days | 0.099 |
| **Habit** | "actively studying Spanish" | 45 days | 0.0154 |
| **Preference** | "prefers Android" | 270 days | 0.00257 |
| **Identity** | "vegetarian" | $\infty$ (opt-out) | 0 (hard-coded) |

*Note:* Identity claims get $\lambda = 0$ exactly. They skip the decay function entirely (`freshness_score` pinned at 1.0) to avoid silent underflow/precision bugs over years of runtime and to explicitly exempt them from aging.

## Architecture & Schema Additions
* `observed_at`: Timestamp of the initial raw signal.
* `approved_at`: Timestamp when the user explicitly confirmed the claim.
* `last_reinforced_at`: Timestamp of the most recent observation matching this claim.
* `freshness_score`: A normalized float (0.0 to 1.0). **This is a cache for UI listing/sorting, not a source of truth.** Read-paths that gate visibility must recompute live.
* `claim_class`: The category dictating the decay behavior.

*Baseline Anchor:* If `last_reinforced_at` is null, decay is computed from `approved_at` (not `observed_at`). On first reinforcement, `last_reinforced_at` is updated.

## The Mathematical Decay Model
$$F(t) = F_0 \cdot e^{-\lambda \Delta t}$$

Where:
* $F(t)$ is the current Freshness Score.
* $F_0$ is the initial baseline score (typically 1.0).
* $\lambda$ is the decay constant specific to the `claim_class`.
* $\Delta t = \max(0, \text{now} - \text{last\_reinforced\_at})$ (clamped to guard against clock skew).

## Reinforcement Mechanism
When a new observation matches an existing approved claim, `last_reinforced_at` updates to `now()` and $F(t)$ resets to 1.0. 

* **Contradiction vs. Aging:** Contradicting signals (e.g., ordering steak while tagged "vegetarian") are invalidation events, not aging. They route to contradiction handling, never silently reinforcing or decaying.
* **Class Promotion:** A rolling reinforcement count is tracked. If a claim meets the next class's cadence (e.g., an Intent reinforced weekly for 10 weeks), it auto-promotes up one tier. Demotions strictly follow the normal decay path.

## Lifecycle Integration & Automated Archival
To prevent visibility state and computed freshness from silently diverging without running heavy background jobs, we utilize a hybrid model with hysteresis (oscillation prevention):

* **Thresholds:** `ARCHIVE_THRESHOLD = 0.2` and `RESTORE_THRESHOLD = 0.4`.
* **Lazy Transition (Hot Path):** $F(t)$ is computed on every read. If below `ARCHIVE_THRESHOLD`, `transitionClaimState` to `ARCHIVED` triggers as a side effect, and the claim is served as absent.
* **Lightweight Sweep (Cold Path):** A low-frequency batch job catches unread SHARED claims, ensuring privacy isn't compromised just because a claim is never queried.

## Reversibility by Design
By keeping `ARCHIVED` separate from `DELETED`, aged-out context is never permanently destroyed. 

* **Visibility on Restore:** Restoring a claim (`rollbackClaimState()`) returns it to `APPROVED` but sets visibility to `PRIVATE`. Explicit user re-confirmation is required to return it to `SHARED`, preventing stale context from quietly re-exposing to third-party apps.

## Migration / Backfill
Existing `MemoryStore` claims require backfilling:
* `claim_class`: Default to `Preference` unless a heuristic classifier can confidently assign a category. Never default to `Identity` or `Intent`.
* `last_reinforced_at`: Backfill to `approved_at` (or `observed_at` if unapproved).
* `freshness_score`: Computed on first read post-migration, not statically backfilled.

## Open Questions for Reviewers
1. Should $\lambda$ / threshold values be global constants, or configurable per-app / per-user? (Recommend config from day one).
2. Who owns `claim_class` promotion decisions — automatic, or requiring separate maintainer approval?