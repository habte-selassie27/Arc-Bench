# Arc Task Verifier Bot

A full-stack web application that evaluates GitHub project submissions for technical soundness, reproducibility, and [Arc Network](https://arc.network) ecosystem alignment. Built as an Arc-native tool with a pluggable rule engine — no external AI APIs required.

## Overview

The Arc Task Verifier Bot helps builders understand how well their projects align with Arc's standards. It provides:

- **Signal Quality Scoring** (0–100): documentation quality, reproducibility, dependencies, and setup instructions
- **Arc Readiness Scoring** (0–100): alignment with Arc-specific tools including Arc RPC, Foundry, smart contracts, USDC gas awareness, and App Kit usage
- **Total Score**: weighted combination of 60% Signal + 40% Arc Readiness
- **Badge Tiers**: Arc-Ready (90+) · Strong (75+) · Needs Work (60+) · Low Signal (40+) · Not Ready (<40)

## Features

| Feature | Description |
|---------|-------------|
| Project Evaluation | Paste a GitHub URL or text description — get scored on reproducibility, docs, Arc ecosystem alignment |
| Leaderboard | Ranked by score, persisted via Redis. Submit evaluations with one click |
| Wallet Connect | MetaMask integration — detect Arc Testnet, display address + chain badge |
| Contract Verifier | Check if any address on Arc Testnet has deployed + verified source code |
| Solidity Analyzer | Paste Solidity code — detects gas issues, security vulnerabilities, and Arc patterns locally |
| Gas Estimator | Static gas model for deployment and interaction costs on Arc, with USDC pricing |
| GitHub OAuth | Login with GitHub, browse and select repos to evaluate instantly |
| Multi-format Export | Download reports as Markdown, CSV, or printable HTML |
| Compare Mode | Side-by-side evaluation of two GitHub projects |
| Deploy to Arc | One-click Foundry deployment flow from the dashboard |
| ERC-20 Scanner | Verify any address follows the ERC-20 standard via on-chain signature detection |
| PR Comment Bot | GitHub Action + webhook — auto-comment on PRs with evaluation scores and upgrade path |
| Public API v1 | API key–authenticated endpoints with rate limiting. Docs at `/api-docs` |
| Streaming Evaluation | Server-Sent Events — watch evaluation progress in real-time |
| User Accounts | Redis-backed persistent profiles linked to GitHub login |
| Test Suite | 16 Vitest unit tests + Playwright E2E setup |

## Project Structure

```
Project_Filter/
├── arc-task-verifier/           # Main Next.js application
│   ├── app/
│   │   ├── api/                 # 17 API route files
│   │   ├── components/          # 8 React components
│   │   ├── lib/                 # 19 business logic modules
│   │   ├── __tests__/           # Vitest unit tests (4 files)
│   │   ├── leaderboard/
│   │   └── share/
│   ├── e2e/                     # Playwright E2E tests
│   ├── docs/                    # PR bot setup guide
│   ├── public/                  # Static assets
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── AGENTS.md                    # Agent configuration
├── BUILDS.md                    # Build instructions
├── Plan.md                      # Development plan
├── Review.md                    # Project review
└── README.md                    # This file
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 with dark mode
- **Storage**: Upstash Redis (persistent) with file-based fallback
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Docker multi-stage build
- **Blockchain**: Arc Testnet RPC, ArcScan API

## Quick Start

```bash
# Install dependencies
cd arc-task-verifier
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local — set at minimum: GITHUB_TOKEN=<your_token>

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub PAT for fetching public repo data |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth App secret |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL (persistent leaderboard) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `WEBHOOK_SECRET` | No | GitHub webhook HMAC secret |
| `WEBHOOK_GITHUB_TOKEN` | No | GitHub PAT for webhook PR comments |

## Usage

### Evaluate a Project

1. Navigate to the app
2. Paste a GitHub URL or type a description
3. Click **Evaluate** — receive Signal Score, Arc Readiness, and Total Score
4. Export results as Markdown, CSV, or HTML

### PR Comment Bot

Two setup options:

- **GitHub Action**: Copy `.github/workflows/arc-evaluate.yml` to your repo — triggers on PR open/sync
- **Webhook**: Configure `WEBHOOK_SECRET` and `WEBHOOK_GITHUB_TOKEN`, add webhook to your repo

Sets commit status: green (≥75), yellow (≥40), red (<40).

### Public API

```bash
curl -X POST https://your-domain.vercel.app/api/v1/evaluate \
  -H "Authorization: Bearer arc_demo_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "https://github.com/owner/repo"}'
```

Rate limited to 100 requests/hour per API key. Create keys at `/api/keys`.

## Docker

```bash
# Build and run
docker compose up

# With local Redis for persistence
docker compose --profile with-redis up
```

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

## Architecture

The evaluation engine uses a pure rule-based approach (no external AI APIs). Key modules:

- `evaluator.ts` — Core rule-based evaluation engine
- `scoring.ts` — Score calculation and badge logic
- `advanced-analyzer.ts` — Slither/Solhint pattern detection for Solidity
- `github-comment.ts` — PR comment formatting and GitHub API integration
- `token-scanner.ts` — ERC-20 interface detection via on-chain signatures
- `leaderboard.ts` — Redis + file-backed persistent store

## Roadmap

- [ ] Vercel KV persistent storage
- [ ] Deployed contract verification success path
- [ ] Rate limiting on public `/api/evaluate` endpoint
- [ ] WebSocket real-time evaluation

## License

MIT
