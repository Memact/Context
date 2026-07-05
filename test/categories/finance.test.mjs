import { describe, it } from 'node:test';
import assert from 'assert';
import * as financeSchema from '../../src/categories/finance.mjs';

describe('Finance Category Schema & Privacy', () => {

  it('should drop all sensitive financial data', () => {
    const rawInput = {
      source: 'bank_api',
      type: 'activity',
      data: {
        account_balance: 10000,
        merchant_name: 'Amazon',
        budget_goals: 'Save for laptop'
      }
    };

    const normalized = financeSchema.normalizeFinanceContext(rawInput);

    assert.strictEqual(normalized.data.account_balance, undefined);
    assert.strictEqual(normalized.data.merchant_name, undefined);
    assert.strictEqual(normalized.data.budget_goals, 'Save for laptop');
  });

  it('should ensure default visibility is private', () => {
    const rawInput = { source: 'user', type: 'preference', data: { budget_goals: 'Debt Free' } };
    const normalized = financeSchema.normalizeFinanceContext(rawInput);
    assert.strictEqual(normalized.visibility, 'private');
  });
});