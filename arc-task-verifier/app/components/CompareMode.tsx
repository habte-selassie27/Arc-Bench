'use client';

import { useState } from 'react';

interface CompareResult {
  project1: { url: string; scores: { totalScore: number; baseSignalScore: number; arcBonusScore: number; badge: string } };
  project2: { url: string; scores: { totalScore: number; baseSignalScore: number; arcBonusScore: number; badge: string } };
}

export default function CompareMode() {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!url1.trim() || !url2.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1: url1.trim(), url2: url2.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Compare failed');
      }
      setResult(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const Cell = ({ label, val }: { label: string; val: string | number }) => (
    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{val}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Compare Projects</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          value={url1}
          onChange={(e) => setUrl1(e.target.value)}
          placeholder="GitHub URL 1"
          className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
        />
        <input
          value={url2}
          onChange={(e) => setUrl2(e.target.value)}
          placeholder="GitHub URL 2"
          className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
        />
      </div>
      <button
        onClick={handleCompare}
        disabled={loading || !url1.trim() || !url2.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {loading ? 'Comparing...' : 'Compare'}
      </button>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {result && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2 truncate">{result.project1.url}</p>
            <Cell label="Total" val={`${result.project1.scores.totalScore}/100`} />
            <Cell label="Signal" val={`${result.project1.scores.baseSignalScore}/100`} />
            <Cell label="Arc" val={`${result.project1.scores.arcBonusScore}/100`} />
            <Cell label="Badge" val={result.project1.scores.badge} />
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2 truncate">{result.project2.url}</p>
            <Cell label="Total" val={`${result.project2.scores.totalScore}/100`} />
            <Cell label="Signal" val={`${result.project2.scores.baseSignalScore}/100`} />
            <Cell label="Arc" val={`${result.project2.scores.arcBonusScore}/100`} />
            <Cell label="Badge" val={result.project2.scores.badge} />
          </div>
        </div>
      )}
    </div>
  );
}
