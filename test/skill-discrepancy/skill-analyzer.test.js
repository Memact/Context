const assert = require('assert');
const SkillAnalyzer = require('../../src/skill-discrepancy/skill-analyzer');
const { SOURCE_TYPES, SKILL_LEVELS, LABEL_TYPES, DISCREPANCY_LEVELS } = require('../../src/skill-discrepancy/skill-constants');

describe('SkillAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SkillAnalyzer();
  });

  describe('Discrepancy Detection', () => {
    it('should detect discrepancy between LinkedIn and Duolingo', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Spanish'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.ok(result.isDiscrepancy);
      assert.strictEqual(result.source1.label, 'stated_professional');
      assert.strictEqual(result.source2.label, 'active_measured');
      assert.strictEqual(result.discrepancyLevel, DISCREPANCY_LEVELS.SEVERE);
    });

    it('should label LinkedIn as stated_professional', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.ADVANCED,
        language: 'French'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.ADVANCED,
        language: 'French'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.strictEqual(result.source1.label, LABEL_TYPES.STATED_PROFESSIONAL);
      assert.strictEqual(result.source2.label, LABEL_TYPES.ACTIVE_MEASURED);
    });

    it('should detect match when levels align', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Japanese'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Japanese'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.ok(result.isMatch);
      assert.strictEqual(result.labels.overall, LABEL_TYPES.MATCH);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for discrepancy', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.BEGINNER,
        language: 'Spanish'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.recommendations.some(r => r.includes('Severe discrepancy')));
    });

    it('should provide positive recommendations for match', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'German'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'German'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.ok(result.recommendations.some(r => r.includes('no action needed')));
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to Duolingo', () => {
      const linkedIn = {
        source: SOURCE_TYPES.LINKEDIN,
        level: SKILL_LEVELS.FLUENT,
        language: 'Spanish'
      };

      const duolingo = {
        source: SOURCE_TYPES.DUOLINGO,
        level: SKILL_LEVELS.INTERMEDIATE,
        language: 'Spanish'
      };

      const result = analyzer.analyze(linkedIn, duolingo);
      
      assert.ok(result.confidence.source2 > result.confidence.source1);
      assert.strictEqual(result.confidence.moreReliable, 'source2');
    });
  });

  describe('Multiple Sources', () => {
    it('should analyze multiple sources', () => {
      const sources = [
        {
          source: SOURCE_TYPES.LINKEDIN,
          level: SKILL_LEVELS.FLUENT,
          language: 'Spanish'
        },
        {
          source: SOURCE_TYPES.DUOLINGO,
          level: SKILL_LEVELS.INTERMEDIATE,
          language: 'Spanish'
        },
        {
          source: SOURCE_TYPES.RESUME,
          level: SKILL_LEVELS.ADVANCED,
          language: 'Spanish'
        }
      ];

      const results = analyzer.analyzeMultiple(sources);
      
      assert.strictEqual(results.length, 3);
      assert.ok(results.some(r => r.isDiscrepancy));
    });
  });

  describe('Summary', () => {
    it('should generate summary', () => {
      const sources = [
        {
          source: SOURCE_TYPES.LINKEDIN,
          level: SKILL_LEVELS.FLUENT,
          language: 'Spanish'
        },
        {
          source: SOURCE_TYPES.DUOLINGO,
          level: SKILL_LEVELS.INTERMEDIATE,
          language: 'Spanish'
        }
      ];

      const results = analyzer.analyzeMultiple(sources);
      const summary = analyzer.getSummary(results);
      
      assert.ok(summary.total > 0);
      assert.ok(summary.matchRate);
      assert.ok(summary.recommendations.length > 0);
    });
  });
});