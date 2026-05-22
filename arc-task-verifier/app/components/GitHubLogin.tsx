'use client';

import { useState, useEffect, useRef } from 'react';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

interface Repo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: { login: string; avatar_url: string };
}

export default function GitHubLogin() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/github/user');
        const data = await response.json();
        if (data.authenticated) {
          setUser(data);
          setConfigured(true);
        } else if (data.configured) {
          setConfigured(true);
        }
      } catch {
        // Network error — component renders nothing
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!dropdownOpen || repos.length > 0) return;
    setReposLoading(true);
    const controller = new AbortController();
    fetch('/api/auth/github/repos', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.repos) setRepos(data.repos);
        setReposLoading(false);
      })
      .catch(() => setReposLoading(false));
    return () => controller.abort();
  }, [dropdownOpen, repos.length]);

  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/github/user', { method: 'DELETE' });
    setUser(null);
    setRepos([]);
  };

  const handleSelectRepo = (repo: Repo) => {
    setDropdownOpen(false);
    window.dispatchEvent(
      new CustomEvent('github-repo-selected', { detail: repo.html_url })
    );
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (checking || !configured) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {user ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div
              className="w-5 h-5 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${user.avatar_url})` }}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user.login}
            </span>
            <span className={`transform transition-transform text-xs text-gray-500 ${dropdownOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            ✕
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {reposLoading ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">Loading...</div>
                ) : filteredRepos.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    {search ? 'No repos match your search' : 'No repositories found'}
                  </div>
                ) : (
                  filteredRepos.slice(0, 50).map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{repo.private ? '🔒' : '📂'}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {repo.full_name}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate pl-5">
                          {repo.description}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Login with GitHub
        </button>
      )}
    </div>
  );
}
