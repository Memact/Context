# Memact Context

Memact Context is the open-source category layer that turns messy app input into useful, user-readable memory suggestions.

Formerly this repo was called **Memact Schema**. Older issues and PRs may still say "Schema"; they are talking about this Context repo.

The main thing Context organizes is app input that may become user memory.

Apps may already have a clear memory suggestion, like `prefers short workouts` or `likes high-energy music`. They may also have app activity records, like skipped playlists, repeated orders, saved items, exported files, watched videos, completed lessons, search queries, or changed settings.

Context does not pretend every activity record is already identity. It defines the category, fields, examples, and rules that help Memact turn app input into a user-readable memory suggestion later.

## Core philosophy

Activity is not identity.

A click, order, read, skip, replay, search, or export can be useful evidence. It is not automatically a stable fact about the user.

A good category should make that difference obvious. Repeated patterns can support a memory suggestion. One-off activity, curiosity, research, shared usage, trending events, and temporary needs should stay weak, temporary, or low-confidence.

## For SSoC26 Contributors

Start here if you are new to Memact.

Context is the main beginner-friendly contribution path. Pick an app category you understand and define what useful memory looks like there.

Before starting, read:

- [`MEMACT.md`](./MEMACT.md) for the contributor handoff.
- [`CONTRIBUTING.md`](https://github.com/Memact/.github/blob/main/CONTRIBUTING.md) for the org-wide contributor guide.

Good first issues are labeled:

- `SSoC26`
- `good first issue`
- `Easy`
- `context`
- `schema` for older issues that have not been renamed yet

Please comment on an issue before starting so work does not get duplicated.

To claim an unassigned SSoC26 issue, comment `/claim`. The auto-assign workflow only claims open `Easy` or `Medium` SSoC26 issues that are not already assigned.

A good category contribution should include:

- useful memory fields
- app activity examples
- normalized memory examples
- user-facing Wiki entry templates
- fields that require extra care
- category-level permission suggestions
- basic tests

Important rule: apps can send memory suggestions or activity records, but users control what becomes accepted memory.

Prefer user-readable summaries over raw personal data. Do not infer sensitive traits. Do not write fake certainty.

## Owns

- App category rules.
- Useful memory fields for each app category.
- Example app activity records.
- Normalization rules.
- User-facing Wiki entry templates.
- User prompts for missing context.
- Access suggestions for category-level permissions.
- Tests for safe memory shaping.

## Does Not Own

- Consent, apps, API keys, or permission checks.
- Wiki storage or user editing.
- Memory retrieval.
- SDK network calls.
- The full inference system that turns every kind of activity into context.
- Retired Capture, Inference, or Intent pipelines.

## Flow

```text
App activity or memory suggestion -> Category rules -> Wiki proposal -> User review -> Memory
```

## Contributor Work

Contributors should pick an app category and define the memory shape for that category.

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

For each category, contributors can add category rules, activity examples, memory fields, normalization rules, Wiki entry templates, access suggestions, and tests.

For `music`, keep the category preference-based and reviewable: safe app inputs include favorite genres, disliked genres, frequent artists, skipped artists, playlist themes, listening moods, discovery preferences, and explicit preferences. Treat inferred identity, mental health, politics, religion, or other sensitive traits as review-only evidence, not accepted memory.

See [`examples/music-context-examples.json`](./examples/music-context-examples.json) for raw app input, normalized output, Wiki-ready templates, and sensitive-field notes.

Start with [`examples/music-node-example.mjs`](./examples/music-node-example.mjs), a minimal Node.js example with placeholder app id, API key, and connection id values.

API keys must not be used in browser code.

Example: a food app may show repeated sushi orders. Context should describe when that can become a food preference, and when it should stay as temporary activity.

## Current Code

The existing v0 engine is still present for compatibility while Context moves toward category rules.

Current exports include:

- `shapeContextProposal(input, options)`
- `shapeContextProposals(inputs, options)`
- `formSchemaPackets(records, options)`
- `groupByCategory(records)`
- `inferSchemaType(record)`
- `createSchemaPacket(group)`

`shapeContextProposal` is the current product-facing path. The schema-packet
functions remain for compatibility while older contributor work is migrated.

Do not treat Capture or Inference as current core product language. New work should prefer app category context rules and Wiki entry outputs.

## Development

```powershell
npm install
npm run check
```
