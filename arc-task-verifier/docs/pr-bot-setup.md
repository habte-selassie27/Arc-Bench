# PR Comment Bot — Setup Guide

Two complementary approaches for automatic PR evaluation comments:

1. **GitHub Action** (lighter — runs in your CI, no webhook setup)
2. **Webhook** (server-side — runs on the Arc Task Verifier instance)

---

## Option 1: GitHub Action (Recommended)

Copy `.github/workflows/arc-evaluate.yml` into your repository. That's it.

**What it does:**
- Triggers on PR open and new commits
- POSTs your repo URL to `https://arc-task-verifier.vercel.app/api/evaluate`
- Posts a formatted PR comment with scores, badges, and an upgrade path
- Edits the existing bot comment on subsequent pushes (no spam)

**Requirements:**
- The workflow uses the built-in `GITHUB_TOKEN` — no extra secrets needed
- `actions/github-script@v7` posts the comment
- `continue-on-error: true` ensures it never blocks the PR check

**Troubleshooting:**
- Comment not appearing? Check Actions tab for workflow run logs
- `401` on evaluate API? The endpoint is public, verify the URL is correct
- Multiple comments? The script searches for an existing bot comment by looking for "Arc Evaluation Report" in the body and edits it

---

## Option 2: Webhook (Self-Hosted)

Configure the webhook on your GitHub repository or organization to point at your deployed Arc Task Verifier instance.

### 1. Set Environment Variables

On your deployment (Vercel dashboard → Settings → Environment Variables):

```
WEBHOOK_SECRET=<generated with: openssl rand -hex 32>
WEBHOOK_GITHUB_TOKEN=<personal-access-token>
```

**`WEBHOOK_GITHUB_TOKEN`** — Create a fine-grained personal access token:
- Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Repository access: `Only select repositories` (pick your repo)
- Permissions: `Pull requests` → `Read and write`
- Copy the token

### 2. Configure Webhook in GitHub

1. Go to your repo → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://arc-task-verifier.vercel.app/api/webhook/github`
3. **Content type:** `application/json`
4. **Secret:** Paste the same `WEBHOOK_SECRET` value you set in Vercel
5. **Events:** Select "Let me select individual events" → check **Pull requests**
6. **Active:** ✅
7. Click "Add webhook"

### 3. Verify

Open a PR on your repo. You should see:
- A green checkmark in the webhook delivery log (repo → Settings → Webhooks → recent deliveries)
- A new comment on the PR from the Arc Task Verifier Bot

**Troubleshooting:**
- **`401 Invalid signature`** — WEBHOOK_SECRET mismatch between Vercel and GitHub webhook settings
- **`500 WEBHOOK_GITHUB_TOKEN not configured`** — The env var is missing on Vercel
- **`403` on comment post** — The PAT doesn't have `pull-requests:write` permission
- **No comment posted but webhook delivered** — Check Vercel function logs for the error

---

## Comment Format

Both approaches produce the same comment format:

```
## 🤖 Arc Evaluation Report

| Metric          | Score       |
|-----------------|-------------|
| Total Score     | 72/100      |
| Signal Score    | 60/100      |
| Arc Readiness   | 40/100      |
| Badge           | 🔧 Needs Work |
| Category        | frontend    |

[![Arc Readiness](https://arc-task-verifier.vercel.app/api/badge?score=72)](...)

### 📊 Signal Checks
✅ reproducible
✅ has_setup_steps
❌ has_demo
...

### 🌐 Arc Ecosystem Checks
...

### ⚠️ Missing Items
...

### 🚀 Suggested Upgrade Path
...

---
*Evaluated by Arc Task Verifier Bot*
```

---

## Idempotency

Both approaches are idempotent:
- **GitHub Action** — searches for an existing comment containing "Arc Evaluation Report" and edits it
- **Webhook** — the `postComment` function in `app/lib/github-comment.ts` performs the same search-and-edit logic

This means pushing new commits updates the existing comment rather than creating a new one.
