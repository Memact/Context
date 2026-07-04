const assert = require('assert');
const LanguageAnalyzer = require('../../src/language/language-analyzer');
const { LANGUAGE_STATUS } = require('../../src/language/language-constants');

describe('LanguageAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new LanguageAnalyzer();
  });

  describe('Duolingo Language Analysis', () => {
    it('should identify active learning from Duolingo', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const result = analyzer.analyze(data);
      assert.strictEqual(result.status, LANGUAGE_STATUS.ACTIVE_LEARNING);
      assert.ok(result.isActiveLearning);
      assert.ok(result.priorityWeight > 0.5);
    });

    it('should track Duolingo progress', () => {
      const data = {
        language: 'French',
        source: 'duolingo',
        progress: 'advanced',
        usageFrequency: 0.8,
        lastUsed: new Date().toISOString()
      };

      const result = analyzer.analyze(data);
      assert.strictEqual(result.duolingoProgress, 'advanced');
      assert.ok(result.duolingoScore > 80);
    });
  });

  describe('Stable Language Detection', () => {
    it('should identify stable languages', () => {
      const data = {
        language: 'English',
        source: 'native',
        usageFrequency: 0.9
      };

      const result = analyzer.analyze(data);
      assert.ok(result.isStable);
      assert.strictEqual(result.status, LANGUAGE_STATUS.STABLE);
    });

    it('should identify fluent languages', () => {
      const data = {
        language: 'German',
        source: 'fluent',
        usageFrequency: 0.85
      };

      const result = analyzer.analyze(data);
      assert.ok(result.isStable);
    });
  });

  describe('Dormant Language Detection', () => {
    it('should identify dormant languages', () => {
      const data = {
        language: 'Japanese',
        source: 'former',
        usageFrequency: 0.1,
        lastUsed: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      };

      const result = analyzer.analyze(data);
      assert.strictEqual(result.status, LANGUAGE_STATUS.DORMANT);
    });
  });

  describe('Priority Weights', () => {
    it('should give higher priority to active learning', () => {
      const activeData = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const stableData = {
        language: 'English',
        source: 'native',
        usageFrequency: 0.9
      };

      const active = analyzer.analyze(activeData);
      const stable = analyzer.analyze(stableData);

      assert.ok(active.priorityWeight > stable.priorityWeight);
    });

    it('should boost priority based on progress', () => {
      const beginner = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'beginner',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const advanced = {
        language: 'French',
        source: 'duolingo',
        progress: 'advanced',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const result1 = analyzer.analyze(beginner);
      const result2 = analyzer.analyze(advanced);

      assert.ok(result2.priorityWeight > result1.priorityWeight);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for active learning', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'beginner',
        usageFrequency: 0.6,
        lastUsed: new Date().toISOString()
      };

      const result = analyzer.analyze(data);
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.recommendations.some(r => r.includes('Continue practicing')));
    });

    it('should provide recommendations for stable languages', () => {
      const data = {
        language: 'English',
        source: 'native',
        usageFrequency: 0.9
      };

      const result = analyzer.analyze(data);
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.recommendations.some(r => r.includes('fluent')));
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence based on data completeness', () => {
      const completeData = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const minimalData = {
        language: 'Spanish',
        source: 'unknown'
      };

      const complete = analyzer.analyze(completeData);
      const minimal = analyzer.analyze(minimalData);

      assert.ok(complete.confidence > minimal.confidence);
    });
  });

  describe('Language Type', () => {
    it('should correctly categorize language types', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const result = analyzer.analyze(data);
      const type = analyzer.getLanguageType(result);
      assert.strictEqual(type, 'active_learning');
    });
  });
});