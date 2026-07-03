/**
 * Playlist Analyzer for Seasonal Decay
 * Analyzes and weights playlists based on seasonal coefficients
 */

const { getSeasonFromDate, parseDate } = require('../utils/date-utils');

class PlaylistAnalyzer {
  constructor(config, coefficient) {
    this.config = config;
    this.coefficient = coefficient;
  }

  /**
   * Analyze a playlist with seasonal weights
   * @param {Array} playlist - Array of tracks
   * @param {Date|string} date - Date to analyze for
   * @returns {Array} Analyzed playlist
   */
  analyzePlaylist(playlist, date = new Date()) {
    const parsedDate = parseDate(date);
    const currentSeason = getSeasonFromDate(parsedDate, this.config.seasonDates, this.config.seasons);

    if (!Array.isArray(playlist)) {
      throw new Error('Playlist must be an array');
    }

    return playlist.map(track => this.analyzeTrack(track, parsedDate, currentSeason));
  }

  /**
   * Analyze a single track
   * @param {Object} track - Track object
   * @param {Date} date - Date to analyze for
   * @param {string} currentSeason - Current season
   * @returns {Object} Analyzed track
   */
  analyzeTrack(track, date, currentSeason) {
    if (!track.genre) {
      return {
        ...track,
        seasonalWeight: 0.5,
        season: currentSeason,
        isSeasonal: false,
        emoji: '🎵'
      };
    }

    const genres = Array.isArray(track.genre) ? track.genre : [track.genre];
    let totalRelevance = 0;
    let maxRelevance = 0;
    let dominantSeason = null;
    let dominantEmoji = '🎵';

    genres.forEach(genre => {
      const relevance = this.coefficient.getGenreCoefficient(genre, date);
      totalRelevance += relevance.relevance;
      if (relevance.relevance > maxRelevance) {
        maxRelevance = relevance.relevance;
        dominantSeason = relevance.season;
        dominantEmoji = relevance.emoji;
      }
    });

    const seasonalWeight = genres.length > 0
      ? (totalRelevance / genres.length) * 1.2 + maxRelevance * 0.3
      : 0.5;

    return {
      ...track,
      seasonalWeight: Math.min(1.0, seasonalWeight),
      season: dominantSeason || currentSeason,
      isSeasonal: seasonalWeight > 0.6,
      emoji: dominantEmoji,
      relevanceBreakdown: genres.map(genre => ({
        genre,
        relevance: this.coefficient.getGenreCoefficient(genre, date).relevance
      }))
    };
  }

  /**
   * Get seasonal distribution of a playlist
   * @param {Array} playlist - Playlist to analyze
   * @param {Date|string} date - Date to analyze for
   * @returns {Object} Distribution by season
   */
  getSeasonalDistribution(playlist, date = new Date()) {
    const analyzed = this.analyzePlaylist(playlist, date);
    const distribution = {};
    const emojis = {};

    analyzed.forEach(track => {
      if (track.season) {
        distribution[track.season] = (distribution[track.season] || 0) + 1;
        emojis[track.season] = track.emoji;
      }
    });

    // Calculate percentages
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const percentages = {};
    for (const [season, count] of Object.entries(distribution)) {
      percentages[season] = {
        count,
        percentage: (count / total * 100).toFixed(2) + '%',
        emoji: emojis[season]
      };
    }

    return {
      distribution,
      percentages,
      totalTracks: total,
      dominantSeason: Object.keys(distribution).reduce((a, b) => 
        distribution[a] > distribution[b] ? a : b, null
      )
    };
  }

  /**
   * Get seasonal playlist recommendations
   * @param {Array} playlist - Playlist to analyze
   * @param {Date|string} date - Date to analyze for
   * @param {number} limit - Number of recommendations
   * @returns {Array} Recommended tracks
   */
  getSeasonalRecommendations(playlist, date = new Date(), limit = 10) {
    const analyzed = this.analyzePlaylist(playlist, date);
    
    // Sort by seasonal weight descending
    const sorted = analyzed.sort((a, b) => b.seasonalWeight - a.seasonalWeight);
    
    // Return tracks that are seasonal and have good weight
    return sorted
      .filter(track => track.isSeasonal && track.seasonalWeight > 0.6)
      .slice(0, limit);
  }

  /**
   * Identify seasonal trends in a playlist
   * @param {Array} playlist - Playlist to analyze
   * @param {Date|string} date - Date to analyze for
   * @returns {Object} Trend analysis
   */
  getSeasonalTrends(playlist, date = new Date()) {
    const analyzed = this.analyzePlaylist(playlist, date);
    const currentSeason = getSeasonFromDate(parseDate(date), this.config.seasonDates, this.config.seasons);

    // Calculate seasonal scores
    const seasonScores = {};
    const currentSeasonTracks = [];
    const offSeasonTracks = [];

    analyzed.forEach(track => {
      if (track.season) {
        seasonScores[track.season] = (seasonScores[track.season] || 0) + track.seasonalWeight;
        
        if (track.season === currentSeason) {
          currentSeasonTracks.push(track);
        } else {
          offSeasonTracks.push(track);
        }
      }
    });

    // Calculate seasonal relevance score
    const totalScore = Object.values(seasonScores).reduce((sum, score) => sum + score, 0);
    const seasonPercentages = {};
    for (const [season, score] of Object.entries(seasonScores)) {
      seasonPercentages[season] = (score / totalScore * 100).toFixed(2) + '%';
    }

    return {
      currentSeason,
      seasonScores,
      seasonPercentages,
      currentSeasonTracks: currentSeasonTracks.length,
      offSeasonTracks: offSeasonTracks.length,
      seasonalRelevance: totalScore / analyzed.length,
      dominantSeason: Object.keys(seasonScores).reduce((a, b) => 
        seasonScores[a] > seasonScores[b] ? a : b
      )
    };
  }

  /**
   * Get seasonal summary for a playlist
   * @param {Array} playlist - Playlist to analyze
   * @param {Date|string} date - Date to analyze for
   * @returns {Object} Summary information
   */
  getSeasonalSummary(playlist, date = new Date()) {
    const analyzed = this.analyzePlaylist(playlist, date);
    const distribution = this.getSeasonalDistribution(playlist, date);
    const trends = this.getSeasonalTrends(playlist, date);

    return {
      totalTracks: playlist.length,
      seasonalTracks: analyzed.filter(t => t.isSeasonal).length,
      nonSeasonalTracks: analyzed.filter(t => !t.isSeasonal).length,
      distribution,
      trends,
      averageSeasonalWeight: analyzed.reduce((sum, t) => sum + t.seasonalWeight, 0) / analyzed.length,
      dominantSeason: distribution.dominantSeason
    };
  }
}

module.exports = PlaylistAnalyzer;