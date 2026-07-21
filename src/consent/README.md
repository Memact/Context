OAuth→Consent contract (Schema Compilers & Tooling)

This folder contains pure, deterministic logic used by Schema Compilers & Tooling backends.

Goals
- Convert provider/OAuth granted scopes into effective Context category permissions.
- Provide backend-agnostic gating for whether compiler outputs should be routed to user review.

Key modules
- `oauth-consent-mapping.mjs`
  - `mapOauthGrantToContextPermissions(grant, mappingRules, contextPermissionsCatalog)`
  - `canCompilerWriteWithConsent({ mappingOutput, required_context_scope, operation, is_first_write_for_that_scope })`

Integration expectation
- Compiler jobs produce outputs like `pending_approval_queue` and `needs_review`.
- This contract helps tooling decide when those review fields should be generated/triggered.

