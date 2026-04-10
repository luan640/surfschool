import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { validatePhoneField } from '@/lib/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildWebhookNotificationUrl,
  createMercadoPagoPaymentClient,
  getValidMercadoPagoAccessTokenForSchool,
  mapMercadoPagoStatusMessage,
  normalizeMercadoPagoAmount,
  type CheckoutBrickPayload,
} from '@/lib/payments/mercadopago'

interface RequestBody {
  tripId: string
  schoolId: string
  paymentMode?: 'pay_now' | 'pay_on_site'
  registrant: {
    fullName: string
    email: string
    phone?: string | null
    notes?: string | null
  }
  checkoutData: CheckoutBrickPayload
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    if (!body.tripId || !body.schoolId || !body.registrant?.fullName || !body.registrant?.email) {
      return NextResponse.json({ error: 'Payload da inscricao invalido.' }, { status: 400 })
    }

    const phoneResult = validatePhoneField(body.registrant.phone, 'Telefone')
    if (phoneResult.error) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: trip } = await admin
      .from('trips')
      .select('id, school_id, title, price, capacity, allow_over_capacity, allow_late_registrations, ends_at, active')
      .eq('id', body.tripId)
      .eq('school_id', body.schoolId)
      .eq('active', true)
      .maybeSingle()

    if (!trip) {
      return NextResponse.json({ error: 'Trip nao encontrada.' }, { status: 404 })
    }

    if (!trip.allow_late_registrations && new Date(trip.ends_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'As inscricoes para esta trip ja foram encerradas.' }, { status: 409 })
    }

    if (trip.capacity && !trip.allow_over_capacity) {
      const { count } = await admin
        .from('trip_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip.id)
        .in('payment_status', ['paid', 'pending'])

      if ((count ?? 0) >= trip.capacity) {
        return NextResponse.json({ error: 'As vagas desta trip se encerraram.' }, { status: 409 })
      }
    }

    const paymentMode = body.paymentMode === 'pay_on_site' ? 'pay_on_site' : 'pay_now'

    if (paymentMode === 'pay_on_site') {
      const { data: registration, error: registrationError } = await admin
        .from('trip_registrations')
        .insert({
          trip_id: trip.id,
          school_id: trip.school_id,
          full_name: body.registrant.fullName,
          email: body.registrant.email,
          phone: phoneResult.value,
          notes: body.registrant.notes || null,
          payment_status: 'pending',
          status: 'confirmed',
          payment_method: null,
          amount: trip.price,
          mercadopago_status_detail: 'Pagamento sera realizado no local.',
        })
        .select('id')
        .single()

      if (registrationError || !registration) {
        return NextResponse.json({ error: registrationError?.message ?? 'Não foi possível reservar a vaga.' }, { status: 500 })
      }

      return NextResponse.json({
        registrationId: registration.id,
        paymentId: null,
        status: 'pay_on_site',
        message: 'Sua inscricao foi reservada. O pagamento ficara pendente para ser feito no local.',
        qrCode: null,
        qrCodeBase64: null,
        ticketUrl: null,
      })
    }

    const accessToken = await getValidMercadoPagoAccessTokenForSchool(trip.school_id)
    if (!accessToken) {
      return NextResponse.json({ error: 'A escola ainda nao conectou o Mercado Pago para esta trip.' }, { status: 409 })
    }

    const externalReference = `surfbook:trip:${crypto.randomUUID()}`
    const { data: registration, error: registrationError } = await admin
      .from('trip_registrations')
      .insert({
        trip_id: trip.id,
        school_id: trip.school_id,
        full_name: body.registrant.fullName,
        email: body.registrant.email,
        phone: phoneResult.value,
        notes: body.registrant.notes || null,
        payment_method: resolveTripPaymentMethod(body.checkoutData),
        amount: trip.price,
        external_reference: externalReference,
      })
      .select('id')
      .single()

    if (registrationError || !registration) {
      return NextResponse.json({ error: registrationError?.message ?? 'Não foi possível iniciar a inscricao.' }, { status: 500 })
    }

    const paymentClient = createMercadoPagoPaymentClient(accessToken)
    const payment = await paymentClient.create({
      body: {
        transaction_amount: normalizeMercadoPagoAmount(Number(trip.price)),
        description: `${trip.title} - Inscricao`,
        external_reference: externalReference,
        notification_url: buildWebhookNotificationUrl(trip.school_id),
        payment_method_id: body.checkoutData.formData.payment_method_id ?? 'pix',
        payer: {
          email: body.checkoutData.formData.payer?.email ?? body.registrant.email,
          first_name: body.registrant.fullName.split(' ')[0],
        },
        additional_info: {
          items: [
            {
              id: trip.id,
              title: trip.title,
              description: 'Inscricao de trip',
              quantity: 1,
              unit_price: normalizeMercadoPagoAmount(Number(trip.price)),
            },
          ],
        },
        metadata: {
          school_id: trip.school_id,
          trip_id: trip.id,
          trip_registration_id: registration.id,
          registrant_email: body.registrant.email,
        },
        token: body.checkoutData.formData.token,
        installments: body.checkoutData.formData.installments,
        issuer_id: body.checkoutData.formData.issuer_id ? Number(body.checkoutData.formData.issuer_id) : undefined,
        transaction_details: body.checkoutData.formData.transaction_details?.financial_institution
          ? {
              financial_institution: body.checkoutData.formData.transaction_details.financial_institution,
            }
          : undefined,
      },
      requestOptions: {
        idempotencyKey: externalReference,
      },
    })

    await admin
      .from('trip_registrations')
      .update({
        mercadopago_payment_id: payment.id ?? null,
        mercadopago_status: payment.status ?? null,
        mercadopago_status_detail: payment.status_detail ?? null,
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
        payment_status: mapTripPaymentStatus(payment.status),
        status: mapTripBookingStatus(payment.status),
      })
      .eq('id', registration.id)

    return NextResponse.json({
      registrationId: registration.id,
      paymentId: payment.id ?? null,
      status: payment.status ?? 'pending',
      message: mapMercadoPagoStatusMessage(payment),
      qrCode: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao processar a trip.' },
      { status: 500 },
    )
  }
}

function resolveTripPaymentMethod(checkoutData: CheckoutBrickPayload) {
  return checkoutData.paymentType === 'bank_transfer'
    || checkoutData.selectedPaymentMethod === 'bank_transfer'
    || checkoutData.formData.payment_method_id === 'pix'
    ? 'pix'
    : 'credit_card'
}

function mapTripPaymentStatus(status?: string) {
  if (status === 'approved') return 'paid'
  if (status === 'pending' || status === 'in_process' || status === 'authorized') return 'pending'
  return 'failed'
}

function mapTripBookingStatus(status?: string) {
  if (status === 'approved') return 'confirmed'
  if (status === 'pending' || status === 'in_process' || status === 'authorized') return 'pending'
  return 'cancelled'
}
