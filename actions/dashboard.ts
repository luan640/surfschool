'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    { data: upcoming },
    { data: instructors },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('school_id', school.id)
      .neq('status', 'cancelled')
      .gte('lesson_date', thisMonthStart),
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('school_id', school.id)
      .neq('status', 'cancelled')
      .gte('lesson_date', lastMonthStart)
      .lte('lesson_date', lastMonthEnd),
    supabase
      .from('bookings')
      .select('id')
      .eq('school_id', school.id)
      .neq('status', 'cancelled')
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
    upcomingLessons: (upcoming ?? []).length,
  }
}

export async function getRevenueMetrics(months = 6): Promise<BookingMetric[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const from = new Date()
  from.setMonth(from.getMonth() - months)
  const fromStr = from.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('booking_metrics')
    .select('*')
    .eq('school_id', school.id)
    .gte('month', fromStr)
    .order('month', { ascending: true })

  return (data ?? []) as BookingMetric[]
}

export async function getInstructorRanking(): Promise<InstructorRankRow[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('instructor_ranking')
    .select('*')
    .eq('school_id', school.id)
    .order('total_revenue', { ascending: false })

  return (data ?? []) as InstructorRankRow[]
}

export async function getUpcomingBookings(limit = 5) {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, lesson_date, time_slots, total_amount, status,
      instructor:instructors(full_name, color, specialty),
      student:student_profiles(full_name)
    `)
    .eq('school_id', school.id)
    .neq('status', 'cancelled')
    .gte('lesson_date', today)
    .order('lesson_date', { ascending: true })
    .limit(limit)

  return data ?? []
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
      .neq('status', 'cancelled')
      .order('lesson_date', { ascending: true }),
  ])

  return {
    instructors: (instructors ?? []) as Pick<Instructor, 'id' | 'full_name' | 'color'>[],
    bookings: ((bookings ?? []) as unknown) as DashboardCalendarBooking[],
  }
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

export async function updateSchoolSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

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
      phone: (formData.get('phone') as string) || null,
      whatsapp: (formData.get('whatsapp') as string) || null,
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
