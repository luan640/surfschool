import { NextResponse } from 'next/server'
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMercadoPagoPaymentClient, getValidMercadoPagoAccessTokenForSchool, validateMercadoPagoWebhookSignature } from '@/lib/payments/mercadopago'
import { syncPaymentTransactionState } from '@/lib/payments/payment-store'

interface MercadoPagoWebhookBody {
  type?: string
  action?: string
  data?: {
    id?: string
  }
}

export async function POST(request: Request) {
  try {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret nao configurado.' }, { status: 500 })
    }

    const url = new URL(request.url)
    const notificationDataId = url.searchParams.get('data.id') ?? url.searchParams.get('data.id'.toUpperCase())
    const schoolId = url.searchParams.get('school_id')
    const signatureHeader = request.headers.get('x-signature')
    const requestId = request.headers.get('x-request-id')

    if (!notificationDataId || !validateMercadoPagoWebhookSignature({
      dataId: notificationDataId,
      requestId,
      signatureHeader,
      secret,
    })) {
      return NextResponse.json({ error: 'Assinatura do webhook invalida.' }, { status: 401 })
    }

    const body = (await request.json()) as MercadoPagoWebhookBody
    if (body.type !== 'payment' || !body.data?.id) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 202 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'school_id ausente no webhook.' }, { status: 400 })
    }

    const accessToken = await getValidMercadoPagoAccessTokenForSchool(schoolId)
    if (!accessToken) {
      return NextResponse.json({ error: 'Conexao Mercado Pago indisponivel para reconciliacao.' }, { status: 409 })
    }

    const paymentClient = createMercadoPagoPaymentClient(accessToken)
    const payment = await paymentClient.get({ id: body.data.id })
    const externalReference = payment.external_reference ?? undefined

    if (externalReference?.startsWith('surfbook:trip:')) {
      await syncTripRegistrationState(payment)
    } else {
      await syncPaymentTransactionState({
        externalReference,
        payment,
      })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao processar webhook.',
      },
      { status: 500 }
    )
  }
}

async function syncTripRegistrationState(payment: PaymentResponse) {
  const admin = createAdminClient()
  const externalReference = payment.external_reference ?? null
  if (!externalReference) throw new Error('Referencia externa ausente para a trip.')

  const paymentStatus = payment.status === 'approved'
    ? 'paid'
    : payment.status === 'pending' || payment.status === 'in_process' || payment.status === 'authorized'
      ? 'pending'
      : 'failed'
  const status = paymentStatus === 'paid'
    ? 'confirmed'
    : paymentStatus === 'pending'
      ? 'pending'
      : 'cancelled'

  const { error } = await admin
    .from('trip_registrations')
    .update({
      payment_status: paymentStatus,
      status,
      mercadopago_payment_id: payment.id ?? null,
      mercadopago_status: payment.status ?? null,
      mercadopago_status_detail: payment.status_detail ?? null,
      ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
      qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    })
    .eq('external_reference', externalReference)

  if (error) throw new Error(error.message)
}
