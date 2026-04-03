'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createMercadoPagoRefundClient,
  getValidMercadoPagoAccessTokenForSchool,
} from '@/lib/payments/mercadopago'
import { markPaymentTransactionRefunded } from '@/lib/payments/payment-store'
import type { ActionResult, SalesHistoryEntry } from '@/lib/types'
import { getMySchool } from '@/actions/instructors'

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function getSalesHistoryPageData(): Promise<{
  sales: SalesHistoryEntry[]
}> {
  const supabase = await createClient()
  const school = await getMySchool()

  if (!school) {
    return { sales: [] }
  }

  const [transactionsResult, tripsResult, manualBookingsResult] = await Promise.all([
    supabase
      .from('payment_transactions')
      .select(`
        id,
        product_type,
        payment_method,
        amount,
        status,
        booking_ids,
        refund_reason,
        external_reference,
        mercadopago_payment_id,
        mercadopago_status,
        mercadopago_status_detail,
        created_at,
        updated_at,
        student:student_profiles(full_name, phone)
      `)
      .eq('school_id', school.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),
    supabase
      .from('trip_registrations')
      .select(`
        id,
        full_name,
        email,
        phone,
        amount,
        status,
        payment_status,
        payment_method,
        refund_reason,
        qr_code,
        external_reference,
        mercadopago_payment_id,
        mercadopago_status,
        mercadopago_status_detail,
        created_at,
        updated_at,
        trip:trips(title)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select(`
        id,
        payment_method,
        payment_status,
        total_amount,
        status,
        lesson_date,
        refund_reason,
        created_at,
        updated_at,
        student:student_profiles(full_name, phone)
      `)
      .eq('school_id', school.id)
      .eq('payment_method', 'cash')
      .is('payment_transaction_id', null)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false }),
  ])

  const lessonAndPackageSales = (transactionsResult.data ?? []).map((row) => {
    const title = row.product_type === 'package' ? 'Pacote de aulas' : 'Aula avulsa'
    const student = getSingleRelation(row.student)

    return {
      id: row.id as string,
      kind: row.product_type as 'single_lesson' | 'package',
      title,
      customer_name: student?.full_name ?? 'Aluno',
      customer_email: null,
      customer_phone: student?.phone ?? null,
      amount: Number(row.amount),
      payment_status: row.status as SalesHistoryEntry['payment_status'],
      sale_status: row.status === 'paid'
        ? 'Venda concluida'
        : row.status === 'pending'
          ? 'Pagamento pendente'
          : row.status === 'refunded'
            ? 'Venda reembolsada'
            : 'Falha no pagamento',
      payment_method_label: row.payment_method === 'pix' ? 'Pix' : 'Cartao',
      external_reference: row.external_reference ?? null,
      mercadopago_payment_id: row.mercadopago_payment_id ?? null,
      mercadopago_status: row.mercadopago_status ?? null,
      mercadopago_status_detail: row.mercadopago_status_detail ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      can_refund: row.status === 'paid' && Boolean(row.mercadopago_payment_id),
      coupon_usage: [] as string[],
      refund_reason: (row.refund_reason as string | null) ?? null,
    } satisfies SalesHistoryEntry
  })

  const tripSales = (tripsResult.data ?? []).map((row) => {
    const trip = getSingleRelation(row.trip)

    return ({
    id: row.id as string,
    kind: 'trip' as const,
    title: trip?.title ? `Trip: ${trip.title}` : 'Trip',
    customer_name: row.full_name as string,
    customer_email: (row.email as string | null) ?? null,
    customer_phone: (row.phone as string | null) ?? null,
    amount: Number(row.amount),
    payment_status: row.payment_status as SalesHistoryEntry['payment_status'],
    sale_status: row.status === 'confirmed'
      ? 'Inscricao confirmada'
      : row.status === 'pending'
        ? 'Inscricao pendente'
        : 'Inscricao cancelada',
    payment_method_label: formatTripPaymentMethodLabel(
      (row.payment_method as 'pix' | 'credit_card' | 'debit_card' | 'cash' | null)
        ?? (row.qr_code ? 'pix' : 'credit_card')
    ),
    external_reference: (row.external_reference as string | null) ?? null,
    mercadopago_payment_id: row.mercadopago_payment_id ?? null,
    mercadopago_status: row.mercadopago_status ?? null,
    mercadopago_status_detail: row.mercadopago_status_detail ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    can_refund: row.payment_status === 'paid' && Boolean(row.mercadopago_payment_id),
    coupon_usage: [] as string[],
    refund_reason: (row.refund_reason as string | null) ?? null,
    })
  })

  const manualSales = (manualBookingsResult.data ?? []).map((row) => {
    const student = getSingleRelation(row.student)

    return ({
    id: row.id as string,
    kind: 'single_lesson' as const,
    title: 'Aula manual',
    customer_name: student?.full_name ?? 'Aluno',
    customer_email: null,
    customer_phone: student?.phone ?? null,
    amount: Number(row.total_amount),
    payment_status: row.payment_status as SalesHistoryEntry['payment_status'],
    sale_status: row.status === 'completed'
      ? 'Aula concluida'
      : row.status === 'confirmed'
        ? 'Aula confirmada'
        : row.status === 'cancelled'
          ? 'Aula cancelada'
          : 'Aula pendente',
    payment_method_label: 'Dinheiro',
    external_reference: null,
    mercadopago_payment_id: null,
    mercadopago_status: null,
    mercadopago_status_detail: `Aula em ${row.lesson_date}`,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    can_refund: false,
    coupon_usage: [] as string[],
    refund_reason: (row.refund_reason as string | null) ?? null,
    })
  })

  const bookingIds = new Set<string>()
  ;(transactionsResult.data ?? []).forEach((row) => {
    const transactionBookingIds = (row.booking_ids as string[] | null) ?? []
    transactionBookingIds.forEach((bookingId) => bookingIds.add(bookingId))
  })
  ;(manualBookingsResult.data ?? []).forEach((row) => bookingIds.add(row.id as string))

  const { data: couponRedemptions } = bookingIds.size
    ? await supabase
        .from('discount_coupon_redemptions')
        .select(`
          booking_id,
          coupon:discount_coupons(code, name)
        `)
        .in('booking_id', [...bookingIds])
    : { data: [] as Array<{ booking_id: string; coupon?: { code: string; name: string } | { code: string; name: string }[] | null }> }

  const couponUsageByBookingId = new Map<string, string[]>()

  ;(couponRedemptions ?? []).forEach((row) => {
    const coupon = Array.isArray(row.coupon) ? row.coupon[0] ?? null : row.coupon ?? null
    if (!row.booking_id || !coupon?.code) return

    const current = couponUsageByBookingId.get(row.booking_id) ?? []
    current.push(coupon.name ? `${coupon.code} - ${coupon.name}` : coupon.code)
    couponUsageByBookingId.set(row.booking_id, [...new Set(current)])
  })

  const lessonAndPackageSalesWithCoupons = lessonAndPackageSales.map((sale, index) => {
    const bookingIdsForSale = (((transactionsResult.data ?? [])[index]?.booking_ids as string[] | null) ?? [])
    const couponUsage = [...new Set(bookingIdsForSale.flatMap((bookingId) => couponUsageByBookingId.get(bookingId) ?? []))]

    return {
      ...sale,
      coupon_usage: couponUsage,
    }
  })

  const manualSalesWithCoupons = manualSales.map((sale, index) => {
    const bookingId = (manualBookingsResult.data ?? [])[index]?.id as string | undefined

    return {
      ...sale,
      coupon_usage: bookingId ? couponUsageByBookingId.get(bookingId) ?? [] : [],
    }
  })

  const sales = [...lessonAndPackageSalesWithCoupons, ...tripSales, ...manualSalesWithCoupons].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return { sales }
}

function formatTripPaymentMethodLabel(paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash' | null) {
  switch (paymentMethod) {
    case 'pix':
      return 'Pix'
    case 'credit_card':
      return 'Cartão de crédito'
    case 'debit_card':
      return 'Cartão de débito'
    case 'cash':
      return 'Dinheiro'
    default:
      return 'Não informado'
  }
}

export async function refundSale(formData: FormData): Promise<ActionResult<{ refunded: true }>> {
  const saleId = (formData.get('sale_id') as string | null)?.trim() ?? ''
  const saleKind = (formData.get('sale_kind') as string | null)?.trim() ?? ''
  const refundReason = (formData.get('refund_reason') as string | null)?.trim() ?? ''

  if (!saleId || !saleKind) {
    return { success: false, error: 'Venda invalida para reembolso.' }
  }

  if (!refundReason) {
    return { success: false, error: 'Informe o motivo do reembolso.' }
  }

  const school = await getMySchool()
  if (!school) {
    return { success: false, error: 'Nao autorizado.' }
  }

  const accessToken = await getValidMercadoPagoAccessTokenForSchool(school.id)
  if (!accessToken) {
    return { success: false, error: 'Conecte o Mercado Pago antes de registrar reembolsos.' }
  }

  const refundClient = createMercadoPagoRefundClient(accessToken)
  const admin = createAdminClient()

  if (saleKind === 'trip') {
    const { data: tripSale, error: tripError } = await admin
      .from('trip_registrations')
      .select('id, school_id, payment_status, mercadopago_payment_id')
      .eq('id', saleId)
      .eq('school_id', school.id)
      .single()

    if (tripError || !tripSale) {
      return { success: false, error: tripError?.message ?? 'Venda nao encontrada.' }
    }

    if (tripSale.payment_status !== 'paid') {
      return { success: false, error: 'Apenas vendas pagas podem ser reembolsadas.' }
    }

    if (!tripSale.mercadopago_payment_id) {
      return { success: false, error: 'Essa venda nao possui pagamento Mercado Pago para reembolso.' }
    }

    try {
      const refund = await refundClient.total({
        payment_id: tripSale.mercadopago_payment_id,
        requestOptions: {
          idempotencyKey: `refund:trip:${saleId}`,
        },
      })

      const { error: updateError } = await admin
        .from('trip_registrations')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
          mercadopago_status: 'refunded',
          mercadopago_status_detail: 'Pagamento reembolsado.',
          refund_reason: refundReason,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripSale.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      revalidatePath('/dashboard/sales-history')
      revalidatePath('/dashboard/trips')
      return { success: true, data: { refunded: true } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel reembolsar a venda.',
      }
    }
  }

  const { data: transaction, error: transactionError } = await admin
    .from('payment_transactions')
    .select('id, school_id, status, mercadopago_payment_id')
    .eq('id', saleId)
    .eq('school_id', school.id)
    .single()

  if (transactionError || !transaction) {
    return { success: false, error: transactionError?.message ?? 'Venda nao encontrada.' }
  }

  if (transaction.status !== 'paid') {
    return { success: false, error: 'Apenas vendas pagas podem ser reembolsadas.' }
  }

  if (!transaction.mercadopago_payment_id) {
    return { success: false, error: 'Essa venda nao possui pagamento Mercado Pago para reembolso.' }
  }

  try {
    const refund = await refundClient.total({
      payment_id: transaction.mercadopago_payment_id,
      requestOptions: {
        idempotencyKey: `refund:transaction:${saleId}`,
      },
    })

    await markPaymentTransactionRefunded({
      transactionId: transaction.id,
      mercadopagoPaymentId: transaction.mercadopago_payment_id,
      refundResponse: refund,
      refundReason,
    })

    revalidatePath('/dashboard/sales-history')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/overview')
    revalidatePath('/dashboard/reports')

    return { success: true, data: { refunded: true } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nao foi possivel reembolsar a venda.',
    }
  }
}
