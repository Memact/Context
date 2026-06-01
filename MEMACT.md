# Memact Contributor Handoff

Memact is a place where users can finally see what apps know about them.

## The idea

Most apps build a private version of the user.

They learn from clicks, searches, orders, playlists, watch history, saved items, skipped items, repeated settings, and habits. The user usually cannot see that profile clearly. They cannot clean it up. They cannot move it to another app. They just get whatever personalization the app decides to give them.

Memact flips that.

An app can send raw signals, like replays, skips, orders, exports, saves, or repeated settings. An app can also propose context directly when it already has a clean summary. Either way, the user should not be stuck with a hidden profile.

Memact takes those app inputs and turns them into something the user can review in Wiki.

Example:

A music app might notice:

```text
User replayed Brazilian phonk playlists 18 times this month and skipped slow acoustic playlists.
```

That is a signal. It is useful, but it should not become a permanent hidden profile.

Schema helps Memact understand what the signal is about:

```text
category: music
kind: repeated listening
possible context: prefers high-energy Brazilian phonk
```

Then the Wiki can show a readable proposal:

```text
Prefers high-energy Brazilian phonk.
```

The user can accept it, reject it, or edit it:

```text
I like Brazilian phonk mostly while working out.
```

That edited user version is stronger than the app guess.

## What contributors do in Schema

Schema is the main beginner-friendly contribution path.

You pick an app category and define how signals and context should work there.

Good category examples:

- music
- video-streaming
- shopping
- learning
- travel
- food-delivery
- news-articles
- creator-tools
- productivity
- AI assistants

For each category, add:

- useful context fields
- raw app signal examples
- normalized context examples
- user-facing Wiki entry templates
- fields that need extra care
- category-level permission suggestions
- basic tests

Do not build random features. Keep the PR focused on one category.

## What a good schema should do

A good schema should help Memact understand app activity without exposing raw private data everywhere.

It should separate:

- stable preferences from temporary intent
- explicit user choices from weak app guesses
- useful summaries from raw private data
- safe personalization context from sensitive inference

Bad:

```text
User is anxious because they watched productivity videos at night.
```

Better:

```text
Often watches productivity videos in the evening.
```

Best, after user edit:

```text
I prefer productivity content in the evening, especially short practical videos.
```

## Parts of Memact

- Access handles consent, apps, API keys, scopes, and permissions.
- Wiki is where users add, edit, approve, reject, delete, and share context.
- Schema defines app category schemas.
- Memory stores accepted context, history, retrieval, and app-safe summaries.
- Contracts defines shared shapes and validators.
- SDK helps apps connect to Memact.
- Website is the user and developer portal.

## Rules

- Apps can send signals or propose context directly.
- Users control what becomes memory.
- Default visibility should be private.
- Apps should not get full Wiki access.
- Apps should only get relevant category context with permission.
- User-added context is stronger than app-proposed context.
- Important app writes should require approval.
- Prefer readable summaries over raw personal data.
- Do not infer sensitive traits.
- Do not write fake certainty.
- Keep user-facing copy simple.
- Do not bring back Capture, Inference, or Intent as current product language.

## Contribution path

Start with an issue labeled:

- `SSoC26`
- `Easy`
- `good first issue`
- `schema`

Comment before starting so work does not get duplicated.

Run checks before opening a PR:

```powershell
npm install
npm run check
```

Keep the first PR small. One category, clear examples, basic tests.
