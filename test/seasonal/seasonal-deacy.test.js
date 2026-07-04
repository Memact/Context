/**
 * Unit Tests for Seasonal Decay Engine
 */

const assert = require('assert');
const SeasonalDecayEngine = require('../../src/seasonal/index.js').SeasonalDecayEngine;
const SEASONS = require('../../src/seasonal/index.js').SEASONS;

describe('SeasonalDecayEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new SeasonalDecayEngine();
    engine.clearCache();
  });

  describe('Season Detection', () => {
    it('should detect summer season', () => {
      const summerDate = new Date(2026, 6, 15);
      const season = engine.getCurrentSeason(summerDate);
      assert.strictEqual(season, SEASONS.SUMMER);
    });

    it('should detect winter season', () => {
      const winterDate = new Date(2026, 11, 25);
      const season = engine.getCurrentSeason(winterDate);
      assert.strictEqual(season, SEASONS.WINTER);
    });

    it('should detect holiday season', () => {
      const holidayDate = new Date(2026, 11, 25);
      const season = engine.getCurrentSeason(holidayDate);
      assert.strictEqual(season, SEASONS.HOLIDAY);
    });

    it('should detect spring season', () => {
      const springDate = new Date(2026, 3, 15);
      const season = engine.getCurrentSeason(springDate);
      assert.strictEqual(season, SEASONS.SPRING);
    });

    it('should detect fall season', () => {
      const fallDate = new Date(2026, 9, 15);
      const season = engine.getCurrentSeason(fallDate);
      assert.strictEqual(season, SEASONS.FALL);
    });
  });

  describe('Coefficient Calculation', () => {
    it('should return high coefficient in summer for summer season', () => {
      const summerDate = new Date(2026, 6, 15);
      const coeff = engine.getCoefficient(SEASONS.SUMMER, summerDate);
      assert.ok(coeff.coefficient >= 0.7);
      assert.ok(coeff.isActive);
      assert.strictEqual(coeff.season, SEASONS.SUMMER);
    });

    it('should return low coefficient in winter for summer season', () => {
      const winterDate = new Date(2026, 11, 25);
      const coeff = engine.getCoefficient(SEASONS.SUMMER, winterDate);
      assert.ok(coeff.coefficient < 0.5);
      assert.ok(!coeff.isActive);
    });

    it('should return high coefficient in winter for winter season', () => {
      const winterDate = new Date(2026, 11, 25);
      const coeff = engine.getCoefficient(SEASONS.WINTER, winterDate);
      assert.ok(coeff.coefficient >= 0.7);
      assert.ok(coeff.isActive);
    });

    it('should include emoji in result', () => {
      const summerDate = new Date(2026, 6, 15);
      const coeff = engine.getCoefficient(SEASONS.SUMMER, summerDate);
      assert.ok(coeff.emoji);
      assert.strictEqual(coeff.emoji, '☀️');
    });
  });

  describe('Genre Relevance', () => {
    it('should boost summer genres in summer', () => {
      const summerDate = new Date(2026, 6, 15);
      const relevance = engine.getGenreRelevance('pop', summerDate);
      assert.ok(relevance.relevance >= 0.6);
      assert.strictEqual(relevance.season, SEASONS.SUMMER);
      assert.ok(relevance.isCurrentSeason);
    });

    it('should decay summer genres in winter', () => {
      const winterDate = new Date(2026, 11, 25);
      const relevance = engine.getGenreRelevance('pop', winterDate);
      assert.ok(relevance.relevance < 0.6);
      assert.ok(!relevance.isCurrentSeason);
    });

    it('should boost winter genres in winter', () => {
      const winterDate = new Date(2026, 11, 25);
      const relevance = engine.getGenreRelevance('classical', winterDate);
      assert.ok(relevance.relevance >= 0.6);
      assert.strictEqual(relevance.season, SEASONS.WINTER);
      assert.ok(relevance.isCurrentSeason);
    });
  });

  describe('Playlist Analysis', () => {
    it('should apply seasonal weights to playlist', () => {
      const summerDate = new Date(2026, 6, 15);
      const playlist = [
        { id: 1, genre: 'pop' },
        { id: 2, genre: 'classical' },
        { id: 3, genre: 'rock' }
      ];

      const analyzed = engine.applyToPlaylist(playlist, summerDate);
      
      assert.ok(analyzed[0].seasonalWeight > analyzed[1].seasonalWeight);
      assert.ok(analyzed[0].isSeasonal);
      assert.ok(analyzed[0].emoji);
    });

    it('should handle multiple genres per track', () => {
      const summerDate = new Date(2026, 6, 15);
      const playlist = [
        { id: 1, genre: ['pop', 'dance'] },
        { id: 2, genre: ['classical', 'jazz'] }
      ];

      const analyzed = engine.applyToPlaylist(playlist, summerDate);
      assert.ok(analyzed[0].seasonalWeight > analyzed[1].seasonalWeight);
    });

    it('should handle tracks with no genre', () => {
      const summerDate = new Date(2026, 6, 15);
      const playlist = [
        { id: 1, genre: 'pop' },
        { id: 2, genre: undefined }
      ];

      const analyzed = engine.applyToPlaylist(playlist, summerDate);
      assert.strictEqual(analyzed[1].seasonalWeight, 0.5);
    });
  });

  describe('Recommendations', () => {
    it('should return summer genres in summer', () => {
      const summerDate = new Date(2026, 6, 15);
      const recommendations = engine.getRecommendations(summerDate);
      assert.ok(recommendations.length > 0);
      assert.ok(recommendations[0].relevance >= 0.5);
      assert.ok(recommendations[0].emoji);
    });

    it('should return winter genres in winter', () => {
      const winterDate = new Date(2026, 11, 25);
      const recommendations = engine.getRecommendations(winterDate);
      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.genre === 'classical' || r.genre === 'jazz'));
    });

    it('should respect limit parameter', () => {
      const summerDate = new Date(2026, 6, 15);
      const recommendations = engine.getRecommendations(summerDate, 3);
      assert.strictEqual(recommendations.length, 3);
    });
  });

  describe('Current Season with Emoji', () => {
    it('should return current season with emoji', () => {
      const summerDate = new Date(2026, 6, 15);
      const result = engine.getCurrentSeasonWithEmoji(summerDate);
      assert.ok(result.season);
      assert.ok(result.emoji);
      assert.ok(result.description);
    });
  });

  describe('Seasonal Calendar', () => {
    it('should generate seasonal calendar', () => {
      const calendar = engine.getSeasonalCalendar(2026);
      assert.ok(calendar.summer);
      assert.ok(calendar.winter);
      assert.ok(calendar.spring);
      assert.ok(calendar.fall);
      assert.ok(calendar.holiday);
      assert.ok(calendar.summer.emoji);
    });

    it('should handle holiday season year wrap', () => {
      const calendar = engine.getSeasonalCalendar(2026);
      assert.ok(calendar.holiday);
      assert.ok(calendar.holiday.start.includes('2026'));
      assert.ok(calendar.holiday.end.includes('2027'));
    });
  });

  describe('Cache Performance', () => {
    it('should cache calculation results', () => {
      const date = new Date(2026, 6, 15);
      
      engine.getCoefficient(SEASONS.SUMMER, date);
      engine.getCoefficient(SEASONS.SUMMER, date);
      
      const stats = engine.getStats();
      assert.strictEqual(stats.cacheHits, 1);
      assert.strictEqual(stats.cacheMisses, 1);
    });

    it('should clear cache', () => {
      const date = new Date(2026, 6, 15);
      engine.getCoefficient(SEASONS.SUMMER, date);
      engine.clearCache();
      
      const stats = engine.getStats();
      assert.strictEqual(stats.cacheSize, 0);
      assert.strictEqual(stats.calculations, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown season gracefully', () => {
      const result = engine.getCoefficient('unknown_season');
      assert.strictEqual(result.coefficient, 0.1);
      assert.ok(result.emoji);
    });

    it('should handle empty playlist', () => {
      const summerDate = new Date(2026, 6, 15);
      const analyzed = engine.applyToPlaylist([], summerDate);
      assert.deepStrictEqual(analyzed, []);
    });

    it('should handle invalid playlist', () => {
      assert.throws(() => {
        engine.applyToPlaylist('not an array');
      }, /Playlist must be an array/);
    });
  });
});