# Memact Schema

Version: `v0.0`

Schema groups semantic evidence into repeated cognitive-style patterns.

It owns one job:

```text
form schema packets from repeated semantic evidence
```

Schema does not capture browser data, infer raw meaning, predict current intent,
store long-term memory, or diagnose the user. It emits cautious schema signals
that Intent can read and Memory can store after the pipeline is gated by Access.

## What This Repo Owns

- Reads `memact.inference.v0` records.
- Ignores records that did not pass the meaningfulness gate.
- Groups repeated concepts, markers, sources, and time patterns.
- Forms virtual cognitive-schema packets when support and cohesion are strong enough.
- Classifies schema nodes and edges into cognitive dimensions such as action,
  evaluation, identity, affect, and social context.
- Keeps evidence records attached to every schema.
- Emits a schema network for Intent, Memory, and query-time engines.

## What This Repo Does Not Own

- Browser/page capture.
- Raw semantic inference from captured activity.
- Current intent prediction.
- Durable memory storage or forgetting.
- App-facing permission checks.

## Input

```json
{
  "schema_version": "memact.inference.v0",
  "records": []
}
```

## Output

```json
{
  "schema_version": "memact.schema.v0",
  "schemas": [
    {
      "id": "induced_startup_proof_building",
      "label": "Startup / Proof Action frame",
      "formation_mode": "evidence_induced",
      "support": 4,
      "confidence": 0.72,
      "schema_kind": "virtual_cognitive_schema",
      "nodes": [],
      "edges": [],
      "evidence_records": []
    }
  ],
  "schema_network": {
    "nodes": [],
    "edges": []
  }
}
```

## Run Locally

Prerequisites:

- Node.js `20+`
- npm `10+`

Install:

```powershell
npm install
```

Validate:

```powershell
npm run check
```

Run sample:

```powershell
npm run sample
```

Run against Inference output:

```powershell
npm run schema -- --input path\to\inference-output.json --format report
```

JSON output:

```powershell
npm run schema -- --input path\to\inference-output.json --format json
```

## Contract

- Activities are evidence, not schemas.
- Schemas require repeated meaningful support.
- A schema packet is a virtual mirror, not a medical claim.
- Schemas contain classified nodes and edges. They are knowledge-graph packets,
  not plain topic labels.
- Intent can use schemas as context for current-goal prediction.
- Memory decides whether a schema survives.

## License

See `LICENSE`.
