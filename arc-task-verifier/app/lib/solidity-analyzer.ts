export interface Finding {
  severity: 'high' | 'medium' | 'low';
  line: number | null;
  message: string;
  suggestion: string;
}

export interface AnalysisResult {
  gasIssues: Finding[];
  securityIssues: Finding[];
  arcPatterns: string[];
  score: number;
}

function findLine(code: string, index: number): number {
  if (index < 0) return 0;
  return code.substring(0, index).split('\n').length;
}

function hasImport(code: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`import\\s+.*${escaped}`).test(code);
}

const GAS_PATTERNS: { pattern: RegExp; severity: 'high' | 'medium' | 'low'; message: string; suggestion: string }[] = [
  {
    pattern: /\bfor\s*\([^;]*;\s*[a-zA-Z_]\w*\s*[<>=!]+\s*[a-zA-Z_]\w*\.(length|balance)\s*;/g,
    severity: 'high',
    message: 'Storage array length read in loop condition',
    suggestion: 'Cache the array length in memory before the loop: uint256 len = arr.length; for(...; i < len; ...)',
  },
  {
    pattern: /\bfor\s*\(;[^;]*;\s*[a-zA-Z_]\w*\s*\+\+\s*\)\s*\{[^}]*\b(storage)\s+/g,
    severity: 'medium',
    message: 'Storage variable read inside a loop',
    suggestion: 'Cache storage variables in memory before the loop to avoid repeated SLOAD operations.',
  },
  {
    pattern: /\bwhile\s*\([^)]*\)\s*\{[^}]*\b(storage|mapping)/g,
    severity: 'medium',
    message: 'Storage access inside a while loop',
    suggestion: 'Move storage reads before the loop and cache results in local variables.',
  },
  {
    pattern: /\+\+/g,
    severity: 'low',
    message: 'Post-increment (i++) used instead of pre-increment (++i)',
    suggestion: 'Use ++i instead of i++ to save gas by avoiding the temporary variable.',
  },
  {
    pattern: /\bdelete\s+\w+\[/g,
    severity: 'medium',
    message: 'Using delete on array elements does not shrink the array',
    suggestion: 'Use pop() to remove the last element, or consider using a mapping instead of an array.',
  },
  {
    pattern: /\brequire\s*\([^)]*\)\s*;/g,
    severity: 'low',
    message: 'Using require() with string error message',
    suggestion: 'Use custom errors (error MyError();) instead of require with string messages to save gas and improve UX.',
  },
  {
    pattern: /\bpublic\s+(mapping|array)\b/g,
    severity: 'low',
    message: 'Public mapping or array auto-generates getters',
    suggestion: 'Use private or internal visibility if external access is not needed. Each public variable generates a default getter.',
  },
];

const SECURITY_PATTERNS: { pattern: RegExp; severity: 'high' | 'medium' | 'low'; message: string; suggestion: string }[] = [
  {
    pattern: /\btx\.origin\b/g,
    severity: 'high',
    message: 'tx.origin used for authorization',
    suggestion: 'Use msg.sender instead of tx.origin. tx.origin is vulnerable to phishing attacks via intermediate contracts.',
  },
  {
    pattern: /\bselfdestruct\b/g,
    severity: 'high',
    message: 'selfdestruct used in contract',
    suggestion: 'Avoid selfdestruct. It is considered deprecated and can break contract invariants. Consider a pause mechanism instead.',
  },
  {
    pattern: /\bdelegatecall\s*\(/g,
    severity: 'high',
    message: 'delegatecall detected',
    suggestion: 'Ensure delegatecall targets only trusted, immutable contract addresses. Never delegatecall to user-supplied addresses.',
  },
  {
    pattern: /\baddress\s*\([^)]*\)\s*\.\s*delegatecall/g,
    severity: 'high',
    message: 'delegatecall on a dynamic address',
    suggestion: 'Use a hardcoded or upgradable proxy pattern with a trusted implementation address.',
  },
  {
    pattern: /\bwithdraw\b|\btransfer\b|\bsend\b/g,
    severity: 'medium',
    message: 'External call in function that may be missing access control',
    suggestion: 'Ensure the function has onlyOwner, onlyRole, or equivalent access control. Follow checks-effects-interactions pattern.',
  },
  {
    pattern: /\btimestamp\b|\bblock\.timestamp\b|\bnow\b/g,
    severity: 'medium',
    message: 'Use of block.timestamp or now for critical logic',
    suggestion: 'Block timestamps can be manipulated by miners within a ~15 second window. Avoid using them for precise time-based decisions.',
  },
  {
    pattern: /\brequire\s*\(\s*msg\.value\s*(==|>=|<=|>|<)\s*\d+/g,
    severity: 'low',
    message: 'Hardcoded msg.value check',
    suggestion: 'Consider using a modifier or a setter function for payable amounts instead of hardcoding values.',
  },
];

function analyzeUncheckedLoops(code: string): Finding[] {
  const findings: Finding[] = [];
  const loopRegex = /\b(for|while)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = loopRegex.exec(code)) !== null) {
    const blockStart = code.indexOf('{', match.index);
    if (blockStart === -1) continue;

    const beforeLoop = code.substring(match.index, blockStart + 1);
    const hasUnchecked = /unchecked/.test(beforeLoop);

    if (!hasUnchecked) {
      let depth = 1;
      let blockEnd = blockStart + 1;
      while (depth > 0 && blockEnd < code.length) {
        if (code[blockEnd] === '{') depth++;
        if (code[blockEnd] === '}') depth--;
        blockEnd++;
      }

      const body = code.substring(blockStart, blockEnd);
      const hasArithmetic = /[+\-*/%]|[\+\-]{2}|[a-z]\s*[+\-*\/%]=/.test(body);

      if (hasArithmetic) {
        findings.push({
          severity: 'medium',
          line: findLine(code, match.index),
          message: 'Loop with arithmetic operations not wrapped in unchecked block',
          suggestion: 'Wrap the loop body in unchecked { ... } to avoid overflow checks on every iteration when overflow is not possible.',
        });
      }
    }
  }
  return findings;
}

function analyzeReentrancy(code: string): Finding | null {
  const hasReentrancyGuard = hasImport(code, 'ReentrancyGuard') || /nonReentrant/.test(code);
  const hasStateChanges = /\b(balance|transfer|send|call)\s*\{/.test(code) || /\.[a-z]+call\s*\{/.test(code);
  const hasExternalCall = /\.call\s*\{[^}]*\}\s*\(/.test(code) || /\}\s*\)\.value/.test(code);

  if (!hasReentrancyGuard && (hasStateChanges || hasExternalCall)) {
    return {
      severity: 'high',
      line: null,
      message: 'Contract makes external calls without reentrancy protection',
      suggestion: 'Import OpenZeppelin ReentrancyGuard and add nonReentrant modifier to functions that make external calls. Follow checks-effects-interactions pattern.',
    };
  }
  return null;
}

function analyzeCEI(code: string): Finding | null {
  const hasStateWrite = /\b[a-z_]\w*\s*=\s*[^;]+;/i.test(code);
  const hasExternalCall = /\.call\s*\{/g.test(code);

  if (hasStateWrite && hasExternalCall) {
    return {
      severity: 'medium',
      line: null,
      message: 'Contract may not follow Checks-Effects-Interactions pattern',
      suggestion: 'Perform all state changes before making external calls. Update balances/mappings first, then call external contracts.',
    };
  }
  return null;
}

const ARC_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /0x07865c6E87B9F70255377e024ace6630C1Eaa37F|USDC_ADDRESS|usdc.*address/i, label: 'References USDC address constant' },
  { pattern: /rpc\.testnet\.arc\.network|ARC_RPC|arc_rpc/i, label: 'Uses Arc RPC endpoint or constant' },
  { pattern: /@arc\s*\/appkit|@appkit|appkit|AppKit/i, label: 'Imports or references Arc App Kit' },
  { pattern: /forge-std|forge_std|Test\.sol|forge test|foundry/i, label: 'Uses Foundry test framework patterns' },
  { pattern: /vm\.startPrank|vm\.deal|vm\.expectEmit|vm\.expectRevert/i, label: 'Uses Foundry cheatcodes in tests' },
  { pattern: /arc.*token|ARC_TOKEN|arcToken/i, label: 'References Arc token or Arc-specific patterns' },
];

export function analyzeSolidity(code: string): AnalysisResult {
  const gasIssues: Finding[] = [];
  const securityIssues: Finding[] = [];
  const arcPatterns: string[] = [];

  for (const gp of GAS_PATTERNS) {
    const matches = code.matchAll(gp.pattern);
    for (const match of matches) {
      gasIssues.push({
        severity: gp.severity,
        line: findLine(code, match.index),
        message: gp.message,
        suggestion: gp.suggestion,
      });
    }
  }

  const uncheckedFindings = analyzeUncheckedLoops(code);
  gasIssues.push(...uncheckedFindings);

  for (const sp of SECURITY_PATTERNS) {
    const matches = code.matchAll(sp.pattern);
    for (const match of matches) {
      securityIssues.push({
        severity: sp.severity,
        line: findLine(code, match.index),
        message: sp.message,
        suggestion: sp.suggestion,
      });
    }
  }

  const reentrancyFinding = analyzeReentrancy(code);
  if (reentrancyFinding) {
    securityIssues.push(reentrancyFinding);
  }

  const ceiFinding = analyzeCEI(code);
  if (ceiFinding) {
    securityIssues.push(ceiFinding);
  }

  for (const ap of ARC_PATTERNS) {
    if (ap.pattern.test(code)) {
      arcPatterns.push(ap.label);
    }
  }

  const totalIssues = gasIssues.length + securityIssues.length;
  const highCount = [...gasIssues, ...securityIssues].filter((f) => f.severity === 'high').length;
  const mediumCount = [...gasIssues, ...securityIssues].filter((f) => f.severity === 'medium').length;

  let score = 100;
  score -= highCount * 20;
  score -= mediumCount * 10;
  score -= (totalIssues - highCount - mediumCount) * 3;
  score = Math.max(0, Math.min(100, score));

  if (arcPatterns.length > 0) {
    score = Math.min(100, score + arcPatterns.length * 5);
  }

  return {
    gasIssues,
    securityIssues,
    arcPatterns: [...new Set(arcPatterns)],
    score,
  };
}
