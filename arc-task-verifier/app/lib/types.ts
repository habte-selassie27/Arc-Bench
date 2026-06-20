export interface EvaluationResult {
  signal_score: number;
  arc_readiness_score: number;
  category: string;
  core_checks: {
    reproducible: boolean;
    has_setup_steps: boolean;
    has_demo: boolean;
    has_dependencies: boolean;
  };
  arc_checks: {
    uses_arc_rpc: boolean;
    mentions_foundry: boolean;
    smart_contract_ready: boolean;
    uses_usdc_gas_awareness: boolean;
    appkit_usage_possible: boolean;
  };
  appkit_details?: {
    has_send: boolean;
    has_bridge: boolean;
    has_swap: boolean;
    has_unified_balance: boolean;
    has_appkit_import: boolean;
  };
  missing_items: string[];
  feedback: string;
  upgrade_path: string[];
  walletAddress?: string;
}

export interface Scores {
  baseSignalScore: number;
  arcBonusScore: number;
  totalScore: number;
  category: string;
  badge: string;
}

export interface ScoreBreakdown {
  baseSignalScore: number;
  arcBonusScore: number;
  totalScore: number;
  category: string;
  badge: string;
}

export interface DeployStatus {
  id: string;
  status: 'pending' | 'compiling' | 'deploying' | 'confirmed' | 'failed';
  txHash?: string;
  contractAddress?: string;
  gasEstimate?: {
    gasUnits: number;
    gasPriceGwei: string;
    estimatedCostUsdc: string;
  };
  error?: string;
  timestamp: number;
}

export interface TokenInfo {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  isERC20: boolean;
  missingFunctions: string[];
  hasOwnable: boolean;
  hasPausable: boolean;
  hasMintable: boolean;
}
