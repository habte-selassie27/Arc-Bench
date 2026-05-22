'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  repoUrl: string;
  repoName: string;
  arcScore: number;
  signalScore: number;
  total: number;
  timestamp: number;
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        // graceful
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🏆 Arc Leaderboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Top-scoring projects evaluated for Arc ecosystem readiness
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">No entries yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              Be the first to submit your evaluation!
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Evaluate Your Project
            </a>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Repository</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Signal</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Arc</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={entry.repoUrl} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-4 text-lg font-bold text-gray-700 dark:text-gray-300">
                          {medal(rank) || rank}
                        </td>
                        <td className="px-4 py-4">
                          <a
                            href={entry.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {entry.repoName}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {entry.signalScore}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {entry.arcScore}
                        </td>
                        <td className="px-4 py-4 text-right text-lg font-bold font-mono">
                          <span className={
                            entry.total >= 80 ? 'text-green-600 dark:text-green-400' :
                            entry.total >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }>
                            {entry.total}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(entry.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Evaluate Your Project
          </a>
        </div>
      </div>
    </div>
  );
}
