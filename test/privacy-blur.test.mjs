import { describe, it } from 'node:test';
import assert from 'assert';

import { blurTemporalData, blurSpatialData } from '../src/categories/privacy-blur.mjs';
describe('PII-Safe Aggregation Schema', () => {

  describe('Temporal Blurring', () => {
    it('should blur exact ISO timestamps into semantic temporal buckets', () => {
      assert.strictEqual(blurTemporalData('2026-07-02T06:15:00Z'), 'early_morning');
      assert.strictEqual(blurTemporalData('2026-07-02T10:00:00Z'), 'morning');
      assert.strictEqual(blurTemporalData('2026-07-02T14:30:00Z'), 'afternoon');
      assert.strictEqual(blurTemporalData('2026-07-02T19:45:00Z'), 'evening');
      assert.strictEqual(blurTemporalData('2026-07-02T23:15:00Z'), 'night');
    });

    it('should NEVER return an exact ISO string or timestamp', () => {
      const input = '2026-07-02T06:15:00Z';
      const output = blurTemporalData(input);
      // Regex checks that the output is not formatted like a timestamp or ISO string
      assert.doesNotMatch(output, /\d{4}-\d{2}-\d{2}/);
      assert.doesNotMatch(output, /\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Spatial Blurring', () => {
    it('should strip GPS coordinates and exact venue names from spatial data', () => {
      const rawLocation = {
        lat: 37.7749,
        lng: -122.4194,
        venue_name: "Downtown Iron Works Gym",
        location_type: "fitness center",
        city: "San Francisco"
      };

      const safeLocation = blurSpatialData(rawLocation);

      assert.strictEqual(safeLocation.lat, undefined, 'Latitude must be stripped');
      assert.strictEqual(safeLocation.lng, undefined, 'Longitude must be stripped');
      assert.strictEqual(safeLocation.venue_name, undefined, 'Exact venue name must be stripped');
      
      // Semantic data and high-level region (city) should be preserved
      assert.strictEqual(safeLocation.location_type, "fitness center");
      assert.strictEqual(safeLocation.city, "San Francisco");
    });
  });

});