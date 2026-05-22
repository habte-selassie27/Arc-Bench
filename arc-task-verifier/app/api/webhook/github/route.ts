import { NextRequest, NextResponse } from 'next/server';
import { evaluateProject } from '../../../lib/evaluator';
import { calculateScores } from '../../../lib/scoring';
import { formatEvaluationComment, postComment, setCommitStatus } from '../../../lib/github-comment';

interface WebhookResult {
  repoUrl: string;
  repoName: string;
  evaluation: unknown;
  scores: ReturnType<typeof calculateScores>;
  timestamp: string;
}

let lastWebhookResult: WebhookResult | null = null;

function verifySignature(payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;

  const sig = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const { createHmac } = require('crypto');
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-github-event');
    const signature = request.headers.get('x-hub-signature-256');
    const bodyText = await request.text();

    // Verify HMAC signature
    if (!verifySignature(bodyText, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);

    // Handle push events (existing functionality)
    if (event === 'push') {
      const repoUrl = body.repository?.html_url;
      const repoName = body.repository?.full_name;
      const pusher = body.pusher?.name;
      const commits = body.commits || [];

      if (!repoUrl) {
        return NextResponse.json({ error: 'No repository URL found' }, { status: 400 });
      }

      const content = [
        `Repository: ${repoName}`,
        `Push by: ${pusher}`,
        `Commits: ${commits.length}`,
        `Description: ${body.repository?.description || ''}`,
        `Language: ${body.repository?.language || ''}`,
        `Topics: ${(body.repository?.topics || []).join(', ')}`,
        `Has README: ${body.repository?.has_readme || false}`,
        `Has Wiki: ${body.repository?.has_wiki || false}`,
      ].join('\n');

      const evaluation = await evaluateProject(content);
      const scores = calculateScores(evaluation);

      lastWebhookResult = { repoUrl, repoName, evaluation, scores, timestamp: new Date().toISOString() };

      return NextResponse.json({
        message: 'Evaluation complete',
        repo: repoName,
        scores,
      });
    }

    // Handle pull_request events
    if (event === 'pull_request') {
      const action = body.action;
      if (action !== 'opened' && action !== 'synchronize') {
        return NextResponse.json({ message: `Ignored PR action: ${action}` });
      }

      const repoFullName = body.repository?.full_name;
      const prNumber = body.pull_request?.number;
      const repoUrl = body.repository?.html_url;
      const prTitle = body.pull_request?.title || '';
      const prBody = body.pull_request?.body || '';
      const headLabel = body.pull_request?.head?.label || '';
      const baseLabel = body.pull_request?.base?.label || '';

      if (!repoFullName || !prNumber || !repoUrl) {
        return NextResponse.json({ error: 'Missing PR information' }, { status: 400 });
      }

      const content = [
        `Repository: ${repoFullName}`,
        `PR: #${prNumber} — ${prTitle}`,
        `Branch: ${headLabel} → ${baseLabel}`,
        `Description: ${body.repository?.description || ''}`,
        `Language: ${body.repository?.language || ''}`,
        `Topics: ${(body.repository?.topics || []).join(', ')}`,
        `PR Description: ${prBody.slice(0, 1000)}`,
      ].join('\n');

      const evaluation = await evaluateProject(content);
      const scores = calculateScores(evaluation);
      const markdown = formatEvaluationComment(evaluation, scores);

      const token = process.env.WEBHOOK_GITHUB_TOKEN;
      if (!token) {
        return NextResponse.json({ error: 'WEBHOOK_GITHUB_TOKEN not configured' }, { status: 500 });
      }

      await postComment(repoFullName, prNumber, markdown, token);

      // Set commit status based on score
      const statusState = scores.totalScore >= 75 ? 'success' : scores.totalScore >= 40 ? 'pending' : 'failure';
      const statusDesc = `Score: ${scores.totalScore}/100 — ${scores.badge}`;
      const headSha = body.pull_request?.head?.sha;
      if (headSha) {
        await setCommitStatus(repoFullName, headSha, statusState, statusDesc, token, scores.totalScore).catch(() => {});
      }

      return NextResponse.json({
        message: 'PR evaluated and comment posted',
        repo: repoFullName,
        prNumber,
        scores,
      });
    }

    return NextResponse.json({ message: 'Ignored event type' });
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook evaluation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const result = lastWebhookResult;
  if (!result) {
    return NextResponse.json({ message: 'No webhook evaluations yet' });
  }
  return NextResponse.json(result);
}
