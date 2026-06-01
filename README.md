# Memact Schema

Schema defines app category schemas for Memact.

The main thing Schema categorizes is user context.

Apps may already have clean context, like `prefers short workouts` or `likes high-energy music`. They may also have app activity records, like skipped playlists, repeated orders, saved items, exported files, watched videos, completed lessons, search queries, or changed settings.

Schema does not pretend every activity record is already context. It defines the category, fields, examples, and rules that help Memact turn activity into a user-readable context proposal later.

## For SSoC26 Contributors

Start here if you are new to Memact.

Schema is the main beginner-friendly contribution path. Pick an app category you understand and define what useful context looks like there.

Before starting, read:

- [`MEMACT.md`](./MEMACT.md) for the contributor handoff.
- [`CONTRIBUTING.md`](https://github.com/Memact/.github/blob/main/CONTRIBUTING.md) for the org-wide contributor guide.

Good first issues are labeled:

- `SSoC26`
- `good first issue`
- `Easy`
- `schema`

Please comment on an issue before starting so work does not get duplicated.

A good category schema contribution should include:

- useful context fields
- app activity examples
- normalized context examples
- user-facing Wiki entry templates
- fields that require extra care
- category-level permission suggestions
- basic tests

Important rule: apps can send proposed context or activity records, but users control what becomes accepted memory.

Prefer user-readable summaries over raw personal data. Do not infer sensitive traits. Do not write fake certainty.

## Owns

- App category schemas.
- Useful context fields for each app category.
- Example app activity records.
- Normalization rules.
- User-facing Wiki entry templates.
- User prompts for missing context.
- Access suggestions for category-level permissions.
- Tests for safe context shaping.

## Does Not Own

- Consent, apps, API keys, or permission checks.
- Wiki storage or user editing.
- Memory retrieval.
- SDK network calls.
- The full inference system that turns every kind of activity into context.
- Retired Capture, Inference, or Intent pipelines.

## Flow

```text
App activity or proposed context -> Category schema -> Wiki proposal -> User review -> Memory
```

## Contributor Work

Contributors should pick an app category and define the context shape for that category.

Examples:

- music
- video-streaming
- movie-booking
- shopping
- learning
- news-articles
- fitness
- travel
- food-delivery
- creator-tools
- productivity
- AI assistants

For each category, contributors can add schemas, activity examples, context fields, normalization rules, Wiki entry templates, access suggestions, and tests.

Example: a food app may show repeated sushi orders. Schema should describe when that can become a food preference, and when it should stay as temporary activity.

## Current Code

The existing v0 engine is still present for compatibility while Schema moves toward category schemas.

Current exports include:

- `formSchemaPackets(records, options)`
- `groupByCategory(records)`
- `inferSchemaType(record)`
- `createSchemaPacket(group)`

Do not treat Capture or Inference as current core product language. New work should prefer app category schemas and Wiki entry outputs.

## Development

```powershell
npm install
npm run check
```
