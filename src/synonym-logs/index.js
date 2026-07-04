/**
 * Synonym Logs Module - Main Export
 * Provides synonym matching explainability logs
 */

const SynonymLogger = require('./synonym-logger');
const SynonymExplainability = require('./synonym-explainability');

module.exports = {
  SynonymLogger,
  SynonymExplainability
};