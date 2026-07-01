# Context Relevance Ranking Beyond Categories (Design Proposal)

## Overview
This document outlines a lightweight approach to move Memact away from strict boolean categorical context matching towards a multi-dimensional relevance system.

## The Problem
Context is currently boxed into strict categories (e.g., `Fitness`). If a user "Runs 4 times a week," it shouldn't just be locked to a fitness app. A nutrition app, a shoe retailer, or a music app (workout playlists) should also be able to query and find this context based on a relevance score, not just a hard category check.

## Proposed Architecture (Multi-Tag Vector Mapping)

Instead of forcing a heavy client-side embedding model (which increases bundle size and hurts performance), we propose extending the `MemoryRecord` schema to include `relevance_vectors`. 

### How it works
Schemas can define baseline vectors. When `LocalContextMatcher` evaluates memories, it checks for requested cross-domain categories and applies the vector weight directly to the score.

```json
{
  "category": "fitness",
  "field_path": "fitness.activity_level",
  "value": "Runs 4 times a week",
  "relevance_vectors": {
    "nutrition": 0.8,
    "shopping": 0.6,
    "music": 0.4
  }
}
Advantages of this approach
Zero added dependency weight: Relies on mathematical adjustments inside the existing scoreMemory() function rather than heavy tensor operations.

Privacy by design: Vector weights can be explicitly defined and capped in schemas (e.g., categories/learning.mjs) ensuring sensitive data doesn't leak inappropriately via semantic overlap.

Graceful Fallback: If an app asks for a category without a hard-coded vector, the engine falls back to a capped lexical semantic overlap check.

Future ML Implementation
If dynamic ML embeddings become necessary, the SemanticContextMatcher could be implemented using a lightweight WebAssembly (WASM) implementation of SentenceTransformers to generate these vectors at runtime on the client device.