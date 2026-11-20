import { useEffect, useRef, useState } from 'react';

export default function useWebSocket(url, { enabled = true, onMessage, protocols } = {}) {
  const [status, setStatus] = useState('disconnected');
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !url) return undefined;
    let socket;
    let reconnectTimer;
    let attempt = 0;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      setStatus(attempt ? 'reconnecting' : 'connecting');
      socket = new WebSocket(url, protocols);
      socket.onopen = () => { attempt = 0; setStatus('connected'); };
      socket.onmessage = (event) => {
        try { handlerRef.current?.(JSON.parse(event.data)); } catch { handlerRef.current?.({ type: 'message', data: event.data }); }
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (disposed) return;
        setStatus('reconnecting');
        const delay = Math.min(30_000, 1000 * (2 ** attempt)) * (0.8 + Math.random() * 0.4);
        attempt = Math.min(attempt + 1, 5);
        reconnectTimer = setTimeout(connect, delay);
      };
    };
    connect();
    return () => { disposed = true; clearTimeout(reconnectTimer); socket?.close(); setStatus('disconnected'); };
  }, [enabled, protocols, url]);

  return status;
}