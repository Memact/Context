# Memact description

**Permissioned intent infrastructure for apps.**

```text
Understand what users are trying to do.
```

Memact is infrastructure that helps apps predict user intent from approved digital activity, without giving them raw access to a user's private data.

This repo is the Schema layer. It groups semantic evidence into repeated cognitive-style schema packets that downstream Intent and Memory layers can use.

## System position

```text
Website manages -> Access gates -> Capture records -> Inference understands -> Schema groups -> Intent predicts -> Memory stores -> Apps consume
```

Schema forms structured packets from repeated semantic evidence. It does not capture browser data, infer raw meaning, diagnose the user, store long-term memory, or produce final intent predictions.

## What this repo owns

- repeated semantic-evidence grouping
- cognitive-style schema packet formation
- schema support, cohesion, lifecycle labels, and evidence links
- schema networks emitted as `memact.schema.v0`

## What this repo does not own

- browser/page capture
- raw semantic inference
- current intent prediction
- durable memory storage
- app-facing permission checks

## Copy rules

Use:

- "Permissioned intent infrastructure for apps."
- "Understand what users are trying to do."
- "approved digital activity"
- "schema packets"
- "repeated evidence patterns"

Avoid:

- generic AI wrapper language
- vague memory-plugin language
- raw-data export framing
- claims that apps get the whole memory graph
- medical or diagnostic framing
- open-source wording unless the repo license explicitly says so
