import { NextRequest, NextResponse } from 'next/server';

function getBadgeColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getBadgeLabel(score: number): string {
  if (score >= 90) return 'Arc-Ready';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Needs Work';
  if (score >= 40) return 'Low Signal';
  return 'Not Ready';
}

function generateBadgeSvg(score: number): string {
  const color = getBadgeColor(score);
  const label = getBadgeLabel(score);
  const labelWidth = 70;
  const scoreWidth = 50;
  const totalWidth = labelWidth + scoreWidth;
  const height = 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}">
  <defs>
    <linearGradient id="smooth" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity="0.1"/>
      <stop offset="1" stop-opacity="0.1"/>
    </linearGradient>
    <mask id="rnd">
      <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
    </mask>
  </defs>
  <g mask="url(#rnd)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${scoreWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${Math.round(labelWidth / 2)}" y="14">Arc</text>
    <text x="${labelWidth + Math.round(scoreWidth / 2)}" y="14">${score}</text>
  </g>
</svg>`;
}

export async function GET(request: NextRequest) {
  const scoreParam = request.nextUrl.searchParams.get('score');
  const score = Math.min(100, Math.max(0, parseInt(scoreParam || '0', 10) || 0));

  const svg = generateBadgeSvg(score);

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
