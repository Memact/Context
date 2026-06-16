# AGENTS.md — Memact Context

## Project

Pure ESM Node.js package (no build, no TypeScript). Turns app activity into user-reviewable memory suggestions.

- `"type": "module"` — all imports use `.mjs` or explicit extensions
- Node >=24 required
- Zero runtime deps; only dev deps: `@commitlint/cli`, `husky`

## Entry points

| Export key | File |
|---|---|
| `.` (default) | `src/engine.mjs` |
| `./context-matcher` | `src/context-matcher.mjs` |
| `./context-goals` | `src/context-goals.mjs` |
| `./lifecycle` | `src/lifecycle.mjs` |
| `./cli` | `src/cli.mjs` |

Bins: `memact-context`, `memact-schema` → both `src/cli.mjs`.

## Commands

```powershell
npm install                         # install (zero runtime deps)
npm run check                       # custom assertion script, not the test suite
npm test                            # 9 test files chained with && (fail-fast)
node test/<file>.test.mjs          # run a single test file
npm run schema -- --input <file>   # CLI: detect schemas from inference JSON
npm run schema -- --input <file> --format json  # JSON output
npm run sample / npm run sample:json            # quick smoke test with sample data
```

## Conventions

- **Commits**: Conventional Commits enforced by husky+commitlint. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`. Scope = category folder/module name. Max 72 chars.
- **No CI**: No `.github/workflows/`. `npm run check` is the only gating.
- **No formatter/linter**: No ESLint, Prettier, or typecheck configured.
- **No `.gitignore` for IDE files**: only `node_modules/`, `dist/`, `schema-output/`.

## Architecture

### v0 engine (`src/engine.mjs`, ~1087 lines)
- `shapeContextProposal(input)` — product-facing: accepts memory suggestions or raw signals, returns proposal with guardrails
- `detectSchemas(inferenceOutput)` — induces virtual cognitive schemas from repeated meaningful activity records
- `formSchemaPackets(records)` — older compatibility path: groups records by category, creates schema packets
- `context-matcher.mjs` — local keyword + Jaro-Winkler fuzzy matching for CAP field resolution
- `context-goals.mjs` — blank-slate helper: given a goal ("buying a laptop"), returns missing/saved fields
- `lifecycle.mjs` — schema state machine: emerging → repeated → reinforced / weakened / contradicted / user_confirmed / user_rejected / archived

### Category rules (`src/categories/*.mjs`)
9 categories: ai-assistants, creator-tools, fitness, food-delivery, learning, movie-booking, news-articles, productivity, shopping.

Each exports: `normalizeActivity()` shape, `contextFields`, `generateWikiEntries()`, `rawInputExamples`, `normalizedOutputExamples`, `wikiEntryTemplates`, `permissionSuggestions`, `careNotes`.

### Tests (`test/`)
Node built-in `node:test` + `node:assert/strict`. Plain `.test.mjs` files run directly with `node`.

- 4 top-level tests: schema-packets, context-matcher, context-goals, news-articles, ai-assistants
- 4 category tests under `test/categories/`: fitness, learning, shopping, movie-booking
- `npm test` uses `&&` — stops on first failure (no test runner parallelism)

### Examples (`examples/`)
- `music-node-example.mjs` — minimal working Node example (needs env vars)
- `sample-inference-output.json` — fixture used by both `scripts/check.mjs` and CLI sample commands
- `examples/news-articles/` and `examples/learning/` — raw + normalized + wiki fixtures

## Key history

- Repo was formerly called **Memact Schema**. Older issues/PRs may still say "Schema" = this repo.
- Capture/Inference/Intent are retired product language. Do not reintroduce.
- Core principle: **Activity is not identity**.

## Installed Skills (`.agents/skills/`)

| Skill | Purpose |
|---|---|
| `conventional-commit` | Generates Conventional Commits-compliant commit messages via structured prompt. |
| `flaky-test-detective` | Diagnoses intermittent test failures — timing, shared state, randomness, network deps. |
| `git-hygiene-enforcer` | Enforces branch naming, commit hooks, and PR templates across the repo. |
| `javascript-testing-patterns` | Patterns for Jest/Vitest unit, integration, and E2E tests with mocking and TDD. |
| `jsdoc-typescript-docs` | Adds JSDoc comments to exported functions and generates API docs. |
| `modern-javascript-patterns` | Guides use of ES6+ features — async/await, destructuring, modules, functional patterns. |
| `node` | Node.js best practices for async, error handling, streams, testing, and performance. |

## New category pattern

A new category should add:
1. `src/categories/<name>.mjs` with normalize, context fields, wiki entries, examples, permissions, care notes
2. `test/categories/<name>.test.mjs`
3. Wire the test into `npm test` in `package.json` (appended to the && chain)
