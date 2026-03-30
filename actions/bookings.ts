'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getMySchool } from './instructors'
import type { ActionResult, Booking, BookingStatus, Instructor, PaymentMethod, StudentProfile } from '@/lib/types'

export async function createBooking(params: {
  schoolId:     string
  studentId:    string
  instructorId: string
  packageId?:   string | null
  billingMode?: 'hourly' | 'package'
  lessonDate:   string
  timeSlots:    string[]
  unitPrice:    number
  paymentMethod: PaymentMethod
}): Promise<ActionResult<Booking>> {
  const supabase = await createClient()

  let { data, error } = await supabase.rpc('create_booking_safe', {
    p_school_id:      params.schoolId,
    p_student_id:     params.studentId,
    p_instructor_id:  params.instructorId,
    p_lesson_date:    params.lessonDate,
    p_time_slots:     params.timeSlots,
    p_unit_price:     params.unitPrice,
    p_payment_method: params.paymentMethod,
    p_billing_mode:   params.billingMode ?? 'hourly',
    p_package_id:     params.packageId ?? null,
  })

  // Backward compatibility for databases that still have the original RPC signature
  // without package-related arguments from migration 004.
  if (error?.message.includes('Could not find the function public.create_booking_safe')) {
    const fallback = await supabase.rpc('create_booking_safe', {
      p_school_id:      params.schoolId,
      p_student_id:     params.studentId,
      p_instructor_id:  params.instructorId,
      p_lesson_date:    params.lessonDate,
      p_time_slots:     params.timeSlots,
      p_unit_price:     params.unitPrice,
      p_payment_method: params.paymentMethod,
    })

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (error.message.includes('SLOT_CONFLICT')) {
      return { success: false, error: 'Um ou mais horários selecionados já foram reservados.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true, data: data as Booking }
}

export async function createPackageBookingPlan(params: {
  schoolId: string
  studentId: string
  instructorId: string
  packageId: string
  lessons: Array<{ lessonDate: string; timeSlots: string[] }>
  totalAmount: number
  paymentMethod: 'pix' | 'credit_card'
}): Promise<ActionResult<{ studentPackageId: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_package_booking_plan_safe', {
    p_school_id: params.schoolId,
    p_student_id: params.studentId,
    p_instructor_id: params.instructorId,
    p_package_id: params.packageId,
    p_lessons: params.lessons,
    p_total_amount: params.totalAmount,
    p_payment_method: params.paymentMethod,
  })

  if (error || !data) {
    if (error?.message.includes('SLOT_CONFLICT_LESSON_')) {
      const index = error.message.split('SLOT_CONFLICT_LESSON_')[1]
      return { success: false, error: `Um ou mais horarios da aula ${index} ja foram reservados.` }
    }
    if (error?.message.includes('INVALID_PACKAGE_LESSON_')) {
      const index = error.message.split('INVALID_PACKAGE_LESSON_')[1]
      return { success: false, error: `A aula ${index} precisa ter data e horario.` }
    }
    if (error?.message.includes('PACKAGE_LESSON_COUNT_MISMATCH')) {
      return { success: false, error: 'A quantidade de aulas do pacote nao confere.' }
    }
    if (error?.message.includes('PACKAGE_INSTRUCTOR_MISMATCH')) {
      return { success: false, error: 'Instrutor invalido para este pacote.' }
    }
    return { success: false, error: error?.message ?? 'Nao foi possivel criar o pacote.' }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true, data: { studentPackageId: data as string } }
}

export async function getBookings(filters?: {
  status?: BookingStatus
  from?: string
  to?: string
  instructorId?: string
}): Promise<Booking[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  let query = supabase
    .from('bookings')
    .select(`
      *,
      instructor:instructors(full_name, photo_url, color, specialty),
      student:student_profiles(full_name, phone)
    `)
    .eq('school_id', school.id)
    .eq('payment_status', 'paid')
    .order('lesson_date', { ascending: false })

  if (filters?.status)       query = query.eq('status', filters.status)
  if (filters?.from)         query = query.gte('lesson_date', filters.from)
  if (filters?.to)           query = query.lte('lesson_date', filters.to)
  if (filters?.instructorId) query = query.eq('instructor_id', filters.instructorId)

  const { data } = await query
  return (data ?? []) as Booking[]
}

export async function getTakenSlots(instructorId: string, date: string): Promise<string[]> {
  return getTakenSlotsForBooking(instructorId, date)
}

export async function getTakenSlotsForBooking(
  instructorId: string,
  date: string,
  excludeBookingId?: string,
): Promise<string[]> {
  const supabase = await createClient()

  let query = supabase
    .from('bookings')
    .select('time_slots')
    .eq('instructor_id', instructorId)
    .eq('lesson_date', date)
    .neq('status', 'cancelled')

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data } = await query

  if (!data) return []
  return data.flatMap(b => b.time_slots as string[])
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/bookings')
  return { success: true, data: undefined }
}

export async function rescheduleBooking(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const bookingId = (formData.get('booking_id') as string | null) ?? ''
  const instructorId = (formData.get('instructor_id') as string | null) ?? ''
  const lessonDate = (formData.get('lesson_date') as string | null) ?? ''
  const selectedSlots = formData.getAll('time_slots').map(String).filter(Boolean).sort()

  if (!bookingId || !instructorId || !lessonDate || selectedSlots.length === 0) {
    return { success: false, error: 'Selecione instrutor, data e pelo menos um horario.' }
  }

  const [{ data: booking }, { data: instructor }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, school_id, status, payment_status, billing_mode, package_id')
      .eq('id', bookingId)
      .eq('school_id', school.id)
      .maybeSingle(),
    supabase
      .from('instructors')
      .select('id, school_id, hourly_price')
      .eq('id', instructorId)
      .eq('school_id', school.id)
      .eq('active', true)
      .maybeSingle(),
  ])

  if (!booking) return { success: false, error: 'Agendamento invalido para esta escola.' }
  if (!instructor) return { success: false, error: 'Instrutor invalido para esta escola.' }

  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return { success: false, error: 'Apenas agendamentos pendentes ou confirmados podem ser reagendados.' }
  }

  const takenSlots = await getTakenSlotsForBooking(instructorId, lessonDate, bookingId)
  const conflictingSlot = selectedSlots.find((slot) => takenSlots.includes(slot))
  if (conflictingSlot) {
    return { success: false, error: `O horario ${conflictingSlot} ja esta reservado para este instrutor.` }
  }

  const updatePayload: Record<string, unknown> = {
    instructor_id: instructorId,
    lesson_date: lessonDate,
    time_slots: selectedSlots,
    total_hours: selectedSlots.length,
    updated_at: new Date().toISOString(),
  }

  if (booking.billing_mode === 'hourly' && !booking.package_id) {
    updatePayload.unit_price = Number(instructor.hourly_price)
    updatePayload.total_amount = Number(instructor.hourly_price) * selectedSlots.length
  }

  const { error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard/overview')
  revalidatePath('/dashboard/reports')
  return { success: true, data: undefined }
}

export async function createManualBooking(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const studentId = (formData.get('student_id') as string | null) ?? ''
  const instructorId = (formData.get('instructor_id') as string | null) ?? ''
  const lessonDate = (formData.get('lesson_date') as string | null) ?? ''
  const selectedSlots = formData.getAll('time_slots').map(String).filter(Boolean).sort()

  if (!studentId || !instructorId || !lessonDate || selectedSlots.length === 0) {
    return { success: false, error: 'Selecione aluno, instrutor, data e pelo menos um horario.' }
  }

  const [{ data: student }, { data: instructor }] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('id, school_id')
      .eq('id', studentId)
      .eq('school_id', school.id)
      .maybeSingle(),
    supabase
      .from('instructors')
      .select('id, school_id, hourly_price')
      .eq('id', instructorId)
      .eq('school_id', school.id)
      .eq('active', true)
      .maybeSingle(),
  ])

  if (!student) return { success: false, error: 'Aluno invalido para esta escola.' }
  if (!instructor) return { success: false, error: 'Instrutor invalido para esta escola.' }

  const bookingResult = await createBooking({
    schoolId: school.id,
    studentId,
    instructorId,
    lessonDate,
    timeSlots: selectedSlots,
    unitPrice: Number(instructor.hourly_price),
    paymentMethod: 'cash',
  })

  if (!bookingResult.success) return bookingResult

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'cash',
    })
    .eq('id', bookingResult.data.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true, data: undefined }
}

export async function getManualBookingOptions(): Promise<{
  students: Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]
  instructors: Instructor[]
}> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { students: [], instructors: [] }

  const [{ data: students }, { data: instructors }] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('id, full_name, phone')
      .eq('school_id', school.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('instructors')
      .select('*, availability:instructor_availability(*)')
      .eq('school_id', school.id)
      .eq('active', true)
      .order('full_name', { ascending: true }),
  ])

  return {
    students: ((students ?? []) as Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]),
    instructors: (instructors ?? []) as Instructor[],
  }
}

export async function getStudentProfile(schoolId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('school_id', schoolId)
    .single()

  return data
}

export async function getStudentBookingsBySchoolSlug(slug: string): Promise<Booking[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!school) return []

  const { data: student } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('school_id', school.id)
    .eq('user_id', user.id)
    .single()

  if (!student) return []

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      instructor:instructors(full_name, photo_url, color, specialty)
    `)
    .eq('school_id', school.id)
    .eq('student_id', student.id)
    .order('lesson_date', { ascending: true })

  return (data ?? []) as Booking[]
}
