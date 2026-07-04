/**
 * Seasonal Coefficient Calculator
 * Calculates decay coefficients based on season and date
 */

const SeasonalConfig = require('./seasonal-config');
const {
  parseDate,
  daysUntil,
  getSeasonMidpoint,
  getSeasonFromDate
} = require('../utils/date-utils');

class SeasonalCoefficient {
  constructor(config) {
    this.config = config || new SeasonalConfig();
    this.cache = new Map();
    this.stats = {
      calculations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Calculate seasonal coefficient for a given season and date
   * @param {string} season - Season name
   * @param {Date|string} date - Date to calculate for
   * @param {string} curveType - Type of decay curve
   * @returns {Object} Coefficient result
   */
  calculate(season, date = new Date(), curveType = null) {
    const parsedDate = parseDate(date);
    const cacheKey = `${season}-${parsedDate.toISOString().split('T')[0]}-${curveType || 'default'}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    this.stats.cacheMisses++;
    this.stats.calculations++;

    // Validate season
    if (!this.config.isValidSeason(season)) {
      const result = {
        coefficient: 0.1,
        season,
        isActive: false,
        daysUntilPeak: 365,
        decayRate: 0.1,
        description: 'Unknown season',
        emoji: '❓'
      };
      this.cache.set(cacheKey, result);
      return result;
    }

    // Get current season
    const currentSeason = getSeasonFromDate(parsedDate, this.config.seasonDates, this.config.seasons);
    const isActive = season === currentSeason;

    // Get season dates and info
    const seasonDates = this.config.getSeasonDates(season);
    const seasonInfo = this.config.seasonalGenres[season];
    
    if (!seasonDates || !seasonInfo) {
      const result = {
        coefficient: 0.1,
        season,
        isActive: false,
        daysUntilPeak: 365,
        decayRate: 0.1,
        description: 'Season not found',
        emoji: '❓'
      };
      this.cache.set(cacheKey, result);
      return result;
    }

    // Get curve configuration
    const actualCurveType = curveType || this.config.getDefaultCurve(season);
    const curveConfig = this.config.getDecayCurve(actualCurveType);

    // Calculate days until peak
    const peakDay = getSeasonMidpoint(seasonDates);
    const daysUntilPeak = daysUntil(peakDay, parsedDate);

    // Calculate decay rate based on curve
    const decayRate = this.applyCurve(curveConfig, isActive, daysUntilPeak);

    // Calculate final coefficient with boosts
    let coefficient = isActive ? 1.0 : decayRate;
    coefficient = this.applyBoosts(coefficient, season, parsedDate);

    const result = {
      coefficient: Math.max(0.05, Math.min(1.0, coefficient)),
      season,
      isActive,
      daysUntilPeak,
      decayRate,
      curveType: actualCurveType,
      description: seasonInfo.description,
      boost: seasonInfo.boost,
      emoji: this.config.getSeasonEmoji(season)
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Apply decay curve
   * @param {Object} curveConfig - Curve configuration
   * @param {boolean} isActive - Is season active
   * @param {number} daysUntilPeak - Days until peak
   * @returns {number} Decay rate
   */
  applyCurve(curveConfig, isActive, daysUntilPeak) {
    const { type, rate, slope, steepness, peak, floor, width } = curveConfig;

    switch (type) {
      case 'exponential': {
        if (isActive) return 1.0;
        return 1 - Math.exp(-rate * daysUntilPeak) * 0.8 + floor;
      }
      
      case 'linear': {
        if (isActive) return 1.0;
        return Math.max(floor, peak - slope * daysUntilPeak);
      }
      
      case 'sigmoid': {
        const z = steepness * (daysUntilPeak - 30);
        if (isActive) return 1.0;
        return floor + (peak - floor) / (1 + Math.exp(z));
      }
      
      case 'gaussian': {
        if (isActive) return 1.0;
        const sigma = width * 30;
        const gaussian = Math.exp(-Math.pow(daysUntilPeak, 2) / (2 * sigma * sigma));
        return floor + (peak - floor) * gaussian;
      }
      
      default: {
        return Math.max(0.1, 1 - daysUntilPeak / 180);
      }
    }
  }

  /**
   * Apply seasonal boosts
   * @param {number} coefficient - Base coefficient
   * @param {string} season - Season name
   * @param {Date} date - Current date
   * @returns {number} Boosted coefficient
   */
  applyBoosts(coefficient, season, date) {
    const seasonInfo = this.config.seasonalGenres[season];
    if (!seasonInfo) return coefficient;

    let boosted = coefficient;

    // Apply season-specific boost
    boosted += seasonInfo.boost * 0.2;

    // Holiday specific boosts
    if (season === this.config.seasons.HOLIDAY) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      if (month === 12 && day >= 20 && day <= 26) {
        boosted += 0.3; // Christmas week
      }
      if (month === 12 && day === 31) {
        boosted += 0.2; // New Year's Eve
      }
      if (month === 1 && day === 1) {
        boosted += 0.2; // New Year's Day
      }
    }

    // Summer weekend boost
    if (season === this.config.seasons.SUMMER) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        boosted += 0.1;
      }
    }

    // Winter evening boost
    if (season === this.config.seasons.WINTER) {
      const hour = date.getHours();
      if (hour >= 18 && hour <= 23) {
        boosted += 0.1;
      }
    }

    return Math.min(1.0, Math.max(0.05, boosted));
  }

  /**
   * Get coefficient for a specific genre
   * @param {string} genre - Music genre
   * @param {Date|string} date - Date to calculate for
   * @returns {Object} Genre relevance
   */
  getGenreCoefficient(genre, date = new Date()) {
    const parsedDate = parseDate(date);
    const currentSeason = getSeasonFromDate(parsedDate, this.config.seasonDates, this.config.seasons);
    let maxRelevance = 0.1;
    let relevantSeason = null;

    for (const season of this.config.getSeasons()) {
      const genres = this.config.getSeasonalGenres(season);
      if (genres.includes(genre)) {
        const coeff = this.calculate(season, parsedDate);
        const relevance = coeff.coefficient * (1 + this.config.getBoostFactor(season) * 0.3);
        if (relevance > maxRelevance) {
          maxRelevance = relevance;
          relevantSeason = season;
        }
      }
    }

    return {
      genre,
      relevance: Math.min(1.0, maxRelevance),
      season: relevantSeason,
      isCurrentSeason: relevantSeason === currentSeason,
      timestamp: parsedDate.toISOString(),
      emoji: relevantSeason ? this.config.getSeasonEmoji(relevantSeason) : '🌍'
    };
  }

  /**
   * Get all genre coefficients for a season
   * @param {string} season - Season name
   * @param {Date|string} date - Date to calculate for
   * @returns {Array} Genre coefficients
   */
  getSeasonGenreCoefficients(season, date = new Date()) {
    const parsedDate = parseDate(date);
    const genres = this.config.getSeasonalGenres(season);
    const coeff = this.calculate(season, parsedDate);

    return genres.map(genre => ({
      genre,
      coefficient: coeff.coefficient * (1 + this.config.getBoostFactor(season) * 0.3),
      season,
      isActive: coeff.isActive,
      emoji: coeff.emoji
    }));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const { calculations, cacheHits, cacheMisses } = this.stats;
    const total = calculations + cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total * 100).toFixed(2) + '%' : '0%';
    
    return {
      ...this.stats,
      totalRequests: total,
      cacheHitRate: hitRate,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.stats = {
      calculations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

module.exports = SeasonalCoefficient;