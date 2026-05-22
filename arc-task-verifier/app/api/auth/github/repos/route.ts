import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('github_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const repos: Record<string, unknown>[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
      }

      const data = (await response.json()) as Record<string, unknown>[];
      repos.push(...data);
      hasMore = data.length === 100;
      page++;
    }

    return NextResponse.json({
      repos: repos.map((r) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        html_url: r.html_url,
        description: r.description,
        owner: {
          login: (r.owner as Record<string, unknown>).login,
          avatar_url: (r.owner as Record<string, unknown>).avatar_url,
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}
