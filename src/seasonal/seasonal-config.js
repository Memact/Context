/**
 * Seasonal Configuration Manager
 * Loads and manages seasonal configuration
 */

const {
  SEASONS,
  SEASON_DATES,
  SEASONAL_GENRES,
  DECAY_CURVES,
  DEFAULT_CURVES,
  SEASON_EMOJIS
} = require('./seasonal-constants');

class SeasonalConfig {
  constructor(options = {}) {
    this.seasons = options.seasons || SEASONS;
    this.seasonDates = options.seasonDates || SEASON_DATES;
    this.seasonalGenres = options.seasonalGenres || SEASONAL_GENRES;
    this.decayCurves = options.decayCurves || DECAY_CURVES;
    this.defaultCurves = options.defaultCurves || DEFAULT_CURVES;
    this.seasonEmojis = options.seasonEmojis || SEASON_EMOJIS;
  }

  /**
   * Get all seasons
   * @returns {Array} List of season names
   */
  getSeasons() {
    return Object.values(this.seasons);
  }

  /**
   * Get season dates
   * @param {string} season - Season name
   * @returns {Object} Season dates {start, end}
   */
  getSeasonDates(season) {
    return this.seasonDates[season];
  }

  /**
   * Get genres for a season
   * @param {string} season - Season name
   * @returns {Array} List of genres
   */
  getSeasonalGenres(season) {
    return this.seasonalGenres[season]?.genres || [];
  }

  /**
   * Get boost factor for a season
   * @param {string} season - Season name
   * @returns {number} Boost factor
   */
  getBoostFactor(season) {
    return this.seasonalGenres[season]?.boost || 0.5;
  }

  /**
   * Get description for a season
   * @param {string} season - Season name
   * @returns {string} Season description
   */
  getSeasonDescription(season) {
    return this.seasonalGenres[season]?.description || 'Unknown season';
  }

  /**
   * Get emoji for a season
   * @param {string} season - Season name
   * @returns {string} Season emoji
   */
  getSeasonEmoji(season) {
    return this.seasonEmojis[season] || '🌍';
  }

  /**
   * Get decay curve configuration
   * @param {string} curveType - Curve type
   * @returns {Object} Curve configuration
   */
  getDecayCurve(curveType) {
    return this.decayCurves[curveType] || this.decayCurves.MODERATE;
  }

  /**
   * Get default curve for a season
   * @param {string} season - Season name
   * @returns {string} Default curve type
   */
  getDefaultCurve(season) {
    return this.defaultCurves[season] || 'MODERATE';
  }

  /**
   * Validate season name
   * @param {string} season - Season name to validate
   * @returns {boolean} True if valid season
   */
  isValidSeason(season) {
    return Object.values(this.seasons).includes(season);
  }

  /**
   * Get all season information
   * @returns {Object} Complete season info
   */
  getAllSeasonInfo() {
    const info = {};
    for (const season of this.getSeasons()) {
      info[season] = {
        dates: this.getSeasonDates(season),
        genres: this.getSeasonalGenres(season),
        boost: this.getBoostFactor(season),
        description: this.getSeasonDescription(season),
        emoji: this.getSeasonEmoji(season),
        defaultCurve: this.getDefaultCurve(season)
      };
    }
    return info;
  }

  /**
   * Get all genres mapped to seasons
   * @returns {Object} Genre to season mapping
   */
  getGenreToSeasonMap() {
    const map = {};
    for (const [season, info] of Object.entries(this.seasonalGenres)) {
      info.genres.forEach(genre => {
        if (!map[genre]) map[genre] = [];
        map[genre].push(season);
      });
    }
    return map;
  }
}

module.exports = SeasonalConfig;