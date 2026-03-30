'use server'

import { createClient } from '@/lib/supabase/server'
import { getPaymentFinancialBreakdown } from '@/lib/payments/financials'
import { getMySchool } from './instructors'
import type {
  DashboardCalendarBooking,
  DiscountCoupon,
  Instructor,
  ReportCouponSummary,
  ReportFilterOptions,
  ReportInstructorSummary,
  ReportKpis,
  ReportTrendPoint,
  StudentProfile,
} from '@/lib/types'

interface ReportFilters {
  from?: string
  to?: string
  instructorId?: string
  couponId?: string
}

interface PaymentTransactionReportRow {
  id: string
  amount: number
  created_at: string
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  booking_ids: string[] | null
  gateway_response: unknown
}

interface BookingFinancialAllocation {
  bookingId: string
  gross: number
  fee: number
  net: number
}

type BookingReportRow = Omit<DashboardCalendarBooking, 'student' | 'instructor'> & {
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_transaction_id?: string | null
  instructor?: Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty' | 'photo_url'> | null
  student?: Pick<StudentProfile, 'id' | 'full_name' | 'phone'> | null
  coupon_redemptions?: Array<{
    coupon_id: string
    discount_amount: number
    coupon?: { id: string; code: string; name: string } | null
  }>
}

type BookingReportQueryRow = {
  id: string
  lesson_date: string
  time_slots: string[]
  total_amount: number
  status: DashboardCalendarBooking['status']
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_transaction_id?: string | null
  instructor?:
    | Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty' | 'photo_url'>
    | Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty' | 'photo_url'>[]
    | null
  student?:
    | Pick<StudentProfile, 'id' | 'full_name' | 'phone'>
    | Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]
    | null
  coupon_redemptions?: Array<{
    coupon_id: string
    discount_amount: number
    coupon?: { id: string; code: string; name: string } | { id: string; code: string; name: string }[] | null
  }> | null
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { instructors: [], coupons: [] }

  const [{ data: instructors }, { data: coupons }] = await Promise.all([
    supabase
      .from('instructors')
      .select('id, full_name, color')
      .eq('school_id', school.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('discount_coupons')
      .select('id, code, name, active')
      .eq('school_id', school.id)
      .order('code', { ascending: true }),
  ])

  return {
    instructors: (instructors ?? []) as Pick<Instructor, 'id' | 'full_name' | 'color'>[],
    coupons: (coupons ?? []) as Pick<DiscountCoupon, 'id' | 'code' | 'name' | 'active'>[],
  }
}

export async function getReportsData(filters: ReportFilters) {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) {
    return {
      filters: normalizeFilters(filters),
      kpis: emptyKpis(),
      trend: [] as ReportTrendPoint[],
      instructorSummary: [] as ReportInstructorSummary[],
      couponSummary: [] as ReportCouponSummary[],
      bookings: [] as BookingReportRow[],
    }
  }

  const normalizedFilters = normalizeFilters(filters)
  let couponBookingIds: string[] | null = null

  if (normalizedFilters.couponId) {
    const { data: couponRows } = await supabase
      .from('discount_coupon_redemptions')
      .select('booking_id')
      .eq('school_id', school.id)
      .eq('coupon_id', normalizedFilters.couponId)

    couponBookingIds = (couponRows ?? [])
      .map((row) => row.booking_id as string | null)
      .filter((value): value is string => Boolean(value))

    if (couponBookingIds.length === 0) {
      return {
        filters: normalizedFilters,
        kpis: emptyKpis(),
        trend: [] as ReportTrendPoint[],
        instructorSummary: [] as ReportInstructorSummary[],
        couponSummary: [] as ReportCouponSummary[],
        bookings: [] as BookingReportRow[],
      }
    }
  }

  let scopeBookingIdsQuery = supabase
    .from('bookings')
    .select('id')
    .eq('school_id', school.id)

  if (normalizedFilters.from) scopeBookingIdsQuery = scopeBookingIdsQuery.gte('lesson_date', normalizedFilters.from)
  if (normalizedFilters.to) scopeBookingIdsQuery = scopeBookingIdsQuery.lte('lesson_date', normalizedFilters.to)
  if (normalizedFilters.instructorId) scopeBookingIdsQuery = scopeBookingIdsQuery.eq('instructor_id', normalizedFilters.instructorId)
  if (couponBookingIds) scopeBookingIdsQuery = scopeBookingIdsQuery.in('id', couponBookingIds)

  const { data: scopeBookingIdsRows } = await scopeBookingIdsQuery
  const scopeBookingIds = new Set((scopeBookingIdsRows ?? []).map((row) => row.id as string))

  let query = supabase
    .from('bookings')
    .select(`
      id,
      lesson_date,
      time_slots,
      total_amount,
      status,
      payment_status,
      payment_transaction_id,
      instructor:instructors(id, full_name, color, specialty, photo_url),
      student:student_profiles(id, full_name, phone),
      coupon_redemptions:discount_coupon_redemptions(
        coupon_id,
        discount_amount,
        coupon:discount_coupons(id, code, name)
      )
    `)
    .eq('school_id', school.id)
    .neq('status', 'cancelled')
    .order('lesson_date', { ascending: true })

  if (normalizedFilters.from) query = query.gte('lesson_date', normalizedFilters.from)
  if (normalizedFilters.to) query = query.lte('lesson_date', normalizedFilters.to)
  if (normalizedFilters.instructorId) query = query.eq('instructor_id', normalizedFilters.instructorId)
  if (couponBookingIds) query = query.in('id', couponBookingIds)

  const { data } = await query
  const bookings = normalizeBookingRows((data ?? []) as BookingReportQueryRow[])
  const filteredBookingIds = new Set(bookings.map((booking) => booking.id))

  const { data: transactions } = scopeBookingIds.size
    ? await supabase
        .from('payment_transactions')
        .select('id, amount, created_at, status, booking_ids, gateway_response')
        .eq('school_id', school.id)
        .in('status', ['pending', 'failed', 'refunded', 'paid'])
    : { data: [] as PaymentTransactionReportRow[] }

  const financialAllocations = buildFinancialAllocations(bookings, (transactions ?? []) as PaymentTransactionReportRow[])
  const kpis = buildKpis(bookings, (transactions ?? []) as PaymentTransactionReportRow[], scopeBookingIds, filteredBookingIds, financialAllocations)
  const trend = buildTrend(bookings, financialAllocations)
  const instructorSummary = buildInstructorSummary(bookings, financialAllocations)
  const couponSummary = buildCouponSummary(bookings)

  return {
    filters: normalizedFilters,
    kpis,
    trend,
    instructorSummary,
    couponSummary,
    bookings,
  }
}

function normalizeFilters(filters: ReportFilters) {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    from: filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : monthStart.toISOString().slice(0, 10),
    to: filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : today.toISOString().slice(0, 10),
    instructorId: filters.instructorId || '',
    couponId: filters.couponId || '',
  }
}

function emptyKpis(): ReportKpis {
  return {
    totalRevenue: 0,
    grossRevenue: 0,
    mercadoPagoFees: 0,
    netRevenue: 0,
    totalBookings: 0,
    averageTicket: 0,
    uniqueStudents: 0,
    couponRedemptions: 0,
    totalDiscounts: 0,
    completedBookings: 0,
    pendingBookings: 0,
    refundedAmount: 0,
    abandonedOrders: 0,
  }
}

function buildKpis(
  bookings: BookingReportRow[],
  transactions: PaymentTransactionReportRow[],
  scopeBookingIds: Set<string>,
  filteredBookingIds: Set<string>,
  financialAllocations: BookingFinancialAllocation[],
): ReportKpis {
  const grossRevenue = financialAllocations.reduce((acc, allocation) => acc + allocation.gross, 0)
  const mercadoPagoFees = financialAllocations.reduce((acc, allocation) => acc + allocation.fee, 0)
  const netRevenue = financialAllocations.reduce((acc, allocation) => acc + allocation.net, 0)
  const couponRedemptions = bookings.reduce((acc, booking) => acc + (booking.coupon_redemptions?.length ?? 0), 0)
  const totalDiscounts = bookings.reduce(
    (acc, booking) => acc + (booking.coupon_redemptions ?? []).reduce((sum, redemption) => sum + Number(redemption.discount_amount), 0),
    0
  )
  const uniqueStudents = new Set(bookings.map((booking) => booking.student?.id).filter(Boolean)).size
  const relevantTransactions = transactions.filter((transaction) => {
    const bookingIds = transaction.booking_ids ?? []
    if (bookingIds.length === 0) return false

    return bookingIds.some((bookingId) => scopeBookingIds.has(bookingId) || filteredBookingIds.has(bookingId))
  })
  const refundedAmount = relevantTransactions
    .filter((transaction) => transaction.status === 'refunded')
    .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
  const abandonedOrders = relevantTransactions.filter(
    (transaction) => transaction.status === 'pending' || transaction.status === 'failed',
  ).length

  return {
    totalRevenue: Number(netRevenue.toFixed(2)),
    grossRevenue: Number(grossRevenue.toFixed(2)),
    mercadoPagoFees: Number(mercadoPagoFees.toFixed(2)),
    netRevenue: Number(netRevenue.toFixed(2)),
    totalBookings: bookings.filter((booking) => booking.payment_status === 'paid').length,
    averageTicket: bookings.filter((booking) => booking.payment_status === 'paid').length > 0
      ? grossRevenue / bookings.filter((booking) => booking.payment_status === 'paid').length
      : 0,
    uniqueStudents,
    couponRedemptions,
    totalDiscounts,
    completedBookings: bookings.filter((booking) => booking.status === 'completed').length,
    pendingBookings: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length,
    refundedAmount,
    abandonedOrders,
  }
}

function buildTrend(bookings: BookingReportRow[], financialAllocations: BookingFinancialAllocation[]): ReportTrendPoint[] {
  const map = new Map<string, ReportTrendPoint>()
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]))

  bookings.forEach((booking) => {
    const current = map.get(booking.lesson_date) ?? {
      date: booking.lesson_date,
      revenue: 0,
      gross_revenue: 0,
      fee_amount: 0,
      net_revenue: 0,
      bookings: 0,
      discount_amount: 0,
    }

    if (booking.payment_status === 'paid') {
      current.bookings += 1
    }
    current.discount_amount += (booking.coupon_redemptions ?? []).reduce((acc, redemption) => acc + Number(redemption.discount_amount), 0)
    map.set(booking.lesson_date, current)
  })

  financialAllocations.forEach((allocation) => {
    const booking = bookingById.get(allocation.bookingId)
    if (!booking) return

    const current = map.get(booking.lesson_date) ?? {
      date: booking.lesson_date,
      revenue: 0,
      gross_revenue: 0,
      fee_amount: 0,
      net_revenue: 0,
      bookings: 0,
      discount_amount: 0,
    }

    current.gross_revenue += allocation.gross
    current.fee_amount += allocation.fee
    current.net_revenue += allocation.net
    current.revenue += allocation.net
    map.set(booking.lesson_date, current)
  })

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function buildInstructorSummary(bookings: BookingReportRow[], financialAllocations: BookingFinancialAllocation[]): ReportInstructorSummary[] {
  const map = new Map<string, ReportInstructorSummary>()
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]))

  bookings.forEach((booking) => {
    if (booking.payment_status !== 'paid') return
    if (!booking.instructor?.id) return

    const current = map.get(booking.instructor.id) ?? {
      id: booking.instructor.id,
      full_name: booking.instructor.full_name ?? 'Instrutor',
      color: booking.instructor.color ?? '#0f172a',
      photo_url: booking.instructor.photo_url ?? null,
      bookings: 0,
      revenue: 0,
    }

    current.bookings += 1
    map.set(booking.instructor.id, current)
  })

  financialAllocations.forEach((allocation) => {
    const booking = bookingById.get(allocation.bookingId)
    if (!booking?.instructor?.id) return

    const current = map.get(booking.instructor.id)
    if (!current) return

    current.revenue += allocation.net
  })

  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

function buildFinancialAllocations(
  bookings: BookingReportRow[],
  transactions: PaymentTransactionReportRow[],
): BookingFinancialAllocation[] {
  const paidBookings = bookings.filter((booking) => booking.payment_status === 'paid')
  const paidBookingMap = new Map(paidBookings.map((booking) => [booking.id, booking]))
  const allocations: BookingFinancialAllocation[] = []
  const allocatedBookingIds = new Set<string>()

  transactions
    .filter((transaction) => transaction.status === 'paid')
    .forEach((transaction) => {
      const matchedBookings = (transaction.booking_ids ?? [])
        .map((bookingId) => paidBookingMap.get(bookingId))
        .filter((booking): booking is BookingReportRow => Boolean(booking))

      if (matchedBookings.length === 0) return

      const breakdown = getPaymentFinancialBreakdown(transaction.gateway_response, Number(transaction.amount))
      const totalWeight = matchedBookings.reduce((sum, booking) => sum + Math.max(Number(booking.total_amount), 0), 0)
      let remainingGross = breakdown.gross
      let remainingFee = breakdown.fee

      matchedBookings.forEach((booking, index) => {
        allocatedBookingIds.add(booking.id)
        const ratio = totalWeight > 0
          ? Number(booking.total_amount) / totalWeight
          : 1 / matchedBookings.length
        const isLast = index === matchedBookings.length - 1
        const gross = isLast
          ? Number(remainingGross.toFixed(2))
          : Number((breakdown.gross * ratio).toFixed(2))
        const fee = isLast
          ? Number(remainingFee.toFixed(2))
          : Number((breakdown.fee * ratio).toFixed(2))
        const net = Number((gross - fee).toFixed(2))

        remainingGross = Number((remainingGross - gross).toFixed(2))
        remainingFee = Number((remainingFee - fee).toFixed(2))

        allocations.push({
          bookingId: booking.id,
          gross,
          fee,
          net,
        })
      })
    })

  paidBookings.forEach((booking) => {
    if (allocatedBookingIds.has(booking.id)) return

    const gross = Number(booking.total_amount)
    allocations.push({
      bookingId: booking.id,
      gross,
      fee: 0,
      net: gross,
    })
  })

  return allocations
}

function buildCouponSummary(bookings: BookingReportRow[]): ReportCouponSummary[] {
  const map = new Map<string, ReportCouponSummary>()

  bookings.forEach((booking) => {
    ;(booking.coupon_redemptions ?? []).forEach((redemption) => {
      const coupon = redemption.coupon
      if (!coupon?.id) return

      const current = map.get(coupon.id) ?? {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        redemptions: 0,
        discount_amount: 0,
      }

      current.redemptions += 1
      current.discount_amount += Number(redemption.discount_amount)
      map.set(coupon.id, current)
    })
  })

  return [...map.values()].sort((a, b) => b.redemptions - a.redemptions)
}

function normalizeBookingRows(rows: BookingReportQueryRow[]): BookingReportRow[] {
  return rows.map((row) => ({
    id: row.id,
    lesson_date: row.lesson_date,
    time_slots: row.time_slots,
    total_amount: row.total_amount,
    status: row.status,
    payment_status: row.payment_status,
    payment_transaction_id: row.payment_transaction_id ?? null,
    instructor: Array.isArray(row.instructor) ? row.instructor[0] : row.instructor ?? undefined,
    student: Array.isArray(row.student) ? row.student[0] ?? null : row.student ?? null,
    coupon_redemptions: (row.coupon_redemptions ?? []).map((redemption) => ({
      coupon_id: redemption.coupon_id,
      discount_amount: redemption.discount_amount,
      coupon: Array.isArray(redemption.coupon) ? redemption.coupon[0] ?? null : redemption.coupon ?? null,
    })),
  }))
}
