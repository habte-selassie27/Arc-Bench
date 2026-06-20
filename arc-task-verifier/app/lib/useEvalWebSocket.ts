'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseEvalWebSocketOptions {
  evalId?: string;
  onProgress?: (data: { step: string; message: string }) => void;
  onResult?: (data: { evaluation: unknown; scores: unknown }) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseEvalWebSocketReturn {
  isConnected: boolean;
  send: (data: Record<string, unknown>) => void;
  close: () => void;
}

export function useEvalWebSocket({
  evalId,
  onProgress,
  onResult,
  onComplete,
  onError,
}: UseEvalWebSocketOptions): UseEvalWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacksRef = useRef({ onProgress, onResult, onComplete, onError });

  // Keep callbacks ref fresh without triggering re-renders
  useEffect(() => {
    callbacksRef.current = { onProgress, onResult, onComplete, onError };
  }, [onProgress, onResult, onComplete, onError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws/evaluate${evalId ? `?id=${evalId}` : ''}`;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'progress':
                callbacksRef.current.onProgress?.(data);
                break;
              case 'result':
                callbacksRef.current.onResult?.(data);
                break;
              case 'complete':
                callbacksRef.current.onComplete?.();
                break;
              case 'error':
                callbacksRef.current.onError?.(data.error);
                break;
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Auto-reconnect after 2 seconds
          reconnectTimeout.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [evalId]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    wsRef.current?.close();
  }, []);

  return { isConnected, send, close };
}
