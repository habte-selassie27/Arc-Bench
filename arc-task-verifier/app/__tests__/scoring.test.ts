import { describe, it, expect } from 'vitest';
import { calculateScores } from '../lib/scoring';
import type { EvaluationResult } from '../lib/evaluator';

function makeResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    signal_score: 0,
    arc_readiness_score: 0,
    category: 'unknown',
    core_checks: { reproducible: false, has_setup_steps: false, has_demo: false, has_dependencies: false },
    arc_checks: { uses_arc_rpc: false, mentions_foundry: false, smart_contract_ready: false, uses_usdc_gas_awareness: false, appkit_usage_possible: false },
    appkit_details: { has_send: false, has_bridge: false, has_swap: false, has_unified_balance: false, has_appkit_import: false },
    missing_items: [],
    feedback: '',
    upgrade_path: [],
    ...overrides,
  };
}

describe('scoring', () => {
  it('should give 0 for empty project', () => {
    const scores = calculateScores(makeResult());
    expect(scores.totalScore).toBe(0);
    expect(scores.badge).toBe('❌ Not Ready');
  });

  it('should give perfect score for all checks', () => {
    const result = makeResult({
      core_checks: { reproducible: true, has_setup_steps: true, has_demo: true, has_dependencies: true },
      arc_checks: { uses_arc_rpc: true, mentions_foundry: true, smart_contract_ready: true, uses_usdc_gas_awareness: true, appkit_usage_possible: true },
      feedback: 'x'.repeat(100),
    });
    const scores = calculateScores(result);
    expect(scores.totalScore).toBeGreaterThanOrEqual(90);
    expect(scores.badge).toBe('🏆 Arc-Ready');
  });

  it('should calculate badge tiers correctly', () => {
    const high = calculateScores(makeResult({
      core_checks: { reproducible: true, has_setup_steps: true, has_demo: true, has_dependencies: true },
      arc_checks: { uses_arc_rpc: true, mentions_foundry: true, smart_contract_ready: true, uses_usdc_gas_awareness: true, appkit_usage_possible: true },
      feedback: 'x'.repeat(100),
    }));
    expect(high.badge).toBe('🏆 Arc-Ready');

    const mid = calculateScores(makeResult({
      core_checks: { reproducible: true, has_setup_steps: true, has_demo: true, has_dependencies: false },
      feedback: 'x'.repeat(60),
    }));
    expect(mid.totalScore).toBeGreaterThanOrEqual(40);
    expect(mid.badge).toBe('⚠️ Low Signal');

    const low = calculateScores(makeResult());
    expect(low.badge).toBe('❌ Not Ready');
  });
});
