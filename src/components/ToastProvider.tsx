import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type NotifyFn, type ToastTone } from './toastContext'

interface ToastItem { id: number; message: string; tone: ToastTone }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback<NotifyFn>((message, tone = 'success') => {
    const id = ++nextId.current
    setItems((current) => [...current.slice(-3), { id, message, tone }])
    const timeout = window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
    timers.current.set(id, timeout)
  }, [dismiss])

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  return <ToastContext.Provider value={notify}>
    {children}
    <div className="toast-region" aria-label="Thông báo thao tác" aria-live="polite">
      {items.map((item) => <div className={`app-toast ${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'} key={item.id}>
        <span className="toast-icon" aria-hidden="true">{item.tone === 'success' ? '✓' : item.tone === 'error' ? '!' : 'i'}</span>
        <p>{item.message}</p>
        <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(item.id)}>×</button>
      </div>)}
    </div>
  </ToastContext.Provider>
}
