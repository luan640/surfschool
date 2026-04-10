import { NextResponse } from 'next/server'
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { filterBookableSlots, getDefaultBookingRules } from '@/lib/booking-rules'
import { createCouponRedemption, validateCheckoutCoupon } from '@/lib/coupons/checkout'
import type { ValidatedCheckoutCoupon } from '@/lib/coupons/checkout'
import {
  buildMercadoPagoPaymentBody,
  CheckoutBrickPayload,
  createExternalReference,
  getValidMercadoPagoAccessTokenForSchool,
  createMercadoPagoPaymentClient,
  mapMercadoPagoStatusMessage,
} from '@/lib/payments/mercadopago'
import {
  attachTransactionToBookings,
  createPaymentTransactionRecord,
  failPaymentTransaction,
  getBookingIdsForStudentPackage,
  syncPaymentTransactionState,
} from '@/lib/payments/payment-store'

interface ProcessPaymentRequestBody {
  schoolId: string
  selectionType: 'single' | 'package'
  isTrialLesson?: boolean
  couponCode?: string | null
  instructorId: string
  paymentMode?: 'pay_now' | 'pay_on_site'
  packageId?: string | null
  selectedDate?: string
  selectedSlots?: string[]
  lessons?: Array<{ lessonDate: string; timeSlots: string[] }>
  checkoutData: CheckoutBrickPayload
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProcessPaymentRequestBody

    const paymentMode = body.paymentMode === 'pay_on_site' ? 'pay_on_site' : 'pay_now'
    const isTrialLesson = body.selectionType === 'single' && body.isTrialLesson === true

    if (!body.schoolId || !body.selectionType || !body.instructorId) {
      return NextResponse.json({ error: 'Payload de pagamento invalido.' }, { status: 400 })
    }

    if (paymentMode === 'pay_now' && !body.checkoutData?.formData) {
      return NextResponse.json({ error: 'Payload de pagamento invalido.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: school, error: schoolError } = await admin
      .from('schools')
      .select('id, name, slug')
      .eq('id', body.schoolId)
      .single()

    if (schoolError || !school) {
      return NextResponse.json({ error: 'Escola nao encontrada.' }, { status: 404 })
    }

    const rules = await getBookingRulesForSchool(school.id)

    const { data: student, error: studentError } = await admin
      .from('student_profiles')
      .select('id, full_name, cpf')
      .eq('school_id', school.id)
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Aluno nao encontrado para esta escola.' }, { status: 403 })
    }

    const { data: instructor, error: instructorError } = await admin
      .from('instructors')
      .select('id, full_name, hourly_price')
      .eq('id', body.instructorId)
      .eq('school_id', school.id)
      .single()

    if (instructorError || !instructor) {
      return NextResponse.json({ error: 'Instrutor invalido.' }, { status: 400 })
    }

    let amount = 0
    let bookingIds: string[] = []
    let studentPackageId: string | null = null
    let packageName: string | null = null
    let couponApplication: ValidatedCheckoutCoupon | null = null

    if (body.selectionType === 'single') {
      if (isTrialLesson) {
        if (!rules.trialLessonEnabled) {
          return NextResponse.json({ error: 'A aula experimental nao esta ativa para esta escola.' }, { status: 409 })
        }

        if (paymentMode !== 'pay_on_site') {
          return NextResponse.json({ error: 'A aula experimental so pode ser confirmada como pagar no local.' }, { status: 409 })
        }

        if (!student.cpf) {
          return NextResponse.json({ error: 'CPF do aluno nao encontrado para validar a aula experimental.' }, { status: 409 })
        }

        const { data: matchingProfiles, error: matchingProfilesError } = await admin
          .from('student_profiles')
          .select('id')
          .eq('school_id', school.id)
          .eq('cpf', student.cpf)

        if (matchingProfilesError || !matchingProfiles || matchingProfiles.length === 0) {
          return NextResponse.json({ error: matchingProfilesError?.message ?? 'Não foi possível validar o CPF do aluno.' }, { status: 500 })
        }

        const { count: existingBookingsCount, error: existingBookingsError } = await admin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .in('student_id', matchingProfiles.map((profile) => profile.id))

        if (existingBookingsError) {
          return NextResponse.json({ error: existingBookingsError.message }, { status: 500 })
        }

        if ((existingBookingsCount ?? 0) > 0) {
          return NextResponse.json({ error: 'A aula experimental so pode ser usada na primeira reserva do aluno.' }, { status: 409 })
        }
      }

      if (!body.selectedDate || !body.selectedSlots || body.selectedSlots.length === 0) {
        return NextResponse.json({ error: 'Data e horarios sao obrigatorios.' }, { status: 400 })
      }

      const normalizedSelectedSlots = [...new Set(body.selectedSlots)].sort()
      const allowedSlots = filterBookableSlots(body.selectedDate, normalizedSelectedSlots, rules)

      if (allowedSlots.length !== normalizedSelectedSlots.length) {
        return NextResponse.json(
          { error: 'Os horarios selecionados nao respeitam a antecedencia minima ou ja passaram.' },
          { status: 409 },
        )
      }

      const grossAmount = isTrialLesson ? 0 : Number(instructor.hourly_price) * normalizedSelectedSlots.length

      if (body.couponCode && !isTrialLesson) {
        const couponResult = await validateCheckoutCoupon({
          schoolId: school.id,
          studentId: student.id as string,
          selectionType: 'single',
          packageId: null,
          amount: grossAmount,
          code: body.couponCode,
        })

        if (!couponResult.success) {
          return NextResponse.json({ error: couponResult.error }, { status: 409 })
        }

        couponApplication = couponResult.data
      }

      amount = couponApplication?.finalAmount ?? grossAmount
      let { data: booking, error: bookingError } = await admin.rpc('create_booking_safe', {
        p_school_id: school.id,
        p_student_id: student.id,
        p_instructor_id: instructor.id,
        p_lesson_date: body.selectedDate,
        p_time_slots: normalizedSelectedSlots,
        p_unit_price: isTrialLesson ? 0 : instructor.hourly_price,
        p_payment_method: paymentMode === 'pay_on_site' ? 'cash' : resolveLocalPaymentMethod(body.checkoutData),
        p_billing_mode: 'hourly',
        p_package_id: null,
      })

      if (bookingError?.message.includes('Could not find the function public.create_booking_safe')) {
        const fallback = await admin.rpc('create_booking_safe', {
          p_school_id: school.id,
          p_student_id: student.id,
          p_instructor_id: instructor.id,
          p_lesson_date: body.selectedDate,
          p_time_slots: normalizedSelectedSlots,
          p_unit_price: isTrialLesson ? 0 : instructor.hourly_price,
          p_payment_method: paymentMode === 'pay_on_site' ? 'cash' : resolveLocalPaymentMethod(body.checkoutData),
        })

        booking = fallback.data
        bookingError = fallback.error
      }

      if (bookingError || !booking) {
        const message = bookingError?.message.includes('SLOT_CONFLICT')
          ? 'Um ou mais horarios selecionados ja foram reservados.'
          : bookingError?.message ?? 'Não foi possível reservar a aula.'
        return NextResponse.json({ error: message }, { status: 409 })
      }

      bookingIds = [(booking as { id: string }).id]

      if (isTrialLesson) {
        const { error: trialBookingError } = await admin
          .from('bookings')
          .update({ notes: 'Aula experimental' })
          .in('id', bookingIds)

        if (trialBookingError) {
          return NextResponse.json({ error: trialBookingError.message }, { status: 500 })
        }
      }

      if (couponApplication) {
        const normalizedUnitPrice = Number((amount / normalizedSelectedSlots.length).toFixed(2))
        const { error: bookingPriceError } = await admin
          .from('bookings')
          .update({ unit_price: normalizedUnitPrice })
          .in('id', bookingIds)

        if (bookingPriceError) {
          return NextResponse.json({ error: bookingPriceError.message }, { status: 500 })
        }
      }
    } else {
      if (!body.packageId || !body.lessons || body.lessons.length === 0) {
        return NextResponse.json({ error: 'Pacote e aulas planejadas sao obrigatorios.' }, { status: 400 })
      }

      const normalizedLessons = body.lessons.map((lesson) => ({
        lessonDate: lesson.lessonDate,
        timeSlots: [...new Set(lesson.timeSlots)].sort(),
      }))

      const hasInvalidLesson = normalizedLessons.some((lesson) => {
        const normalizedSlots = [...new Set(lesson.timeSlots)].sort()
        if (normalizedSlots.length === 0) return true
        return filterBookableSlots(lesson.lessonDate, normalizedSlots, rules).length !== normalizedSlots.length
      })

      if (hasInvalidLesson) {
        return NextResponse.json(
          { error: 'Uma ou mais aulas do pacote nao respeitam a antecedencia minima ou usam horarios que ja passaram.' },
          { status: 409 },
        )
      }

      const { data: pkg, error: packageError } = await admin
        .from('lesson_packages')
        .select('id, name, price')
        .eq('id', body.packageId)
        .eq('school_id', school.id)
        .single()

      if (packageError || !pkg) {
        return NextResponse.json({ error: 'Pacote invalido.' }, { status: 400 })
      }

      const grossAmount = Number(pkg.price)
      packageName = pkg.name

      if (body.couponCode) {
        const couponResult = await validateCheckoutCoupon({
          schoolId: school.id,
          studentId: student.id as string,
          selectionType: 'package',
          packageId: pkg.id,
          amount: grossAmount,
          code: body.couponCode,
        })

        if (!couponResult.success) {
          return NextResponse.json({ error: couponResult.error }, { status: 409 })
        }

        couponApplication = couponResult.data
      }

      amount = couponApplication?.finalAmount ?? grossAmount

      const { data: packagePlanId, error: packagePlanError } = await admin.rpc('create_package_booking_plan_safe', {
        p_school_id: school.id,
        p_student_id: student.id,
        p_instructor_id: instructor.id,
        p_package_id: pkg.id,
        p_lessons: normalizedLessons,
        p_total_amount: amount,
        p_payment_method: paymentMode === 'pay_on_site' ? 'cash' : resolveLocalPaymentMethod(body.checkoutData),
      })

      if (packagePlanError || !packagePlanId) {
        const message = packagePlanError?.message.includes('SLOT_CONFLICT_LESSON_')
          ? 'Um ou mais horarios do pacote nao estao mais disponiveis.'
          : packagePlanError?.message ?? 'Não foi possível reservar o pacote.'
        return NextResponse.json({ error: message }, { status: 409 })
      }

      studentPackageId = packagePlanId as string
      bookingIds = await getBookingIdsForStudentPackage(studentPackageId)
    }

    if (couponApplication) {
      await createCouponRedemption({
        couponId: couponApplication.id,
        schoolId: school.id,
        studentId: student.id as string,
        bookingId: bookingIds[0] ?? null,
        appliedCode: couponApplication.code,
        discountAmount: couponApplication.discountAmount,
      })
    }

    if (paymentMode === 'pay_on_site') {
      const { error: bookingUpdateError } = await admin
        .from('bookings')
        .update({
          status: isTrialLesson ? 'confirmed' : 'pending',
          payment_status: isTrialLesson ? 'paid' : 'pending',
          payment_method: isTrialLesson ? 'cash' : null,
        })
        .in('id', bookingIds)

      if (bookingUpdateError) {
        return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 })
      }

      return NextResponse.json(
        {
          transactionId: null,
          paymentId: null,
          status: 'pay_on_site',
          statusDetail: null,
          message: 'Agendamento confirmado. O pagamento ficará pendente para ser feito na hora.',
          qrCode: null,
          qrCodeBase64: null,
          ticketUrl: null,
        },
        { status: 200 },
      )
    }

    const schoolAccessToken = await getValidMercadoPagoAccessTokenForSchool(school.id)
    if (!schoolAccessToken) {
      return NextResponse.json({ error: 'A escola ainda não conectou o Mercado Pago para receber pagamentos.' }, { status: 409 })
    }

    const paymentMethod = resolveLocalPaymentMethod(body.checkoutData)
    const externalReference = createExternalReference(body.selectionType)
    const transactionId = await createPaymentTransactionRecord({
      schoolId: school.id,
      studentId: student.id,
      bookingIds,
      studentPackageId,
      selectionType: body.selectionType,
      paymentMethod,
      amount,
      externalReference,
      checkoutPayload: body.checkoutData,
    })

    await attachTransactionToBookings(transactionId, bookingIds)

    const paymentClient = createMercadoPagoPaymentClient(schoolAccessToken)
    let payment: PaymentResponse
    try {
      payment = await paymentClient.create({
        body: buildMercadoPagoPaymentBody({
          externalReference,
          checkoutData: body.checkoutData,
          booking: {
            schoolId: school.id,
            schoolName: school.name,
            schoolSlug: school.slug,
            studentId: student.id,
            studentName: student.full_name,
            studentEmail: user.email,
            instructorId: instructor.id,
            instructorName: instructor.full_name,
            paymentMethod,
            amount,
            selectionType: body.selectionType,
            bookingIds,
            packageId: body.packageId ?? null,
            packageName,
            studentPackageId,
          },
        }),
        requestOptions: {
          idempotencyKey: externalReference,
        },
      })
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : 'Erro ao criar pagamento no Mercado Pago.'
      await failPaymentTransaction({
        transactionId,
        bookingIds,
        studentPackageId,
        errorMessage: message,
      })
      return NextResponse.json({ error: message }, { status: 502 })
    }

    await syncPaymentTransactionState({
      transactionId,
      payment,
    })

    return NextResponse.json(buildClientPaymentResponse(transactionId, payment), { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro interno ao processar o pagamento.',
      },
      { status: 500 }
    )
  }
}

function buildClientPaymentResponse(transactionId: string, payment: PaymentResponse) {
  return {
    transactionId,
    paymentId: payment.id ?? null,
    status: payment.status ?? 'pending',
    statusDetail: payment.status_detail ?? null,
    message: mapMercadoPagoStatusMessage(payment),
    qrCode: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url ?? null,
  }
}

function resolveLocalPaymentMethod(checkoutData: CheckoutBrickPayload) {
  return checkoutData.paymentType === 'bank_transfer' || checkoutData.selectedPaymentMethod === 'bank_transfer' || checkoutData.formData.payment_method_id === 'pix'
    ? 'pix'
    : 'credit_card'
}

async function getBookingRulesForSchool(schoolId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('school_rules')
    .select('minimum_booking_notice_hours, booking_window_days, trial_lesson_enabled')
    .eq('school_id', schoolId)
    .maybeSingle()

  return {
    minimumBookingNoticeHours: data?.minimum_booking_notice_hours ?? getDefaultBookingRules().minimumBookingNoticeHours,
    bookingWindowDays: data?.booking_window_days ?? getDefaultBookingRules().bookingWindowDays,
    trialLessonEnabled: data?.trial_lesson_enabled ?? false,
  }
}
