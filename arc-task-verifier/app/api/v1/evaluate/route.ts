import { NextRequest, NextResponse } from 'next/server';
import { fetchRepoData } from '../../../lib/github';
import { evaluateProject, setCachedEvaluation } from '../../../lib/evaluator';
import { calculateScores } from '../../../lib/scoring';
import { requireApiKey, buildRateLimitHeaders } from '../../../lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiKey(request);
    if (!auth.valid) {
      return auth.response!;
    }

    const body = await request.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required (GitHub URL or project description)' },
        { status: 400 }
      );
    }

    const cacheKey = input.trim().toLowerCase();

    let content = '';
    if (input.includes('github.com')) {
      try {
        const repoData = await fetchRepoData(input);
        content = `README:\n${repoData.readme}\n\nStructure:\n${repoData.structure.join('\n')}\n\nDependencies:\n${JSON.stringify(repoData.packageJson || {}, null, 2)}`;
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to fetch repository: ${(error as Error).message}` },
          { status: 500 }
        );
      }
    } else {
      content = input;
    }

    const evaluation = await evaluateProject(content);
    setCachedEvaluation(cacheKey, evaluation);
    const scores = calculateScores(evaluation);

    const rateLimitHeaders = buildRateLimitHeaders(auth.remaining!, auth.resetAt!);

    return NextResponse.json({
      apiVersion: 'v1',
      requestId: crypto.randomUUID(),
      evaluation,
      scores,
      cached: false,
      rateLimit: {
        remaining: auth.remaining,
        resetAt: auth.resetAt,
      },
    }, { headers: rateLimitHeaders });
  } catch (error) {
    console.error('V1 evaluate error:', error);
    return NextResponse.json(
      { error: `Evaluation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
