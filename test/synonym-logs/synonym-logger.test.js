const assert = require('assert');
const SynonymLogger = require('../../src/synonym-logs/synonym-logger');

describe('SynonymLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new SynonymLogger();
  });

  describe('Tracing', () => {
    it('should start a trace', () => {
      const traceId = logger.startTrace({ text: 'workout', field: 'fitness.goal' });
      assert.ok(traceId);
      assert.ok(logger.currentTrace);
      assert.strictEqual(logger.currentTrace.request.text, 'workout');
    });

    it('should log steps', () => {
      logger.startTrace({ text: 'workout' });
      
      logger.logStep({
        type: 'synonym_expansion',
        appField: 'workout',
        memactFields: ['fitness.goal', 'exercise.preference']
      });

      assert.strictEqual(logger.currentTrace.steps.length, 1);
    });

    it('should complete a trace', () => {
      const traceId = logger.startTrace({ text: 'workout' });
      
      logger.logStep({ type: 'synonym_expansion', appField: 'workout', memactFields: ['fitness.goal'] });
      
      logger.logResult({
        success: true,
        matches: ['fitness.goal']
      });

      const trace = logger.getTrace(traceId);
      assert.ok(trace);
      assert.ok(trace.completedAt);
      assert.ok(trace.result);
      assert.strictEqual(trace.steps.length, 1);
    });
  });

  describe('Synonym Logging', () => {
    it('should log synonym expansion', () => {
      logger.startTrace({ text: 'workout' });
      
      logger.logSynonymExpansion('workout', ['fitness.goal', 'exercise.preference'], {
        matchType: 'exact',
        confidence: 0.9,
        reason: 'Synonym mapping found'
      });

      const step = logger.currentTrace.steps[0];
      assert.strictEqual(step.type, 'synonym_expansion');
      assert.strictEqual(step.appField, 'workout');
      assert.strictEqual(step.memactFields.length, 2);
    });

    it('should log synonym failure', () => {
      logger.startTrace({ text: 'unknown' });
      
      logger.logSynonymFailure('unknown', 'No synonyms found');

      const step = logger.currentTrace.steps[0];
      assert.strictEqual(step.type, 'synonym_failure');
      assert.strictEqual(step.reason, 'No synonyms found');
    });

    it('should log partial match', () => {
      logger.startTrace({ text: 'work' });
      
      logger.logPartialMatch('work', 'workout', 0.7);

      const step = logger.currentTrace.steps[0];
      assert.strictEqual(step.type, 'partial_match');
      assert.strictEqual(step.similarity, 0.7);
    });
  });

  describe('Retrieval', () => {
    it('should get logs', () => {
      const traceId = logger.startTrace({ text: 'workout' });
      logger.logSynonymExpansion('workout', ['fitness.goal']);
      logger.logResult({ success: true });

      const logs = logger.getLogs();
      assert.strictEqual(logs.length, 1);
    });

    it('should get recent expansions', () => {
      const traceId = logger.startTrace({ text: 'workout' });
      logger.logSynonymExpansion('workout', ['fitness.goal']);
      logger.logResult({ success: true });

      const expansions = logger.getRecentExpansions();
      assert.strictEqual(expansions.length, 1);
      assert.strictEqual(expansions[0].appField, 'workout');
    });

    it('should get failures', () => {
      const traceId = logger.startTrace({ text: 'unknown' });
      logger.logSynonymFailure('unknown', 'No synonyms found');
      logger.logResult({ success: false });

      const failures = logger.getFailures();
      assert.strictEqual(failures.length, 1);
      assert.strictEqual(failures[0].reason, 'No synonyms found');
    });
  });

  describe('Statistics', () => {
    it('should provide stats', () => {
      const traceId = logger.startTrace({ text: 'workout' });
      logger.logSynonymExpansion('workout', ['fitness.goal']);
      logger.logResult({ success: true });

      const stats = logger.getStats();
      assert.strictEqual(stats.totalTraces, 1);
      assert.strictEqual(stats.successfulTraces, 1);
      assert.strictEqual(stats.totalSteps, 1);
      assert.ok(stats.stepTypes.synonym_expansion);
    });
  });

  describe('Clear', () => {
    it('should clear all logs', () => {
      const traceId = logger.startTrace({ text: 'workout' });
      logger.logSynonymExpansion('workout', ['fitness.goal']);
      logger.logResult({ success: true });

      assert.strictEqual(logger.getLogs().length, 1);
      
      logger.clear();
      
      assert.strictEqual(logger.getLogs().length, 0);
    });
  });
});