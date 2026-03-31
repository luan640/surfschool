'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelSubscriptionButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/subscriptions/cancel', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? 'Erro ao cancelar assinatura.')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <p className="text-xs text-slate-600">
          Tem certeza? Voce perdera o acesso ao final do periodo pago (30 dias de graca).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-rose-500 transition-colors hover:text-rose-700"
    >
      Cancelar assinatura
    </button>
  )
}
