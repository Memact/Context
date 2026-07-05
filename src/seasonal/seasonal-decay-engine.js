/**
 * Seasonal Decay Engine - Main Entry Point
 * Orchestrates seasonal decay calculations and applies to context
 */

const SeasonalConfig = require('./seasonal-config');
const SeasonalCoefficient = require('./seasonal-coefficient');
const PlaylistAnalyzer = require('./playlist-analyzer');
const { getSeasonFromDate, parseDate } = require('../utils/date-utils');

class SeasonalDecayEngine {
  constructor(options = {}) {
    this.config = new SeasonalConfig(options);
    this.coefficient = new SeasonalCoefficient(this.config);
    this.analyzer = new PlaylistAnalyzer(this.config, this.coefficient);
  }

  /**
   * Get seasonal coefficient for a season/date
   * @param {string} season - Season name
   * @param {Date|string} date - Date to calculate for
   * @param {string} curveType - Curve type
   * @returns {Object} Coefficient result
   */
  getCoefficient(season, date = new Date(), curveType = null) {
    return this.coefficient.calculate(season, date, curveType);
  }

  /**
   * Get genre relevance for a date
   * @param {string} genre - Genre name
   * @param {Date|string} date - Date to calculate for
   * @returns {Object} Genre relevance
   */
  getGenreRelevance(genre, date = new Date()) {
    return this.coefficient.getGenreCoefficient(genre, date);
  }

  /**
   * Apply seasonal decay to a playlist
   * @param {Array} playlist - Array of tracks
   * @param {Date|string} date - Date to apply for
   * @returns {Array} Weighted playlist
   */
  applyToPlaylist(playlist, date = new Date()) {
    return this.analyzer.analyzePlaylist(playlist, date);
  }

  /**
   * Get seasonal recommendations
   * @param {Date|string} date - Date to get recommendations for
   * @param {number} limit - Number of recommendations
   * @returns {Array} Recommendations
   */
  getRecommendations(date = new Date(), limit = 5) {
    const parsedDate = parseDate(date);
    const currentSeason = getSeasonFromDate(parsedDate, this.config.seasonDates, this.config.seasons);
    const genres = this.config.getSeasonalGenres(currentSeason);
    
    const recommendations = genres.map(genre => {
      const relevance = this.coefficient.getGenreCoefficient(genre, parsedDate);
      return {
        genre,
        relevance: relevance.relevance,
        emoji: relevance.emoji,
        season: currentSeason
      };
    });

    return recommendations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Get seasonal boost factor
   * @param {string} season - Season name
   * @param {Date|string} date - Date to check
   * @returns {number} Boost factor
   */
  getSeasonalBoost(season, date = new Date()) {
    const coeff = this.coefficient.calculate(season, date);
    return coeff.coefficient;
  }

  /**
   * Check if a season is active
   * @param {string} season - Season name
   * @param {Date|string} date - Date to check
   * @returns {boolean} True if active
   */
  isSeasonActive(season, date = new Date()) {
    const coeff = this.coefficient.calculate(season, date);
    return coeff.isActive;
  }

  /**
   * Get full seasonal analysis
   * @param {Array} playlist - Playlist to analyze
   * @param {Date|string} date - Date to analyze for
   * @returns {Object} Complete analysis
   */
  getFullAnalysis(playlist, date = new Date()) {
    const parsedDate = parseDate(date);
    const currentSeason = getSeasonFromDate(parsedDate, this.config.seasonDates, this.config.seasons);
    
    const weightedPlaylist = this.applyToPlaylist(playlist, parsedDate);
    const recommendations = this.getRecommendations(parsedDate);
    const seasonGenres = this.config.getSeasonalGenres(currentSeason);
    const summary = this.analyzer.getSeasonalSummary(playlist, parsedDate);
    
    // Calculate season distribution
    const distribution = {};
    weightedPlaylist.forEach(track => {
      if (track.season) {
        distribution[track.season] = (distribution[track.season] || 0) + 1;
      }
    });

    return {
      currentSeason,
      currentSeasonEmoji: this.config.getSeasonEmoji(currentSeason),
      weightedPlaylist,
      recommendations,
      seasonGenres,
      distribution,
      summary,
      coefficient: this.coefficient.calculate(currentSeason, parsedDate),
      statistics: {
        totalTracks: playlist.length,
        seasonalTracks: weightedPlaylist.filter(t => t.isSeasonal).length,
        averageWeight: weightedPlaylist.reduce((sum, t) => sum + (t.seasonalWeight || 0.5), 0) / weightedPlaylist.length,
        dominantSeason: summary.dominantSeason
      }
    };
  }

  /**
   * Get current season
   * @param {Date|string} date - Date to check
   * @returns {string} Current season
   */
  getCurrentSeason(date = new Date()) {
    return getSeasonFromDate(parseDate(date), this.config.seasonDates, this.config.seasons);
  }

  /**
   * Get current season with emoji
   * @param {Date|string} date - Date to check
   * @returns {Object} Season with emoji
   */
  getCurrentSeasonWithEmoji(date = new Date()) {
    const season = this.getCurrentSeason(date);
    return {
      season,
      emoji: this.config.getSeasonEmoji(season),
      description: this.config.getSeasonDescription(season)
    };
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine stats
   */
  getStats() {
    return this.coefficient.getStats();
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.coefficient.clearCache();
  }

  /**
   * Get seasonal calendar
   * @param {number} year - Year to generate calendar for
   * @returns {Object} Seasonal calendar
   */
  getSeasonalCalendar(year = new Date().getFullYear()) {
    const calendar = {};
    
    for (const season of this.config.getSeasons()) {
      const dates = this.config.getSeasonDates(season);
      if (!dates) continue;
      
      const startDate = new Date(year, dates.start.month - 1, dates.start.day);
      const endDate = new Date(year, dates.end.month - 1, dates.end.day);
      
      if (dates.start.month > dates.end.month) {
        calendar[season] = {
          start: `${year}-${String(dates.start.month).padStart(2, '0')}-${String(dates.start.day).padStart(2, '0')}`,
          end: `${year + 1}-${String(dates.end.month).padStart(2, '0')}-${String(dates.end.day).padStart(2, '0')}`,
          emoji: this.config.getSeasonEmoji(season)
        };
      } else {
        calendar[season] = {
          start: `${year}-${String(dates.start.month).padStart(2, '0')}-${String(dates.start.day).padStart(2, '0')}`,
          end: `${year}-${String(dates.end.month).padStart(2, '0')}-${String(dates.end.day).padStart(2, '0')}`,
          emoji: this.config.getSeasonEmoji(season)
        };
      }
    }
    
    return calendar;
  }
}

module.exports = SeasonalDecayEngine;