/**
 * Synonym Explainability - Wrapper for context matcher with synonym logging
 */

const SynonymLogger = require('./synonym-logger');

class SynonymExplainability {
  constructor(options = {}) {
    this.logger = new SynonymLogger(options);
    this.matcher = options.matcher || null;
    this.synonymMap = options.synonymMap || {};
    this.defaultOptions = options.defaultOptions || {};
  }

  /**
   * Match context with explainability
   * @param {Object} request - Matching request
   * @param {Object} options - Match options
   * @returns {Object} Match result with trace
   */
  match(request, options = {}) {
    const traceId = this.logger.startTrace(request);
    const opts = { ...this.defaultOptions, ...options };

    // Log the request
    this.logger.logStep({
      type: 'request_received',
      request: {
        text: request.text || '',
        field: request.field || '',
        category: request.category || ''
      }
    });

    // Log available synonyms
    const synonyms = this.findSynonyms(request.text, opts);
    if (synonyms.length > 0) {
      this.logger.logSynonymSource('synonym_trie', synonyms);
    }

    // If no synonyms found, try partial match
    if (synonyms.length === 0) {
      const partialMatch = this.findPartialMatch(request.text, opts);
      if (partialMatch) {
        this.logger.logPartialMatch(
          request.text,
          partialMatch.field,
          partialMatch.similarity
        );
      } else {
        this.logger.logSynonymFailure(
          request.text,
          'No synonyms or partial matches found'
        );
      }
    }

    // Log each synonym expansion
    for (const synonym of synonyms) {
      this.logger.logSynonymExpansion(
        request.text,
        synonym.fields,
        {
          matchType: synonym.matchType || 'exact',
          confidence: synonym.confidence || 0.9,
          reason: synonym.reason || `Matched '${request.text}' to fields`
        }
      );
    }

    // Perform actual matching
    let result = null;
    if (this.matcher) {
      result = this.matcher.match(request, opts);
    } else {
      // Simple mock matching
      result = this.simpleMatch(request, synonyms, opts);
    }

    // Log the result
    this.logger.logResult({
      success: result && result.matches && result.matches.length > 0,
      matches: result?.matches || [],
      confidence: result?.confidence || 0,
      totalMatches: result?.matches?.length || 0
    });

    // Get the trace
    const trace = this.logger.getTrace(traceId);

    return {
      result,
      trace,
      explanation: this.generateExplanation(trace)
    };
  }

  /**
   * Find synonyms for a word/phrase
   * @param {string} text - Text to find synonyms for
   * @param {Object} options - Options
   * @returns {Array} Synonyms found
   */
  findSynonyms(text, options = {}) {
    const results = [];
    const textLower = text.toLowerCase().trim();

    // Use the synonym map
    for (const [key, value] of Object.entries(this.synonymMap)) {
      if (textLower.includes(key) || key.includes(textLower)) {
        results.push({
          field: key,
          fields: Array.isArray(value) ? value : [value],
          matchType: 'exact',
          confidence: 0.9,
          reason: `Direct match: '${text}' → '${key}'`
        });
      }
    }

    return results;
  }

  /**
   * Find partial matches
   * @param {string} text - Text to match
   * @param {Object} options - Options
   * @returns {Object|null} Partial match or null
   */
  findPartialMatch(text, options = {}) {
    const textLower = text.toLowerCase().trim();

    for (const [key, value] of Object.entries(this.synonymMap)) {
      if (textLower.includes(key.substring(0, 3)) || key.includes(textLower.substring(0, 3))) {
        return {
          field: key,
          fields: Array.isArray(value) ? value : [value],
          similarity: 0.6,
          reason: `Partial match: '${text}' similar to '${key}'`
        };
      }
    }

    return null;
  }

  /**
   * Simple matching for demo
   * @param {Object} request - Request
   * @param {Array} synonyms - Synonyms
   * @param {Object} options - Options
   * @returns {Object} Match result
   */
  simpleMatch(request, synonyms, options = {}) {
    const matches = [];

    for (const synonym of synonyms) {
      for (const field of synonym.fields) {
        matches.push({
          field,
          confidence: synonym.confidence || 0.8,
          reason: synonym.reason || 'Synonym match',
          source: request.text
        });
      }
    }

    return {
      matches,
      confidence: matches.length > 0 ? 0.8 : 0,
      totalMatches: matches.length,
      success: matches.length > 0
    };
  }

  /**
   * Generate human-readable explanation
   * @param {Object} trace - Trace object
   * @returns {string} Explanation
   */
  generateExplanation(trace) {
    if (!trace) return 'No trace available';

    const steps = trace.steps;
    if (steps.length === 0) return 'No steps recorded';

    let explanation = `🔍 Matching request: "${trace.request.text}"\n`;
    explanation += `📊 Total steps: ${steps.length}\n\n`;

    for (const step of steps) {
      switch (step.type) {
        case 'synonym_expansion':
          explanation += `  ✅ Expanded "${step.appField}" → ${step.memactFields.join(', ')}\n`;
          explanation += `     Reason: ${step.reason}\n`;
          break;
        case 'synonym_failure':
          explanation += `  ❌ No match found for "${step.appField}"\n`;
          explanation += `     Reason: ${step.reason}\n`;
          break;
        case 'partial_match':
          explanation += `  🔄 Partial match: "${step.appField}" → "${step.closestMatch}" (${(step.similarity * 100).toFixed(0)}%)\n`;
          break;
        case 'synonym_source':
          explanation += `  📚 Found synonyms from ${step.source}: ${step.synonyms.join(', ')}\n`;
          break;
        default:
          explanation += `  • ${step.type}: ${JSON.stringify(step)}\n`;
      }
    }

    if (trace.result) {
      explanation += `\n📈 Result: ${trace.result.success ? '✅ SUCCESS' : '❌ FAILED'}`;
      explanation += ` (${trace.result.totalMatches || 0} matches found)`;
      if (trace.duration) {
        explanation += ` ⏱️ ${trace.duration}ms`;
      }
    }

    return explanation;
  }

  /**
   * Generate detailed trace for debugging
   * @param {string} traceId - Trace ID
   * @returns {Object} Detailed trace
   */
  getDetailedTrace(traceId) {
    const trace = this.logger.getTrace(traceId);
    if (!trace) return null;

    return {
      ...trace,
      steps: trace.steps.map((step, index) => ({
        index: index + 1,
        ...step
      })),
      formattedDuration: trace.duration ? `${trace.duration}ms` : 'N/A'
    };
  }

  /**
   * Get explainability logs for a specific request
   * @param {string} requestText - Request text
   * @returns {Array} Matching logs
   */
  getLogsForRequest(requestText) {
    const logs = this.logger.getLogs();
    return logs.filter(log => 
      log.request.text && log.request.text.includes(requestText)
    );
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return this.logger.getStats();
  }
}

module.exports = SynonymExplainability;