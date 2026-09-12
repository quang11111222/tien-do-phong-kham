import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'
export type NotifyFn = (message: string, tone?: ToastTone) => void

export const ToastContext = createContext<NotifyFn | null>(null)

export function useToast() {
  const notify = useContext(ToastContext)
  if (!notify) throw new Error('useToast phải được dùng bên trong ToastProvider.')
  return notify
}
