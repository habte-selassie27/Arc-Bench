export interface HistoryEntry {
  id: string;
  input: string;
  scores: {
    baseSignalScore: number;
    arcBonusScore: number;
    totalScore: number;
    category: string;
    badge: string;
  };
  timestamp: string;
  walletAddress?: string;
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('arc-verifier-history');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const history = getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  const updated = [newEntry, ...history].slice(0, 50); // Keep last 50
  if (typeof window !== 'undefined') {
    localStorage.setItem('arc-verifier-history', JSON.stringify(updated));
  }
  return newEntry;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory();
  const updated = history.filter((entry) => entry.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem('arc-verifier-history', JSON.stringify(updated));
  }
}

export function clearHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('arc-verifier-history');
  }
}
