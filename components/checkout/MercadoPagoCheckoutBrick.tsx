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
import { useLanguage } from '@/contexts/LanguageContext'

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
  payOnSiteOnly?: boolean
  payOnSiteLabel?: string
  payOnSiteHint?: string
  isTrialLesson?: boolean
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

interface AppliedCoupon {
  id: string
  code: string
  name: string
  discountAmount: number
  finalAmount: number
}

export function MercadoPagoCheckoutBrick(props: Props) {
  const { t, lang, dateLocale } = useLanguage()
  const [paymentMode, setPaymentMode] = useState<'pay_now' | 'pay_on_site' | null>(props.payOnSiteOnly ? 'pay_on_site' : null)
  const [submitting, setSubmitting] = useState(false)
  const [pollingStatus, setPollingStatus] = useState(false)
  const [lastStatusCheckAt, setLastStatusCheckAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessPaymentResponse | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  useEffect(() => {
    setPaymentMode(props.payOnSiteOnly ? 'pay_on_site' : null)
  }, [props.instructorId, props.onlineEnabled, props.packageId, props.payOnSiteOnly, props.schoolId, props.selectedDate, props.selectionType])

  useEffect(() => {
    setCouponCode('')
    setCouponError(null)
    setAppliedCoupon(null)
  }, [props.amount, props.packageId, props.schoolId, props.selectionType, props.selectedDate, props.instructorId])

  useEffect(() => {
    props.onNavigationLockChange?.(result?.status === 'pay_on_site')
  }, [props, result?.status])

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    if (!publicKey) {
      setError(t.checkout_error_mp_key)
      return
    }

    initMercadoPago(publicKey, {
      locale: lang === 'en' ? 'en-US' : 'pt-BR',
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
            message: t.checkout_payment_approved,
          } : current)
          props.onApproved(t.checkout_payment_approved)
          window.clearInterval(interval)
        }

        if (payload.status === 'failed') {
          setResult((current) => current ? {
            ...current,
            status: 'rejected',
            statusDetail: payload.mercadopago_status_detail ?? current.statusDetail,
            message: payload.mercadopago_status_detail || t.checkout_payment_rejected,
          } : current)
          props.onFailure(payload.mercadopago_status_detail || t.checkout_payment_rejected)
          window.clearInterval(interval)
        }
      } finally {
        setPollingStatus(false)
      }
    }, 5000)

    return () => window.clearInterval(interval)
  }, [props, result])

  const payableAmount = appliedCoupon?.finalAmount ?? props.amount

  const initialization = useMemo(() => ({
    amount: payableAmount,
    payer: props.payerEmail ? { email: props.payerEmail } : undefined,
    items: {
      totalItemsAmount: payableAmount,
      itemsList: [
        {
          name: props.title,
          description: props.description,
          units: 1,
          value: payableAmount,
        },
      ],
    },
  }), [payableAmount, props.description, props.payerEmail, props.title])

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setCouponError(t.checkout_coupon_empty_error)
      return
    }

    setCouponLoading(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: props.schoolId,
          selectionType: props.selectionType,
          packageId: props.packageId ?? null,
          amount: props.amount,
          code: couponCode,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setAppliedCoupon(null)
        setCouponError(payload.error || t.checkout_coupon_invalid_error)
        return
      }

      setAppliedCoupon(payload as AppliedCoupon)
      setCouponCode((payload.code as string) ?? couponCode.trim().toUpperCase())
    } finally {
      setCouponLoading(false)
    }
  }

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
              {payOnSite ? t.checkout_booking_confirmed_badge : t.checkout_payment_approved_badge}
            </div>
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-wide text-slate-900 sm:text-5xl">
              {payOnSite ? t.checkout_booking_reserved : t.checkout_booking_confirmed}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {payOnSite ? result.message : `${result.message} ${t.checkout_booking_ready}`}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t.checkout_summary}</div>
                <div className="space-y-3">
                  <SuccessRow label={t.checkout_summary_product} value={props.title} />
                  <SuccessRow label={payOnSite ? t.checkout_summary_amount_agreed : t.checkout_summary_amount_paid} value={formatPrice(payableAmount)} />
                  <SuccessRow label={t.checkout_summary_instructor} value={props.description} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 text-left backdrop-blur-sm">
                <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  <Sparkles size={14} />
                  {t.checkout_next_steps}
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>{payOnSite ? t.checkout_next_pay_on_site : t.checkout_next_approved}</p>
                  {!payOnSite && result.ticketUrl && (
                    <a href={result.ticketUrl} target="_blank" rel="noreferrer" className="inline-flex font-bold text-emerald-700 underline">
                      {t.checkout_open_receipt}
                    </a>
                  )}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="primary">
                    <Link href={`/${props.schoolSlug}/minhas-aulas`}>{t.checkout_my_lessons}</Link>
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
          amount={payableAmount}
          isPolling={pollingStatus}
          lastStatusCheckAt={lastStatusCheckAt}
          result={result}
        />
      )}
      {!result && (
        <div className="relative rounded border border-slate-200 bg-white p-4">
          {!props.payOnSiteOnly && (
            <div className="mb-5 rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-end gap-3">
                <label className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t.checkout_coupon_label}</div>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder={t.checkout_coupon_placeholder}
                    className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)]"
                  />
                </label>
                <Button type="button" onClick={applyCoupon} disabled={couponLoading || submitting}>
                  {couponLoading ? t.checkout_coupon_applying : t.checkout_coupon_apply}
                </Button>
                {appliedCoupon && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponError(null)
                      setCouponCode('')
                    }}
                    disabled={couponLoading || submitting}
                  >
                    {t.checkout_coupon_remove}
                  </Button>
                )}
              </div>
              {couponError && <div className="mt-2 text-sm text-rose-600">{couponError}</div>}
              {appliedCoupon && (
                <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  <div className="font-semibold">{t.checkout_coupon_applied(appliedCoupon.code)}</div>
                  <div className="mt-1">{t.checkout_coupon_discount(formatPrice(appliedCoupon.discountAmount))}</div>
                  <div>{t.checkout_coupon_total(formatPrice(appliedCoupon.finalAmount))}</div>
                </div>
              )}
            </div>
          )}

          {!props.payOnSiteOnly && (
          <div className="mb-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => props.onlineEnabled && setPaymentMode('pay_now')}
              disabled={!props.onlineEnabled}
              className={`flex items-center gap-3 rounded border px-4 py-3 text-left transition-colors ${paymentMode === 'pay_now' ? 'border-[var(--primary)] bg-sky-50' : 'border-slate-200 bg-white'} ${!props.onlineEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${paymentMode === 'pay_now' ? 'border-[var(--primary)]' : 'border-slate-300'}`}>
                {paymentMode === 'pay_now' && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{t.checkout_option1_title}</span>
                <span className="block text-sm text-slate-500">
                  {props.onlineEnabled ? t.checkout_option1_desc : t.checkout_option1_unavailable}
                </span>
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
                <span className="block font-semibold text-slate-900">{t.checkout_option2_title}</span>
                <span className="block text-sm text-slate-500">{t.checkout_option2_desc}</span>
              </span>
            </button>
          </div>
          )}

          {paymentMode === 'pay_now' ? (
            <>
              <div className="mb-4 text-sm text-slate-500">{t.checkout_payment_intro}</div>
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
                locale={lang === 'en' ? 'en-US' : 'pt-BR'}
                onReady={() => undefined}
                onError={(brickError) => {
                  setError(brickError.message ?? t.checkout_error_process)
                  props.onFailure(brickError.message ?? t.checkout_error_process)
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
                        isTrialLesson: props.isTrialLesson ?? false,
                        couponCode: appliedCoupon?.code ?? null,
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
                      const message = payload.error || t.checkout_error_process
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
              {props.payOnSiteHint && (
                <div className="rounded border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                  {props.payOnSiteHint}
                </div>
              )}
              {!props.isTrialLesson && (
                <div className="rounded border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                  {t.checkout_pay_on_site_info}
                </div>
              )}
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
                          isTrialLesson: props.isTrialLesson ?? false,
                          couponCode: appliedCoupon?.code ?? null,
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
                        const message = payload.error || t.checkout_error_confirm
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
                  {submitting ? t.checkout_confirming : (props.payOnSiteLabel ?? t.checkout_confirm_pay_later)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {t.checkout_choose_option}
            </div>
          )}
          {submitting && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded bg-white/80 backdrop-blur-[1px]">
              <SurfLoading
                compact
                fitParent
                title={t.checkout_processing_title}
                subtitle={t.checkout_processing_sub}
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
  const { t, dateLocale } = useLanguage()
  const [copied, setCopied] = useState(false)
  const isApproved = result.status === 'approved'
  const isPending = result.status === 'pending' || result.status === 'in_process'
  const heading = isApproved ? t.checkout_payment_approved : isPending ? t.checkout_payment_waiting : t.checkout_payment_rejected
  const description = isPending ? t.checkout_payment_pix_hint : result.message

  function copyQrCode() {
    if (!result.qrCode) return
    navigator.clipboard.writeText(result.qrCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className={`rounded border px-4 py-4 ${isApproved ? 'border-emerald-200 bg-emerald-50' : isPending ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="font-condensed text-2xl font-bold uppercase">{heading}</div>
      <div className="mt-1 text-sm">{description}</div>
      <div className="mt-2 text-sm font-semibold">{t.checkout_amount_label(formatPrice(amount))}</div>
      {isPending && (
        <div className="mt-4 rounded border border-amber-300 bg-white/70 px-3 py-3 text-sm text-amber-900">
          <div className="font-semibold uppercase">{t.checkout_payment_waiting_label}</div>
          <div className="mt-1">{t.checkout_qr_pending}</div>
          <div className="mt-2 text-xs text-amber-700">
            {isPolling
              ? t.checkout_checking
              : lastStatusCheckAt
                ? t.checkout_last_check(new Date(lastStatusCheckAt).toLocaleTimeString(dateLocale))
                : t.checkout_auto_update}
          </div>
        </div>
      )}
      {result.qrCodeBase64 && (
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <img
            src={`data:image/png;base64,${result.qrCodeBase64}`}
            alt="QR Code PIX"
            className="h-48 w-48 rounded border border-white bg-white p-2"
          />
          {result.qrCode && (
            <button
              type="button"
              onClick={copyQrCode}
              className={`flex items-center gap-2 rounded border px-4 py-2 text-sm font-semibold transition-colors ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-50'}`}
            >
              {copied ? '✓ Copiado!' : 'Copiar código PIX'}
            </button>
          )}
        </div>
      )}
      {result.qrCode && <div className="mt-3 break-all rounded bg-white/80 px-3 py-2 font-mono text-xs">{result.qrCode}</div>}
      {result.ticketUrl && <a href={result.ticketUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold underline">{t.checkout_open_receipt}</a>}
    </div>
  )
}
