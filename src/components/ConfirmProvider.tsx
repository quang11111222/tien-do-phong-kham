import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirmContext'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((accepted: boolean) => void) | null>(null)
  const cancelButton = useRef<HTMLButtonElement | null>(null)

  const confirm = useCallback<ConfirmFn>((nextOptions) => new Promise((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setOptions(nextOptions)
  }), [])

  const finish = useCallback((accepted: boolean) => {
    resolver.current?.(accepted)
    resolver.current = null
    setOptions(null)
  }, [])

  useEffect(() => {
    if (!options) return
    cancelButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finish, options])

  return <ConfirmContext.Provider value={confirm}>
    {children}
    {options && <div className="confirm-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) finish(false) }}>
      <section className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className={`confirm-icon ${options.tone === 'danger' ? 'danger' : 'primary'}`} aria-hidden="true">{options.tone === 'danger' ? '!' : '?'}</div>
        <div className="confirm-copy"><h2 id="confirm-title">{options.title}</h2><p id="confirm-message">{options.message}</p></div>
        <div className="confirm-actions"><button ref={cancelButton} className="btn" onClick={() => finish(false)}>{options.cancelLabel ?? 'Hủy bỏ'}</button><button className={`btn ${options.tone === 'danger' ? 'dgrf' : 'pri'}`} onClick={() => finish(true)}>{options.confirmLabel ?? 'Xác nhận'}</button></div>
      </section>
    </div>}
  </ConfirmContext.Provider>
}
