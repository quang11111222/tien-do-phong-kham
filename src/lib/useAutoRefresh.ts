import { useEffect, useRef } from 'react'

interface AutoRefreshOptions {
  enabled?: boolean
  intervalMs?: number
}

export function useAutoRefresh(callback: () => void | Promise<void>, { enabled = true, intervalMs = 15_000 }: AutoRefreshOptions = {}) {
  const callbackRef = useRef(callback)
  const runningRef = useRef(false)

  useEffect(() => { callbackRef.current = callback }, [callback])

  useEffect(() => {
    if (!enabled) return

    const refresh = async () => {
      if (runningRef.current) return
      runningRef.current = true
      try { await callbackRef.current() } finally { runningRef.current = false }
    }
    const onFocus = () => void refresh()
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, intervalMs)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs])
}
