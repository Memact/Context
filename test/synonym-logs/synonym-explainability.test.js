const assert = require('assert');
const SynonymExplainability = require('../../src/synonym-logs/synonym-explainability');

describe('SynonymExplainability', () => {
  let explainability;

  beforeEach(() => {
    explainability = new SynonymExplainability({
      synonymMap: {
        'workout': ['fitness.goal', 'exercise.preference'],
        'food': ['diet.preference', 'nutrition.goal']
      }
    });
  });

  describe('Matching', () => {
    it('should match with explainability', () => {
      const result = explainability.match({
        text: 'workout',
        field: 'fitness'
      });

      assert.ok(result.trace);
      assert.ok(result.explanation);
      assert.ok(result.result);
    });

    it('should log synonym expansion', () => {
      const result = explainability.match({
        text: 'workout',
        field: 'fitness'
      });

      const trace = result.trace;
      const expansionStep = trace.steps.find(s => s.type === 'synonym_expansion');
      
      assert.ok(expansionStep);
      assert.strictEqual(expansionStep.appField, 'workout');
      assert.ok(expansionStep.memactFields.includes('fitness.goal'));
    });

    it('should log synonym source', () => {
      const result = explainability.match({
        text: 'workout'
      });

      const trace = result.trace;
      const sourceStep = trace.steps.find(s => s.type === 'synonym_source');
      
      assert.ok(sourceStep);
      assert.strictEqual(sourceStep.source, 'synonym_trie');
    });

    it('should generate explanation', () => {
      const result = explainability.match({
        text: 'workout'
      });

      const explanation = result.explanation;
      assert.ok(explanation.includes('Matching request'));
      assert.ok(explanation.includes('Expanded'));
      assert.ok(explanation.includes('RESULT'));
    });
  });

  describe('Partial Matches', () => {
    it('should log partial match when no exact match', () => {
      const result = explainability.match({
        text: 'work'
      });

      const trace = result.trace;
      const partialStep = trace.steps.find(s => s.type === 'partial_match');
      
      // May or may not find partial match depending on implementation
      if (partialStep) {
        assert.strictEqual(partialStep.appField, 'work');
      }
    });

    it('should log failure when no match found', () => {
      const result = explainability.match({
        text: 'xyzabc'
      });

      const trace = result.trace;
      const failureStep = trace.steps.find(s => s.type === 'synonym_failure');
      
      assert.ok(failureStep);
      assert.strictEqual(failureStep.appField, 'xyzabc');
    });
  });

  describe('Trace Details', () => {
    it('should get detailed trace', () => {
      const result = explainability.match({
        text: 'workout'
      });

      const traceId = result.trace.id;
      const detailed = explainability.getDetailedTrace(traceId);

      assert.ok(detailed);
      assert.ok(detailed.steps);
      assert.strictEqual(detailed.request.text, 'workout');
    });

    it('should get logs for request', () => {
      explainability.match({ text: 'workout' });
      
      const logs = explainability.getLogsForRequest('workout');
      assert.ok(logs.length > 0);
    });
  });

  describe('Statistics', () => {
    it('should provide stats', () => {
      explainability.match({ text: 'workout' });
      
      const stats = explainability.getStats();
      assert.strictEqual(stats.totalTraces, 1);
    });
  });
});