/**
 * Skill Analyzer - Analyzes language skill discrepancies
 */

const {
  SOURCE_TYPES,
  SKILL_LEVELS,
  SKILL_SCORES,
  LABEL_TYPES,
  DISCREPANCY_LEVELS,
  CONFIDENCE_WEIGHTS
} = require('./skill-constants');

class SkillAnalyzer {
  constructor(options = {}) {
    this.skillScores = options.skillScores || SKILL_SCORES;
    this.confidenceWeights = options.confidenceWeights || CONFIDENCE_WEIGHTS;
    this.discrepancyThresholds = options.discrepancyThresholds || {
      mild: 10,
      moderate: 25,
      severe: 40
    };
  }

  /**
   * Analyze skill discrepancy between sources
   * @param {Object} source1 - First skill source
   * @param {Object} source2 - Second skill source
   * @returns {Object} Analysis result
   */
  analyze(source1, source2) {
    // Get scores
    const score1 = this.getSkillScore(source1.level);
    const score2 = this.getSkillScore(source2.level);

    // Calculate discrepancy
    const discrepancy = Math.abs(score1 - score2);
    const discrepancyLevel = this.getDiscrepancyLevel(discrepancy);

    // Determine labels
    const labels = this.determineLabels(source1, source2, discrepancyLevel);

    // Calculate confidence
    const confidence1 = source1.confidence || this.confidenceWeights[source1.source] || 0.5;
    const confidence2 = source2.confidence || this.confidenceWeights[source2.source] || 0.5;

    // Determine which source is more reliable
    const moreReliable = confidence1 > confidence2 ? 'source1' : 
                         confidence2 > confidence1 ? 'source2' : 'equal';

    return {
      source1: {
        ...source1,
        score: score1,
        label: labels.source1
      },
      source2: {
        ...source2,
        score: score2,
        label: labels.source2
      },
      discrepancy,
      discrepancyLevel,
      labels,
      confidence: {
        source1: confidence1,
        source2: confidence2,
        moreReliable,
        average: (confidence1 + confidence2) / 2
      },
      isMatch: discrepancyLevel === DISCREPANCY_LEVELS.NONE,
      isDiscrepancy: discrepancyLevel !== DISCREPANCY_LEVELS.NONE,
      severity: this.getSeverity(discrepancyLevel),
      recommendations: this.getRecommendations(source1, source2, discrepancyLevel),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get skill score from level
   * @param {string} level - Skill level
   * @returns {number} Score (0-100)
   */
  getSkillScore(level) {
    return this.skillScores[level] || 0;
  }

  /**
   * Get discrepancy level
   * @param {number} discrepancy - Discrepancy value
   * @returns {string} Discrepancy level
   */
  getDiscrepancyLevel(discrepancy) {
    const { mild, moderate, severe } = this.discrepancyThresholds;
    
    if (discrepancy <= mild) return DISCREPANCY_LEVELS.NONE;
    if (discrepancy <= moderate) return DISCREPANCY_LEVELS.MILD;
    if (discrepancy <= severe) return DISCREPANCY_LEVELS.MODERATE;
    return DISCREPANCY_LEVELS.SEVERE;
  }

  /**
   * Determine labels for each source
   * @param {Object} source1 - First source
   * @param {Object} source2 - Second source
   * @param {string} discrepancyLevel - Discrepancy level
   * @returns {Object} Labels
   */
  determineLabels(source1, source2, discrepancyLevel) {
    const isProfessionalSource = source1.source === SOURCE_TYPES.LINKEDIN || 
                                 source1.source === SOURCE_TYPES.RESUME;
    const isLearningSource = source2.source === SOURCE_TYPES.DUOLINGO;

    let label1, label2;

    if (isProfessionalSource && isLearningSource) {
      // LinkedIn vs Duolingo
      label1 = LABEL_TYPES.STATED_PROFESSIONAL;
      label2 = LABEL_TYPES.ACTIVE_MEASURED;
    } else if (isLearningSource && isProfessionalSource) {
      // Duolingo vs LinkedIn
      label1 = LABEL_TYPES.ACTIVE_MEASURED;
      label2 = LABEL_TYPES.STATED_PROFESSIONAL;
    } else {
      // Other combinations
      label1 = source1.source === SOURCE_TYPES.LINKEDIN ? LABEL_TYPES.STATED_PROFESSIONAL : 'unknown';
      label2 = source2.source === SOURCE_TYPES.DUOLINGO ? LABEL_TYPES.ACTIVE_MEASURED : 'unknown';
    }

    // If discrepancy exists, add flag
    if (discrepancyLevel !== DISCREPANCY_LEVELS.NONE) {
      if (label1 === LABEL_TYPES.STATED_PROFESSIONAL) {
        label1 = `${label1}_discrepancy`;
      }
      if (label2 === LABEL_TYPES.ACTIVE_MEASURED) {
        label2 = `${label2}_discrepancy`;
      }
    }

    return {
      source1: label1 || 'unknown',
      source2: label2 || 'unknown',
      overall: discrepancyLevel === DISCREPANCY_LEVELS.NONE ? LABEL_TYPES.MATCH : LABEL_TYPES.DISCREPANCY
    };
  }

  /**
   * Get severity description
   * @param {string} level - Discrepancy level
   * @returns {string} Severity description
   */
  getSeverity(level) {
    const severities = {
      [DISCREPANCY_LEVELS.NONE]: 'No discrepancy detected',
      [DISCREPANCY_LEVELS.MILD]: 'Minor discrepancy - close enough',
      [DISCREPANCY_LEVELS.MODERATE]: 'Moderate discrepancy - needs attention',
      [DISCREPANCY_LEVELS.SEVERE]: 'Severe discrepancy - significant mismatch'
    };
    return severities[level] || 'Unknown discrepancy level';
  }

  /**
   * Get recommendations based on analysis
   * @param {Object} source1 - First source
   * @param {Object} source2 - Second source
   * @param {string} level - Discrepancy level
   * @returns {Array} Recommendations
   */
  getRecommendations(source1, source2, level) {
    const recommendations = [];

    if (level === DISCREPANCY_LEVELS.NONE) {
      recommendations.push('Skills match - no action needed');
      recommendations.push('Maintain current learning pace');
    }

    if (level === DISCREPANCY_LEVELS.MILD) {
      recommendations.push('Minor mismatch detected - consider reviewing skill levels');
      recommendations.push(`Update ${source1.level} or ${source2.level} to align`);
    }

    if (level === DISCREPANCY_LEVELS.MODERATE) {
      recommendations.push('Moderate discrepancy detected - recommend verifying skills');
      recommendations.push('Consider taking a formal assessment');
      recommendations.push(`Review ${source1.source} claim (${source1.level}) vs ${source2.source} (${source2.level})`);
    }

    if (level === DISCREPANCY_LEVELS.SEVERE) {
      recommendations.push('⚠️ Severe discrepancy detected - immediate attention needed');
      recommendations.push('Recommend professional assessment');
      recommendations.push('Update professional profile to match actual skill level');
      recommendations.push('Consider intensive learning if aiming for stated level');
    }

    // Add source-specific recommendations
    if (source1.source === SOURCE_TYPES.LINKEDIN) {
      recommendations.push(`Verify LinkedIn claim: "${source1.level}" with actual proficiency`);
    }

    if (source2.source === SOURCE_TYPES.DUOLINGO) {
      recommendations.push(`Continue Duolingo tracking to measure actual progress`);
    }

    return recommendations;
  }

  /**
   * Compare multiple skill sources
   * @param {Array} sources - Array of skill sources
   * @returns {Array} Analysis results
   */
  analyzeMultiple(sources) {
    const results = [];

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const result = this.analyze(sources[i], sources[j]);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get skill level from score
   * @param {number} score - Score (0-100)
   * @returns {string} Skill level
   */
  getLevelFromScore(score) {
    if (score <= 10) return SKILL_LEVELS.BEGINNER;
    if (score <= 25) return SKILL_LEVELS.ELEMENTARY;
    if (score <= 45) return SKILL_LEVELS.INTERMEDIATE;
    if (score <= 65) return SKILL_LEVELS.UPPER_INTERMEDIATE;
    if (score <= 80) return SKILL_LEVELS.ADVANCED;
    if (score <= 90) return SKILL_LEVELS.FLUENT;
    return SKILL_LEVELS.NATIVE;
  }

  /**
   * Get summary of all analyses
   * @param {Array} results - Analysis results
   * @returns {Object} Summary
   */
  getSummary(results) {
    const total = results.length;
    const matches = results.filter(r => r.isMatch).length;
    const discrepancies = results.filter(r => r.isDiscrepancy).length;

    const byLevel = {
      [DISCREPANCY_LEVELS.NONE]: 0,
      [DISCREPANCY_LEVELS.MILD]: 0,
      [DISCREPANCY_LEVELS.MODERATE]: 0,
      [DISCREPANCY_LEVELS.SEVERE]: 0
    };

    for (const result of results) {
      byLevel[result.discrepancyLevel]++;
    }

    const byLabel = {
      [LABEL_TYPES.STATED_PROFESSIONAL]: 0,
      [LABEL_TYPES.ACTIVE_MEASURED]: 0,
      [LABEL_TYPES.MATCH]: 0,
      [LABEL_TYPES.DISCREPANCY]: 0
    };

    for (const result of results) {
      byLabel[result.labels.overall]++;
    }

    return {
      total,
      matches,
      discrepancies,
      matchRate: total > 0 ? (matches / total * 100).toFixed(2) + '%' : '0%',
      byLevel,
      byLabel,
      averageDiscrepancy: results.reduce((sum, r) => sum + r.discrepancy, 0) / total || 0,
      recommendations: this.getGlobalRecommendations(results)
    };
  }

  /**
   * Get global recommendations from all analyses
   * @param {Array} results - Analysis results
   * @returns {Array} Global recommendations
   */
  getGlobalRecommendations(results) {
    const recommendations = new Set();

    const severe = results.filter(r => r.discrepancyLevel === DISCREPANCY_LEVELS.SEVERE);
    const moderate = results.filter(r => r.discrepancyLevel === DISCREPANCY_LEVELS.MODERATE);

    if (severe.length > 0) {
      recommendations.add('⚠️ Severe discrepancies found - review all language claims');
    }

    if (moderate.length > 0) {
      recommendations.add('📝 Moderate discrepancies found - recommend verification');
    }

    if (severe.length === 0 && moderate.length === 0) {
      recommendations.add('✅ All skill claims aligned - good job!');
    }

    // Add specific recommendations
    const linkedInClaims = results.filter(r => 
      r.source1.source === SOURCE_TYPES.LINKEDIN || r.source2.source === SOURCE_TYPES.LINKEDIN
    );

    if (linkedInClaims.some(r => r.isDiscrepancy)) {
      recommendations.add('📋 Review LinkedIn skill claims against actual progress');
    }

    return Array.from(recommendations);
  }
}

module.exports = SkillAnalyzer;