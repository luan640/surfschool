'use server'

import { createClient } from '@/lib/supabase/server'
import { getMySchool } from '@/actions/instructors'
import { formatPaymentMethod } from '@/lib/utils'

export type PurchaseKind = 'booking' | 'package' | 'trip'

export interface PurchaseEntry {
  id: string
  kind: PurchaseKind
  title: string
  customer_name: string
  customer_phone: string | null
  amount: number
  payment_method: string | null
  payment_status: 'paid' | 'refunded'
  refund_reason: string | null
  origin: 'online' | 'presencial'
  mercadopago_payment_id: number | null
  can_refund: boolean
  coupon_codes: string[]
  created_at: string
  lesson_date?: string
  instructor_name?: string | null
}

export interface PurchaseFilters {
  kind?: PurchaseKind | ''
  origin?: 'online' | 'presencial' | ''
  from?: string
  to?: string
  query?: string
  page?: number
}

const PAGE_SIZE = 30
const SOURCE_LIMIT = 500

export { formatPaymentMethod }

function single<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

export async function getPurchases(filters: PurchaseFilters = {}): Promise<{
  purchases: PurchaseEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { purchases: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 }

  const page = Math.max(1, filters.page ?? 1)
  const { kind, origin, from, to } = filters

  const wantsBookings = !kind || kind === 'booking'
  const wantsPackages = !kind || kind === 'package'
  const wantsTrips    = !kind || kind === 'trip'

  const [bookingsRes, packagesRes, tripsRes] = await Promise.all([
    wantsBookings ? buildBookingsQuery(supabase, school.id, from, to) : Promise.resolve({ data: [] as any[] }),
    wantsPackages ? buildPackagesQuery(supabase, school.id, from, to) : Promise.resolve({ data: [] as any[] }),
    wantsTrips    ? buildTripsQuery(supabase, school.id, from, to)    : Promise.resolve({ data: [] as any[] }),
  ])

  if (bookingsRes.error) throw new Error(`Falha ao carregar compras de aulas: ${bookingsRes.error.message}`)
  if (packagesRes.error) throw new Error(`Falha ao carregar compras de pacotes: ${packagesRes.error.message}`)
  if (tripsRes.error) throw new Error(`Falha ao carregar compras de trips: ${tripsRes.error.message}`)

  // MP IDs via payment_transactions para bookings
  const onlineBookingTxIds = (bookingsRes.data ?? [])
    .filter((r: any) => r.payment_transaction_id)
    .map((r: any) => r.payment_transaction_id as string)

  const transactionMap = new Map<string, number>()
  if (onlineBookingTxIds.length > 0) {
    const { data: txRows } = await supabase
      .from('payment_transactions')
      .select('id, mercadopago_payment_id')
      .in('id', onlineBookingTxIds)
    ;(txRows ?? []).forEach((tx: any) => {
      if (tx.mercadopago_payment_id) transactionMap.set(tx.id, tx.mercadopago_payment_id)
    })
  }

  // MP IDs via payment_transactions para pacotes
  const packageIds = (packagesRes.data ?? []).map((r: any) => r.id as string)
  const packageMpMap = new Map<string, number>()
  if (packageIds.length > 0) {
    const { data: pkgTxRows } = await supabase
      .from('payment_transactions')
      .select('student_package_id, mercadopago_payment_id')
      .in('student_package_id', packageIds)
      .not('mercadopago_payment_id', 'is', null)
    ;(pkgTxRows ?? []).forEach((tx: any) => {
      if (tx.student_package_id && tx.mercadopago_payment_id)
        packageMpMap.set(tx.student_package_id, tx.mercadopago_payment_id)
    })
  }

  // Cupons por booking_id
  const allBookingIds = (bookingsRes.data ?? []).map((r: any) => r.id as string)
  const couponByBookingId = new Map<string, string[]>()
  if (allBookingIds.length > 0) {
    const { data: redemptions } = await supabase
      .from('discount_coupon_redemptions')
      .select('booking_id, applied_code')
      .in('booking_id', allBookingIds)
    ;(redemptions ?? []).forEach((r: any) => {
      if (!r.booking_id || !r.applied_code) return
      const existing = couponByBookingId.get(r.booking_id) ?? []
      if (!existing.includes(r.applied_code)) existing.push(r.applied_code)
      couponByBookingId.set(r.booking_id, existing)
    })
  }

  // Mapear

  const bookings: PurchaseEntry[] = (bookingsRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null; phone: string | null }>(row.student)
    const instructor = single<{ full_name: string }>(row.instructor)
    const mpId = row.payment_transaction_id ? (transactionMap.get(row.payment_transaction_id) ?? null) : null
    const status = row.payment_status as 'paid' | 'refunded'
    return {
      id: row.id,
      kind: 'booking' as const,
      title: 'Aula avulsa',
      customer_name: student?.full_name ?? 'Aluno',
      customer_phone: student?.phone ?? null,
      amount: Number(row.total_amount),
      payment_method: formatPaymentMethod(row.payment_method),
      payment_status: status,
      refund_reason: row.refund_reason ?? null,
      origin: row.payment_transaction_id ? 'online' as const : 'presencial' as const,
      mercadopago_payment_id: mpId,
      can_refund: status === 'paid' && Boolean(mpId),
      coupon_codes: couponByBookingId.get(row.id) ?? [],
      created_at: row.created_at,
      lesson_date: row.lesson_date,
      instructor_name: instructor?.full_name ?? null,
    }
  })

  const packages: PurchaseEntry[] = (packagesRes.data ?? []).map((row: any) => {
    const student = single<{ full_name: string | null; phone: string | null }>(row.student)
    const pkg = single<{ name: string }>(row.package)
    const mpId = packageMpMap.get(row.id) ?? null
    const status = row.payment_status as 'paid' | 'refunded'
    return {
      id: row.id,
      kind: 'package' as const,
      title: pkg?.name ? `Pacote: ${pkg.name}` : 'Pacote de aulas',
      customer_name: student?.full_name ?? 'Aluno',
      customer_phone: student?.phone ?? null,
      amount: Number(row.total_amount),
      payment_method: formatPaymentMethod(row.payment_method),
      payment_status: status,
      refund_reason: null,
      origin: mpId ? 'online' as const : 'presencial' as const,
      mercadopago_payment_id: mpId,
      can_refund: status === 'paid' && Boolean(mpId),
      coupon_codes: [],
      created_at: row.created_at,
    }
  })

  const trips: PurchaseEntry[] = (tripsRes.data ?? []).map((row: any) => {
    const trip = single<{ title: string }>(row.trip)
    const mpId = row.mercadopago_payment_id ?? null
    const status = row.payment_status as 'paid' | 'refunded'
    return {
      id: row.id,
      kind: 'trip' as const,
      title: trip?.title ? `Trip: ${trip.title}` : 'Trip',
      customer_name: row.full_name,
      customer_phone: row.phone ?? null,
      amount: Number(row.amount),
      payment_method: formatPaymentMethod(row.payment_method ?? (row.qr_code ? 'pix' : null)),
      payment_status: status,
      refund_reason: row.refund_reason ?? null,
      origin: (mpId || row.qr_code) ? 'online' as const : 'presencial' as const,
      mercadopago_payment_id: mpId,
      can_refund: status === 'paid' && Boolean(mpId),
      coupon_codes: [],
      created_at: row.created_at,
    }
  })

  // Merge, filtros em memória, ordenar

  let merged = [...bookings, ...packages, ...trips].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  if (origin) merged = merged.filter((p) => p.origin === origin)

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase()
    merged = merged.filter((p) =>
      [p.customer_name, p.customer_phone ?? '', p.title, p.instructor_name ?? '']
        .join(' ').toLowerCase().includes(q),
    )
  }

  const total = merged.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const purchases = merged.slice(start, start + PAGE_SIZE)

  return { purchases, total, page: safePage, pageSize: PAGE_SIZE, totalPages }
}

// ── Query helpers ────────────────────────────────────────────────────────────

function buildBookingsQuery(supabase: any, schoolId: string, from?: string, to?: string) {
  let q = supabase
    .from('bookings')
    .select(`
      id,
      lesson_date,
      total_amount,
      payment_method,
      payment_status,
      payment_transaction_id,
      refund_reason,
      created_at,
      student:student_profiles(full_name, phone),
      instructor:instructors(full_name)
    `)
    .eq('school_id', schoolId)
    .in('payment_status', ['paid', 'refunded'])
    .or('billing_mode.eq.hourly,billing_mode.is.null')
    .is('package_id', null)
    .order('created_at', { ascending: false })
    .limit(SOURCE_LIMIT)

  if (from) q = q.gte('created_at', `${from}T00:00:00`)
  if (to)   q = q.lte('created_at', `${to}T23:59:59`)
  return q
}

function buildPackagesQuery(supabase: any, schoolId: string, from?: string, to?: string) {
  let q = supabase
    .from('student_packages')
    .select(`
      id,
      total_amount,
      payment_method,
      payment_status,
      created_at,
      student:student_profiles(full_name, phone),
      package:lesson_packages(name)
    `)
    .eq('school_id', schoolId)
    .in('payment_status', ['paid', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(SOURCE_LIMIT)

  if (from) q = q.gte('created_at', `${from}T00:00:00`)
  if (to)   q = q.lte('created_at', `${to}T23:59:59`)
  return q
}

function buildTripsQuery(supabase: any, schoolId: string, from?: string, to?: string) {
  let q = supabase
    .from('trip_registrations')
    .select(`
      id,
      full_name,
      phone,
      amount,
      payment_method,
      payment_status,
      refund_reason,
      mercadopago_payment_id,
      qr_code,
      created_at,
      trip:trips(title)
    `)
    .eq('school_id', schoolId)
    .in('payment_status', ['paid', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(SOURCE_LIMIT)

  if (from) q = q.gte('created_at', `${from}T00:00:00`)
  if (to)   q = q.lte('created_at', `${to}T23:59:59`)
  return q
}
