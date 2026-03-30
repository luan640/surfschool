import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapMercadoPagoStatus } from '@/lib/payments/mercadopago'

export interface PersistCheckoutTransactionInput {
  schoolId: string
  studentId: string
  bookingIds: string[]
  studentPackageId?: string | null
  selectionType: 'single' | 'package'
  paymentMethod: 'pix' | 'credit_card'
  amount: number
  externalReference: string
  checkoutPayload: unknown
}

export async function createPaymentTransactionRecord(input: PersistCheckoutTransactionInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_transactions')
    .insert({
      school_id: input.schoolId,
      student_id: input.studentId,
      booking_ids: input.bookingIds,
      student_package_id: input.studentPackageId ?? null,
      product_type: input.selectionType === 'package' ? 'package' : 'single_lesson',
      payment_method: input.paymentMethod,
      amount: input.amount,
      external_reference: input.externalReference,
      checkout_payload: input.checkoutPayload,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Nao foi possivel registrar a transacao.')
  }

  return data.id as string
}

export async function attachTransactionToBookings(transactionId: string, bookingIds: string[]) {
  if (bookingIds.length === 0) return

  const admin = createAdminClient()
  const { error } = await admin
    .from('bookings')
    .update({ payment_transaction_id: transactionId })
    .in('id', bookingIds)

  if (error) throw new Error(error.message)
}

export async function getBookingIdsForStudentPackage(studentPackageId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('student_package_lessons')
    .select('booking_id')
    .eq('student_package_id', studentPackageId)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((item) => item.booking_id as string | null)
    .filter((value): value is string => Boolean(value))
}

export async function syncPaymentTransactionState(input: {
  transactionId?: string
  externalReference?: string
  payment: PaymentResponse
}) {
  const admin = createAdminClient()
  const paymentStatus = mapMercadoPagoStatus(input.payment.status)

  if (!input.transactionId && !input.externalReference) {
    throw new Error('Referencia local de pagamento ausente.')
  }

  let query = admin
    .from('payment_transactions')
    .select('id, booking_ids, student_package_id')

  query = input.transactionId
    ? query.eq('id', input.transactionId)
    : query.eq('external_reference', input.externalReference ?? '')

  const { data: transaction, error: transactionError } = await query.single()
  if (transactionError || !transaction) {
    throw new Error(transactionError?.message ?? 'Transacao local nao encontrada.')
  }

  const bookingIds = (transaction.booking_ids as string[] | null) ?? []
  const paymentRef = input.payment.id?.toString() ?? null

  const { error: updateTransactionError } = await admin
    .from('payment_transactions')
    .update({
      status: paymentStatus,
      mercadopago_payment_id: input.payment.id ?? null,
      mercadopago_status: input.payment.status ?? null,
      mercadopago_status_detail: input.payment.status_detail ?? null,
      payment_method_id: input.payment.payment_method_id ?? null,
      payment_type_id: input.payment.payment_type_id ?? null,
      gateway_response: input.payment,
    })
    .eq('id', transaction.id)

  if (updateTransactionError) throw new Error(updateTransactionError.message)

  const bookingPatch = paymentStatus === 'paid'
    ? { payment_status: 'paid', payment_ref: paymentRef, status: 'confirmed' }
    : paymentStatus === 'pending'
      ? { payment_status: 'pending', payment_ref: paymentRef }
      : { payment_status: 'failed', payment_ref: paymentRef, status: 'cancelled' }

  if (bookingIds.length > 0) {
    const { error: bookingError } = await admin
      .from('bookings')
      .update(bookingPatch)
      .in('id', bookingIds)

    if (bookingError) throw new Error(bookingError.message)
  }

  if (transaction.student_package_id) {
    const packagePatch = paymentStatus === 'paid'
      ? { payment_status: 'paid', status: 'active' }
      : paymentStatus === 'pending'
        ? { payment_status: 'pending', status: 'active' }
        : { payment_status: 'failed', status: 'cancelled' }

    const { error: packageError } = await admin
      .from('student_packages')
      .update(packagePatch)
      .eq('id', transaction.student_package_id)

    if (packageError) throw new Error(packageError.message)
  }

  return {
    id: transaction.id as string,
    status: paymentStatus,
    bookingIds,
    studentPackageId: transaction.student_package_id as string | null,
  }
}

export async function failPaymentTransaction(input: {
  transactionId: string
  bookingIds: string[]
  studentPackageId?: string | null
  errorMessage: string
}) {
  const admin = createAdminClient()

  const { error: transactionError } = await admin
    .from('payment_transactions')
    .update({
      status: 'failed',
      mercadopago_status: 'error',
      mercadopago_status_detail: input.errorMessage,
    })
    .eq('id', input.transactionId)

  if (transactionError) throw new Error(transactionError.message)

  if (input.bookingIds.length > 0) {
    const { error: bookingError } = await admin
      .from('bookings')
      .update({
        payment_status: 'failed',
        status: 'cancelled',
      })
      .in('id', input.bookingIds)

    if (bookingError) throw new Error(bookingError.message)
  }

  if (input.studentPackageId) {
    const { error: packageError } = await admin
      .from('student_packages')
      .update({
        payment_status: 'failed',
        status: 'cancelled',
      })
      .eq('id', input.studentPackageId)

    if (packageError) throw new Error(packageError.message)
  }
}

export async function getPaymentTransactionForStudent(transactionId: string, studentUserId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_transactions')
    .select(`
      id,
      status,
      amount,
      external_reference,
      mercadopago_payment_id,
      mercadopago_status,
      mercadopago_status_detail,
      payment_method_id,
      payment_type_id,
      gateway_response,
      student:student_profiles!inner(user_id)
    `)
    .eq('id', transactionId)
    .eq('student.user_id', studentUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function markPaymentTransactionRefunded(input: {
  transactionId: string
  mercadopagoPaymentId: number
  refundResponse: unknown
  refundReason: string
}) {
  const admin = createAdminClient()
  const { data: transaction, error: transactionError } = await admin
    .from('payment_transactions')
    .select('id, booking_ids, student_package_id, gateway_response')
    .eq('id', input.transactionId)
    .single()

  if (transactionError || !transaction) {
    throw new Error(transactionError?.message ?? 'Transacao local nao encontrada para reembolso.')
  }

  const mergedGatewayResponse = {
    payment: transaction.gateway_response ?? null,
    refund: input.refundResponse,
  }

  const { error: updateTransactionError } = await admin
    .from('payment_transactions')
    .update({
      status: 'refunded',
      mercadopago_payment_id: input.mercadopagoPaymentId,
      mercadopago_status: 'refunded',
      mercadopago_status_detail: 'Pagamento reembolsado.',
      refund_reason: input.refundReason,
      refunded_at: new Date().toISOString(),
      gateway_response: mergedGatewayResponse,
    })
    .eq('id', transaction.id)

  if (updateTransactionError) throw new Error(updateTransactionError.message)

  const bookingIds = (transaction.booking_ids as string[] | null) ?? []

  if (bookingIds.length > 0) {
    const { error: bookingPaymentError } = await admin
      .from('bookings')
      .update({
        payment_status: 'refunded',
      })
      .in('id', bookingIds)

    if (bookingPaymentError) throw new Error(bookingPaymentError.message)

    const { error: bookingStatusError } = await admin
      .from('bookings')
      .update({
        status: 'cancelled',
      })
      .in('id', bookingIds)
      .neq('status', 'completed')

    if (bookingStatusError) throw new Error(bookingStatusError.message)
  }

  if (transaction.student_package_id) {
    const { error: packageError } = await admin
      .from('student_packages')
      .update({
        payment_status: 'refunded',
        status: 'cancelled',
      })
      .eq('id', transaction.student_package_id)

    if (packageError) throw new Error(packageError.message)
  }
}
