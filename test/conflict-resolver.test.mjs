import { describe, it } from 'node:test';
import assert from 'assert';
import { resolveContextConflict } from '../src/conflict-resolver.mjs';

describe('Context Conflict Resolution Engine', () => {

  it('Rule 1: Explicit general preference should override inferred specialized activity', () => {
    const claimA = {
      category: 'interaction-style', // General
      observation_type: 'explicit_preference',
      data: { tone: 'casual' }
    };
    
    const claimB = {
      category: 'academic-profile', // Highly Specialized
      observation_type: 'inferred_preference',
      data: { tone: 'formal' }
    };

    const winner = resolveContextConflict(claimA, claimB);
    assert.strictEqual(winner.category, 'interaction-style');
    assert.strictEqual(winner.data.tone, 'casual');
  });

  it('Rule 2: Specialized category should win if both are inferred', () => {
    const claimA = {
      category: 'interaction-style', // General
      observation_type: 'inferred_preference',
      data: { theme: 'light' }
    };
    
    const claimB = {
      category: 'developer-workspace', // Specialized
      observation_type: 'inferred_preference',
      data: { theme: 'dark' }
    };

    const winner = resolveContextConflict(claimA, claimB);
    assert.strictEqual(winner.category, 'developer-workspace');
    assert.strictEqual(winner.data.theme, 'dark');
  });

  it('Rule 3: Should fall back to confidence if both observation type and category tie', () => {
    const claimA = {
      category: 'fitness',
      observation_type: 'weak_observation',
      confidence: 0.3,
      data: { goal: 'maintenance' }
    };
    
    const claimB = {
      category: 'fitness',
      observation_type: 'weak_observation',
      confidence: 0.8,
      data: { goal: 'weight loss' }
    };

    const winner = resolveContextConflict(claimA, claimB);
    assert.strictEqual(winner.data.goal, 'weight loss');
  });
});