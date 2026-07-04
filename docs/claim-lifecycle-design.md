# Claim Lifecycle & Reversibility (Design Proposal)

## Overview
This document outlines a robust state machine for Memact Context claims. To respect the fluidity of human identity, every claim's state transition must be entirely reversible.

## Architecture & Lifecycle States

The core object shape now tracks state transitions explicitly using `transitionClaimState()`.

### The Core States
- `pending`: The initial state when a raw signal proposes a context. Visibility is restricted to the Memact UI (`private`).
- `approved`: User explicitly approved the claim. Visibility opens to `shared`.
- `hidden`: A user-triggered temporary revocation. The claim is retained locally but visibility drops to `private` immediately.
- `rejected`: The user explicitly denied the suggestion.
- `deleted` (Soft-delete): Purged from user-view, but a hashed signature is retained locally to prevent the same raw observation from triggering the same annoying suggestion again.

### Action Buffering (The 5-Second Rule)
To prevent accidental misclicks, the SDK layer should implement a standard `5000ms` promise delay before calling `transitionClaimState()`. During this window, a UI toast can allow the user to "Undo" the action, flushing the buffer without mutating the actual local database.

### Revocation Sync
When a claim transitions to `hidden`, `rejected`, or `deleted`, the `revoked_at` timestamp is populated. The API gateway must broadcast a webhook or WebSockets payload to all authorized third-party applications explicitly instructing them to invalidate and drop the cached context.

## Privacy by Design
By segregating `status` and `visibility`, users can curate their active context dynamically (e.g., hiding political context off-season) without permanently destroying their own data history.