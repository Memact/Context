# OAuth flow ↔ Schema Compilers & Tooling contract

## Purpose
This document defines how OAuth/OIDC consent (provider granted scopes) should be mapped into Context’s category permission model so that Schema Compilers & Tooling can:
- decide whether reads/writes are allowed for a given user+source
- route sensitive field writes into user review
- keep durable context aligned with Context’s “activity is not identity” and sensitivity rules

## Key idea
**OAuth grants scopes to a Tooling backend**. The backend must translate those scopes into **Context permissions** and then enforce field-level gating.

Context category normalizers already emit:
- `pending_approval_queue` (items requiring explicit confirmation)
- `needs_review` (boolean)

This repo provides the deterministic mapping contract logic:
- `src/consent/oauth-consent-mapping.mjs`

## OAuth model
Use OIDC Authorization Code + PKCE (recommended).

Backend should store:
- access/refresh tokens (encrypted)
- granted OAuth scopes
- a `consent_version` (audit/version hash)
- mapping decisions (scope sets derived from rules)

## Mapping contract
### Inputs
`mapOauthGrantToContextPermissions(grant, mappingRules, contextPermissionsCatalog)`

- `grant.granted_oauth_scopes`: scopes actually granted by the user at the IdP/provider
- `mappingRules`: mapping from `provider_scope` → `context_scope`
- `contextPermissionsCatalog`: metadata for Context scopes
  - `scope` (e.g., `fitness-challenges:streaks`)
  - `sensitivity` (low/medium/high)
  - `default_granted`
  - `first_write_requires_confirmation`

### Output
- `effective_context_permissions[]` where each item is:
  - `allowed` (allowed by grant and/or default)
  - `first_write_requires_confirmation`

## Compiler write gating
When a compiler job produces output fields that should be persisted, tooling should check:

`canCompilerWriteWithConsent({ mappingOutput, required_context_scope, operation, is_first_write_for_that_scope })`

Rules implemented:
- **If permission is not allowed** → deny write
- **If it is allowed but `first_write_requires_confirmation` and this is the first write** → allow but mark as **requires_review**
- Reads are permitted when `allowed=true`

## How this aligns with category normalizers
Category normalizers (example: `src/categories/fitness-challenges.mjs`) already:
- build `pending_approval_queue` items for sensitive fields
- set `needs_review` when review is required

Tooling should use the consent mapping to decide whether to:
- execute writes immediately
- or ensure review routing occurs for first writes of confirmation-gated permissions

## Audit & revocation
- Store `consent_version` alongside the grant.
- If provider authorization is revoked, stop tooling ingestion for that source.
- Prefer retaining only derived non-sensitive context, consistent with category-level sensitivity and durable preference rules.

