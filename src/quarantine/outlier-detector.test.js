const assert = require('assert');
const OutlierDetector = require('../../src/quarantine/outlier-detector');

describe('OutlierDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new OutlierDetector();
  });

  describe('Category Matching', () => {
    it('should match appliance category', () => {
      const purchase = {
        category: 'appliance',
        price: 800,
        description: 'Refrigerator',
        productName: 'Samsung Refrigerator'
      };

      const result = detector.matchCategory(
        purchase.category,
        purchase.description,
        purchase.productName
      );
      assert.strictEqual(result, 'appliance');
    });

    it('should match electronics via keyword', () => {
      const purchase = {
        category: 'unknown',
        price: 1000,
        description: 'MacBook Pro laptop',
        productName: 'Apple MacBook'
      };

      const result = detector.matchCategory(
        purchase.category,
        purchase.description,
        purchase.productName
      );
      assert.strictEqual(result, 'electronics');
    });

    it('should return null for no match', () => {
      const purchase = {
        category: 'unknown',
        price: 10,
        description: 'pencil',
        productName: 'pencil'
      };

      const result = detector.matchCategory(
        purchase.category,
        purchase.description,
        purchase.productName
      );
      assert.strictEqual(result, null);
    });
  });

  describe('Outlier Detection', () => {
    it('should detect high-ticket outlier', () => {
      const purchase = {
        category: 'electronics',
        price: 1500,
        description: 'Gaming laptop',
        productName: 'Asus ROG'
      };

      const result = detector.detect(purchase, []);
      assert.ok(result.isOutlier);
      assert.ok(result.confidence >= 0.6);
      assert.ok(result.decayRate > 0);
    });

    it('should not detect low-ticket item', () => {
      const purchase = {
        category: 'electronics',
        price: 50,
        description: 'USB cable',
        productName: 'USB-C cable'
      };

      const result = detector.detect(purchase, []);
      assert.ok(!result.isOutlier);
      assert.ok(result.confidence < 0.6);
    });

    it('should detect appliance outlier', () => {
      const purchase = {
        category: 'appliance',
        price: 600,
        description: 'Dishwasher',
        productName: 'Bosch Dishwasher'
      };

      const result = detector.detect(purchase, []);
      assert.ok(result.isOutlier);
      assert.strictEqual(result.category, 'appliance');
    });
  });

  describe('Purchase History', () => {
    it('should detect low frequency', () => {
      const purchase = {
        category: 'electronics',
        price: 1200,
        description: 'TV',
        productName: 'Samsung TV'
      };

      const history = [
        { category: 'electronics', price: 1200, timestamp: new Date().toISOString() }
      ];

      const result = detector.detect(purchase, history);
      assert.ok(result.isOutlier);
      assert.strictEqual(result.frequency, 0);
    });

    it('should detect high frequency', () => {
      const purchase = {
        category: 'electronics',
        price: 1200,
        description: 'TV',
        productName: 'Samsung TV'
      };

      const history = [
        { category: 'electronics', price: 1200, timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { category: 'electronics', price: 1200, timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }
      ];

      const result = detector.detect(purchase, history);
      assert.ok(result.frequency > 1);
    });
  });
});