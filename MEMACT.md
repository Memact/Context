# Memact — Context

Memact is open identity infrastructure.

Users own an identity address. Apps interact with identity providers through open protocols.

## What Context Does

Context is the **category schema registry** for the Memact identity protocol.

Context defines:
- **What categories exist** — fitness, shopping, music, travel, productivity, and more
- **What fields belong to each category** — the vocabulary apps use when contributing observations
- **What is sensitive** — which fields require extra care in permission enforcement
- **What a valid observation looks like** — field types, constraints, and examples

Context does NOT execute normalization. Context does NOT perform matching. Context does NOT store data.

Context is a passive registry of shape definitions.

## How Context Fits the Protocol

When an app contributes an observation via CCP, it must specify:
- A `category` from the Context registry (e.g., `fitness.v1`)
- A `field` within that category (e.g., `preferred_activity`)

This ensures that any two apps using `fitness.v1.preferred_activity` mean the same thing, enabling the identity provider to merge, rank, and compare contributions across apps.

## Category Registry

Current registered categories (all v1):

| Category | Description |
|---|---|
| `fitness.v1` | Physical activity, workouts, health metrics |
| `shopping.v1` | Purchase patterns, preferences, brand affinities |
| `music.v1` | Listening history, genre preferences, artist affinities |
| `travel.v1` | Trip history, destination preferences, travel style |
| `productivity.v1` | Work patterns, tool preferences, scheduling habits |
| `food.v1` | Dietary preferences, restrictions, cuisine affinities |
| `entertainment.v1` | Content consumption, genre preferences |
| `learning.v1` | Learning style, topics of interest, skill progression |
| `social.v1` | Interaction patterns, communication preferences |
| `finance.v1` | Spending patterns (sensitivity: high) |
| `health.v1` | Medical context (sensitivity: restricted) |
| `location.v1` | Geographic preferences (sensitivity: high) |
| `devices.v1` | Device and UI preferences |
| `language.v1` | Language preferences, reading level |

## Contributing

To propose a new category or add a field to an existing category, open an RFC issue in the `protocol` repository.

## License

Apache 2.0.
