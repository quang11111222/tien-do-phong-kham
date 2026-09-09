import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>
export const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm phải được dùng bên trong ConfirmProvider.')
  return confirm
}
