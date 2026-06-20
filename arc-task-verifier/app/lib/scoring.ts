import type { EvaluationResult, ScoreBreakdown } from './types';

export type { ScoreBreakdown };

export function calculateScores(result: EvaluationResult): ScoreBreakdown {
  // Base Signal Score (0-100)
  let baseSignalScore = 0;
  
  if (result.core_checks.reproducible) baseSignalScore += 25;
  if (result.core_checks.has_setup_steps) baseSignalScore += 20;
  if (result.core_checks.has_demo) baseSignalScore += 20;
  if (result.core_checks.has_dependencies) baseSignalScore += 15;
  if (result.feedback.length > 50) baseSignalScore += 20; // Documentation quality
  
  // Arc Bonus Score (0-100)
  let arcBonusScore = 0;
  
  if (result.arc_checks.uses_arc_rpc) arcBonusScore += 20;
  if (result.arc_checks.mentions_foundry) arcBonusScore += 20;
  if (result.arc_checks.smart_contract_ready) arcBonusScore += 20;
  if (result.arc_checks.uses_usdc_gas_awareness) arcBonusScore += 20;
  if (result.arc_checks.appkit_usage_possible) arcBonusScore += 20;
  
  // Total score (weighted average)
  const totalScore = Math.round((baseSignalScore * 0.6) + (arcBonusScore * 0.4));
  
  // Determine badge
  let badge = '🔍 Unknown';
  if (totalScore >= 90) badge = '🏆 Arc-Ready';
  else if (totalScore >= 75) badge = '✅ Strong Candidate';
  else if (totalScore >= 60) badge = '🔧 Needs Work';
  else if (totalScore >= 40) badge = '⚠️ Low Signal';
  else badge = '❌ Not Ready';
  
  return {
    baseSignalScore,
    arcBonusScore,
    totalScore,
    category: result.category,
    badge,
  };
}
