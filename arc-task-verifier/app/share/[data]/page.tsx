'use client';

import { useEffect, useState } from 'react';
import { parseShareUrl, ShareableData } from '../../lib/share';
import Link from 'next/link';

export default function SharePage({ params }: { params: Promise<{ data: string }> }) {
  const [data, setData] = useState<ShareableData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    params.then((p) => {
      const parsed = parseShareUrl(p.data);
      if (parsed) {
        setData(parsed);
      } else {
        setError(true);
      }
    });
  }, [params]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invalid Share Link</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Go back to evaluator
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Arc Task Verifier Results</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
            <p className="text-sm text-blue-600 dark:text-blue-400">Signal Score</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{data.scores.baseSignalScore}/100</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">Arc Readiness</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200">{data.scores.arcBonusScore}/100</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Score</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.scores.totalScore}/100</p>
          <p className="text-lg mt-2">{data.scores.badge}</p>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-6">{data.feedback}</p>

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Evaluate Your Project
          </Link>
        </div>
      </div>
    </div>
  );
}
