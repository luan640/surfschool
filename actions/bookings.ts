'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getMySchool } from './instructors'
import { filterBookableSlots, getDefaultBookingRules } from '@/lib/booking-rules'
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
    return { success: false, error: error?.message ?? 'Não foi possível criar o pacote.' }
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
    .order('created_at', { ascending: false })

  if (filters?.status)       query = query.eq('status', filters.status)
  if (filters?.from)         query = query.gte('lesson_date', filters.from)
  if (filters?.to)           query = query.lte('lesson_date', filters.to)
  if (filters?.instructorId) query = query.eq('instructor_id', filters.instructorId)

  const { data } = await query
  const bookings = (data ?? []) as Booking[]

  const packageBookingIds = bookings
    .filter((booking) => booking.billing_mode === 'package' && booking.package_id)
    .map((booking) => booking.id)

  if (packageBookingIds.length === 0) {
    return bookings
  }

  const { data: packageLessons } = await supabase
    .from('student_package_lessons')
    .select('booking_id, student_package:student_packages(total_amount)')
    .in('booking_id', packageBookingIds)

  const packageAmountByBookingId = new Map<string, number>()

  ;(packageLessons ?? []).forEach((row: any) => {
    if (!row.booking_id) return
    const studentPackage = Array.isArray(row.student_package)
      ? row.student_package[0]
      : row.student_package
    const totalAmount = Number(studentPackage?.total_amount ?? 0)
    packageAmountByBookingId.set(row.booking_id, totalAmount)
  })

  return bookings.map((booking) => (
    booking.billing_mode === 'package' && packageAmountByBookingId.has(booking.id)
      ? { ...booking, total_amount: packageAmountByBookingId.get(booking.id) ?? booking.total_amount }
      : booking
  ))
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
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  if (status === 'completed') {
    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', id)
      .eq('school_id', school.id)
      .maybeSingle()

    if (!booking) return { success: false, error: 'Agendamento nao encontrado.' }
    if (booking.payment_status !== 'paid') {
      return { success: false, error: 'Confirme o pagamento antes de concluir a aula.' }
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .eq('school_id', school.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/bookings')
  return { success: true, data: undefined }
}

export async function confirmBookingPayment(id: string, amount?: number, paymentMethod?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, school_id, payment_status, payment_transaction_id, payment_method, billing_mode, package_id, time_slots')
    .eq('id', id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (bookingError) return { success: false, error: bookingError.message }
  if (!booking) return { success: false, error: 'Agendamento invalido para esta escola.' }
  if (booking.payment_transaction_id) return { success: false, error: 'Este pagamento foi criado online e nao pode ser confirmado manualmente.' }
  if (booking.payment_status === 'paid') return { success: true, data: undefined }
  if (!Number.isFinite(amount) || Number(amount) <= 0) {
    return { success: false, error: 'Informe o valor acordado para confirmar o pagamento presencial.' }
  }

  const normalizedAmount = Number(amount)
  const normalizedPaymentMethod = (paymentMethod ?? booking.payment_method ?? 'cash') as PaymentMethod

  if (booking.billing_mode === 'package' && booking.package_id) {
    const { data: packageLesson, error: packageLessonError } = await supabase
      .from('student_package_lessons')
      .select('student_package_id')
      .eq('booking_id', id)
      .maybeSingle()

    if (packageLessonError) return { success: false, error: packageLessonError.message }
    if (!packageLesson?.student_package_id) {
      return { success: false, error: 'Nao foi possivel localizar o pacote vinculado a este agendamento.' }
    }

    const { data: packageBookings, error: packageBookingsError } = await supabase
      .from('student_package_lessons')
      .select('booking_id')
      .eq('student_package_id', packageLesson.student_package_id)

    if (packageBookingsError) return { success: false, error: packageBookingsError.message }

    const relatedBookingIds = (packageBookings ?? [])
      .map((item) => item.booking_id as string | null)
      .filter((value): value is string => Boolean(value))

    if (relatedBookingIds.length > 0) {
      const { error: bookingsUpdateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: normalizedPaymentMethod,
          updated_at: new Date().toISOString(),
        })
        .in('id', relatedBookingIds)

      if (bookingsUpdateError) return { success: false, error: bookingsUpdateError.message }
    }

    const { error: studentPackageError } = await supabase
      .from('student_packages')
      .update({
        total_amount: Number(normalizedAmount.toFixed(2)),
        payment_status: 'paid',
        payment_method: normalizedPaymentMethod,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', packageLesson.student_package_id)

    if (studentPackageError) return { success: false, error: studentPackageError.message }
  } else {
    const normalizedUnitPrice = Number(
      (normalizedAmount / Math.max(booking.time_slots?.length ?? 0, 1)).toFixed(2),
    )

    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: normalizedPaymentMethod,
        unit_price: normalizedUnitPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard/bookings/today')
  revalidatePath('/dashboard/overview')
  revalidatePath('/dashboard/reports')
  revalidatePath('/dashboard/purchases')
  revalidatePath('/dashboard/refunds')
  return { success: true, data: undefined }
}

export async function getBookingPaymentPreview(id: string): Promise<ActionResult<{ amount: number }>> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, school_id, billing_mode, total_amount, package_id')
    .eq('id', id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (bookingError) return { success: false, error: bookingError.message }
  if (!booking) return { success: false, error: 'Agendamento invalido para esta escola.' }

  if (booking.billing_mode === 'package' && booking.package_id) {
    const { data: packageLesson, error: packageLessonError } = await supabase
      .from('student_package_lessons')
      .select('student_package:student_packages(total_amount)')
      .eq('booking_id', id)
      .maybeSingle()

    if (packageLessonError) return { success: false, error: packageLessonError.message }

    const studentPackage = Array.isArray(packageLesson?.student_package)
      ? packageLesson?.student_package[0]
      : packageLesson?.student_package

    return { success: true, data: { amount: Number(studentPackage?.total_amount ?? 0) } }
  }

  return { success: true, data: { amount: Number(booking.total_amount ?? 0) } }
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
    updated_at: new Date().toISOString(),
  }

  if (booking.billing_mode === 'hourly' && !booking.package_id) {
    updatePayload.unit_price = Number(instructor.hourly_price)
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
  const paymentMethod = ((formData.get('payment_method') as string | null) ?? 'cash') as PaymentMethod
  const selectedSlots = formData.getAll('time_slots').map(String).filter(Boolean).sort()

  if (!studentId || !instructorId || !lessonDate || selectedSlots.length === 0) {
    return { success: false, error: 'Selecione aluno, instrutor, data e pelo menos um horario.' }
  }

  if (!['cash', 'pix', 'credit_card', 'debit_card'].includes(paymentMethod)) {
    return { success: false, error: 'Selecione uma forma de pagamento valida.' }
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

  const bookingRules = await getBookingRulesForSchool(school.id)
  const allowedSlots = filterBookableSlots(lessonDate, selectedSlots, bookingRules)

  if (allowedSlots.length !== selectedSlots.length) {
    return { success: false, error: 'Os horarios selecionados nao respeitam a antecedencia minima ou ja passaram.' }
  }

  const bookingResult = await createBooking({
    schoolId: school.id,
    studentId,
    instructorId,
    lessonDate,
    timeSlots: selectedSlots,
    unitPrice: Number(instructor.hourly_price),
    paymentMethod,
  })

  if (!bookingResult.success) return bookingResult

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'pending',
      payment_status: 'pending',
      payment_method: paymentMethod,
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
  bookingRules: {
    minimumBookingNoticeHours: number
    bookingWindowDays: number
  }
}> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) {
    return {
      students: [],
      instructors: [],
      bookingRules: getDefaultBookingRules(),
    }
  }

  const [{ data: students }, { data: instructors }, bookingRules] = await Promise.all([
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
    getBookingRulesForSchool(school.id),
  ])

  return {
    students: ((students ?? []) as Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]),
    instructors: (instructors ?? []) as Instructor[],
    bookingRules,
  }
}

async function getBookingRulesForSchool(schoolId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('school_rules')
    .select('minimum_booking_notice_hours, booking_window_days')
    .eq('school_id', schoolId)
    .maybeSingle()

  return {
    minimumBookingNoticeHours: data?.minimum_booking_notice_hours ?? getDefaultBookingRules().minimumBookingNoticeHours,
    bookingWindowDays: data?.booking_window_days ?? getDefaultBookingRules().bookingWindowDays,
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
