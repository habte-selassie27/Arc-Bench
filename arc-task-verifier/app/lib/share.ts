export interface ShareableData {
  input: string;
  scores: {
    baseSignalScore: number;
    arcBonusScore: number;
    totalScore: number;
    category: string;
    badge: string;
  };
  feedback: string;
}

export function generateShareUrl(data: ShareableData): string {
  const json = JSON.stringify(data);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${window.location.origin}/share/${encoded}`;
}

export function parseShareUrl(hash: string): ShareableData | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function generateShareText(data: ShareableData): string {
  return `Arc Task Verifier Results

📊 Total Score: ${data.scores.totalScore}/100
🔍 Signal Score: ${data.scores.baseSignalScore}/100
🌐 Arc Readiness: ${data.scores.arcBonusScore}/100
🏷️ Badge: ${data.scores.badge}
📁 Category: ${data.scores.category}

💬 ${data.feedback}

Check your project at: ${window.location.origin}`;
}
