import test from "node:test";
import assert from "node:assert/strict";
import { initializeCrossDomainSchemaParser, crossDomainIndex } from "../src/engine.mjs";

test("Cross-Domain Index properly maps identical schema paths at initialization", () => {
  // Mock configuration maps matching cross-domain attributes
  initializeCrossDomainSchemaParser([
    {
      concept: "financial_boundaries",
      synonyms: ["shopping.budget", "finance.spending_limits", "wallet.allowance"]
    }
  ]);

  const shoppingAliases = crossDomainIndex.getAliases("shopping.budget");

  // Confirm standard mapping resolutions
  assert.ok(shoppingAliases.includes("finance.spending_limits"));
  assert.ok(shoppingAliases.includes("wallet.allowance"));
  assert.equal(shoppingAliases.length, 2);

  // Confirm backwards evaluation pathways function properly
  const financeAliases = crossDomainIndex.getAliases("finance.spending_limits");
  assert.ok(financeAliases.includes("shopping.budget"));
});