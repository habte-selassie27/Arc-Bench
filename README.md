# Arc Task Verifier Bot

Evaluate GitHub projects for [Arc Network](https://arc.network) ecosystem readiness. Get scored on signal quality, Arc-specific patterns, and receive a detailed upgrade path — all from a pluggable rule engine with no external AI APIs.

## Why This Exists

The earlier version was a single-shot evaluator — paste a URL, get a score, done.

As more features landed (caching, batch mode, badges, webhooks), the value of the tool was getting buried in one flat form. So I rebuilt it around a proper evaluation workflow.

It's a small shift, but it makes Arc Task Verifier Bot feel a lot closer to infrastructure than a demo.

**Live:** https://arc-task-verifier.vercel.app

## What It Does

- **Run single or batch evaluations** — up to 20 repos at once
- **Get a live Arc Readiness Badge** — drop it straight into your README
- **Generate a pre-configured Foundry template ZIP** — ready for Arc deployment
- **Export full evaluation reports** — Markdown, CSV, or printable HTML
- **Auto-evaluate on push** — GitHub webhook integration with commit status checks

## Scoring

The scoring engine runs 100% client-side with a rule-based approach:

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| **Signal Score** | 60% | Documentation quality, reproducibility, dependencies, setup instructions |
| **Arc Readiness** | 40% | Arc RPC, Foundry, smart contracts, USDC gas awareness, App Kit usage |

**Total Score** = 60% Signal + 40% Arc Readiness

Badge tiers:

- 🏆 **Arc-Ready** (90+) — full ecosystem alignment
- ✅ **Strong** (75+) — solid foundation
- 🔧 **Needs Work** (60+) — functional but missing pieces
- ⚠️ **Low Signal** (40+) — needs significant improvement
- ❌ **Not Ready** (<40) — start from scratch

## Features

| Feature | Description |
|---------|-------------|
| Project Evaluation | Paste a GitHub URL or text description — get scored on reproducibility, docs, Arc alignment |
| Batch Mode | Evaluate up to 20 repos in a single run |
| Live Badge | Auto-updating SVG badge for your README |
| Foundry Template | Pre-configured ZIP for Arc Testnet deployment |
| Leaderboard | Ranked by score, persisted via Redis |
| Wallet Connect | MetaMask integration — detect Arc Testnet, display address + chain badge |
| Contract Verifier | Check if any address on Arc Testnet has deployed + verified source code |
| Solidity Analyzer | Paste Solidity code — detect gas issues, security vulnerabilities, and Arc patterns locally |
| Gas Estimator | Static gas model for deployment and interaction costs on Arc with USDC pricing |
| GitHub OAuth | Login with GitHub, browse and select repos to evaluate instantly |
| Compare Mode | Side-by-side evaluation of two GitHub projects |
| PR Comment Bot | GitHub Action + webhook — auto-comment on PRs with scores and upgrade path |
| Public API v1 | API key–authenticated endpoints with rate limiting. Docs at `/api-docs` |
| Streaming Evaluation | Server-Sent Events — watch evaluation progress in real-time |
| User Accounts | Redis-backed persistent profiles linked to GitHub login |
| Test Suite | 16 Vitest unit tests + Playwright E2E setup |

## Quick Start

```bash
cd arc-task-verifier
npm install

cp .env.local.example .env.local
# Edit .env.local — set at minimum: GITHUB_TOKEN=<your_token>

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

1. Go to the app
2. Paste a GitHub URL or type a description
3. Click **Evaluate** — get Signal Score, Arc Readiness, and Total Score
4. Export results or copy the badge to your README

### Batch Evaluate

Enter multiple GitHub URLs (one per line) or upload a list. Up to 20 repos per batch.

### PR Comment Bot

Two setup options:

- **GitHub Action** (easiest): Copy `.github/workflows/arc-evaluate.yml` to your repo — triggers on PR open/sync
- **Webhook**: Set `WEBHOOK_SECRET` + `WEBHOOK_GITHUB_TOKEN`, add webhook to your repo

Sets commit status: green (≥75), yellow (≥40), red (<40).

### Badge

After evaluating a repo, grab the badge markdown:

```markdown
![Arc Readiness](https://your-domain.vercel.app/api/badge?repo=owner/repo)
```

The badge auto-updates on each evaluation.

### Public API

```bash
curl -X POST https://your-domain.vercel.app/api/v1/evaluate \
  -H "Authorization: Bearer arc_demo_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "https://github.com/owner/repo"}'
```

Rate limited to 100 requests/hour per API key. Create keys at `/api/keys`.

## Project Structure

```
arc-task-verifier/
├── app/
│   ├── api/              # 17 API route handlers
│   ├── components/       # React UI components
│   ├── lib/              # Business logic modules
│   ├── __tests__/        # Vitest unit tests
│   └── leaderboard/      # Leaderboard page
├── e2e/                  # Playwright E2E tests
├── docs/                 # PR bot setup guide
├── public/               # Static assets
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 with dark mode
- **Storage**: Upstash Redis (persistent) with file-based fallback
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Docker multi-stage build
- **Blockchain**: Arc Testnet RPC, ArcScan API

## Architecture

Pure rule-based evaluation engine — no external AI APIs, no latency, no cost. Key modules:

- `evaluator.ts` — Core evaluation logic
- `scoring.ts` — Score calculation + badge logic
- `advanced-analyzer.ts` — Slither/Solhint pattern detection for Solidity
- `github-comment.ts` — PR comment formatting + GitHub API
- `token-scanner.ts` — ERC-20 interface detection via on-chain signatures
- `leaderboard.ts` — Redis + file-backed persistent store

## Docker

```bash
docker compose up

# With local Redis for persistence
docker compose --profile with-redis up
```

## Testing

```bash
npm test              # Unit tests
npm run test:watch    # Watch mode
npm run test:e2e      # E2E tests
```

## Roadmap

- [ ] Vercel KV persistent storage
- [ ] Deployed contract verification success path
- [ ] Rate limiting on public `/api/evaluate` endpoint
- [ ] WebSocket real-time evaluation

---

Built by me.
Built on Arc.
