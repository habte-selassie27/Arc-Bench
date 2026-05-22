import { NextRequest, NextResponse } from 'next/server';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('github_token')?.value;

  if (!token) {
    const configured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    return NextResponse.json({ authenticated: false, configured }, { status: 401 });
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const data = (await response.json()) as GitHubUser;

    return NextResponse.json({
      authenticated: true,
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.name,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set('github_token', '', { maxAge: 0, path: '/' });
  return response;
}
