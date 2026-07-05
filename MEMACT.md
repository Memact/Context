# Memact Context

Context defines the categories and schema shapes for user data.

## What Context Does

Context is a schema registry. It defines:
- The registered categories (such as fitness, shopping, travel, and productivity).
- The fields allowed inside each category (the words apps use when suggesting observations).
- Which fields are sensitive and require extra protection.
- What valid values look like (types, sizes, and formats).

Context is passive. It does not validate consent, run checks, match profiles, or store data. It only holds the shape definitions.

## How Context Fits the Protocol

When an app suggests new information using CCP, it must specify:
- A category from the registry (e.g. `fitness.v1`).
- A field within that category (e.g. `preferred_activity`).

This ensures that any two apps using `fitness.v1.preferred_activity` mean the same thing, letting your provider rank and compare suggestions.

## Category Registry

The registered categories include:

| Category | Description |
|---|---|
| `fitness.v1` | Physical activity, workouts, and metrics |
| `shopping.v1` | Purchase patterns, sizes, and brand preferences |
| `music.v1` | Listening history, genres, and artist affinities |
| `travel.v1` | Trip history, destinations, and travel styles |
| `productivity.v1` | Work patterns, tools, and scheduling habits |
| `food.v1` | Dietary preferences, restrictions, and cuisines |
| `entertainment.v1` | Content consumption and genre preferences |
| `learning.v1` | Learning styles, topics of interest, and skills |
| `social.v1` | Interaction patterns and messaging preferences |
| `finance.v1` | Spending patterns (high sensitivity) |
| `health.v1` | Medical context (restricted sensitivity) |
| `location.v1` | Geographic preferences (high sensitivity) |
| `devices.v1` | Device and user interface preferences |
| `language.v1` | Language preferences and reading levels |

## Suggestions

To propose a new category or add a field, open an RFC issue in the `Protocol` repository.

## License

Apache 2.0. The registry schemas are open and free.
