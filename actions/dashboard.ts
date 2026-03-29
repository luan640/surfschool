'use server'

import { revalidatePath } from 'next/cache'
import { validatePhoneField } from '@/lib/phone'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensurePublicBucket } from '@/lib/supabase/storage'
import { getMySchool } from './instructors'
import type {
  ActionResult,
  BookingMetric,
  DashboardCalendarBooking,
  DashboardKPIs,
  Instructor,
  InstructorRankRow,
  PaymentProviderConnection,
  SchoolRules,
} from '@/lib/types'

type DashboardBookingRelation<T> = T | T[] | null

type DashboardBookingQueryRow = {
  id: string
  lesson_date: string
  time_slots: string[]
  total_amount: number
  status: DashboardCalendarBooking['status']
  instructor?: DashboardBookingRelation<NonNullable<DashboardCalendarBooking['instructor']>>
  student?: DashboardBookingRelation<NonNullable<DashboardCalendarBooking['student']>>
}

type DashboardRevenueRow = {
  lesson_date: string
  total_amount: number
}

type DashboardInstructorRankingRow = {
  total_amount: number
  time_slots: string[]
  instructor?: DashboardBookingRelation<Pick<Instructor, 'id' | 'full_name' | 'photo_url' | 'hourly_price'>>
}

const SCHOOL_ASSETS_BUCKET = 'school-assets'
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = await createClient()
  const school = await getMySchool()

  if (!school) {
    return {
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      bookingsThisMonth: 0,
      bookingsLastMonth: 0,
      activeInstructors: 0,
      upcomingLessons: 0,
      paidScheduledLessons: 0,
    }
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [
    { data: thisMonth },
    { data: lastMonth },
    { data: completedLessons },
    { data: paidScheduledLessons },
    { data: instructors },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .eq('status', 'completed')
      .gte('lesson_date', thisMonthStart),
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .eq('status', 'completed')
      .gte('lesson_date', lastMonthStart)
      .lte('lesson_date', lastMonthEnd),
    supabase
      .from('bookings')
      .select('id')
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .eq('status', 'completed'),
    supabase
      .from('bookings')
      .select('id')
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .in('status', ['pending', 'confirmed'])
      .gte('lesson_date', today),
    supabase
      .from('instructors')
      .select('id')
      .eq('school_id', school.id)
      .eq('active', true),
  ])

  const sum = (rows: { total_amount: number }[] | null) =>
    (rows ?? []).reduce((acc, row) => acc + Number(row.total_amount), 0)

  return {
    revenueThisMonth: sum(thisMonth),
    revenueLastMonth: sum(lastMonth),
    bookingsThisMonth: (thisMonth ?? []).length,
    bookingsLastMonth: (lastMonth ?? []).length,
    activeInstructors: (instructors ?? []).length,
    upcomingLessons: (completedLessons ?? []).length,
    paidScheduledLessons: (paidScheduledLessons ?? []).length,
  }
}

export async function getRevenueMetrics(months = 6): Promise<BookingMetric[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('bookings')
    .select('lesson_date, total_amount')
    .eq('school_id', school.id)
    .eq('payment_status', 'paid')
    .eq('status', 'completed')

  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const metricsMap = new Map<string, BookingMetric>()

  for (let index = 0; index < months; index += 1) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1)
    const monthKey = monthDate.toISOString().slice(0, 10)
    metricsMap.set(monthKey, {
      month: monthKey,
      total_bookings: 0,
      total_revenue: 0,
      completed: 0,
      cancelled: 0,
    })
  }

  for (const row of (data ?? []) as DashboardRevenueRow[]) {
    const lessonDate = new Date(`${row.lesson_date}T00:00:00`)
    const monthKey = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), 1).toISOString().slice(0, 10)
    const metric = metricsMap.get(monthKey)

    if (!metric) continue

    metric.total_bookings += 1
    metric.total_revenue += Number(row.total_amount)
    metric.completed += 1
  }

  return [...metricsMap.values()]
}

export async function getInstructorRanking(): Promise<InstructorRankRow[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      total_amount,
      time_slots,
      instructor:instructors(id, full_name, photo_url, hourly_price)
    `)
    .eq('school_id', school.id)
    .eq('payment_status', 'paid')
    .eq('status', 'completed')

  const rankingMap = new Map<string, InstructorRankRow>()

  for (const row of (data ?? []) as DashboardInstructorRankingRow[]) {
    const instructor = Array.isArray(row.instructor) ? row.instructor[0] : row.instructor
    if (!instructor?.id) continue

    const current = rankingMap.get(instructor.id) ?? {
      id: instructor.id,
      full_name: instructor.full_name,
      photo_url: instructor.photo_url,
      hourly_price: Number(instructor.hourly_price),
      total_bookings: 0,
      total_revenue: 0,
      avg_hours: 0,
    }

    current.total_bookings += 1
    current.total_revenue += Number(row.total_amount)
    current.avg_hours += Array.isArray(row.time_slots) ? row.time_slots.length : 0

    rankingMap.set(instructor.id, current)
  }

  return [...rankingMap.values()]
    .map((row) => ({
      ...row,
      avg_hours: row.total_bookings > 0 ? row.avg_hours / row.total_bookings : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
}

export async function getUpcomingBookings(limit = 5) {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, lesson_date, time_slots, total_amount, status,
      instructor:instructors(full_name, color, specialty),
      student:student_profiles(full_name)
    `)
    .eq('school_id', school.id)
    .eq('payment_status', 'paid')
    .eq('status', 'completed')
    .order('lesson_date', { ascending: false })
    .limit(limit)

  return normalizeDashboardBookings((data ?? []) as DashboardBookingQueryRow[])
}

export async function getDashboardCalendarData(): Promise<{
  instructors: Pick<Instructor, 'id' | 'full_name' | 'color'>[]
  bookings: DashboardCalendarBooking[]
}> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { instructors: [], bookings: [] }

  const [{ data: instructors }, { data: bookings }] = await Promise.all([
    supabase
      .from('instructors')
      .select('id, full_name, color')
      .eq('school_id', school.id)
      .eq('active', true)
      .order('full_name', { ascending: true }),
    supabase
      .from('bookings')
      .select(`
        id,
        lesson_date,
        time_slots,
        total_amount,
        status,
        instructor:instructors(id, full_name, color, specialty),
        student:student_profiles(full_name, phone)
      `)
      .eq('school_id', school.id)
      .eq('payment_status', 'paid')
      .eq('status', 'completed')
      .order('lesson_date', { ascending: true }),
  ])

  return {
    instructors: (instructors ?? []) as Pick<Instructor, 'id' | 'full_name' | 'color'>[],
    bookings: normalizeDashboardBookings((bookings ?? []) as DashboardBookingQueryRow[]),
  }
}

function normalizeDashboardBookings(rows: DashboardBookingQueryRow[]): DashboardCalendarBooking[] {
  return rows.map((row) => ({
    id: row.id,
    lesson_date: row.lesson_date,
    time_slots: row.time_slots,
    total_amount: row.total_amount,
    status: row.status,
    instructor: Array.isArray(row.instructor) ? row.instructor[0] : row.instructor ?? undefined,
    student: Array.isArray(row.student) ? row.student[0] : row.student ?? undefined,
  }))
}

export async function getSchoolSettings() {
  return getMySchool()
}

export async function getMercadoPagoConnection() {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return null

  const { data } = await supabase
    .from('payment_provider_connections')
    .select('id, school_id, provider, mp_user_id, expires_at, status, last_error, connected_at, updated_at')
    .eq('school_id', school.id)
    .eq('provider', 'mercadopago')
    .maybeSingle()

  return (data ?? null) as PaymentProviderConnection | null
}

export async function getSchoolRules(): Promise<SchoolRules | null> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return null

  const { data } = await supabase
    .from('school_rules')
    .select('*')
    .eq('school_id', school.id)
    .maybeSingle()

  if (data) return data as SchoolRules

  return {
    school_id: school.id,
    allow_student_cancellation: true,
    cancellation_notice_hours: 24,
    allow_student_reschedule: true,
    reschedule_notice_hours: 24,
    minimum_booking_notice_hours: 2,
    booking_window_days: 90,
    max_active_bookings_per_student: null,
    created_at: '',
    updated_at: '',
  }
}

export async function getPublicSchoolRulesBySlug(slug: string): Promise<SchoolRules | null> {
  if (!slug) return null

  const admin = createAdminClient()
  const { data: school } = await admin
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!school) return null

  const { data } = await admin
    .from('school_rules')
    .select('*')
    .eq('school_id', school.id)
    .maybeSingle()

  if (data) return data as SchoolRules

  return {
    school_id: school.id,
    allow_student_cancellation: true,
    cancellation_notice_hours: 24,
    allow_student_reschedule: true,
    reschedule_notice_hours: 24,
    minimum_booking_notice_hours: 2,
    booking_window_days: 90,
    max_active_bookings_per_student: null,
    created_at: '',
    updated_at: '',
  }
}

export async function updateSchoolSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  const whatsappResult = validatePhoneField(formData.get('whatsapp') as string | null, 'WhatsApp')

  if (phoneResult.error) return { success: false, error: phoneResult.error }
  if (whatsappResult.error) return { success: false, error: whatsappResult.error }

  let logoUrl = school.logo_url
  const logoFile = formData.get('logo_file')

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!ALLOWED_LOGO_TYPES.includes(logoFile.type)) {
      return {
        success: false,
        error: 'Envie a logo em JPG, PNG, WEBP ou SVG.',
      }
    }

    if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      return {
        success: false,
        error: 'A logo deve ter no maximo 2 MB.',
      }
    }

    const admin = createAdminClient()
    await ensurePublicBucket(SCHOOL_ASSETS_BUCKET)
    const extension = logoFile.name.includes('.') ? logoFile.name.split('.').pop()?.toLowerCase() ?? 'png' : 'png'
    const folder = `schools/${school.id}`
    const filePath = `${folder}/logo-${Date.now()}.${extension}`

    const { data: existingFiles, error: listError } = await admin.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .list(folder, { limit: 100 })

    if (listError) {
      return { success: false, error: `Nao foi possivel acessar o storage: ${listError.message}` }
    }

    if ((existingFiles ?? []).length > 0) {
      const { error: removeError } = await admin.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .remove(existingFiles!.map((file) => `${folder}/${file.name}`))

      if (removeError) {
        return { success: false, error: `Nao foi possivel atualizar a logo atual: ${removeError.message}` }
      }
    }

    const { error: uploadError } = await admin.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .upload(filePath, logoFile, {
        upsert: true,
        contentType: logoFile.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      return { success: false, error: `Nao foi possivel enviar a logo: ${uploadError.message}` }
    }

    const { data: publicLogo } = admin.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .getPublicUrl(filePath)

    logoUrl = publicLogo.publicUrl
  }

  const { error } = await supabase
    .from('schools')
    .update({
      name: formData.get('name') as string,
      tagline: (formData.get('tagline') as string) || null,
      address: (formData.get('address') as string) || null,
      phone: phoneResult.value,
      whatsapp: whatsappResult.value,
      logo_url: logoUrl,
      primary_color: formData.get('primary_color') as string,
      cta_color: formData.get('cta_color') as string,
    })
    .eq('id', school.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/settings/account-data')
  return { success: true, data: undefined }
}

export async function updateSchoolRules(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const cancellationNoticeHours = Number(formData.get('cancellation_notice_hours') ?? 24)
  const rescheduleNoticeHours = Number(formData.get('reschedule_notice_hours') ?? 24)
  const minimumBookingNoticeHours = Number(formData.get('minimum_booking_notice_hours') ?? 2)
  const bookingWindowDays = Number(formData.get('booking_window_days') ?? 90)
  const maxActiveBookingsRaw = ((formData.get('max_active_bookings_per_student') as string | null) ?? '').trim()
  const maxActiveBookingsPerStudent = maxActiveBookingsRaw ? Number(maxActiveBookingsRaw) : null

  if (
    [cancellationNoticeHours, rescheduleNoticeHours, minimumBookingNoticeHours, bookingWindowDays]
      .some((value) => Number.isNaN(value) || value < 0)
  ) {
    return { success: false, error: 'Preencha as regras com numeros validos.' }
  }

  if (
    maxActiveBookingsPerStudent !== null &&
    (Number.isNaN(maxActiveBookingsPerStudent) || maxActiveBookingsPerStudent < 1)
  ) {
    return {
      success: false,
      error: 'O limite de aulas futuras por aluno deve ser vazio ou maior que zero.',
    }
  }

  const { error } = await supabase
    .from('school_rules')
    .upsert(
      {
        school_id: school.id,
        allow_student_cancellation: formData.get('allow_student_cancellation') === 'on',
        cancellation_notice_hours: cancellationNoticeHours,
        allow_student_reschedule: formData.get('allow_student_reschedule') === 'on',
        reschedule_notice_hours: rescheduleNoticeHours,
        minimum_booking_notice_hours: minimumBookingNoticeHours,
        booking_window_days: bookingWindowDays,
        max_active_bookings_per_student: maxActiveBookingsPerStudent,
      },
      { onConflict: 'school_id' },
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/settings/rules')
  return { success: true, data: undefined }
}
