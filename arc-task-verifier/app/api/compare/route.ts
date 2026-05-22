import { NextRequest, NextResponse } from 'next/server';
import { fetchRepoData } from '../../lib/github';
import { evaluateProject } from '../../lib/evaluator';
import { calculateScores } from '../../lib/scoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url1, url2 } = body;

    if (!url1 || !url2) {
      return NextResponse.json({ error: 'url1 and url2 required' }, { status: 400 });
    }

    const [data1, data2] = await Promise.all([
      url1.includes('github.com') ? fetchRepoData(url1) : { readme: url1, structure: [], packageJson: null },
      url2.includes('github.com') ? fetchRepoData(url2) : { readme: url2, structure: [], packageJson: null },
    ]);

    const [eval1, eval2] = await Promise.all([
      evaluateProject(`README:\n${data1.readme}\n\nStructure:\n${data1.structure.join('\n')}\n\nDependencies:\n${JSON.stringify(data1.packageJson || {}, null, 2)}`),
      evaluateProject(`README:\n${data2.readme}\n\nStructure:\n${data2.structure.join('\n')}\n\nDependencies:\n${JSON.stringify(data2.packageJson || {}, null, 2)}`),
    ]);

    return NextResponse.json({
      project1: { url: url1, evaluation: eval1, scores: calculateScores(eval1) },
      project2: { url: url2, evaluation: eval2, scores: calculateScores(eval2) },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
