'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MercadoPagoConfig, PaymentRefund } from 'mercadopago'
import { markPaymentTransactionRefunded } from '@/lib/payments/payment-store'
import { getMySchool } from '@/actions/instructors'
import { getValidMercadoPagoAccessTokenForSchool } from '@/lib/payments/mercadopago'
import { formatPaymentMethod } from '@/lib/utils'
import type { ActionResult } from '@/lib/types'
import type { PurchaseKind } from '@/actions/purchases'

// Entrada simplificada usada no seletor dos modais
export interface RefundablePurchase {
  id: string
  kind: PurchaseKind
  title: string
  customer_name: string
  amount: number
  origin: 'online' | 'presencial'
  payment_method: string | null
  mercadopago_payment_id: number | null
  created_at: string
}

function single<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

// Entrada do histórico de reembolsos
export interface RefundEntry {
  id: string
  kind: PurchaseKind
  title: string
  customer_name: string
  amount: number
  origin: 'online' | 'presencial'
  payment_method: string | null
  refund_reason: string | null
  updated_at: string
  created_at: string
}

// Carrega compras pagas (elegíveis para reembolso)
export async function getRefundablePurchases(): Promise<RefundablePurchase[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const [bookingsRes, packagesRes, tripsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, total_amount, payment_method, payment_transaction_id, created_at,
        student:student_profiles(full_name)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .or('billing_mode.eq.hourly,billing_mode.is.null')
      .is('package_id', null)
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('student_packages')
      .select(`
        id, total_amount, payment_method, created_at,
        student:student_profiles(full_name),
        package:lesson_packages(name)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(500),

    supabase
      .from('trip_registrations')
      .select(`
        id, amount, payment_method, mercadopago_payment_id, qr_code, created_at,
        full_name,
        trip:trips(title)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  // MP IDs para bookings
  const txIds = (bookingsRes.data ?? [])
    .filter((r: any) => r.payment_transaction_id)
    .map((r: any) => r.payment_transaction_id as string)

  const txMpMap = new Map<string, number>()
  if (txIds.length > 0) {
    const { data } = await supabase
      .from('payment_transactions')
      .select('id, mercadopago_payment_id')
      .in('id', txIds)
    ;(data ?? []).forEach((tx: any) => {
      if (tx.mercadopago_payment_id) txMpMap.set(tx.id, tx.mercadopago_payment_id)
    })
  }

  // MP IDs para pacotes
  const pkgIds = (packagesRes.data ?? []).map((r: any) => r.id as string)
  const pkgMpMap = new Map<string, number>()
  if (pkgIds.length > 0) {
    const { data } = await supabase
      .from('payment_transactions')
      .select('student_package_id, mercadopago_payment_id')
      .in('student_package_id', pkgIds)
      .not('mercadopago_payment_id', 'is', null)
    ;(data ?? []).forEach((tx: any) => {
      if (tx.student_package_id && tx.mercadopago_payment_id)
        pkgMpMap.set(tx.student_package_id, tx.mercadopago_payment_id)
    })
  }

  const bookings: RefundablePurchase[] = (bookingsRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null }>(row.student)
    const mpId = row.payment_transaction_id ? (txMpMap.get(row.payment_transaction_id) ?? null) : null
    return {
      id: row.id,
      kind: 'booking' as const,
      title: 'Aula avulsa',
      customer_name: student?.full_name ?? 'Aluno',
      amount: Number(row.total_amount),
      origin: row.payment_transaction_id ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method),
      mercadopago_payment_id: mpId,
      created_at: row.created_at,
    }
  })

  const packages: RefundablePurchase[] = (packagesRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null }>(row.student)
    const pkg = single<{ name: string }>(row.package)
    const mpId = pkgMpMap.get(row.id) ?? null
    return {
      id: row.id,
      kind: 'package' as const,
      title: pkg?.name ? `Pacote: ${pkg.name}` : 'Pacote de aulas',
      customer_name: student?.full_name ?? 'Aluno',
      amount: Number(row.total_amount),
      origin: mpId ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method),
      mercadopago_payment_id: mpId,
      created_at: row.created_at,
    }
  })

  const trips: RefundablePurchase[] = (tripsRes.data ?? []).map((row: any) => {
    const trip = single<{ title: string }>(row.trip)
    const mpId = row.mercadopago_payment_id ?? null
    return {
      id: row.id,
      kind: 'trip' as const,
      title: trip?.title ? `Trip: ${trip.title}` : 'Trip',
      customer_name: row.full_name,
      amount: Number(row.amount),
      origin: (mpId || row.qr_code) ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method ?? (row.qr_code ? 'pix' : null)),
      mercadopago_payment_id: mpId,
      created_at: row.created_at,
    }
  })

  return [...bookings, ...packages, ...trips].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

// Carrega reembolsos já processados (histórico)
export async function getRecentRefunds(): Promise<RefundEntry[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const [bookingsRes, packagesRes, tripsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, total_amount, payment_method, payment_transaction_id,
        refund_reason, updated_at, created_at,
        student:student_profiles(full_name)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'refunded')
      .or('billing_mode.eq.hourly,billing_mode.is.null')
      .is('package_id', null)
      .order('updated_at', { ascending: false })
      .limit(200),

    supabase
      .from('student_packages')
      .select(`
        id, total_amount, payment_method, updated_at, created_at,
        student:student_profiles(full_name),
        package:lesson_packages(name)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'refunded')
      .order('updated_at', { ascending: false })
      .limit(200),

    supabase
      .from('trip_registrations')
      .select(`
        id, amount, payment_method, mercadopago_payment_id, qr_code,
        refund_reason, updated_at, created_at,
        full_name, trip:trips(title)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'refunded')
      .order('updated_at', { ascending: false })
      .limit(200),
  ])

  const packageIds = (packagesRes.data ?? []).map((row: any) => row.id as string)
  const packageRefundMap = new Map<string, { mercadopago_payment_id: number | null; refund_reason: string | null }>()
  if (packageIds.length > 0) {
    const { data } = await supabase
      .from('payment_transactions')
      .select('student_package_id, mercadopago_payment_id, refund_reason')
      .in('student_package_id', packageIds)
      .eq('status', 'refunded')

    ;(data ?? []).forEach((tx: any) => {
      if (!tx.student_package_id) return
      packageRefundMap.set(tx.student_package_id, {
        mercadopago_payment_id: tx.mercadopago_payment_id ?? null,
        refund_reason: tx.refund_reason ?? null,
      })
    })
  }

  const bookings: RefundEntry[] = (bookingsRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null }>(row.student)
    return {
      id: row.id,
      kind: 'booking' as const,
      title: 'Aula avulsa',
      customer_name: student?.full_name ?? 'Aluno',
      amount: Number(row.total_amount),
      origin: row.payment_transaction_id ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method),
      refund_reason: row.refund_reason ?? null,
      updated_at: row.updated_at,
      created_at: row.created_at,
    }
  })

  const packages: RefundEntry[] = (packagesRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null }>(row.student)
    const pkg = single<{ name: string }>(row.package)
    const refundMeta = packageRefundMap.get(row.id)
    return {
      id: row.id,
      kind: 'package' as const,
      title: pkg?.name ? `Pacote: ${pkg.name}` : 'Pacote de aulas',
      customer_name: student?.full_name ?? 'Aluno',
      amount: Number(row.total_amount),
      origin: refundMeta?.mercadopago_payment_id ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method),
      refund_reason: refundMeta?.refund_reason ?? null,
      updated_at: row.updated_at,
      created_at: row.created_at,
    }
  })

  const trips: RefundEntry[] = (tripsRes.data ?? []).map((row: any) => {
    const trip = single<{ title: string }>(row.trip)
    return {
      id: row.id,
      kind: 'trip' as const,
      title: trip?.title ? `Trip: ${trip.title}` : 'Trip',
      customer_name: row.full_name,
      amount: Number(row.amount),
      origin: (row.mercadopago_payment_id || row.qr_code) ? 'online' as const : 'presencial' as const,
      payment_method: formatPaymentMethod(row.payment_method ?? (row.qr_code ? 'pix' : null)),
      refund_reason: row.refund_reason ?? null,
      updated_at: row.updated_at,
      created_at: row.created_at,
    }
  })

  return [...bookings, ...packages, ...trips].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

// ── Reembolso via Mercado Pago (chave informada pelo usuário) ─────────────────

export async function processOnlineRefund(
  id: string,
  kind: PurchaseKind,
  refundReason: string,
): Promise<ActionResult<{ refunded: true }>> {
  if (!id || !kind)             return { success: false, error: 'Compra inválida.' }
  if (!refundReason?.trim())    return { success: false, error: 'Informe o motivo do reembolso.' }

  const school = await getMySchool()
  if (!school) return { success: false, error: 'Não autorizado.' }

  const accessToken = await getValidMercadoPagoAccessTokenForSchool(school.id)
  if (!accessToken) return { success: false, error: 'A escola ainda nao conectou o Mercado Pago para processar reembolsos.' }

  const mp = new MercadoPagoConfig({ accessToken })
  const refundClient = new PaymentRefund(mp)
  const admin = createAdminClient()

  try {
    if (kind === 'trip') {
      const { data: reg, error } = await admin
        .from('trip_registrations')
        .select('id, school_id, payment_status, mercadopago_payment_id')
        .eq('id', id).eq('school_id', school.id).single()

      if (error || !reg) return { success: false, error: 'Registro não encontrado.' }
      if (reg.payment_status !== 'paid') return { success: false, error: 'Compra já reembolsada.' }
      if (!reg.mercadopago_payment_id) return { success: false, error: 'Sem pagamento MP para reembolsar.' }

      await refundClient.total({
        payment_id: reg.mercadopago_payment_id,
        requestOptions: { idempotencyKey: `refund:trip:${id}` },
      })
      await admin.from('trip_registrations').update({
        payment_status: 'refunded', status: 'cancelled',
        mercadopago_status: 'refunded',
        mercadopago_status_detail: 'Pagamento reembolsado.',
        refund_reason: refundReason.trim(),
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

    else if (kind === 'booking') {
      const { data: booking, error } = await admin
        .from('bookings')
        .select('id, school_id, payment_status, payment_transaction_id')
        .eq('id', id).eq('school_id', school.id).single()

      if (error || !booking) return { success: false, error: 'Agendamento não encontrado.' }
      if (booking.payment_status !== 'paid') return { success: false, error: 'Compra já reembolsada.' }
      if (!booking.payment_transaction_id) return { success: false, error: 'Sem transação online para reembolsar.' }

      const { data: tx, error: txErr } = await admin
        .from('payment_transactions')
        .select('id, status, mercadopago_payment_id')
        .eq('id', booking.payment_transaction_id).eq('school_id', school.id).single()

      if (txErr || !tx || !tx.mercadopago_payment_id) return { success: false, error: 'Transação não encontrada ou sem código MP.' }

      const refund = await refundClient.total({
        payment_id: tx.mercadopago_payment_id,
        requestOptions: { idempotencyKey: `refund:transaction:${tx.id}` },
      })
      await markPaymentTransactionRefunded({
        transactionId: tx.id,
        mercadopagoPaymentId: tx.mercadopago_payment_id,
        refundResponse: refund,
        refundReason: refundReason.trim(),
      })
    }

    else if (kind === 'package') {
      const { data: tx, error: txErr } = await admin
        .from('payment_transactions')
        .select('id, status, mercadopago_payment_id')
        .eq('student_package_id', id).eq('school_id', school.id).eq('status', 'paid').single()

      if (txErr || !tx || !tx.mercadopago_payment_id) return { success: false, error: 'Sem transação MP para este pacote.' }

      const refund = await refundClient.total({
        payment_id: tx.mercadopago_payment_id,
        requestOptions: { idempotencyKey: `refund:transaction:${tx.id}` },
      })
      await markPaymentTransactionRefunded({
        transactionId: tx.id,
        mercadopagoPaymentId: tx.mercadopago_payment_id,
        refundResponse: refund,
        refundReason: refundReason.trim(),
      })
    }

    revalidatePath('/dashboard/purchases')
    revalidatePath('/dashboard/refunds')
    return { success: true, data: { refunded: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Não foi possível reembolsar.' }
  }
}

// ── Reembolso Manual (sem chamar API do MP) ───────────────────────────────────

export async function processManualRefund(
  id: string,
  kind: PurchaseKind,
  refundReason: string,
): Promise<ActionResult<{ refunded: true }>> {
  if (!id || !kind)          return { success: false, error: 'Compra inválida.' }
  if (!refundReason?.trim()) return { success: false, error: 'Informe o motivo do reembolso.' }

  const school = await getMySchool()
  if (!school) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  try {
    if (kind === 'trip') {
      const { data: reg, error } = await admin
        .from('trip_registrations')
        .select('id, school_id, payment_status')
        .eq('id', id).eq('school_id', school.id).single()

      if (error || !reg) return { success: false, error: 'Registro não encontrado.' }
      if (reg.payment_status !== 'paid') return { success: false, error: 'Compra já reembolsada.' }

      await admin.from('trip_registrations').update({
        payment_status: 'refunded',
        status: 'cancelled',
        refund_reason: refundReason.trim(),
        refunded_at: now,
        updated_at: now,
      }).eq('id', id)
    }

    else if (kind === 'booking') {
      const { data: booking, error } = await admin
        .from('bookings')
        .select('id, school_id, payment_status, payment_transaction_id')
        .eq('id', id).eq('school_id', school.id).single()

      if (error || !booking) return { success: false, error: 'Agendamento não encontrado.' }
      if (booking.payment_status !== 'paid') return { success: false, error: 'Compra já reembolsada.' }

      await admin.from('bookings').update({
        payment_status: 'refunded',
        refund_reason: refundReason.trim(),
        updated_at: now,
      }).eq('id', id)

      // Se tinha transação online, marcar como reembolsado também
      if (booking.payment_transaction_id) {
        await admin.from('payment_transactions').update({
          status: 'refunded',
          refund_reason: refundReason.trim(),
          refunded_at: now,
        }).eq('id', booking.payment_transaction_id)
      }
    }

    else if (kind === 'package') {
      const { data: pkg, error } = await admin
        .from('student_packages')
        .select('id, school_id, payment_status')
        .eq('id', id).eq('school_id', school.id).single()

      if (error || !pkg) return { success: false, error: 'Pacote não encontrado.' }
      if (pkg.payment_status !== 'paid') return { success: false, error: 'Compra já reembolsada.' }

      await admin.from('student_packages').update({
        payment_status: 'refunded',
        status: 'cancelled',
        updated_at: now,
      }).eq('id', id)

      // Cancelar bookings vinculados
      await admin.from('bookings').update({
        payment_status: 'refunded',
        updated_at: now,
      }).eq('package_id', id).eq('school_id', school.id).neq('status', 'completed')

      // Se tinha transação online
      const { data: tx } = await admin
        .from('payment_transactions')
        .select('id')
        .eq('student_package_id', id)
        .eq('school_id', school.id)
        .maybeSingle()

      if (tx) {
        await admin.from('payment_transactions').update({
          status: 'refunded',
          refund_reason: refundReason.trim(),
          refunded_at: now,
        }).eq('id', tx.id)
      }
    }

    revalidatePath('/dashboard/purchases')
    revalidatePath('/dashboard/refunds')
    return { success: true, data: { refunded: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Não foi possível registrar o reembolso.' }
  }
}
