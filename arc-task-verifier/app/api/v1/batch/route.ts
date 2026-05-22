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
    const { inputs } = body;

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: 'inputs array is required with at least one item' },
        { status: 400 }
      );
    }

    if (inputs.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 items per batch' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      inputs.map(async (input: string) => {
        const cacheKey = input.trim().toLowerCase();
        let content = '';
        if (input.includes('github.com')) {
          const repoData = await fetchRepoData(input);
          content = `README:\n${repoData.readme}\n\nStructure:\n${repoData.structure.join('\n')}\n\nDependencies:\n${JSON.stringify(repoData.packageJson || {}, null, 2)}`;
        } else {
          content = input;
        }
        const evaluation = await evaluateProject(content);
        setCachedEvaluation(cacheKey, evaluation);
        const scores = calculateScores(evaluation);
        return { input, evaluation, scores };
      })
    );

    const evaluations = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { input: inputs[i], error: r.reason.message };
    });

    const rateLimitHeaders = buildRateLimitHeaders(auth.remaining!, auth.resetAt!);
    const requestId = crypto.randomUUID();

    return NextResponse.json({
      apiVersion: 'v1',
      requestId,
      evaluations,
      rateLimit: {
        remaining: auth.remaining,
        resetAt: auth.resetAt,
      },
    }, { headers: rateLimitHeaders });
  } catch (error) {
    console.error('V1 batch error:', error);
    return NextResponse.json(
      { error: `Batch evaluation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
