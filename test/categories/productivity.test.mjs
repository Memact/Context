import assert from 'assert';
import * as productivitySchema from '../../src/categories/productivity.mjs';

describe('Productivity Category Declarative Schema', () => {
  
  it('should export the correct category identifier', () => {
    assert.strictEqual(productivitySchema.category, 'productivity');
  });

  it('should export required declarative metadata structures', () => {
    assert.ok(productivitySchema.contextFields, 'Missing contextFields');
    assert.ok(productivitySchema.sensitiveFieldRules, 'Missing sensitiveFieldRules');
    assert.ok(productivitySchema.rawInputExamples, 'Missing rawInputExamples');
    assert.ok(productivitySchema.normalizedOutputExamples, 'Missing normalizedOutputExamples');
    assert.ok(productivitySchema.proposalOutputExamples, 'Missing proposalOutputExamples');
  });

  it('should contain strict privacy rules for workplace data', () => {
    assert.boolean(productivitySchema.sensitiveFieldRules.has('proprietary_code'), true);
    assert.boolean(productivitySchema.sensitiveFieldRules.has('confidential_client_data'), true);
  });
});