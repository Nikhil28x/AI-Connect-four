import { useEffect, useRef, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

export function useWebSocket(path: string, onMessage: (data: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}${path}`)
    wsRef.current = ws

    ws.onmessage = (evt) => {
      try {
        onMessageRef.current(JSON.parse(evt.data))
      } catch {
        // ignore malformed frames
      }
    }

    return () => {
      ws.close()
    }
  }, [path])

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  return { send }
}
