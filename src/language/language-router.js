/**
 * Language Router - Routes languages to appropriate metadata fields
 */

const {
  LANGUAGE_STATUS,
  PRIORITY_WEIGHTS
} = require('./language-constants');

class LanguageRouter {
  constructor(options = {}) {
    this.separateFields = options.separateFields || true;
    this.fieldPrefix = options.fieldPrefix || 'language';
  }

  /**
   * Route language to appropriate metadata fields
   * @param {Object} analysis - Language analysis result
   * @param {Object} languageData - Raw language data
   * @returns {Object} Routed language with metadata
   */
  route(analysis, languageData) {
    const routed = {
      language: analysis.language,
      status: analysis.status,
      priorityWeight: analysis.priorityWeight,
      source: analysis.source,
      timestamp: analysis.timestamp
    };

    if (analysis.isActiveLearning) {
      routed.active_learning = {
        language: analysis.language,
        progress: analysis.duolingoProgress,
        score: analysis.duolingoScore,
        source: analysis.source,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.ACTIVE_LEARNING],
        lastUsed: languageData.lastUsed || null,
        recommendations: analysis.recommendations
      };
    }

    if (analysis.isStable) {
      routed.stable = {
        language: analysis.language,
        proficiency: this.determineProficiency(languageData),
        source: analysis.source,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.STABLE]
      };
    }

    if (analysis.status === LANGUAGE_STATUS.DORMANT) {
      routed.dormant = {
        language: analysis.language,
        lastUsed: languageData.lastUsed || null,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.DORMANT],
        recommendation: analysis.recommendations[0] || null
      };
    }

    if (analysis.status === LANGUAGE_STATUS.PLANNED) {
      routed.planned = {
        language: analysis.language,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.PLANNED],
        recommendation: analysis.recommendations[0] || null
      };
    }

    // Generate separate metadata fields
    if (this.separateFields) {
      routed.metadata = this.generateMetadataFields(routed, analysis);
    }

    return routed;
  }

  /**
   * Determine proficiency level
   * @param {Object} data - Language data
   * @returns {string} Proficiency level
   */
  determineProficiency(data) {
    const { progress, source } = data;

    if (source === 'duolingo' && progress) {
      return progress;
    }

    return 'fluent';
  }

  /**
   * Generate separate metadata fields
   * @param {Object} routed - Routed language
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metadata fields
   */
  generateMetadataFields(routed, analysis) {
    const metadata = {};

    // Active learning fields
    if (analysis.isActiveLearning) {
      metadata[`${this.fieldPrefix}.active_learning.${analysis.language}`] = {
        status: LANGUAGE_STATUS.ACTIVE_LEARNING,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.ACTIVE_LEARNING],
        progress: analysis.duolingoProgress || 'beginner',
        score: analysis.duolingoScore || 0,
        source: analysis.source || 'duolingo'
      };
    }

    // Stable language fields
    if (analysis.isStable) {
      metadata[`${this.fieldPrefix}.stable.${analysis.language}`] = {
        status: LANGUAGE_STATUS.STABLE,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.STABLE],
        proficiency: 'fluent',
        source: analysis.source || 'native'
      };
    }

    // Dormant language fields
    if (analysis.status === LANGUAGE_STATUS.DORMANT) {
      metadata[`${this.fieldPrefix}.dormant.${analysis.language}`] = {
        status: LANGUAGE_STATUS.DORMANT,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.DORMANT],
        lastUsed: routed.dormant?.lastUsed || null
      };
    }

    // Planned language fields
    if (analysis.status === LANGUAGE_STATUS.PLANNED) {
      metadata[`${this.fieldPrefix}.planned.${analysis.language}`] = {
        status: LANGUAGE_STATUS.PLANNED,
        priority: PRIORITY_WEIGHTS[LANGUAGE_STATUS.PLANNED]
      };
    }

    return metadata;
  }

  /**
   * Apply priority weights to a context
   * @param {Object} context - Context object
   * @param {Object} routed - Routed language
   * @returns {Object} Context with updated weights
   */
  applyPriorities(context, routed) {
    const updated = { ...context };

    if (routed.active_learning) {
      updated.priority = routed.active_learning.priority;
      updated.weight = routed.active_learning.priority * 1.2;
    }

    if (routed.stable) {
      updated.priority = routed.stable.priority;
      updated.weight = routed.stable.priority;
    }

    if (routed.dormant) {
      updated.priority = routed.dormant.priority;
      updated.weight = routed.dormant.priority * 0.5;
    }

    if (routed.planned) {
      updated.priority = routed.planned.priority;
      updated.weight = routed.planned.priority * 0.7;
    }

    return updated;
  }

  /**
   * Get language summary
   * @param {Array} routedLanguages - Array of routed languages
   * @returns {Object} Summary
   */
  getSummary(routedLanguages) {
    const summary = {
      total: routedLanguages.length,
      activeLearning: 0,
      stable: 0,
      dormant: 0,
      planned: 0,
      languages: {}
    };

    for (const lang of routedLanguages) {
      if (lang.active_learning) {
        summary.activeLearning++;
        summary.languages[lang.language] = {
          status: LANGUAGE_STATUS.ACTIVE_LEARNING,
          priority: lang.priorityWeight
        };
      } else if (lang.stable) {
        summary.stable++;
        summary.languages[lang.language] = {
          status: LANGUAGE_STATUS.STABLE,
          priority: lang.priorityWeight
        };
      } else if (lang.dormant) {
        summary.dormant++;
        summary.languages[lang.language] = {
          status: LANGUAGE_STATUS.DORMANT,
          priority: lang.priorityWeight
        };
      } else if (lang.planned) {
        summary.planned++;
        summary.languages[lang.language] = {
          status: LANGUAGE_STATUS.PLANNED,
          priority: lang.priorityWeight
        };
      }
    }

    return summary;
  }

  /**
   * Get separate metadata fields for all languages
   * @param {Array} routedLanguages - Array of routed languages
   * @returns {Object} All metadata fields
   */
  getAllMetadataFields(routedLanguages) {
    const allMetadata = {};

    for (const lang of routedLanguages) {
      if (lang.metadata) {
        Object.assign(allMetadata, lang.metadata);
      }
    }

    return allMetadata;
  }
}

module.exports = LanguageRouter;