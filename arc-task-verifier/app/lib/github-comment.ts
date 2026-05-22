import type { EvaluationResult } from './evaluator';
import type { ScoreBreakdown } from './scoring';

export function formatEvaluationComment(
  result: EvaluationResult,
  scores: ScoreBreakdown
): string {
  const badgeUrl = `https://arc-task-verifier.vercel.app/api/badge?score=${scores.totalScore}`;

  const checkList = (obj: Record<string, boolean>) =>
    Object.entries(obj)
      .map(([k, v]) => `- ${v ? '✅' : '❌'} ${k.replace(/_/g, ' ')}`)
      .join('\n');

  const missingSection =
    result.missing_items.length > 0
      ? `\n### ⚠️ Missing Items\n${result.missing_items.map((i) => `- ${i}`).join('\n')}\n`
      : '';

  const upgradeSection =
    result.upgrade_path.length > 0
      ? `\n### 🚀 Suggested Upgrade Path\n${result.upgrade_path.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
      : '';

  const appKitSection = result.appkit_details
    ? `\n### 🔌 App Kit Scan\n${checkList(result.appkit_details)}\n`
    : '';

  return [
    `## 🤖 Arc Evaluation Report`,
    ``,
    `| Metric | Score |`,
    `|--------|-------|`,
    `| **Total Score** | **${scores.totalScore}/100** |`,
    `| Signal Score | ${scores.baseSignalScore}/100 |`,
    `| Arc Readiness | ${scores.arcBonusScore}/100 |`,
    `| Badge | ${scores.badge} |`,
    `| Category | ${scores.category} |`,
    ``,
    `[![Arc Readiness](${badgeUrl})](https://arc-task-verifier.vercel.app)`,
    ``,
    `### 📊 Signal Checks`,
    checkList(result.core_checks),
    ``,
    `### 🌐 Arc Ecosystem Checks`,
    checkList(result.arc_checks),
    appKitSection,
    missingSection,
    upgradeSection,
    `---`,
    `*Evaluated by [Arc Task Verifier Bot](https://arc-task-verifier.vercel.app)*`,
    ``,
    `> Trigger a re-evaluation by pushing new commits to this PR.`,
  ].join('\n');
}

export async function setCommitStatus(
  repoFullName: string,
  sha: string,
  state: 'success' | 'failure' | 'pending',
  description: string,
  token: string,
  totalScore?: number
): Promise<void> {
  const [owner, repo] = repoFullName.split('/');
  const targetUrl = totalScore ? `https://arc-task-verifier.vercel.app/api/badge?score=${totalScore}` : undefined;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        state,
        target_url: targetUrl,
        description,
        context: 'Arc Task Verifier',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to set commit status: ${response.status}`);
  }
}

export async function postComment(
  repoFullName: string,
  prNumber: number,
  markdown: string,
  token: string
): Promise<void> {
  const [owner, repo] = repoFullName.split('/');

  // Search for existing bot comment
  const listResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  );

  if (!listResponse.ok) {
    throw new Error(`Failed to list PR comments: ${listResponse.status}`);
  }

  const comments = (await listResponse.json()) as Array<{
    id: number;
    user: { type: string };
    body?: string;
  }>;

  const botComment = comments.find(
    (c) => c.user.type === 'Bot' && c.body?.includes('Arc Evaluation Report')
  );

  if (botComment) {
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${botComment.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body: markdown }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update comment: ${updateResponse.status}`);
    }
  } else {
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body: markdown }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create comment: ${createResponse.status}`);
    }
  }
}
