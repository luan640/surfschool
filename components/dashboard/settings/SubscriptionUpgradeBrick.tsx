'use client'

import { useEffect, useState } from 'react'
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react'
import type { ICardPaymentFormData, ICardPaymentBrickPayer } from '@mercadopago/sdk-react/esm/bricks/cardPayment/type'
import { CheckCircle2, Sparkles, Waves } from 'lucide-react'

interface Props {
  payerEmail: string
  publicKey: string
}

type SubscriptionResult = {
  subscriptionId: string
  status: string
}

export function SubscriptionUpgradeBrick({ payerEmail, publicKey }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubscriptionResult | null>(null)

  useEffect(() => {
    if (!publicKey) return
    initMercadoPago(publicKey, { locale: 'pt-BR' })
  }, [publicKey])

  const customization = {
    visual: {
      style: { theme: 'default' as const },
    },
    paymentMethods: {
      minInstallments: 1,
      maxInstallments: 1,
    },
  }

  async function handleSubmit(formData: ICardPaymentFormData<ICardPaymentBrickPayer>) {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.token,
          paymentMethodId: formData.payment_method_id,
          issuerId: formData.issuer_id,
          payerEmail: formData.payer?.email ?? payerEmail,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? 'Nao foi possivel ativar a assinatura.')
        return
      }

      setResult(payload as SubscriptionResult)
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.status === 'authorized') {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(145deg,#ecfdf5_0%,#d1fae5_42%,#dbeafe_100%)] p-8 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10b981,#0284c7)] text-white shadow-[0_18px_45px_rgba(16,185,129,0.28)]">
          <div className="relative">
            <Waves size={26} />
            <CheckCircle2 size={20} className="absolute -right-4 -top-4 rounded-full bg-white text-emerald-500" />
          </div>
        </div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          <Sparkles size={13} />
          Plano VSPro ativado
        </div>
        <h2 className="mt-2 font-condensed text-3xl font-bold uppercase tracking-wide text-slate-900">
          Bem-vindo ao VSPro!
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">
          Sua assinatura foi ativada com sucesso. O acesso completo ja esta disponivel.
        </p>
        <a
          href="/dashboard/settings/plan"
          className="mt-6 inline-flex h-10 items-center justify-center rounded bg-emerald-600 px-6 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
        >
          Ver meu plano
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="relative rounded border border-slate-200 bg-white p-4">
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Insira os dados do cartão de crédito para ativar a assinatura mensal de{' '}
            <span className="font-semibold text-slate-800">R$ 99,90/mes</span>.
          </p>
        </div>

        <CardPayment
          initialization={{ amount: 1.00, payer: { email: payerEmail } }}
          customization={customization}
          locale="pt-BR"
          onReady={() => undefined}
          onError={(brickError) => setError(brickError.message ?? 'Erro ao inicializar o checkout.')}
          onSubmit={handleSubmit}
        />

        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/80 backdrop-blur-[1px]">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
              <p className="text-sm font-medium text-slate-600">Ativando assinatura...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
