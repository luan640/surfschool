'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error'

type ToastItem = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

type ToastInput = Omit<ToastItem, 'id'>

type ToastContextValue = {
  toast: (input: ToastInput) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextIdRef = useRef(1)

  const removeToast = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = nextIdRef.current++
    setItems((current) => [...current, { ...input, id }])
    window.setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const value = useMemo<ToastContextValue>(() => ({
    toast,
    success: (title, description) => toast({ title, description, variant: 'success' }),
    error: (title, description) => toast({ title, description, variant: 'error' }),
  }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {items.map((item) => {
          const isSuccess = item.variant === 'success'

          return (
            <div
              key={item.id}
              className={`pointer-events-auto overflow-hidden rounded border shadow-lg ${
                isSuccess
                  ? 'border-emerald-200 bg-white'
                  : 'border-rose-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {isSuccess ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fechar notificacao"
                >
                  <X size={14} />
                </button>
              </div>
              <div className={`h-1 w-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
