/**
 * Seasonal Module - Main Export
 * Provides seasonal decay functionality for Memact Context
 */

const SeasonalConfig = require('./seasonal-config');
const SeasonalCoefficient = require('./seasonal-coefficient');
const SeasonalDecayEngine = require('./seasonal-decay-engine');
const PlaylistAnalyzer = require('./playlist-analyzer');
const {
  SEASONS,
  SEASON_DATES,
  SEASONAL_GENRES,
  DECAY_CURVES,
  DEFAULT_CURVES,
  SEASON_EMOJIS
} = require('./seasonal-constants');

module.exports = {
  // Main engine
  SeasonalDecayEngine,
  
  // Components
  SeasonalConfig,
  SeasonalCoefficient,
  PlaylistAnalyzer,
  
  // Constants
  SEASONS,
  SEASON_DATES,
  SEASONAL_GENRES,
  DECAY_CURVES,
  DEFAULT_CURVES,
  SEASON_EMOJIS
};