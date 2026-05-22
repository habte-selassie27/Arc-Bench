import { describe, it, expect } from 'vitest';
import { formatEvaluationComment } from '../lib/github-comment';
import type { EvaluationResult } from '../lib/evaluator';
import type { ScoreBreakdown } from '../lib/scoring';

const sampleResult: EvaluationResult = {
  signal_score: 60,
  arc_readiness_score: 40,
  category: 'frontend',
  core_checks: { reproducible: true, has_setup_steps: true, has_demo: false, has_dependencies: true },
  arc_checks: { uses_arc_rpc: false, mentions_foundry: true, smart_contract_ready: true, uses_usdc_gas_awareness: false, appkit_usage_possible: true },
  appkit_details: { has_send: false, has_bridge: true, has_swap: false, has_unified_balance: false, has_appkit_import: true },
  missing_items: ['Add Arc RPC', 'Add USDC support'],
  feedback: 'Solid foundation.',
  upgrade_path: ['Configure Arc RPC', 'Add Foundry scripts'],
};

const sampleScores: ScoreBreakdown = {
  baseSignalScore: 60,
  arcBonusScore: 40,
  totalScore: 52,
  category: 'frontend',
  badge: '🔧 Needs Work',
};

describe('github-comment', () => {
  it('should format evaluation comment with scores', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('Arc Evaluation Report');
    expect(comment).toContain('52/100');
    expect(comment).toContain('🔧 Needs Work');
    expect(comment).toContain('Signal Score');
    expect(comment).toContain('Arc Readiness');
  });

  it('should include check lists', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('✅');
    expect(comment).toContain('❌');
  });

  it('should include missing items section', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('Missing Items');
    expect(comment).toContain('Add Arc RPC');
  });

  it('should include upgrade path', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('Upgrade Path');
    expect(comment).toContain('Configure Arc RPC');
  });

  it('should include App Kit section', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('App Kit Scan');
  });

  it('should include badge image', () => {
    const comment = formatEvaluationComment(sampleResult, sampleScores);
    expect(comment).toContain('api/badge?score=52');
  });
});
