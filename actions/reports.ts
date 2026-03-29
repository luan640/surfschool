'use server'

import { createClient } from '@/lib/supabase/server'
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

type BookingReportRow = Omit<DashboardCalendarBooking, 'student'> & {
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
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
  instructor?:
    | Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty'>
    | Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty'>[]
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

  let query = supabase
    .from('bookings')
    .select(`
      id,
      lesson_date,
      time_slots,
      total_amount,
      status,
      payment_status,
      instructor:instructors(id, full_name, color, specialty),
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

  const kpis = buildKpis(bookings)
  const trend = buildTrend(bookings)
  const instructorSummary = buildInstructorSummary(bookings)
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
    totalBookings: 0,
    averageTicket: 0,
    uniqueStudents: 0,
    couponRedemptions: 0,
    totalDiscounts: 0,
    completedBookings: 0,
    pendingBookings: 0,
  }
}

function buildKpis(bookings: BookingReportRow[]): ReportKpis {
  const totalRevenue = bookings.reduce((acc, booking) => acc + Number(booking.total_amount), 0)
  const couponRedemptions = bookings.reduce((acc, booking) => acc + (booking.coupon_redemptions?.length ?? 0), 0)
  const totalDiscounts = bookings.reduce(
    (acc, booking) => acc + (booking.coupon_redemptions ?? []).reduce((sum, redemption) => sum + Number(redemption.discount_amount), 0),
    0
  )
  const uniqueStudents = new Set(bookings.map((booking) => booking.student?.id).filter(Boolean)).size

  return {
    totalRevenue,
    totalBookings: bookings.filter((booking) => booking.payment_status === 'paid').length,
    averageTicket: bookings.length > 0 ? totalRevenue / bookings.length : 0,
    uniqueStudents,
    couponRedemptions,
    totalDiscounts,
    completedBookings: bookings.filter((booking) => booking.status === 'completed').length,
    pendingBookings: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length,
  }
}

function buildTrend(bookings: BookingReportRow[]): ReportTrendPoint[] {
  const map = new Map<string, ReportTrendPoint>()

  bookings.forEach((booking) => {
    const current = map.get(booking.lesson_date) ?? {
      date: booking.lesson_date,
      revenue: 0,
      bookings: 0,
      discount_amount: 0,
    }

    current.revenue += Number(booking.total_amount)
    current.bookings += 1
    current.discount_amount += (booking.coupon_redemptions ?? []).reduce((acc, redemption) => acc + Number(redemption.discount_amount), 0)
    map.set(booking.lesson_date, current)
  })

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function buildInstructorSummary(bookings: BookingReportRow[]): ReportInstructorSummary[] {
  const map = new Map<string, ReportInstructorSummary>()

  bookings.forEach((booking) => {
    if (!booking.instructor?.id) return

    const current = map.get(booking.instructor.id) ?? {
      id: booking.instructor.id,
      full_name: booking.instructor.full_name ?? 'Instrutor',
      color: booking.instructor.color ?? '#0f172a',
      bookings: 0,
      revenue: 0,
    }

    current.bookings += 1
    current.revenue += Number(booking.total_amount)
    map.set(booking.instructor.id, current)
  })

  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
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
    instructor: Array.isArray(row.instructor) ? row.instructor[0] : row.instructor ?? undefined,
    student: Array.isArray(row.student) ? row.student[0] ?? null : row.student ?? null,
    coupon_redemptions: (row.coupon_redemptions ?? []).map((redemption) => ({
      coupon_id: redemption.coupon_id,
      discount_amount: redemption.discount_amount,
      coupon: Array.isArray(redemption.coupon) ? redemption.coupon[0] ?? null : redemption.coupon ?? null,
    })),
  }))
}
