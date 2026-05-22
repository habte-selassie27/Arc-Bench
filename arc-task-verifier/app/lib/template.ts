import JSZip from 'jszip';

export async function generateArcTemplate(): Promise<Blob> {
  const zip = new JSZip();

  // .env file
  zip.file('.env', `ARC_TESTNET_RPC_URL="https://rpc.testnet.arc.network"
PRIVATE_KEY="0x..."
HELLOARCHITECT_ADDRESS="0x..."
`);

  // foundry.toml
  zip.file('foundry.toml', `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
    "forge-std/=lib/forge-std/src/"
]

[rpc_endpoints]
arc-testnet = "https://rpc.testnet.arc.network"

[etherscan]
arc-testnet = { key = "", url = "https://testnet.arcscan.app/api" }
`);

  // .gitignore
  zip.file('.gitignore', `# Compiler files
cache/
out/

# Ignores development broadcast logs
!/broadcast
/broadcast/*/31337/
/broadcast/**/dry-run/

# Docs
docs/

# Dotenv file
.env
`);

  // src/HelloArchitect.sol
  zip.file('src/HelloArchitect.sol', `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title HelloArchitect
/// @notice A simple greeting contract for Arc Testnet
contract HelloArchitect {
    string private greeting;

    event GreetingChanged(string newGreeting);

    constructor() {
        greeting = "Hello Architect!";
    }

    function setGreeting(string memory newGreeting) public {
        greeting = newGreeting;
        emit GreetingChanged(newGreeting);
    }

    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
`);

  // test/HelloArchitect.t.sol
  zip.file('test/HelloArchitect.t.sol', `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/HelloArchitect.sol";

contract HelloArchitectTest is Test {
    HelloArchitect helloArchitect;

    function setUp() public {
        helloArchitect = new HelloArchitect();
    }

    function testInitialGreeting() public view {
        assertEq(helloArchitect.getGreeting(), "Hello Architect!");
    }

    function testSetGreeting() public {
        string memory newGreeting = "Welcome to Arc!";
        helloArchitect.setGreeting(newGreeting);
        assertEq(helloArchitect.getGreeting(), newGreeting);
    }

    function testGreetingChangedEvent() public {
        string memory newGreeting = "Building on Arc!";
        vm.expectEmit(true, true, true, true);
        emit HelloArchitect.GreetingChanged(newGreeting);
        helloArchitect.setGreeting(newGreeting);
    }
}
`);

  // README.md
  zip.file('README.md', `# Arc Foundry Template

Pre-configured Foundry project for Arc Testnet deployment.

## Setup

\`\`\`bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install foundry-rs/forge-std --no-commit

# Run tests
forge test

# Build
forge build
\`\`\`

## Deploy to Arc Testnet

1. Add your private key to \`.env\`
2. Fund your wallet at https://faucet.circle.com (select Arc Testnet)
3. Deploy:

\`\`\`bash
source .env
forge create src/HelloArchitect.sol:HelloArchitect \\
  --rpc-url $ARC_TESTNET_RPC_URL \\
  --private-key $PRIVATE_KEY \\
  --broadcast
\`\`\`

## Interact

\`\`\`bash
# Get greeting
cast call $HELLOARCHITECT_ADDRESS "getGreeting()(string)" --rpc-url $ARC_TESTNET_RPC_URL

# Set greeting
cast send $HELLOARCHITECT_ADDRESS "setGreeting(string)" "Hello Arc!" --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY
\`\`\`

## Arc Network Details

- **RPC**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Explorer**: https://testnet.arcscan.app
- **Gas Token**: USDC (18 decimals)
`);

  // scripts/deploy.sh
  zip.file('scripts/deploy.sh', `#!/bin/bash
set -e

echo "Loading environment variables..."
source .env

echo "Deploying to Arc Testnet..."
forge create src/HelloArchitect.sol:HelloArchitect \\
  --rpc-url $ARC_TESTNET_RPC_URL \\
  --private-key $PRIVATE_KEY \\
  --broadcast

echo "Deployment complete!"
`);

  return await zip.generateAsync({ type: 'blob' });
}
