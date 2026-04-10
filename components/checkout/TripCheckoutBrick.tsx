'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { PartyPopper, Sparkles } from 'lucide-react'
import { PaymentSuccessAnimation } from '@/components/checkout/PaymentSuccessAnimation'
import { Button } from '@/components/ui/button'
import { SurfLoading } from '@/components/dashboard/SurfLoading'
import { formatPhone, PHONE_INPUT_MAX_LENGTH } from '@/lib/phone'
import { formatPrice } from '@/lib/utils'

interface Props {
  tripId: string
  schoolId: string
  schoolSlug: string
  amount: number
  title: string
}

interface ProcessTripPaymentResponse {
  registrationId: string
  paymentId: number | null
  status: string
  message: string
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export function TripCheckoutBrick({ tripId, schoolId, schoolSlug, amount, title }: Props) {
  const [paymentMode, setPaymentMode] = useState<'pay_now' | 'pay_on_site'>('pay_now')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessTripPaymentResponse | null>(null)

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    if (!publicKey) {
      setError('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY nao configurada.')
      return
    }

    initMercadoPago(publicKey, { locale: 'pt-BR' })
  }, [])

  useEffect(() => {
    if (!result?.registrationId || (result.status !== 'pending' && result.status !== 'in_process')) return

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/trips/registrations/status/${result.registrationId}`, { cache: 'no-store' })
      if (!response.ok) return

      const payload = await response.json()
      if (payload.payment_status === 'paid') {
        setResult((current) => current ? { ...current, status: 'approved', message: 'Inscricao confirmada com pagamento aprovado.' } : current)
        window.clearInterval(interval)
      }

      if (payload.payment_status === 'failed') {
        setResult((current) => current ? { ...current, status: 'rejected', message: 'O pagamento da inscricao nao foi aprovado.' } : current)
        window.clearInterval(interval)
      }
    }, 5000)

    return () => window.clearInterval(interval)
  }, [result])

  const initialization = useMemo(() => ({
    amount,
    payer: email ? { email } : undefined,
    items: {
      totalItemsAmount: amount,
      itemsList: [
        {
          name: title,
          description: 'Inscricao de trip',
          units: 1,
          value: amount,
        },
      ],
    },
  }), [amount, email, title])

  const formReady = fullName.trim() && email.trim()

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
              {payOnSite ? 'Reserva confirmada' : 'Pagamento aprovado'}
            </div>
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-wide text-slate-900 sm:text-5xl">
              {payOnSite ? 'Sua vaga foi reservada' : 'Sua vaga esta garantida'}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {result.message} {payOnSite ? 'Leve essa confirmacao para concluir o pagamento presencialmente.' : 'Agora e so arrumar a prancha, separar o protetor solar e se preparar para a trip.'}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Resumo da inscricao</div>
                <div className="space-y-3">
                  <SuccessRow label="Trip" value={title} />
                  <SuccessRow label="Participante" value={fullName} />
                  <SuccessRow label={payOnSite ? 'Valor combinado' : 'Valor pago'} value={formatPrice(amount)} />
                  <SuccessRow label="E-mail" value={email} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  <Sparkles size={14} />
                  Próximos passos
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>Você receberá as informações da trip no e-mail informado durante a inscrição.</p>
                  <p>{payOnSite ? 'O pagamento ficara marcado como pendente ate ser recebido pela escola.' : 'Se precisar revisar os detalhes do pagamento, verifique o e-mail informado durante a inscricao.'}</p>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="primary">
                    <Link href={`/${schoolSlug}`}>Voltar para a escola</Link>
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
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <div className="font-condensed text-2xl font-bold uppercase text-slate-900">Inscreva-se na trip</div>
          <p className="mt-1 text-sm text-slate-500">Preencha seus dados e escolha se prefere pagar agora ou combinar o pagamento no local.</p>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPaymentMode('pay_now')}
            className={`flex items-center gap-3 rounded border px-4 py-3 text-left transition-colors ${paymentMode === 'pay_now' ? 'border-[var(--primary)] bg-sky-50' : 'border-slate-200 bg-white'}`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${paymentMode === 'pay_now' ? 'border-[var(--primary)]' : 'border-slate-300'}`}>
              {paymentMode === 'pay_now' && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Pague agora</span>
              <span className="block text-sm text-slate-500">Pix ou cartão pelo checkout.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('pay_on_site')}
            className={`flex items-center gap-3 rounded border px-4 py-3 text-left transition-colors ${paymentMode === 'pay_on_site' ? 'border-[var(--primary)] bg-sky-50' : 'border-slate-200 bg-white'}`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${paymentMode === 'pay_on_site' ? 'border-[var(--primary)]' : 'border-slate-300'}`}>
              {paymentMode === 'pay_on_site' && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Pague na hora</span>
              <span className="block text-sm text-slate-500">Confirma o agendamento e deixa o pagamento pendente.</span>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome completo *">
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 w-full rounded-sm border border-slate-200 px-3 text-sm" />
          </Field>
          <Field label="E-mail *">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-11 w-full rounded-sm border border-slate-200 px-3 text-sm" />
          </Field>
          <Field label="Telefone">
            <input
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              inputMode="numeric"
              maxLength={PHONE_INPUT_MAX_LENGTH}
              className="h-11 w-full rounded-sm border border-slate-200 px-3 text-sm"
            />
          </Field>
          <Field label="Valor">
            <div className="flex h-11 items-center rounded-sm border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">{formatPrice(amount)}</div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm" />
            </Field>
          </div>
        </div>
      </div>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {result ? (
        <div className={`rounded-2xl border p-5 ${result.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : result.status === 'pending' || result.status === 'in_process' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className="font-condensed text-2xl font-bold uppercase">
            {result.status === 'approved' ? 'Inscricao confirmada' : result.status === 'pending' || result.status === 'in_process' ? 'Aguardando pagamento' : 'Pagamento nao aprovado'}
          </div>
          <p className="mt-2 text-sm">{result.message}</p>
          {result.qrCodeBase64 && (
            <img src={`data:image/png;base64,${result.qrCodeBase64}`} alt="QR Code PIX" className="mt-4 h-48 w-48 rounded border border-white bg-white p-2" />
          )}
          {result.qrCode && <div className="mt-3 break-all rounded bg-white/80 px-3 py-2 font-mono text-xs">{result.qrCode}</div>}
        </div>
      ) : paymentMode === 'pay_now' ? (
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
          {!formReady && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Preencha pelo menos nome e e-mail para liberar o pagamento.
            </div>
          )}
          <Payment
            initialization={initialization}
            customization={{
              paymentMethods: {
                creditCard: 'all',
                bankTransfer: 'all',
                types: { included: ['creditCard', 'bank_transfer'] },
                maxInstallments: 12,
              },
            }}
            locale="pt-BR"
            onError={(brickError) => setError(brickError.message ?? 'Erro ao inicializar o checkout.')}
            onReady={() => undefined}
            onSubmit={async (submission, additionalData) => {
              if (!formReady) {
                setError('Preencha nome e e-mail antes de pagar.')
                throw new Error('Form incompleto.')
              }

              setSubmitting(true)
              setError(null)
              try {
                const response = await fetch('/api/trips/process-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tripId,
                    schoolId,
                    registrant: { fullName, email, phone, notes },
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
                  const message = payload.error || 'Não foi possível processar a inscricao.'
                  setError(message)
                  throw new Error(message)
                }

                setResult(payload as ProcessTripPaymentResponse)
              } finally {
                setSubmitting(false)
              }
            }}
          />
          {submitting && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl bg-white/80 backdrop-blur-[1px]">
              <SurfLoading
                compact
                fitParent
                title="Processando pagamento"
                subtitle="Estamos validando o metodo escolhido e finalizando sua inscricao."
              />
            </div>
          )}
          {!formReady && <div className="absolute inset-0 z-[5] rounded-2xl bg-white/35" />}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {!formReady && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Preencha pelo menos nome e e-mail para reservar sua vaga.
            </div>
          )}
          <div className="rounded border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            Sua vaga sera registrada como confirmada, com pagamento pendente para ser feito no local.
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              disabled={!formReady || submitting}
              onClick={async () => {
                if (!formReady) {
                  setError('Preencha nome e e-mail antes de reservar.')
                  return
                }

                setSubmitting(true)
                setError(null)
                try {
                  const response = await fetch('/api/trips/process-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tripId,
                      schoolId,
                      paymentMode: 'pay_on_site',
                      registrant: { fullName, email, phone, notes },
                      checkoutData: { formData: {} },
                    }),
                  })

                  const payload = await response.json()
                  if (!response.ok) {
                    const message = payload.error || 'Não foi possível reservar a inscricao.'
                    setError(message)
                    throw new Error(message)
                  }

                  setResult(payload as ProcessTripPaymentResponse)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting ? 'Reservando...' : 'Reservar e pagar no local'}
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </label>
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
