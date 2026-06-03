# Memact Contributor Handoff

Memact is a place where users see what apps know about them and control it.

## The idea

Most apps build a private version of the user.

They learn from clicks, searches, orders, playlists, watch history, saved items, skipped items, repeated settings, and habits. The user usually cannot see that profile clearly. They cannot clean it up. They cannot move it to another app. They just get whatever personalization the app decides to give them.

Memact flips that.

An app may send a memory suggestion directly, like:

```text
User prefers high-energy music.
```

Or it may send app activity records, like:

```text
User replayed Brazilian phonk playlists 18 times this month and skipped slow acoustic playlists.
```

Those are not the same thing.

Context mainly categorizes app input. It also defines how activity from a category should be handled before Memact turns it into a memory suggestion.

This repo was formerly called Schema. If an older issue or PR says "Schema," it means this Context repo.

For the music example, Context can say:

```text
category: music
activity: repeated playlist replay
possible memory: prefers high-energy Brazilian phonk
care note: do not expose raw listening history by default
```

Then Wiki can show a readable proposal:

```text
Prefers high-energy Brazilian phonk.
```

The user can accept it, reject it, or edit it:

```text
I like Brazilian phonk mostly while working out.
```

That edited user version is stronger than the app guess.

Important: Context is not a surveillance or inference free-for-all. It defines categories, examples, fields, and safe rules so app activity can become user-reviewable memory suggestions later.

## Core rule

Activity is not identity.

A person reading one article, ordering one meal, skipping one song, searching one topic, or exporting one file does not mean Memact should turn that into a permanent fact about them.

Patterns matter. User edits matter more. One-off activity should stay weak, temporary, or low-confidence unless the user chooses to keep it.

## What contributors do in Context

Context is the main beginner-friendly contribution path.

You pick an app category and define what useful memory looks like there.

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

- useful memory fields
- app activity examples
- normalized memory examples
- user-facing Wiki entry templates
- fields that need extra care
- category-level permission suggestions
- basic tests

Do not build random features. Keep the PR focused on one category.

## What a good category should do

A good category should make it clear what Memact is allowed to understand from an app.

It should separate:

- stable preferences from temporary activity
- explicit user choices from weak app guesses
- useful summaries from raw private data
- safe personalization memory from sensitive guesses

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
- Context defines app category rules and proposal templates.
- Memory stores accepted context, history, retrieval, and app-safe summaries.
- Contracts defines shared shapes and validators.
- SDK helps apps connect to Memact.
- Website is the user and developer portal.

## Rules

- Apps can send memory suggestions or app activity records.
- Activity is not identity.
- Users control what becomes memory.
- Default visibility should be private.
- Apps should not get full Wiki access.
- Apps should only get relevant category memory with permission.
- User-added memory is stronger than app-proposed memory.
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
- `context`
- `schema` for older issues that have not been renamed yet

Comment before starting so work does not get duplicated.

Run checks before opening a PR:

```powershell
npm install
npm run check
```

Keep the first PR small. One category, clear examples, basic tests.
