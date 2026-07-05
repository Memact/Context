const assert = require('assert');
const ConnectionSuggester = require('../../src/cross-category/connection-suggester');
const { CATEGORIES, CONNECTION_STATUS } = require('../../src/cross-category/category-constants');

describe('ConnectionSuggester', () => {
  let suggester;

  beforeEach(() => {
    suggester = new ConnectionSuggester();
  });

  describe('Connection Suggestions', () => {
    it('should suggest connections between categories', () => {
      const contextItems = [
        { id: 1, category: CATEGORIES.FITNESS, timestamp: new Date().toISOString() },
        { id: 2, category: CATEGORIES.FOOD, timestamp: new Date().toISOString() },
        { id: 3, category: CATEGORIES.MUSIC, timestamp: new Date().toISOString() },
        { id: 4, category: CATEGORIES.HEALTH, timestamp: new Date().toISOString() }
      ];

      const result = suggester.suggest(contextItems);
      assert.ok(result.connections.length > 0);
    });

    it('should generate proposals', () => {
      const contextItems = [
        { id: 1, category: CATEGORIES.FITNESS, timestamp: new Date().toISOString() },
        { id: 2, category: CATEGORIES.FOOD, timestamp: new Date().toISOString() }
      ];

      const result = suggester.suggest(contextItems);
      assert.ok(result.proposals.length > 0);
    });

    it('should create inbox items', () => {
      const contextItems = [
        { id: 1, category: CATEGORIES.FITNESS, timestamp: new Date().toISOString() },
        { id: 2, category: CATEGORIES.HEALTH, timestamp: new Date().toISOString() }
      ];

      const result = suggester.suggest(contextItems);
      assert.ok(result.inboxItems.length > 0);
      assert.strictEqual(result.inboxItems[0].status, CONNECTION_STATUS.PENDING);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence for connections', () => {
      const contextItems = [
        { id: 1, category: CATEGORIES.FITNESS, timestamp: new Date().toISOString() },
        { id: 2, category: CATEGORIES.HEALTH, timestamp: new Date().toISOString() }
      ];

      const result = suggester.suggest(contextItems);
      assert.ok(result.connections[0].confidence >= 0);
      assert.ok(result.connections[0].confidence <= 1);
    });
  });

  describe('Category Relationships', () => {
    it('should identify related categories', () => {
      const relationship = suggester.getRelationship(CATEGORIES.FITNESS, CATEGORIES.HEALTH);
      assert.ok(relationship);
      assert.ok(relationship.weight > 0);
    });

    it('should not identify unrelated categories', () => {
      const relationship = suggester.getRelationship(CATEGORIES.FITNESS, CATEGORIES.READING);
      assert.ok(!relationship);
    });
  });

  describe('Inbox Management', () => {
    it('should get inbox items', () => {
      const items = suggester.getInboxItems();
      assert.ok(Array.isArray(items));
    });

    it('should update inbox item', () => {
      const result = suggester.updateInboxItem('test-id', CONNECTION_STATUS.APPROVED);
      assert.strictEqual(result.id, 'test-id');
      assert.strictEqual(result.status, CONNECTION_STATUS.APPROVED);
    });
  });
});