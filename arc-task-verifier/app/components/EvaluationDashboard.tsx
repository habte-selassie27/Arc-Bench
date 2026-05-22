'use client';

import { useState, useEffect } from 'react';
import { getHistory, saveToHistory, deleteFromHistory, clearHistory, HistoryEntry } from '../lib/history';
import { generateShareUrl, parseShareUrl, copyToClipboard, ShareableData } from '../lib/share';
import { generateArcTemplate } from '../lib/template';
import { generateMarkdownReport, downloadMarkdown, EvaluationResult, Scores } from '../lib/export';

interface DashboardResult {
  evaluation: EvaluationResult;
  scores: Scores;
  cached?: boolean;
}

interface BatchItem {
  input: string;
  evaluation?: EvaluationResult;
  scores?: Scores;
  error?: string;
}

export default function EvaluationDashboard() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [batchResults, setBatchResults] = useState<BatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [badgeText, setBadgeText] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('arc-dark-mode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const hash = path.replace('/share/', '');
      const data = parseShareUrl(hash);
      if (data) {
        setResult({
          evaluation: {
            signal_score: data.scores.baseSignalScore,
            arc_readiness_score: data.scores.arcBonusScore,
            category: data.scores.category,
            core_checks: { reproducible: false, has_setup_steps: false, has_demo: false, has_dependencies: false },
            arc_checks: { uses_arc_rpc: false, mentions_foundry: false, smart_contract_ready: false, uses_usdc_gas_awareness: false, appkit_usage_possible: false },
            appkit_details: { has_send: false, has_bridge: false, has_swap: false, has_unified_balance: false, has_appkit_import: false },
            missing_items: [],
            feedback: data.feedback,
            upgrade_path: [],
          },
          scores: data.scores,
        });
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('arc-dark-mode', (!darkMode).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setBatchResults(null);
    setShareUrl(null);

    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);

    if (batchMode && lines.length > 1) {
      try {
        const response = await fetch('/api/evaluate/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: lines }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Batch evaluation failed');
        }

        const data = await response.json();
        setBatchResults(data.evaluations);

        data.evaluations.forEach((item: BatchItem) => {
          if (item.scores) {
            saveToHistory({ input: item.input, scores: item.scores });
          }
        });
        setHistory(getHistory());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: lines[0] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Evaluation failed');
      }

      const data = await response.json();
      setResult(data);

      const entry = saveToHistory({
        input,
        scores: data.scores,
      });
      setHistory((prev) => [entry, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!result) return;
    const shareData: ShareableData = {
      input,
      scores: result.scores,
      feedback: result.evaluation.feedback,
    };
    const url = generateShareUrl(shareData);
    setShareUrl(url);
    copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!result) return;
    const markdown = generateMarkdownReport(input, result.evaluation, result.scores);
    const filename = `arc-evaluation-${Date.now()}.md`;
    downloadMarkdown(filename, markdown);
  };

  const handleCopyBadge = () => {
    if (!result) return;
    const origin = window.location.origin;
    const badgeUrl = `${origin}/api/badge?score=${result.scores.totalScore}`;
    const badgeMd = `[![Arc Readiness](${badgeUrl})](${origin})`;
    setBadgeText(badgeMd);
    copyToClipboard(badgeMd);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  const handleTemplateDownload = async () => {
    setTemplateLoading(true);
    try {
      const blob = await generateArcTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arc-foundry-template.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate template');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleClearServerCache = async () => {
    try {
      const response = await fetch('/api/evaluate', { method: 'DELETE' });
      if (response.ok) setError('Server cache cleared');
    } catch {
      setError('Failed to clear cache');
    }
  };

  const handleDeleteHistory = (id: string) => {
    deleteFromHistory(id);
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Arc Task Verifier Bot</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Evaluate your project for Arc ecosystem readiness</p>
          </div>
          <button onClick={toggleDarkMode} className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow hover:shadow-md transition" aria-label="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mb-8">
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="project-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {batchMode ? 'Enter projects (one per line)' : 'Enter GitHub URL or project description'}
            </label>
            <button
              type="button"
              onClick={() => { setBatchMode(!batchMode); setResult(null); setBatchResults(null); }}
              className={`px-3 py-1 text-xs rounded-md ${batchMode ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {batchMode ? 'Batch Mode' : 'Single Mode'}
            </button>
          </div>
          <textarea
            id="project-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={batchMode ? 6 : 4}
            placeholder={batchMode ? "https://github.com/user/project1\nhttps://github.com/user/project2\nMy project description..." : "https://github.com/user/project or describe your project..."}
            required
          />
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Evaluating...' : batchMode ? 'Batch Evaluate' : 'Evaluate Project'}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              History ({history.length})
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleTemplateDownload} disabled={templateLoading} className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium disabled:opacity-50">
              {templateLoading ? 'Generating...' : '📦 Download Arc Template'}
            </button>
            <button onClick={handleExport} disabled={!result} className="p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-sm font-medium disabled:opacity-50">
              📄 Export Report
            </button>
            <button onClick={handleClearServerCache} className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium">
              🗑️ Clear Cache
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-md mb-8">
            <p>{error}</p>
          </div>
        )}

        {showHistory && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Evaluation History</h2>
              <button onClick={handleClearHistory} className="text-sm text-red-600 dark:text-red-400 hover:underline">Clear All</button>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No evaluations yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.input}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{entry.scores.totalScore}/100</span>
                      <span className="text-sm">{entry.scores.badge}</span>
                      <button onClick={() => handleDeleteHistory(entry.id)} className="text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Batch Results */}
        {batchResults && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Batch Results ({batchResults.length})</h2>
            <div className="space-y-3">
              {batchResults.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.input}</p>
                    {item.scores && (
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.scores.totalScore}/100</span>
                    )}
                  </div>
                  {item.error ? (
                    <p className="text-sm text-red-600">Error: {item.error}</p>
                  ) : item.scores && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-blue-600 dark:text-blue-400">Signal: {item.scores.baseSignalScore}</span>
                      <span className="text-green-600 dark:text-green-400">Arc: {item.scores.arcBonusScore}</span>
                      <span>{item.scores.badge}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single Result */}
        {result && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Evaluation Results</h2>
                <div className="flex items-center gap-3">
                  {result.cached && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Cached</span>}
                  <span className="text-2xl">{result.scores.badge}</span>
                  <button onClick={handleShare} className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                </div>
              </div>

              {shareUrl && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-400">Share link copied to clipboard!</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Signal Score</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{result.scores.baseSignalScore}/100</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
                  <p className="text-sm text-green-600 dark:text-green-400">Arc Readiness</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.scores.arcBonusScore}/100</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{result.scores.totalScore}/100</p>
              </div>

              <p className="text-gray-700 dark:text-gray-300">{result.evaluation.feedback}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Arc Readiness Badge</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add this badge to your GitHub README.</p>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-lg font-mono font-bold">{result.scores.totalScore}/100</span>
                <span className="text-base">{result.scores.badge}</span>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={badgeText} placeholder="Click 'Copy Badge' to generate markdown" className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono border-0" />
                <button onClick={handleCopyBadge} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 whitespace-nowrap">
                  {copiedBadge ? 'Copied!' : 'Copy Badge'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Core Checks</h3>
              <div className="space-y-2">
                {Object.entries(result.evaluation.core_checks).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="ml-auto">{value ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Arc Ecosystem Checks</h3>
              <div className="space-y-2">
                {Object.entries(result.evaluation.arc_checks).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="ml-auto">{value ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.evaluation.appkit_details && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">App Kit Integration Scan</h3>
                <div className="space-y-2">
                  {Object.entries(result.evaluation.appkit_details).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="ml-auto">{value ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.evaluation.missing_items.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Missing Items</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {result.evaluation.missing_items.map((item, index) => (
                    <li key={index} className="text-gray-700 dark:text-gray-300">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.evaluation.upgrade_path.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Arc Upgrade Path</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  {result.evaluation.upgrade_path.map((step, index) => (
                    <li key={index} className="text-gray-700 dark:text-gray-300">{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
