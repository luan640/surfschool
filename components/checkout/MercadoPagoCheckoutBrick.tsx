'use client'

import { useEffect, useMemo, useState } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import type { IPaymentFormData, IAdditionalData } from '@mercadopago/sdk-react/esm/bricks/payment/type'
import { SurfLoading } from '@/components/dashboard/SurfLoading'
import { formatPrice } from '@/lib/utils'

interface LessonPlanInput {
  lessonDate: string
  timeSlots: string[]
}

interface Props {
  schoolId: string
  selectionType: 'single' | 'package'
  amount: number
  title: string
  description: string
  instructorId: string
  selectedDate?: string
  selectedSlots?: string[]
  packageId?: string | null
  lessons?: LessonPlanInput[]
  payerEmail?: string | null
  onApproved: (message: string) => void
  onPending: (message: string) => void
  onFailure: (message: string) => void
}

interface ProcessPaymentResponse {
  transactionId: string
  paymentId: number | null
  status: string
  statusDetail: string | null
  message: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export function MercadoPagoCheckoutBrick(props: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [pollingStatus, setPollingStatus] = useState(false)
  const [lastStatusCheckAt, setLastStatusCheckAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessPaymentResponse | null>(null)

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    if (!publicKey) {
      setError('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY nao configurada.')
      return
    }

    initMercadoPago(publicKey, {
      locale: 'pt-BR',
    })
  }, [])

  useEffect(() => {
    if (!result?.transactionId || (result.status !== 'pending' && result.status !== 'in_process')) return

    const interval = window.setInterval(async () => {
      setPollingStatus(true)

      try {
        const response = await fetch(`/api/payments/status/${result.transactionId}`, { cache: 'no-store' })
        setLastStatusCheckAt(Date.now())
        if (!response.ok) return

        const payload = await response.json()
        if (payload.status === 'paid') {
          setResult((current) => current ? {
            ...current,
            status: 'approved',
            statusDetail: payload.mercadopago_status_detail ?? current.statusDetail,
            message: 'Pagamento aprovado.',
          } : current)
          props.onApproved('Pagamento aprovado.')
          window.clearInterval(interval)
        }

        if (payload.status === 'failed') {
          setResult((current) => current ? {
            ...current,
            status: 'rejected',
            statusDetail: payload.mercadopago_status_detail ?? current.statusDetail,
            message: payload.mercadopago_status_detail || 'Pagamento rejeitado.',
          } : current)
          props.onFailure(payload.mercadopago_status_detail || 'Pagamento rejeitado.')
          window.clearInterval(interval)
        }
      } finally {
        setPollingStatus(false)
      }
    }, 5000)

    return () => window.clearInterval(interval)
  }, [props, result])

  const initialization = useMemo(() => ({
    amount: props.amount,
    payer: props.payerEmail ? { email: props.payerEmail } : undefined,
    items: {
      totalItemsAmount: props.amount,
      itemsList: [
        {
          name: props.title,
          description: props.description,
          units: 1,
          value: props.amount,
        },
      ],
    },
  }), [props.amount, props.description, props.payerEmail, props.title])

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {result && (
        <PaymentFeedback
          amount={props.amount}
          isPolling={pollingStatus}
          lastStatusCheckAt={lastStatusCheckAt}
          result={result}
        />
      )}
      {!result && (
        <div className="relative rounded border border-slate-200 bg-white p-4">
          <div className="mb-4 text-sm text-slate-500">Escolha o meio de pagamento abaixo para concluir.</div>
          <Payment
            initialization={initialization}
            customization={{
              paymentMethods: {
                creditCard: 'all',
                bankTransfer: 'all',
                types: {
                  included: ['creditCard', 'bank_transfer'],
                },
                maxInstallments: 12,
              },
              visual: {
                style: {
                  theme: 'default',
                },
              },
            }}
            locale="pt-BR"
            onReady={() => undefined}
            onError={(brickError) => {
              setError(brickError.message ?? 'Erro ao inicializar o checkout.')
              props.onFailure(brickError.message ?? 'Erro ao inicializar o checkout.')
            }}
            onSubmit={async (submission, additionalData) => {
              setSubmitting(true)
              setError(null)

              try {
                const response = await fetch('/api/payments/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    schoolId: props.schoolId,
                    selectionType: props.selectionType,
                    instructorId: props.instructorId,
                    packageId: props.packageId ?? null,
                    selectedDate: props.selectedDate,
                    selectedSlots: props.selectedSlots,
                    lessons: props.lessons,
                    checkoutData: {
                      paymentType: submission.paymentType,
                      selectedPaymentMethod: submission.selectedPaymentMethod,
                      formData: submission.formData,
                      additionalData: additionalData ?? null,
                    },
                  }),
                })

                const payload = await response.json()
                if (!response.ok) {
                  const message = payload.error || 'Nao foi possivel processar o pagamento.'
                  setError(message)
                  props.onFailure(message)
                  throw new Error(message)
                }

                const checkoutResult = payload as ProcessPaymentResponse
                setResult(checkoutResult)

                if (checkoutResult.status === 'approved') {
                  props.onApproved(checkoutResult.message)
                } else if (checkoutResult.status === 'pending' || checkoutResult.status === 'in_process') {
                  props.onPending(checkoutResult.message)
                } else {
                  props.onFailure(checkoutResult.message)
                }
              } finally {
                setSubmitting(false)
              }
            }}
          />
          {submitting && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded bg-white/80 backdrop-blur-[1px]">
              <SurfLoading
                compact
                title="Processando pagamento"
                subtitle="Estamos validando o metodo escolhido e finalizando a cobranca."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PaymentFeedback({
  amount,
  isPolling,
  lastStatusCheckAt,
  result,
}: {
  amount: number
  isPolling: boolean
  lastStatusCheckAt: number | null
  result: ProcessPaymentResponse
}) {
  const isApproved = result.status === 'approved'
  const isPending = result.status === 'pending' || result.status === 'in_process'
  const heading = isApproved ? 'Pagamento aprovado' : isPending ? 'Aguardando pagamento' : 'Pagamento nao aprovado'
  const description = isPending
    ? 'Finalize o pagamento no PIX ou aguarde a confirmação automatica.'
    : result.message

  return (
    <div className={`rounded border px-4 py-4 ${isApproved ? 'border-emerald-200 bg-emerald-50' : isPending ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="font-condensed text-2xl font-bold uppercase">{heading}</div>
      <div className="mt-1 text-sm">{description}</div>
      <div className="mt-2 text-sm font-semibold">Valor: {formatPrice(amount)}</div>
      {isPending && (
        <div className="mt-4 rounded border border-amber-300 bg-white/70 px-3 py-3 text-sm text-amber-900">
          <div className="font-semibold uppercase">Aguardando pagamento</div>
          <div className="mt-1">O QR Code continua visivel ate o Mercado Pago confirmar a transacao.</div>
          <div className="mt-2 text-xs text-amber-700">
            {isPolling
              ? 'Verificando pagamento...'
              : lastStatusCheckAt
                ? `Ultima verificacao: ${new Date(lastStatusCheckAt).toLocaleTimeString('pt-BR')}`
                : 'A confirconfirmaçãomacao será atualizada automaticamente.'}
          </div>
        </div>
      )}
      {result.qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${result.qrCodeBase64}`}
          alt="QR Code PIX"
          className="mt-4 h-48 w-48 rounded border border-white bg-white p-2"
        />
      )}
      {result.qrCode && <div className="mt-3 break-all rounded bg-white/80 px-3 py-2 font-mono text-xs">{result.qrCode}</div>}
      {result.ticketUrl && <a href={result.ticketUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold underline">Abrir comprovante</a>}
    </div>
  )
}
