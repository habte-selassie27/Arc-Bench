import type { EvaluationResult } from './types';

export type { EvaluationResult };

// In-memory cache for evaluations
const evaluationCache = new Map<string, EvaluationResult>();

export function getCachedEvaluation(key: string): EvaluationResult | null {
  return evaluationCache.get(key) ?? null;
}

export function setCachedEvaluation(key: string, result: EvaluationResult): void {
  evaluationCache.set(key, result);
  // Keep cache under 100 entries
  if (evaluationCache.size > 100) {
    const firstKey = evaluationCache.keys().next().value;
    if (firstKey) evaluationCache.delete(firstKey);
  }
}

export function clearCache(): void {
  evaluationCache.clear();
}

export async function evaluateProject(content: string): Promise<EvaluationResult> {
  const lower = content.toLowerCase();

  // Core checks
  const hasSetupSteps = /install|npm install|yarn|pnpm|pip install|forge|foundry|setup|getting started|quick start/i.test(content);
  const hasDemo = /demo|live|deployed|hosted|vercel|netlify|heroku|localhost|run|start/i.test(content);
  const hasDependencies = /package\.json|requirements\.txt|cargo\.toml|go\.mod|dependencies|devDependencies/i.test(content);
  const hasReadme = content.length > 100;
  const reproducible = hasSetupSteps && hasDependencies && hasReadme;

  // Arc-specific checks
  const usesArcRpc = /arc\.network|5042002|rpc\.testnet\.arc/i.test(content);
  const mentionsFoundry = /foundry|forge|cast|anvil|solidity|\.sol/i.test(content);
  const smartContractReady = /contract|pragma solidity|function|event|constructor/i.test(content);
  const usesUsdcGasAwareness = /usdc|gas|native token|stablecoin/i.test(content);
  const appkitUsagePossible = /app.?kit|bridge|swap|send|cross.?chain|cctp/i.test(content);

  // App Kit deep scan
  const hasSend = /send|transfer|erc20.*transfer/i.test(lower);
  const hasBridge = /bridge|cctp|cross.?chain|circle/i.test(lower);
  const hasSwap = /swap|dex|uniswap|amm|liquidity/i.test(lower);
  const hasUnifiedBalance = /unified.?balance|balance.*combine|multi.?chain.*balance/i.test(lower);
  const hasAppkitImport = /@arc\/app.?kit|arc.*app.?kit|import.*app.?kit/i.test(lower);

  // Category detection
  let category = 'unknown';
  if (smartContractReady && mentionsFoundry) category = 'smart_contract';
  else if (appkitUsagePossible || /react|next|vue|angular|frontend/i.test(lower)) category = 'frontend';
  else if (/api|server|backend|node|express|fastapi|django/i.test(lower)) category = 'backend';
  else if (smartContractReady || appkitUsagePossible) category = 'fullstack';

  // Scoring
  let signalScore = 0;
  if (reproducible) signalScore += 25;
  if (hasSetupSteps) signalScore += 20;
  if (hasDemo) signalScore += 20;
  if (hasDependencies) signalScore += 15;
  if (hasReadme) signalScore += 20;

  let arcScore = 0;
  if (usesArcRpc) arcScore += 20;
  if (mentionsFoundry) arcScore += 20;
  if (smartContractReady) arcScore += 20;
  if (usesUsdcGasAwareness) arcScore += 20;
  if (appkitUsagePossible) arcScore += 20;

  // Missing items
  const missingItems: string[] = [];
  if (!hasSetupSteps) missingItems.push('Add installation and setup instructions');
  if (!hasDemo) missingItems.push('Include a working demo or deployment link');
  if (!hasDependencies) missingItems.push('Add dependency file (package.json, requirements.txt, etc.)');
  if (!usesArcRpc) missingItems.push('Add Arc Testnet RPC configuration');
  if (!mentionsFoundry) missingItems.push('Include Foundry deployment script for Arc Testnet');
  if (!smartContractReady) missingItems.push('Add smart contract structure if applicable');
  if (!usesUsdcGasAwareness) missingItems.push('Clarify USDC gas token usage for Arc');
  if (!appkitUsagePossible) missingItems.push('Consider integrating Arc App Kit for cross-chain workflows');
  if (!hasAppkitImport) missingItems.push('Add @arc/app-kit SDK import for Send/Bridge/Swap');

  // Feedback
  let feedback = '';
  if (signalScore >= 80 && arcScore >= 60) {
    feedback = 'Strong project with good Arc alignment. Consider adding more Arc-specific integrations.';
  } else if (signalScore >= 60) {
    feedback = 'Solid foundation. Focus on Arc ecosystem integration to improve readiness score.';
  } else if (signalScore >= 40) {
    feedback = 'Project has potential but needs better documentation and Arc-specific setup.';
  } else {
    feedback = 'Project needs significant improvements in documentation, reproducibility, and Arc alignment.';
  }

  // Upgrade path
  const upgradePath: string[] = [];
  if (!usesArcRpc) upgradePath.push('Configure Arc Testnet RPC in your .env file');
  if (!mentionsFoundry) upgradePath.push('Set up Foundry project with forge init');
  if (!smartContractReady) upgradePath.push('Add Solidity contracts with proper structure');
  if (!usesUsdcGasAwareness) upgradePath.push('Update documentation to mention USDC as native gas token');
  if (!hasAppkitImport) upgradePath.push('Install @arc/app-kit: npm install @arc/app-kit');
  if (!hasSend) upgradePath.push('Implement token Send functionality using App Kit');
  if (!hasBridge) upgradePath.push('Add cross-chain Bridge support via CCTP');
  if (!hasSwap) upgradePath.push('Integrate Swap feature for same-chain token exchanges');
  if (upgradePath.length === 0) upgradePath.push('Deploy to Arc Testnet and share explorer link');

  return {
    signal_score: signalScore,
    arc_readiness_score: arcScore,
    category,
    core_checks: {
      reproducible,
      has_setup_steps: hasSetupSteps,
      has_demo: hasDemo,
      has_dependencies: hasDependencies,
    },
    arc_checks: {
      uses_arc_rpc: usesArcRpc,
      mentions_foundry: mentionsFoundry,
      smart_contract_ready: smartContractReady,
      uses_usdc_gas_awareness: usesUsdcGasAwareness,
      appkit_usage_possible: appkitUsagePossible,
    },
    appkit_details: {
      has_send: hasSend,
      has_bridge: hasBridge,
      has_swap: hasSwap,
      has_unified_balance: hasUnifiedBalance,
      has_appkit_import: hasAppkitImport,
    },
    missing_items: missingItems,
    feedback,
    upgrade_path: upgradePath,
  };
}
