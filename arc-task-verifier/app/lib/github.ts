import axios from 'axios';

interface RepoData {
  readme: string;
  structure: string[];
  packageJson?: Record<string, unknown>;
  requirementsTxt?: string;
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
