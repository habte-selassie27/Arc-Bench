import { NextRequest, NextResponse } from 'next/server';
import { fetchRepoData } from '../../../lib/github';
import { evaluateProject, getCachedEvaluation, setCachedEvaluation } from '../../../lib/evaluator';
import { calculateScores } from '../../../lib/scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputs } = body;

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: 'inputs array is required with at least one item' },
        { status: 400 }
      );
    }

    if (inputs.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 items per batch' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      inputs.map(async (input: string) => {
        const cacheKey = input.trim().toLowerCase();
        let cached = getCachedEvaluation(cacheKey);

        if (cached) {
          return { input, evaluation: cached, scores: calculateScores(cached), cached: true };
        }

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
        return { input, evaluation, scores, cached: false };
      })
    );

    const evaluations = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { input: inputs[i], error: r.reason.message };
    });

    return NextResponse.json({ evaluations });
  } catch (error) {
    return NextResponse.json(
      { error: `Batch evaluation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
