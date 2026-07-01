import { describe, it } from 'node:test';
import assert from 'assert';
import * as weatherSchema from '../../src/categories/weather-settings.mjs';

describe('Weather Settings Category Schema', () => {

  it('should export the required declarative schema fields', () => {
    assert.strictEqual(weatherSchema.category, 'weather-settings');
    assert.ok(weatherSchema.contextFields);
    assert.ok(weatherSchema.rawInputExamples);
    assert.ok(weatherSchema.proposalOutputExamples);
  });

  it('should process durable preference settings correctly', () => {
    const rawPreference = {
      source: 'settings_sync',
      type: 'preference',
      explicit: true,
      data: {
        temp_unit_scale: 'Fahrenheit',
        briefing_delivery: '07:30 AM'
      }
    };

    const normalized = weatherSchema.normalizeWeatherContext(rawPreference);

    assert.strictEqual(normalized.observation_type, 'explicit_preference');
    assert.strictEqual(normalized.is_identity_claim, true);
    assert.strictEqual(normalized.visibility, 'private');
    assert.strictEqual(normalized.data.temp_unit_scale, 'Fahrenheit');
  });
});