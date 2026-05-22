import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/?auth=github_denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
    }

    const storedState = request.cookies.get('github_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      const response = NextResponse.redirect(new URL('/?auth=github_failed', request.url));
      response.cookies.set('github_oauth_state', '', { maxAge: 0, path: '/' });
      return response;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          state,
        }),
      }
    );

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
    }

    const accessToken = tokenData.access_token as string;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
    }

    const response = NextResponse.redirect(new URL('/?auth=github_success', request.url));

    response.cookies.set('github_oauth_state', '', { maxAge: 0, path: '/' });
    response.cookies.set('github_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL('/?auth=github_failed', request.url));
  }
}
