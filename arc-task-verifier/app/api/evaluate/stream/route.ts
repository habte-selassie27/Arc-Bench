import { NextRequest } from 'next/server';
import { fetchRepoData } from '../../../lib/github';
import { evaluateProject } from '../../../lib/evaluator';
import { calculateScores } from '../../../lib/scoring';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input) {
      return new Response(
        'event: error\ndata: {"error":"Input is required"}\n\n',
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send('progress', { step: 'fetching', message: 'Fetching repository data...' });

          let content = '';
          if (input.includes('github.com')) {
            const repoData = await fetchRepoData(input);
            content = `README:\n${repoData.readme}\n\nStructure:\n${repoData.structure.join('\n')}\n\nDependencies:\n${JSON.stringify(repoData.packageJson || {}, null, 2)}`;
            send('progress', { step: 'fetched', message: 'Repository data loaded' });
          } else {
            content = input;
          }

          send('progress', { step: 'evaluating', message: 'Running evaluation rules...' });
          const evaluation = await evaluateProject(content);
          send('progress', { step: 'scoring', message: 'Calculating scores...' });
          const scores = calculateScores(evaluation);

          send('result', { evaluation, scores, cached: false });
          send('complete', { message: 'Evaluation complete' });
        } catch (error) {
          send('error', { error: (error as Error).message });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(
      'event: error\ndata: {"error":"Evaluation failed"}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
