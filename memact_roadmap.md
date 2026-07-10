# Memact Architectural Roadmap - SSoC26

Below are the 50 foundational architectural issues recently opened to realign the codebase with the canonical vision.

## Protocol
- [#19: [Medium] Draft RFC for Webhook Event Subscriptions](https://github.com/Memact/Protocol/issues/19) - Labels: `SSoC26`, `architecture`, `Medium`
- [#18: [Hard] Build Conformance Test Suite CLI](https://github.com/Memact/Protocol/issues/18) - Labels: `SSoC26`, `architecture`, `Hard`
- [#17: [Hard] Draft RFC for Cross-Provider Discovery Delegation](https://github.com/Memact/Protocol/issues/17) - Labels: `SSoC26`, `architecture`, `Hard`
- [#16: [Hard] Define JSON Schema for /.well-known/memact-configuration](https://github.com/Memact/Protocol/issues/16) - Labels: `SSoC26`, `architecture`, `Hard`

## Access
- [#79: [Medium] CAP Response Pagination](https://github.com/Memact/Access/issues/79) - Labels: `SSoC26`, `Medium`, `architecture`
- [#78: [Medium] CCP proposal rate-limiting middleware](https://github.com/Memact/Access/issues/78) - Labels: `SSoC26`, `Medium`, `architecture`
- [#77: [Medium] Strict CAP payload signature verification](https://github.com/Memact/Access/issues/77) - Labels: `SSoC26`, `Medium`, `architecture`
- [#76: [Hard] Token Revocation endpoint](https://github.com/Memact/Access/issues/76) - Labels: `SSoC26`, `Hard`, `architecture`
- [#75: [Medium] Host JWKS (JSON Web Key Set) endpoint](https://github.com/Memact/Access/issues/75) - Labels: `SSoC26`, `Medium`, `architecture`
- [#74: [Hard] JWT Generation and Signing](https://github.com/Memact/Access/issues/74) - Labels: `SSoC26`, `Hard`, `architecture`
- [#73: [Medium] Map CCP/CAP categories to OAuth Scopes](https://github.com/Memact/Access/issues/73) - Labels: `SSoC26`, `Medium`, `architecture`
- [#72: [Hard] Implement PKCE support for mobile clients](https://github.com/Memact/Access/issues/72) - Labels: `SSoC26`, `Hard`, `architecture`
- [#71: [Hard] Implement /token endpoint](https://github.com/Memact/Access/issues/71) - Labels: `SSoC26`, `Hard`, `architecture`
- [#70: [Hard] Implement /authorize endpoint (Authorization Code Flow)](https://github.com/Memact/Access/issues/70) - Labels: `SSoC26`, `Hard`, `architecture`
- [#69: [Easy] Host /.well-known/webfinger endpoint](https://github.com/Memact/Access/issues/69) - Labels: `SSoC26`, `Easy`, `architecture`
- [#68: [Medium] Host static /.well-known/memact-configuration](https://github.com/Memact/Access/issues/68) - Labels: `SSoC26`, `Medium`, `architecture`

## SDK
- [#65: [Easy] Generate TypeScript definitions for dynamically loaded schemas](https://github.com/Memact/SDK/issues/65) - Labels: `SSoC26`, `Easy`, `architecture`
- [#64: [Hard] Automated token refresh interceptors](https://github.com/Memact/SDK/issues/64) - Labels: `SSoC26`, `Hard`, `architecture`
- [#63: [Hard] Implement MemactClient.connect(address) entrypoint](https://github.com/Memact/SDK/issues/63) - Labels: `SSoC26`, `Hard`, `architecture`
- [#62: [Medium] Implement provider discovery fallback caching](https://github.com/Memact/SDK/issues/62) - Labels: `SSoC26`, `Medium`, `architecture`
- [#61: [Hard] Enforce HTTPS and strict redirect rules for discovery](https://github.com/Memact/SDK/issues/61) - Labels: `SSoC26`, `Hard`, `architecture`
- [#60: [Medium] Fetch and parse provider capability documents](https://github.com/Memact/SDK/issues/60) - Labels: `SSoC26`, `Medium`, `architecture`
- [#59: [Hard] Implement WebFinger lookup client](https://github.com/Memact/SDK/issues/59) - Labels: `SSoC26`, `Hard`, `architecture`

## Memory
- [#112: [Medium] Automated Garbage Collection for dead evidence](https://github.com/Memact/Memory/issues/112) - Labels: `SSoC26`, `Medium`, `architecture`
- [#111: [Hard] Integrate Context decay rates into SQL queries](https://github.com/Memact/Memory/issues/111) - Labels: `SSoC26`, `Hard`, `architecture`
- [#110: [Hard] Implement Explainable Confidence Data Structures](https://github.com/Memact/Memory/issues/110) - Labels: `SSoC26`, `Hard`, `architecture`
- [#109: [Medium] Freshness boosting for explicit user approvals](https://github.com/Memact/Memory/issues/109) - Labels: `SSoC26`, `Medium`, `architecture`
- [#108: [Hard] Conflict Resolution Engine (Context overrides)](https://github.com/Memact/Memory/issues/108) - Labels: `SSoC26`, `Hard`, `architecture`
- [#107: [Hard] Source Authority Weighting Algorithm](https://github.com/Memact/Memory/issues/107) - Labels: `SSoC26`, `Hard`, `architecture`
- [#106: [Hard] Implement Exponential Half-Life Decay function](https://github.com/Memact/Memory/issues/106) - Labels: `SSoC26`, `Hard`, `architecture`
- [#105: [Medium] Deprecate and remove custom JSON Compaction Daemon](https://github.com/Memact/Memory/issues/105) - Labels: `SSoC26`, `Medium`, `architecture`
- [#104: [Hard] Build migration script from flat memory.json to SQLite](https://github.com/Memact/Memory/issues/104) - Labels: `SSoC26`, `Hard`, `architecture`
- [#103: [Medium] Implement Graph Traversal queries for Evidence chains](https://github.com/Memact/Memory/issues/103) - Labels: `SSoC26`, `Medium`, `architecture`
- [#102: [Hard] Write CRUD interface for CCP Proposals](https://github.com/Memact/Memory/issues/102) - Labels: `SSoC26`, `Hard`, `architecture`
- [#101: [Hard] Write CRUD interface for CAP Requests](https://github.com/Memact/Memory/issues/101) - Labels: `SSoC26`, `Hard`, `architecture`
- [#100: [Hard] Implement AES-256-GCM encryption at SQLite write layer](https://github.com/Memact/Memory/issues/100) - Labels: `SSoC26`, `Hard`, `architecture`
- [#99: [Medium] Define SQL Schema for 'Sources' (App Registry) table](https://github.com/Memact/Memory/issues/99) - Labels: `SSoC26`, `Medium`, `architecture`
- [#98: [Medium] Define SQL Schema for 'Evidence' table](https://github.com/Memact/Memory/issues/98) - Labels: `SSoC26`, `Medium`, `architecture`
- [#97: [Medium] Define SQL Schema for 'Facts' table](https://github.com/Memact/Memory/issues/97) - Labels: `SSoC26`, `Medium`, `architecture`
- [#96: [Hard] Scaffold SQLite database initialization](https://github.com/Memact/Memory/issues/96) - Labels: `SSoC26`, `Hard`, `architecture`

## Context
- [#382: [Medium] Cross-Category Discrepancy Alert Thresholds](https://github.com/Memact/Context/issues/382) - Labels: `SSoC26`, `Medium`, `architecture`
- [#381: [Medium] Define category-specific decay rates](https://github.com/Memact/Context/issues/381) - Labels: `SSoC26`, `Medium`, `architecture`

## Contracts
- [#19: [Easy] Validator for Pagination Cursors](https://github.com/Memact/Contracts/issues/19) - Labels: `SSoC26`, `Easy`, `architecture`
- [#18: [Hard] Zod Schema Generator from Context Markdown](https://github.com/Memact/Contracts/issues/18) - Labels: `SSoC26`, `Hard`, `architecture`
- [#17: [Easy] Validate Explainable Confidence payloads](https://github.com/Memact/Contracts/issues/17) - Labels: `SSoC26`, `Easy`, `architecture`
- [#16: [Easy] Validator for Identity Address Format](https://github.com/Memact/Contracts/issues/16) - Labels: `SSoC26`, `Easy`, `architecture`

## Notebook
- [#49: [Medium] Implement Interactive Setup Onboarding](https://github.com/Memact/Notebook/issues/49) - Labels: `SSoC26`, `Medium`, `architecture`
- [#48: [Hard] Evidence Graph Visualizer](https://github.com/Memact/Notebook/issues/48) - Labels: `SSoC26`, `Hard`, `architecture`
- [#47: [Medium] Active Sessions and Authorized Apps Dashboard](https://github.com/Memact/Notebook/issues/47) - Labels: `SSoC26`, `Medium`, `architecture`
- [#46: [Medium] Build React Consent Screen UI](https://github.com/Memact/Notebook/issues/46) - Labels: `SSoC26`, `Medium`, `architecture`
