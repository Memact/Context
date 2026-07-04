/**
 * Language Module - Main Export
 * Provides language categorization and routing
 */

const LanguageAnalyzer = require('./language-analyzer');
const LanguageRouter = require('./language-router');
const {
  LANGUAGE_STATUS,
  LANGUAGE_CATEGORIES,
  PRIORITY_WEIGHTS,
  DUOLINGO_PROGRESS,
  DUOLINGO_SCORES,
  LANGUAGE_RECOGNITION
} = require('./language-constants');

module.exports = {
  LanguageAnalyzer,
  LanguageRouter,
  LANGUAGE_STATUS,
  LANGUAGE_CATEGORIES,
  PRIORITY_WEIGHTS,
  DUOLINGO_PROGRESS,
  DUOLINGO_SCORES,
  LANGUAGE_RECOGNITION
};