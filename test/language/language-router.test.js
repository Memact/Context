const assert = require('assert');
const LanguageAnalyzer = require('../../src/language/language-analyzer');
const LanguageRouter = require('../../src/language/language-router');
const { LANGUAGE_STATUS } = require('../../src/language/language-constants');

describe('LanguageRouter', () => {
  let analyzer;
  let router;

  beforeEach(() => {
    analyzer = new LanguageAnalyzer();
    router = new LanguageRouter();
  });

  describe('Routing', () => {
    it('should route active learning to correct fields', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      assert.ok(routed.active_learning);
      assert.strictEqual(routed.active_learning.language, 'Spanish');
      assert.ok(routed.active_learning.priority > 0.5);
    });

    it('should route stable languages to correct fields', () => {
      const data = {
        language: 'English',
        source: 'native',
        usageFrequency: 0.9
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      assert.ok(routed.stable);
      assert.strictEqual(routed.stable.language, 'English');
    });

    it('should route dormant languages to correct fields', () => {
      const data = {
        language: 'Japanese',
        source: 'former',
        usageFrequency: 0.1,
        lastUsed: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      assert.ok(routed.dormant);
      assert.strictEqual(routed.dormant.language, 'Japanese');
    });
  });

  describe('Metadata Fields', () => {
    it('should generate separate metadata fields', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      assert.ok(routed.metadata);
      assert.ok(Object.keys(routed.metadata).length > 0);
    });

    it('should have different fields for different statuses', () => {
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

      const activeAnalysis = analyzer.analyze(activeData);
      const stableAnalysis = analyzer.analyze(stableData);

      const active = router.route(activeAnalysis, activeData);
      const stable = router.route(stableAnalysis, stableData);

      assert.ok(Object.keys(active.metadata)[0].includes('active_learning'));
      assert.ok(Object.keys(stable.metadata)[0].includes('stable'));
    });
  });

  describe('Priority Application', () => {
    it('should apply correct priorities to context', () => {
      const data = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      const context = { value: 'test' };
      const updated = router.applyPriorities(context, routed);

      assert.ok(updated.priority > 0.5);
      assert.ok(updated.weight > 0.5);
    });

    it('should apply lower priority to dormant languages', () => {
      const data = {
        language: 'Japanese',
        source: 'former',
        usageFrequency: 0.1,
        lastUsed: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      };

      const analysis = analyzer.analyze(data);
      const routed = router.route(analysis, data);

      const context = { value: 'test' };
      const updated = router.applyPriorities(context, routed);

      assert.ok(updated.priority < 0.5);
      assert.ok(updated.weight < 0.5);
    });
  });

  describe('Summaries', () => {
    it('should generate language summary', () => {
      const data1 = {
        language: 'Spanish',
        source: 'duolingo',
        progress: 'intermediate',
        usageFrequency: 0.7,
        lastUsed: new Date().toISOString()
      };

      const data2 = {
        language: 'English',
        source: 'native',
        usageFrequency: 0.9
      };

      const analysis1 = analyzer.analyze(data1);
      const analysis2 = analyzer.analyze(data2);

      const routed1 = router.route(analysis1, data1);
      const routed2 = router.route(analysis2, data2);

      const summary = router.getSummary([routed1, routed2]);

      assert.strictEqual(summary.total, 2);
      assert.strictEqual(summary.activeLearning, 1);
      assert.strictEqual(summary.stable, 1);
    });
  });
});