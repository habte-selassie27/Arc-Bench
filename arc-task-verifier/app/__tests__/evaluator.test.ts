import { describe, it, expect } from 'vitest';
import { evaluateProject } from '../lib/evaluator';

describe('evaluator', () => {
  it('should detect a basic project', async () => {
    const content = `# My Project
## Getting Started
npm install
npm run dev

## Demo
Deployed at https://myapp.vercel.app

Depends on: package.json
Uses Arc RPC at https://rpc.testnet.arc.network
Built with Foundry/Forge`;
    const result = await evaluateProject(content);
    expect(result.signal_score).toBeGreaterThan(0);
    expect(result.core_checks.reproducible).toBe(true);
    expect(result.core_checks.has_setup_steps).toBe(true);
    expect(result.arc_checks.uses_arc_rpc).toBe(true);
    expect(result.arc_checks.mentions_foundry).toBe(true);
  });

  it('should detect a low-quality project', async () => {
    const content = `# junk`;
    const result = await evaluateProject(content);
    expect(result.signal_score).toBeLessThan(30);
    expect(result.missing_items.length).toBeGreaterThan(5);
  });

  it('should detect App Kit usage', async () => {
    const content = `import { AppKit } from '@arc/app-kit';
const bridge = new Bridge();`;
    const result = await evaluateProject(content);
    expect(result.arc_checks.appkit_usage_possible).toBe(true);
    expect(result.appkit_details?.has_bridge).toBe(true);
    expect(result.appkit_details?.has_appkit_import).toBe(true);
  });

  it('should categorize smart contract projects', async () => {
    const content = `pragma solidity ^0.8.20;
contract MyToken {
    function transfer() public {}
}`;
    const result = await evaluateProject(content);
    expect(result.category).toBe('smart_contract');
    expect(result.arc_checks.mentions_foundry).toBe(true);
    expect(result.arc_checks.smart_contract_ready).toBe(true);
  });
});
