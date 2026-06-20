'use client';

import { useState } from 'react';
import { APP_DEPLOY_URL } from '../lib/config';

const curlEvaluate = `curl -X POST ${APP_DEPLOY_URL}/api/v1/evaluate \\
  -H "Authorization: Bearer arc_demo_key" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "https://github.com/owner/repo"}'`;

const curlBatch = `curl -X POST ${APP_DEPLOY_URL}/api/v1/batch \\
  -H "Authorization: Bearer arc_demo_key" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": ["https://github.com/owner/repo1", "https://github.com/owner/repo2"]}'`;

const jsFetch = `const response = await fetch('${APP_DEPLOY_URL}/api/v1/evaluate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer arc_demo_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: 'https://github.com/owner/repo' }),
});
const data = await response.json();`;

const pythonCode = `import requests

response = requests.post(
    '${APP_DEPLOY_URL}/api/v1/evaluate',
    headers={
        'Authorization': 'Bearer arc_demo_key',
        'Content-Type': 'application/json',
    },
    json={'input': 'https://github.com/owner/repo'}
)
data = response.json()`;

const responseExample = `{
  "apiVersion": "v1",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "evaluation": {
    "signal_score": 75,
    "arc_readiness_score": 40,
    "category": "frontend",
    "core_checks": {
      "reproducible": true,
      "has_setup_steps": true,
      "has_demo": true,
      "has_dependencies": true
    },
    "arc_checks": {
      "uses_arc_rpc": false,
      "mentions_foundry": true,
      "smart_contract_ready": true,
      "uses_usdc_gas_awareness": false,
      "appkit_usage_possible": true
    },
    "missing_items": [...],
    "feedback": "...",
    "upgrade_path": [...]
  },
  "scores": {
    "totalScore": 61,
    "baseSignalScore": 75,
    "arcBonusScore": 40,
    "badge": "🔧 Needs Work",
    "category": "frontend"
  },
  "cached": false,
  "rateLimit": {
    "remaining": 99,
    "resetAt": 1718000000000
  }
}`;

const errorResponse = `{
  "error": "Invalid API key"
}`;

const rateLimitResponse = `{
  "error": "Rate limit exceeded. Retry after 1234 seconds"
}`;

export default function ApiDocsPage() {
  const [liveInput, setLiveInput] = useState('https://github.com/expressjs/express');
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const handleLiveTest = async () => {
    setLiveLoading(true);
    setLiveResult(null);
    setLiveError(null);
    try {
      const res = await fetch('/api/v1/evaluate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer arc_demo_key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: liveInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLiveError(data.error || `HTTP ${res.status}`);
        setLiveResult(JSON.stringify(data, null, 2));
      } else {
        setLiveResult(JSON.stringify(data, null, 2));
      }
    } catch {
      setLiveError('Network error');
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Arc Task Verifier API
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Evaluate projects for Arc ecosystem readiness programmatically.
          </p>
        </div>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              All API requests require an API key sent via the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Authorization</code> header:
            </p>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm mb-4">
              Authorization: Bearer arc_demo_key
            </pre>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>⚠️ Demo key:</strong> <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">arc_demo_key</code> is limited to 100 requests/hour.
                Create your own key via <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">POST /api/keys</code> (note: only accessible from this domain).
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Each API key is limited to <strong>100 requests per hour</strong> using a sliding window.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rate limit headers are returned on every response:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm inline-block mb-4">
              X-RateLimit-Limit: 100{'\n'}
              X-RateLimit-Remaining: 99{'\n'}
              X-RateLimit-Reset: 1718000000000
            </pre>
            <p className="text-gray-700 dark:text-gray-300">
              When exceeded, you&apos;ll receive a <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">429</code> response with a <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Retry-After</code> header.
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Endpoints</h2>

          {/* POST /api/v1/evaluate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-mono font-bold rounded">POST</span>
              <code className="text-lg font-mono text-gray-800 dark:text-gray-200">/api/v1/evaluate</code>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Evaluate a single project by GitHub URL or text description.
            </p>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Request Body</h4>
            <table className="w-full mb-4 text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Field</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Type</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Required</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-2 font-mono text-gray-800 dark:text-gray-200">input</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">string</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">Yes</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">GitHub URL or plain text description</td>
                </tr>
              </tbody>
            </table>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Example — cURL</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm mb-4"><code>{curlEvaluate}</code></pre>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Example — JavaScript</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm mb-4"><code>{jsFetch}</code></pre>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Example — Python</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm mb-4"><code>{pythonCode}</code></pre>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Response</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm mb-2"><code>{responseExample}</code></pre>
          </div>

          {/* POST /api/v1/batch */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-mono font-bold rounded">POST</span>
              <code className="text-lg font-mono text-gray-800 dark:text-gray-200">/api/v1/batch</code>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Evaluate up to 10 projects in a single request. Results are returned in order.
            </p>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Request Body</h4>
            <table className="w-full mb-4 text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Field</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Type</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Required</th>
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-2 font-mono text-gray-800 dark:text-gray-200">inputs</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">string[]</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">Yes</td>
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">Array of GitHub URLs or descriptions (max 10)</td>
                </tr>
              </tbody>
            </table>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Example — cURL</h4>
            <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm"><code>{curlBatch}</code></pre>
          </div>

          {/* Error Responses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-mono font-bold rounded">Error</span>
              <span className="text-lg text-gray-800 dark:text-gray-200 font-semibold">Responses</span>
            </div>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">401 — Missing/Invalid Auth</h4>
            <pre className="bg-gray-900 text-red-400 rounded p-4 overflow-x-auto text-sm mb-4"><code>{errorResponse}</code></pre>

            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">429 — Rate Limited</h4>
            <pre className="bg-gray-900 text-red-400 rounded p-4 overflow-x-auto text-sm"><code>{rateLimitResponse}</code></pre>
          </div>
        </section>

        {/* Try It Live */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4"> Try It Live</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Test the API right now with the demo key. Enter a GitHub URL or description:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={liveInput}
                onChange={(e) => setLiveInput(e.target.value)}
                placeholder="https://github.com/owner/repo or project description"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <button
                onClick={handleLiveTest}
                disabled={liveLoading || !liveInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"
              >
                {liveLoading ? 'Evaluating...' : 'Send'}
              </button>
            </div>
            {liveError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <p className="text-red-700 dark:text-red-300 text-sm font-semibold mb-1">Error</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{liveError}</p>
              </div>
            )}
            {liveResult && (
              <pre className="bg-gray-900 text-green-400 rounded p-4 overflow-x-auto text-sm max-h-96 overflow-y-auto">
                <code>{liveResult}</code>
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
