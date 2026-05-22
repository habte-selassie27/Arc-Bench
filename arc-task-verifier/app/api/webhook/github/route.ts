import { NextRequest, NextResponse } from 'next/server';
import { evaluateProject } from '../../../lib/evaluator';
import { calculateScores } from '../../../lib/scoring';

interface WebhookResult {
  repoUrl: string;
  repoName: string;
  evaluation: unknown;
  scores: ReturnType<typeof calculateScores>;
  timestamp: string;
}

let lastWebhookResult: WebhookResult | null = null;

export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-github-event');
    const body = await request.json();

    if (event !== 'push') {
      return NextResponse.json({ message: 'Ignored event type' });
    }

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

    // Store last webhook result in memory
    lastWebhookResult = { repoUrl, repoName, evaluation, scores, timestamp: new Date().toISOString() };

    return NextResponse.json({
      message: 'Evaluation complete',
      repo: repoName,
      scores,
    });
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
