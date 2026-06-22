/**
 * test/categories/news-reading.test.mjs
 */
import assert from 'node:assert';
import { test, describe } from 'node:test';
import { newsReadingCategory } from '../../src/categories/news-reading.mjs';

describe('News-Reading Category Schema', () => {

  test('should handle valid raw data and normalize correctly', () => {
    const rawInput = {
      preferredCategories: ['Technology', ' SCIENCE '],
      avoidedTopics: ['Politics', 'Gossip'],
      preferredLength: 'long-form'
    };

    const expected = {
      preferredCategories: ['technology', 'science'],
      avoidedTopics: ['politics', 'gossip'],
      preferredLength: 'long-form'
    };

    const result = newsReadingCategory.normalize(rawInput);
    assert.deepStrictEqual(result, expected);
  });

  test('should fall back to safe defaults when input is empty or missing fields', () => {
    const rawInput = {};
    
    const result = newsReadingCategory.normalize(rawInput);

    assert.deepStrictEqual(result.preferredCategories, ['technology', 'local news', 'science']);
    assert.deepStrictEqual(result.avoidedTopics, ['politics']);
    assert.strictEqual(result.preferredLength, 'short summaries');
  });

  test('should fallback to safe reading length if an invalid format is provided', () => {
    const rawInput = {
      preferredLength: 'ultra-short-tweets-only'
    };

    const result = newsReadingCategory.normalize(rawInput);
    assert.strictEqual(result.preferredLength, 'short summaries');
  });

  test('should generate a properly structured template string', () => {
    const mockContext = {
      preferredCategories: ['technology', 'science'],
      avoidedTopics: ['politics'],
      preferredLength: 'long-form'
    };

    const outputString = newsReadingCategory.template(mockContext);

    assert.ok(outputString.includes('- Target Categories: technology, science'));
    assert.ok(outputString.includes('- Excluded Topics/Filters: politics'));
    assert.ok(outputString.includes('- Reading Format Preference: long-form'));
  });
});