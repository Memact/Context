# Contributing to Memact/Context

Welcome to the **Memact** open-source community! 👋
We are part of **SSoC 2026 (Summer of Selecting Open Contributions)** and we are excited to have you here.


> **This is the main tracking repository for SSoC26.** All contributors working on sub-repositories
> (`Access`, `Memory`, `SDK`, `Contracts`, `Notebook`) must open a **Dummy PR** here in `Memact/Context`
> referencing their actual PR. Only Context PRs are counted by the SSoC26 leaderboard.


---

## Table of Contents

1. [Understanding the Protocol](#understanding-the-protocol)
2. [SSoC26 Contribution Workflow](#ssoc26-contribution-workflow)
3. [Getting an Issue Assigned](#getting-an-issue-assigned)
4. [Dummy PR Requirement (Sub-repo contributors)](#dummy-pr-requirement)
5. [Assignment Rules & Limits](#assignment-rules--limits)
6. [Code Quality Standards](#code-quality-standards)
7. [Pull Request Checklist](#pull-request-checklist)
8. [Labels & Difficulty](#labels--difficulty)
9. [Need Help?](#need-help)

---

## Understanding the Protocol

Memact is a **user-owned personal context protocol** — a privacy-preserving middleware layer that gives
users visibility and control over what apps know about them.

The core spine:

```
Access → Wiki → Context → Memory → SDK → Apps
```

- **Access** — Permission gating, isolation profiles, token revocation
- **Context** — Schema validation, conflict resolution, canonical data shapes
- **Memory** — Persistent storage, indexing, decay, offline sync
- **SDK** — Client adapters, CLI tooling, third-party integration helpers
- **Contracts** — Shared type definitions and schema validators
- **Notebook** — UI layouts and front-end data contracts

All issues use **generic capability names** (e.g. _Ride Booking_, _Media Playback_, _Developer Activity_)
rather than brand names. Specific apps are reference implementations only.

---

## SSoC26 Contribution Workflow

```
1. Find an open issue labelled [SSoC26]
2. Comment "I want to get assigned" (or similar) on the issue
3. Bot auto-assigns you (chronological order, first come first served)
4. Fork the repo and create a branch: feat/<short-description>
5. Implement your changes following the Code Quality Standards below
6. Open a Pull Request referencing the issue (e.g. "Closes #42")
7. [Sub-repos only] Open a Dummy PR in Memact/Context referencing your PR
8. Wait for review and address feedback promptly
```

---

## Getting an Issue Assigned

Comment any of the following on an issue to request assignment:

- `I want to get assigned`
- `Can I work on this?`
- `Assign me`
- `I'd like to work on this`

> Our bot processes assignment requests **chronologically** — the first person to request gets priority.
> Do not spam multiple issues at once beyond your limit (see below).

To **unassign** yourself, comment:

- `Please unassign me`
- `Unassign me`

---

## Dummy PR Requirement

If you are contributing to **any sub-repository** (`Access`, `Memory`, `SDK`, `Contracts`, `Notebook`),
you **must also open a Dummy PR** in [`Memact/Context`](https://github.com/Memact/Context) to be
counted on the SSoC26 leaderboard.

### How to open a Dummy PR in Context

1. Go to [Memact/Context](https://github.com/Memact/Context)
2. Create a new branch: `dummy/<your-username>-<repo>-<issue-number>`
3. Make a minimal change (e.g. add a line to `dummy_contributions.md` if it exists, or update a comment)
4. Open a PR with a title like:

   ```
   [Dummy PR] <Repo>/<Your PR title> — <your-username>
   ```

5. In the PR description, reference your actual PR:

   ```
   This is a tracking PR for my contribution in Memact/<Repo>.
   Actual PR: Memact/<Repo>#<PR number>
   ```

> Our bot automatically detects dummy PRs and links them. You will receive a confirmation comment
> on your sub-repo PR once the linkage is verified.

---

## Assignment Rules & Limits

| Rule | Detail |
|---|---|
| **Max active assignments** | 10 issues at a time |
| **Priority** | First commenter on an issue gets assigned |
| **Stale warning** | If no PR is opened within 3 days, you receive a friendly warning |
| **Greylisting** | Repeated low-quality PRs may restrict future assignments |
| **Unassignment** | Comment "please unassign me" at any time to release an issue |

---

## Code Quality Standards

All PRs are automatically reviewed by our bot for the following. Violations will trigger a
`Quality: Needs Polish` label and a comment requesting fixes before merge.

### ✅ Required
- [ ] Code follows the existing patterns and architecture of the repository
- [ ] All functions/modules have proper docstrings or comments
- [ ] Tests are written for all new functionality
- [ ] No breaking changes to existing interfaces without prior discussion

### ❌ Prohibited
- [ ] `console.log`, `debugger`, `print` statements left in production code
- [ ] Hardcoded secrets, API keys, passwords, or tokens
- [ ] Unresolved `TODO`, `FIXME`, or `XXX` markers
- [ ] Dead code or commented-out blocks of logic
- [ ] Files with no meaningful change (whitespace-only PRs)

---

## Pull Request Checklist

Before opening your PR, verify:

```
[ ] My branch is up-to-date with main
[ ] I have referenced the issue in my PR description (e.g. "Closes #42")
[ ] My code passes all existing tests
[ ] I have added tests for my changes
[ ] I have NOT hardcoded any API keys or secrets
[ ] I have opened a Dummy PR in Memact/Context (if contributing to a sub-repo)
[ ] My PR title follows: feat(<scope>): <short description>
```

---

## Labels & Difficulty

All SSoC26 issues are tagged with a difficulty label that determines point value:

| Label | Description | Points (approx.) |
|---|---|---|
| `Easy` | Straightforward implementation, well-defined scope | 20 pts |
| `Medium` | Requires some design thinking or integration work | 30 pts |
| `Hard` | Complex architecture, deep protocol knowledge needed | 40 pts |

All issues also carry the `SSoC26` label for leaderboard tracking.

---

## Need Help?

- 💬 Ask questions directly on the issue thread
- 📖 Read the project context: [`.agents/rules/memact-project-context.md`](/.agents/rules/memact-project-context.md)
- 🌐 Visit the [SSoC26 Leaderboard](https://ssoc.devfolio.co/) to track your points

We appreciate every contribution — no matter how small. Happy coding! 🚀
