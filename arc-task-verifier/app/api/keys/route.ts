import { NextResponse } from 'next/server';
import { generateApiKey, getKeyMetadata } from '../../lib/api-keys';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { label } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json(
        { error: 'label is required (non-empty string)' },
        { status: 400 }
      );
    }

    if (label.length > 64) {
      return NextResponse.json(
        { error: 'label must be 64 characters or fewer' },
        { status: 400 }
      );
    }

    const key = generateApiKey(label.trim());

    // Key is returned ONCE, never again
    return NextResponse.json({
      key,
      label: label.trim(),
      createdAt: Date.now(),
      message: 'Save this key — it will not be shown again',
    });
  } catch (error) {
    console.error('Key generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const metadata = getKeyMetadata();
    return NextResponse.json({
      keys: metadata,
    });
  } catch (error) {
    console.error('Key metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve key metadata' },
      { status: 500 }
    );
  }
}
