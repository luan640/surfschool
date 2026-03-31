'use client'

import { useEffect, useMemo, useState } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import type { IPaymentFormData, IAdditionalData } from '@mercadopago/sdk-react/esm/bricks/payment/type'
import Link from 'next/link'
import { PartyPopper, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaymentSuccessAnimation } from '@/components/checkout/PaymentSuccessAnimation'
import { SurfLoading } from '@/components/dashboard/SurfLoading'
import { formatPrice } from '@/lib/utils'

interface LessonPlanInput {
  lessonDate: string
  timeSlots: string[]
}

interface Props {
  schoolSlug: string
  schoolId: string
  selectionType: 'single' | 'package'
  amount: number
  title: string
  description: string
  onlineEnabled?: boolean
  instructorId: string
  selectedDate?: string
  selectedSlots?: string[]
  packageId?: string | null
  lessons?: LessonPlanInput[]
  payerEmail?: string | null
  onApproved: (message: string) => void
  onPending: (message: string) => void
  onFailure: (message: string) => void
  onNavigationLockChange?: (locked: boolean) => void
}

interface ProcessPaymentResponse {
  transactionId: string | null
  paymentId: number | null
  status: string
  statusDetail: string | null
  message: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export function MercadoPagoCheckoutBrick(props: Props) {
  const [paymentMode, setPaymentMode] = useState<'pay_now' | 'pay_on_site' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pollingStatus, setPollingStatus] = useState(false)
  const [lastStatusCheckAt, setLastStatusCheckAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessPaymentResponse | null>(null)

  useEffect(() => {
    setPaymentMode(null)
  }, [props.onlineEnabled, props.schoolId, props.selectionType, props.selectedDate, props.packageId, props.instructorId])

  useEffect(() => {
    props.onNavigationLockChange?.(result?.status === 'pay_on_site')
  }, [props, result?.status])

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

  if (result?.status === 'approved' || result?.status === 'pay_on_site') {
    const payOnSite = result.status === 'pay_on_site'

    return (
      <section className={`overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(15,23,42,0.08)] ${payOnSite ? 'border-sky-200 bg-[linear-gradient(145deg,#eff6ff_0%,#dbeafe_48%,#ecfeff_100%)]' : 'border-emerald-200 bg-[linear-gradient(145deg,#ecfdf5_0%,#d1fae5_42%,#dbeafe_100%)]'}`}>
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl ${payOnSite ? 'bg-sky-300/35' : 'bg-emerald-300/35'}`} />
          <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-sky-300/30 blur-3xl" />

          <div className="relative text-center">
            <div className="mx-auto mb-2 flex items-center justify-center">
              <PaymentSuccessAnimation size={190} />
            </div>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${payOnSite ? 'text-sky-700' : 'text-emerald-700'}`}>
              <PartyPopper size={14} />
              {payOnSite ? 'Agendamento confirmado' : 'Pagamento aprovado'}
            </div>
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-wide text-slate-900 sm:text-5xl">
              {payOnSite ? 'Sua aula foi reservada' : 'Sua aula esta confirmada'}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {payOnSite ? result.message : `${result.message} Agora e so se preparar e chegar no horario combinado.`}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Resumo</div>
                <div className="space-y-3">
                  <SuccessRow label="Produto" value={props.title} />
                  <SuccessRow label={payOnSite ? 'Valor combinado' : 'Valor pago'} value={formatPrice(props.amount)} />
                  <SuccessRow label="Instrutor" value={props.description} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  <Sparkles size={14} />
                  Proximos passos
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>{payOnSite ? 'Apresente esta confirmção para concluir o pagamento diretamente com a escola.' : 'Voce pode acompanhar suas aulas e revisar os detalhes na sua area do aluno.'}</p>
                  {!payOnSite && result.ticketUrl && (
                    <a href={result.ticketUrl} target="_blank" rel="noreferrer" className="inline-flex font-bold text-emerald-700 underline">
                      Abrir comprovante
                    </a>
                  )}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="primary">
                    <Link href={`/${props.schoolSlug}/minhas-aulas`}>Ir para minhas aulas</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

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
          <div className="mb-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => props.onlineEnabled && setPaymentMode('pay_now')}
              disabled={!props.onlineEnabled}
              className={`rounded border px-4 py-3 text-left ${paymentMode === 'pay_now' ? 'border-[var(--primary)] bg-sky-50' : 'border-slate-200 bg-white'} ${!props.onlineEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Opção 1</div>
              <div className="mt-1 font-semibold text-slate-900">Pague agora</div>
              <div className="mt-1 text-sm text-slate-500">
                {props.onlineEnabled ? 'Pix ou cartao pelo checkout.' : 'Disponivel apenas quando a escola conectar o Mercado Pago.'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('pay_on_site')}
              className={`rounded border px-4 py-3 text-left ${paymentMode === 'pay_on_site' ? 'border-[var(--primary)] bg-sky-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Opção 2</div>
              <div className="mt-1 font-semibold text-slate-900">Pague na hora</div>
              <div className="mt-1 text-sm text-slate-500">Confirma o agendamento e deixa o pagamento pendente.</div>
            </button>
          </div>

          {paymentMode === 'pay_now' ? (
            <>
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
                        paymentMode: 'pay_now',
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
            </>
          ) : paymentMode === 'pay_on_site' ? (
            <div className="space-y-4">
              <div className="rounded border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                Seu agendamento será confirmado agora, e o pagamento ficará pendente para ser feito na hora.
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    setSubmitting(true)
                    setError(null)

                    try {
                      const response = await fetch('/api/payments/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          schoolId: props.schoolId,
                          selectionType: props.selectionType,
                          paymentMode: 'pay_on_site',
                          instructorId: props.instructorId,
                          packageId: props.packageId ?? null,
                          selectedDate: props.selectedDate,
                          selectedSlots: props.selectedSlots,
                          lessons: props.lessons,
                          checkoutData: { formData: {} },
                        }),
                      })

                      const payload = await response.json()
                      if (!response.ok) {
                        const message = payload.error || 'Nao foi possivel confirmar o agendamento.'
                        setError(message)
                        props.onFailure(message)
                        throw new Error(message)
                      }

                      const checkoutResult = payload as ProcessPaymentResponse
                      setResult(checkoutResult)
                      props.onApproved(checkoutResult.message)
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  disabled={submitting}
                >
                  {submitting ? 'Confirmando...' : 'Confirmar e pagar na hora'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Escolha uma das opcoes acima para continuar.
            </div>
          )}
          {submitting && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded bg-white/80 backdrop-blur-[1px]">
              <SurfLoading
                compact
                fitParent
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

function SuccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-800">{value}</div>
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
