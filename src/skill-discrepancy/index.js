/**
 * Skill Discrepancy Module - Main Export
 * Provides language skill discrepancy detection
 */

const SkillAnalyzer = require('./skill-analyzer');
const DiscrepancyTracker = require('./discrepancy-tracker');
const {
  SOURCE_TYPES,
  SKILL_LEVELS,
  SKILL_SCORES,
  LABEL_TYPES,
  DISCREPANCY_LEVELS,
  CONFIDENCE_WEIGHTS
} = require('./skill-constants');

module.exports = {
  SkillAnalyzer,
  DiscrepancyTracker,
  SOURCE_TYPES,
  SKILL_LEVELS,
  SKILL_SCORES,
  LABEL_TYPES,
  DISCREPANCY_LEVELS,
  CONFIDENCE_WEIGHTS
};