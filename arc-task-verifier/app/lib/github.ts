import axios from 'axios';

interface RepoData {
  readme: string;
  structure: string[];
  packageJson?: Record<string, unknown>;
  requirementsTxt?: string;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: { login: string; avatar_url: string };
}

export interface RepoDetails {
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

export async function fetchUserRepos(accessToken: string): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
      { headers: getHeaders(accessToken) }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    const data = (await response.json()) as Repo[];
    repos.push(...data);
    hasMore = data.length === 100;
    page++;
  }

  return repos;
}

export async function fetchRepoDetails(
  accessToken: string,
  repoFullName: string
): Promise<RepoDetails> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}`,
    { headers: getHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repo details: ${repoFullName}`);
  }

  const data = await response.json();

  return {
    full_name: data.full_name,
    description: data.description,
    default_branch: data.default_branch,
    language: data.language,
    topics: data.topics || [],
    stargazers_count: data.stargazers_count,
    forks_count: data.forks_count,
    open_issues_count: data.open_issues_count,
  };
}

export async function fetchRepoData(repoUrl: string): Promise<RepoData> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured');

  const repoPath = repoUrl.replace('https://github.com/', '');
  const [owner, repo] = repoPath.split('/');

  if (!owner || !repo) {
    throw new Error('Invalid GitHub URL');
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    const [readmeRes, structureRes, packageRes, requirementsRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/requirements.txt`, { headers }),
    ]);

    const readme = readmeRes.status === 'fulfilled'
      ? Buffer.from(readmeRes.value.data.content, 'base64').toString('utf-8')
      : '';

    const structure = structureRes.status === 'fulfilled'
      ? structureRes.value.data.map((item: { name: string }) => item.name)
      : [];

    const packageJson = packageRes.status === 'fulfilled'
      ? JSON.parse(Buffer.from(packageRes.value.data.content, 'base64').toString('utf-8'))
      : undefined;

    const requirementsTxt = requirementsRes.status === 'fulfilled'
      ? Buffer.from(requirementsRes.value.data.content, 'base64').toString('utf-8')
      : undefined;

    return {
      readme,
      structure,
      packageJson,
      requirementsTxt,
    };
  } catch (error) {
    throw new Error(`Failed to fetch repository data: ${(error as Error).message}`);
  }
}
