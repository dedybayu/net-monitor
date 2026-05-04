'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '@/types/traffic';

interface UseWebSocketOptions {
  url: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  lastMessage: WSMessage | null;
  isConnected: boolean;
  reconnectAttempts: number;
  sendMessage: (message: WSMessage) => void;
}

/**
 * Custom hook for WebSocket connection with auto-reconnect.
 * Connects to the traffic monitor WebSocket server.
 */
export function useWebSocket({
  url,
  reconnectIntervalMs = 3000,
  maxReconnectAttempts = 50,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to server');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimerRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectIntervalMs);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
    }
  }, [url, reconnectIntervalMs, maxReconnectAttempts, reconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message, WebSocket is not open');
    }
  }, []);

  return { lastMessage, isConnected, reconnectAttempts, sendMessage };
}
