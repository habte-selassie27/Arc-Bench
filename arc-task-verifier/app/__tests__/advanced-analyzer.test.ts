import { describe, it, expect } from 'vitest';
import { enhanceAnalysis } from '../lib/advanced-analyzer';
import { analyzeSolidity } from '../lib/solidity-analyzer';

describe('advanced-analyzer', () => {
  it('should detect Slither-style findings', async () => {
    const source = `contract Bad {
    function withdraw() public {
        msg.sender.call{value: address(this).balance}("");
    }
    function die() public {
        selfdestruct(payable(msg.sender));
    }
}`;
    const base = await analyzeSolidity(source);
    const enhanced = enhanceAnalysis(source, base);
    expect(enhanced.slitherFindings.length).toBeGreaterThan(0);
    expect(enhanced.slitherFindings.some(f => f.check === 'selfdestruct')).toBe(true);
  });

  it('should detect Solhint-style findings', async () => {
    const source = `pragma solidity ^0.8.20;
contract Test {
    function foo() {
    }
}`;
    const base = await analyzeSolidity(source);
    const enhanced = enhanceAnalysis(source, base);
    expect(enhanced.solhintFindings.length).toBeGreaterThan(0);
  });

  it('should calculate overall score', async () => {
    const clean = `pragma solidity 0.8.20;
contract Safe {
    function safeTransfer(address to, uint amount) external {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "tx failed");
    }
}`;
    const base = await analyzeSolidity(clean);
    const enhanced = enhanceAnalysis(clean, base);
    expect(enhanced.overallScore).toBeGreaterThanOrEqual(0);
    expect(enhanced.overallScore).toBeLessThanOrEqual(100);
  });
});
