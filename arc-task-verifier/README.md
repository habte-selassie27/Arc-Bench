# 🤖 Arc Task Verifier Bot

Evaluate GitHub projects for [Arc Network](https://arc.network) ecosystem readiness. Get scored on signal quality, Arc-specific patterns, and receive a detailed upgrade path — all from a pluggable rule engine (no external AI APIs needed).

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🔍 Project Evaluation** | Paste a GitHub URL or text description — get scored on reproducibility, docs, Arc ecosystem alignment |
| **🏆 Leaderboard** | Ranked by score, persisted via Redis. Submit your evaluations with one click |
| **🔗 Wallet Connect** | MetaMask integration — detect Arc Testnet, display address + chain badge |
| **📄 Contract Verifier** | Check if any address on Arc Testnet has deployed + verified source code |
| **🔬 Solidity Analyzer** | Paste Solidity code — detects gas issues, security vulnerabilities, and Arc patterns locally (no compiler needed) |
| **⛽ Gas Estimator** | Static gas model for deployment & interaction costs on Arc, with USDC pricing |
| **🔑 GitHub OAuth** | Login with GitHub, browse and select repos to evaluate instantly |
| **📊 Multi-format Export** | Download reports as Markdown, CSV, or printable HTML |
| **🔄 Compare Mode** | Side-by-side evaluation of two GitHub projects |
| **🎯 Deploy to Arc** | One-click Foundry deployment flow from the dashboard (connected wallet required) |
| **🔎 ERC-20 Scanner** | Verify any address follows the ERC-20 standard via on-chain signature detection |
| **🤖 PR Comment Bot** | GitHub Action + webhook — auto-comment on PRs with evaluation scores and upgrade path. Sets commit status (green/yellow/red) |
| **🔌 Public API v1** | API key–authenticated endpoints with rate limiting. Docs at `/api-docs` |
| **📡 Streaming Evaluation** | Server-Sent Events — watch evaluation progress in real-time |
| **👤 User Accounts** | Redis-backed persistent profiles linked to GitHub login |
| **🧪 Test Suite** | 16 Vitest unit tests + Playwright E2E setup |

## 🚀 Quick Start

```bash
# Install
npm install

# Copy env template
cp .env.local.example .env.local

# Fill in at minimum:
# GITHUB_TOKEN=<your github token>  (for public repo fetching)

# Run dev
npm run dev
```

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | ✅ | — | GitHub PAT for fetching public repo data |
| `GITHUB_CLIENT_ID` | ❌ | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ❌ | — | GitHub OAuth App secret |
| `UPSTASH_REDIS_REST_URL` | ❌ | — | Upstash Redis REST URL (persistent leaderboard) |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | — | Upstash Redis REST token |
| `WEBHOOK_SECRET` | ❌ | — | GitHub webhook HMAC secret |
| `WEBHOOK_GITHUB_TOKEN` | ❌ | — | GitHub PAT for webhook PR comments |

## 🖥️ Usage

### Evaluate a Project

1. Go to `http://localhost:3000`
2. Paste a GitHub URL (e.g., `https://github.com/expressjs/express`) or type a description
3. Click **Evaluate** → get scored on:
   - **Signal Score** (0–100): documentation quality, reproducibility, dependencies
   - **Arc Readiness** (0–100): Arc RPC, Foundry, smart contracts, USDC awareness, App Kit usage
4. **Total Score** = 60% Signal + 40% Arc
5. Badge tiers: 🏆 Arc-Ready (90+) · ✅ Strong (75+) · 🔧 Needs Work (60+) · ⚠️ Low Signal (40+) · ❌ Not Ready

### Submit to Leaderboard

- After evaluation, check **"Add to public leaderboard"** → click Submit
- Or from **Evaluation History**, click **Submit All to Leaderboard** to batch-submit all past evaluations
- Visit `/leaderboard` to see ranked entries

### Solidity Analysis

Open the **Solidity Analyzer** panel, paste your `.sol` source, and get:
- ⛽ Gas issues (unchecked loops, storage-in-loop, `++i` vs `i++`, etc.)
- 🔒 Security issues (reentrancy, `tx.origin`, `selfdestruct`, missing checks-effects-interactions, etc.)
- 🌐 Arc patterns (App Kit imports, Foundry patterns, Arc RPC usage)
- Advanced **Slither/Solhint** style analysis (10 Slither checks + 8 Solhint rules)

### Compare Projects

Scroll to the **Compare Projects** section, enter two GitHub URLs, and see them side-by-side.

## 🤖 PR Bot Setup

### GitHub Action (easiest)

Copy `.github/workflows/arc-evaluate.yml` to your repo. It triggers on PR open/sync, calls the evaluation API, and posts a formatted comment. Uses the built-in `GITHUB_TOKEN`.

### Webhook (self-hosted)

1. Set `WEBHOOK_SECRET` + `WEBHOOK_GITHUB_TOKEN` on your deployment
2. Add webhook in GitHub repo → Settings → Webhooks:
   - Payload URL: `https://your-domain.vercel.app/api/webhook/github`
   - Content type: `application/json`
   - Secret: same as `WEBHOOK_SECRET`
   - Events: **Pull requests**
3. PRs get an evaluation comment + commit status check (green ≥ 75 / yellow ≥ 40 / red < 40)

See `docs/pr-bot-setup.md` for details.

## 📡 Public API

Authenticated endpoints at `/api/v1/evaluate` and `/api/v1/batch`:

```bash
curl -X POST https://your-domain.vercel.app/api/v1/evaluate \
  -H "Authorization: Bearer arc_demo_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "https://github.com/owner/repo"}'
```

Rate limited: 100 req/hr per key. Create keys at `/api/keys`. Full docs at `/api-docs`.

## 🐳 Docker

```bash
# Build and run
docker compose up

# With local Redis for persistence
docker compose --profile with-redis up
```

## 🧪 Tests

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# E2E (Playwright)
npm run test:e2e
```

## 🏗️ Architecture

```
app/
├── api/           # Route handlers:
│   ├── v1/        #   Authenticated API (API keys + rate limiting)
│   ├── webhook/   #   GitHub webhook (HMAC-verified)
│   ├── deploy/    #   Foundry deployment simulation
│   ├── erc20/     #   Token standard compliance check
│   ├── compare/   #   Side-by-side project comparison
│   └── ...
├── lib/           # Business logic:
│   ├── evaluator.ts        # Rule-based evaluation engine
│   ├── scoring.ts           # Score calculation + badge logic
│   ├── github-comment.ts    # PR comment formatting + GitHub API
│   ├── api-auth.ts          # API key auth + rate limiter
│   ├── leaderboard.ts       # Redis + file-backed store
│   ├── advanced-analyzer.ts # Slither/Solhint pattern detection
│   ├── token-scanner.ts     # ERC-20 interface detection
│   └── ...
├── components/    # React components:
│   ├── EvaluationDashboard  # Main UI orchestrator
│   ├── CompareMode          # Side-by-side comparison
│   ├── TokenScanner         # ERC-20 scanner UI
│   ├── DeployButton         # Arc Testnet deploy
│   └── ...
├── __tests__/     # Vitest tests
└── leaderboard/   # Leaderboard page (client-rendered)
```

## 🛣️ Roadmap

- [ ] Vercel KV persistent storage (already compatible — swap `UPSTASH_REDIS_REST_URL` for `REDIS_URL`)
- [ ] Deployed contract verification success path (waiting for verified contracts on Arc Testnet)
- [ ] Rate limiting on public `/api/evaluate` endpoint
- [ ] WebSocket real-time evaluation (SSE already built)

## 📝 License

MIT
