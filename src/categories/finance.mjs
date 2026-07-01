/**
 * Memact Context - Finance and Budgeting Category
 */

export const category = "finance";

export const contextFields = {
  budget_goals: "High-level budgeting goals (e.g., savings target, debt repayment)",
  spending_categories: "Preferred categories for spend tracking",
  currency_preference: "Default currency for financial data"
};

// Strict Privacy Boundary: Financial data MUST NOT be persisted as durable identity
export const SENSITIVE_FIELDS = new Set([
  "account_balance",
  "transaction_id",
  "merchant_name",
  "raw_spend_amount",
  "account_number"
]);

export function normalizeFinanceContext(input) {
  if (!input || !input.data) return null;
  const { source, type, data, explicit = false } = input;

  // 1. Strict Privacy Guardrail: Drop sensitive financial details
  const cleanedData = { ...data };
  for (const key of Object.keys(cleanedData)) {
    if (SENSITIVE_FIELDS.has(key)) {
      delete cleanedData[key];
    }
  }

  // 2. Finance activity/transactions are treated as transient/weak
  if (type === "activity") {
    return {
      category: "finance",
      source,
      observation_type: "weak_observation",
      confidence: "low",
      visibility: "private", // Default must be Private
      is_identity_claim: false,
      data: cleanedData,
      suggestion: "You recently recorded a transaction. Would you like to categorize this for your budget?",
      needs_review: true
    };
  }

  // 3. Durable Preference Handling
  if (type === "preference") {
    return {
      category: "finance",
      source,
      observation_type: explicit ? "explicit_preference" : "inferred_preference",
      confidence: explicit ? "high" : "medium",
      visibility: "private",
      is_identity_claim: explicit,
      data: cleanedData,
      suggestion: explicit ? null : "Update your budgeting goals?",
      needs_review: !explicit
    };
  }

  return { category: "finance", source, observation_type: "unknown", confidence: "low", visibility: "private" };
}

// --- DECLARATIVE EXAMPLES ---

export const rawInputExamples = [
  {
    source: "banking_app",
    type: "activity",
    data: {
      merchant_name: "Cafe Coffee Day",
      raw_spend_amount: 500,
      account_balance: 50000
    }
  }
];

export const normalizedOutputExamples = [
  {
    category: "finance",
    budget_goals: "Save for vacation",
    currency_preference: "INR"
  }
];

export const proposalOutputExamples = [
  "Currently focused on {{budget_goals}}.",
  "Tracking spending in {{spending_categories}}."
];