import test from "node:test";
import assert from "node:assert/strict";

import {
  mapOauthGrantToContextPermissions,
  canCompilerWriteWithConsent
} from "../src/consent/oauth-consent-mapping.mjs";

test("mapOauthGrantToContextPermissions maps granted provider scopes -> effective context permissions", () => {
  const grant = {
    user_id: "u_1",
    source: "StepApp",
    provider: "steps-provider",
    granted_oauth_scopes: ["provider:read_steps", "provider:write_streaks"],
    consent_version: "v1"
  };

  const mappingRules = [
    { provider_scope: "provider:read_steps", context_scope: "fitness-challenges:goals" },
    { provider_scope: "provider:write_streaks", context_scope: "fitness-challenges:streaks" },
    { provider_scope: "provider:write_preferences", context_scope: "fitness-challenges:preferences" }
  ];

  const catalog = [
    { scope: "fitness-challenges:goals", sensitivity: "low", default_granted: true },
    { scope: "fitness-challenges:preferences", sensitivity: "low", default_granted: true },
    { scope: "fitness-challenges:streaks", sensitivity: "medium", default_granted: false, first_write_requires_confirmation: true }
  ];

  const out = mapOauthGrantToContextPermissions(grant, mappingRules, catalog);

  const byScope = new Map(out.effective_context_permissions.map((p) => [p.scope, p]));

  assert.equal(out.user_id, "u_1");
  assert.equal(out.consent_version, "v1");

  // default granted goals/preferences
  assert.equal(byScope.get("fitness-challenges:goals").allowed, true);
  assert.equal(byScope.get("fitness-challenges:preferences").allowed, true);

  // granted streaks
  assert.equal(byScope.get("fitness-challenges:streaks").allowed, true);
  assert.equal(byScope.get("fitness-challenges:streaks").first_write_requires_confirmation, true);
});

test("canCompilerWriteWithConsent requires review on first write when permission requests confirmation", () => {
  const mappingOutput = {
    consent_version: "v1",
    user_id: "u_1",
    source: "StepApp",
    provider: "steps-provider",
    effective_context_permissions: [
      {
        scope: "fitness-challenges:streaks",
        sensitivity: "medium",
        allowed: true,
        first_write_requires_confirmation: true
      }
    ]
  };

  const first = canCompilerWriteWithConsent({
    mappingOutput,
    required_context_scope: "fitness-challenges:streaks",
    operation: "write",
    is_first_write_for_that_scope: true
  });

  assert.deepEqual(first, { allowed: true, requires_review: true });

  const subsequent = canCompilerWriteWithConsent({
    mappingOutput,
    required_context_scope: "fitness-challenges:streaks",
    operation: "write",
    is_first_write_for_that_scope: false
  });

  assert.deepEqual(subsequent, { allowed: true, requires_review: false });
});

test("canCompilerWriteWithConsent denies when permission is not allowed", () => {
  const mappingOutput = {
    effective_context_permissions: [
      {
        scope: "fitness-challenges:streaks",
        sensitivity: "medium",
        allowed: false,
        first_write_requires_confirmation: true
      }
    ]
  };

  const out = canCompilerWriteWithConsent({
    mappingOutput,
    required_context_scope: "fitness-challenges:streaks",
    operation: "write",
    is_first_write_for_that_scope: true
  });

  assert.deepEqual(out, { allowed: false, requires_review: false });
});

