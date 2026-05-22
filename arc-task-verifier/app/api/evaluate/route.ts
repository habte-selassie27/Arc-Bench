import { NextRequest, NextResponse } from 'next/server';
import { fetchRepoData } from '../../lib/github';
import { evaluateProject, getCachedEvaluation, setCachedEvaluation, clearCache } from '../../lib/evaluator';
import { calculateScores } from '../../lib/scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required (GitHub URL or project description)' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = input.trim().toLowerCase();
    const cached = getCachedEvaluation(cacheKey);
    if (cached) {
      return NextResponse.json({
        evaluation: cached,
        scores: calculateScores(cached),
        cached: true,
      });
    }

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

    return NextResponse.json({ evaluation, scores, cached: false });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: `Evaluation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  clearCache();
  return NextResponse.json({ message: 'Cache cleared' });
}
