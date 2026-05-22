import type { AnalysisResult } from './solidity-analyzer';

export interface SlitherFinding {
  check: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface EnhancedAnalysis extends AnalysisResult {
  slitherFindings: SlitherFinding[];
  solhintFindings: SlitherFinding[];
  overallScore: number;
}

const SLITHER_CHECKS: Array<{ check: string; pattern: RegExp; severity: 'high' | 'medium' | 'low'; message: string }> = [
  { check: 'reentrancy', pattern: /\.call\s*\{[^}]*\}\s*\([^)]*\)\s*;/g, severity: 'high', message: 'Potential reentrancy: external call in .call()' },
  { check: 'unchecked-transfer', pattern: /\.transfer\(/g, severity: 'medium', message: 'Use call() instead of transfer() for gas flexibility' },
  { check: 'timestamp-dependency', pattern: /block\.timestamp|now\b/g, severity: 'medium', message: 'Block timestamp used for critical logic' },
  { check: 'tx-origin', pattern: /tx\.origin/g, severity: 'high', message: 'Use msg.sender instead of tx.origin' },
  { check: 'delegatecall', pattern: /delegatecall/g, severity: 'high', message: 'delegatecall to untrusted address' },
  { check: 'selfdestruct', pattern: /selfdestruct\b/g, severity: 'high', message: 'Contract can be self-destructed' },
  { check: 'integer-overflow', pattern: /\b(uint|int)\d*\s+[a-z]+\s*=\s*[a-z]+\s*[-+]\s*[a-z]+\s*;/gi, severity: 'medium', message: 'Unchecked arithmetic operation' },
  { check: 'centralization', pattern: /\bonlyOwner\b|\brequire\(msg\.sender\s*==\s*owner\b/gi, severity: 'low', message: 'Centralized control pattern' },
  { check: 'gas-loop', pattern: /for\s*\([^)]+\)\s*\{[^}]*\b(transfer|call|send)\b/g, severity: 'high', message: 'External call inside loop can cause gas griefing' },
  { check: 'uninitialized-state', pattern: /(bool|address|uint\d*)\s+public\s+\w+;/g, severity: 'medium', message: 'Uninitialized state variable' },
];

const SOLHINT_RULES: Array<{ check: string; pattern: RegExp; severity: 'low' | 'medium'; message: string }> = [
  { check: 'func-visibility', pattern: /function\s+\w+\s*\([^)]*\)\s*\{/g, severity: 'medium', message: 'Explicit function visibility required' },
  { check: 'compiler-version', pattern: /pragma\s+solidity\s+\^?\d+\.\d+\.\d+/g, severity: 'low', message: 'Lock compiler version with exact pragma' },
  { check: 'naming-convention', pattern: /(uint|int|bool|address|string|bytes\d*)\s+[A-Z]/g, severity: 'low', message: 'Variable should not start with uppercase' },
  { check: 'event-param', pattern: /emit\s+\w+\s*\([^)]*\)/g, severity: 'low', message: 'Consider indexed event parameters' },
  { check: 'modifier-order', pattern: /\b(public|external)\s+view\b|\b(public|external)\s+pure\b/g, severity: 'low', message: 'Cheap modifiers should come before expensive ones' },
  { check: 'no-empty-block', pattern: /\{\s*\}/g, severity: 'medium', message: 'Remove empty blocks' },
  { check: 'long-line', pattern: /^.{121,}$/gm, severity: 'low', message: 'Line exceeds 120 characters' },
  { check: 'code-complexity', pattern: /(if|for|while|require|revert).*\n.*(if|for|while|require|revert)/g, severity: 'medium', message: 'High cyclomatic complexity' },
];

export function enhanceAnalysis(source: string, baseResult: AnalysisResult): EnhancedAnalysis {
  const slitherFindings: SlitherFinding[] = [];
  const solhintFindings: SlitherFinding[] = [];

  for (const check of SLITHER_CHECKS) {
    const matches = source.match(check.pattern);
    if (matches) {
      slitherFindings.push({
        check: check.check,
        severity: check.severity,
        message: check.message,
        confidence: check.severity === 'high' ? 'high' : 'medium',
      });
    }
  }

  for (const rule of SOLHINT_RULES) {
    const matches = source.match(rule.pattern);
    if (matches) {
      solhintFindings.push({
        check: rule.check,
        severity: rule.severity,
        message: rule.message,
        confidence: 'medium',
      });
    }
  }

  const totalIssues = slitherFindings.length + solhintFindings.length + baseResult.gasIssues.length + baseResult.securityIssues.length;
  const overallScore = Math.max(0, 100 - totalIssues * 8 - slitherFindings.filter(f => f.severity === 'high').length * 5);

  return {
    ...baseResult,
    slitherFindings,
    solhintFindings,
    overallScore,
  };
}
