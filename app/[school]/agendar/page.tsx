'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Clock, MapPin, Package, User } from 'lucide-react'
import { getTakenSlots } from '@/actions/bookings'
import { getPublicMercadoPagoConnectionBySlug, getPublicSchoolRulesBySlug } from '@/actions/dashboard'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { getPublicTripSettingsBySlug } from '@/actions/trips'
import { getPublicLessonPackagesBySchoolSlug } from '@/actions/packages'
import { MercadoPagoCheckoutBrick } from '@/components/checkout/MercadoPagoCheckoutBrick'
import { filterBookableSlots, getDateKeyFromDate, getDefaultBookingRules, getSchoolNowDateKey, isDateWithinBookingWindow } from '@/lib/booking-rules'
import { createClient } from '@/lib/supabase/client'
import type { BookingWizardState, Instructor, LessonPackage, SchoolRules, SchoolTripSettings } from '@/lib/types'
import { formatDate, formatPrice, initials } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

// Steps are built dynamically from translations in the component

interface Props {
  params: Promise<{ school: string }>
}

export default function BookingWizardPage({ params: paramsPromise }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  const [slug, setSlug] = useState('')
  const [school, setSchool] = useState<{ id: string; name: string; address: string | null; primary_color: string; cta_color: string } | null>(null)
  const [schoolRules, setSchoolRules] = useState<SchoolRules | null>(null)
  const [tripSettings, setTripSettings] = useState<SchoolTripSettings | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [packages, setPackages] = useState<LessonPackage[]>([])
  const [studentEmail, setStudentEmail] = useState<string | null>(null)
  const [trialLessonEligible, setTrialLessonEligible] = useState(false)
  const [trialLessonChecked, setTrialLessonChecked] = useState(false)
  const [mercadoPagoReady, setMercadoPagoReady] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packageStepMessage, setPackageStepMessage] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [productTab, setProductTab] = useState<'single' | 'package'>('single')
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [navigationLocked, setNavigationLocked] = useState(false)
  const packagePlannerRef = useRef<HTMLDivElement | null>(null)

  const [wizard, setWizard] = useState<BookingWizardState>({
    schoolId: '',
    selectionType: null,
    selectedPackage: null,
    selectedDate: null,
    selectedInstructor: null,
    selectedSlots: [],
    packageLessons: [],
    activePackageLessonIndex: 0,
    step: 1,
  })

  useEffect(() => {
    paramsPromise.then((params) => setSlug(params.school))
  }, [paramsPromise])

  useEffect(() => {
    if (!slug) return

    const supabase = createClient()
    let active = true

    supabase
      .from('schools')
      .select('id, name, address, primary_color, cta_color')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (!active || !data) return
        setSchool(data)
        setWizard((current) => ({ ...current, schoolId: data.id }))
      })

    getInstructorsBySchoolSlug(slug).then(setInstructors)
    getPublicLessonPackagesBySchoolSlug(slug).then(setPackages)
    getPublicSchoolRulesBySlug(slug).then(setSchoolRules)
    getPublicTripSettingsBySlug(slug).then(setTripSettings)
    getPublicMercadoPagoConnectionBySlug(slug).then((connection) => setMercadoPagoReady(connection?.status === 'connected'))

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return

      setStudentEmail(session?.user?.email ?? null)
      setAuthReady(true)

      if (!session?.user) {
        router.replace(`/${slug}/entrar?mode=login&next=agendar`)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      setStudentEmail(session?.user?.email ?? null)
      setAuthReady(true)

      if (event === 'SIGNED_OUT' || !session?.user) {
        router.replace(`/${slug}/entrar?mode=login&next=agendar`)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router, slug])

  useEffect(() => {
    if (!authReady || !school?.id) return
    if (!schoolRules?.trial_lesson_enabled) {
      setTrialLessonEligible(false)
      setTrialLessonChecked(true)
      return
    }

    const supabase = createClient()
    let active = true

    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active) return

      if (!user) {
        setTrialLessonEligible(false)
        setTrialLessonChecked(true)
        return
      }

      const { data: studentProfile, error: studentProfileError } = await supabase
        .from('student_profiles')
        .select('id, cpf')
        .eq('school_id', school.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return

      if (studentProfileError || !studentProfile || !studentProfile.cpf) {
        setTrialLessonEligible(false)
        setTrialLessonChecked(true)
        return
      }

      const { data: matchingProfiles, error: matchingProfilesError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('school_id', school.id)
        .eq('cpf', studentProfile.cpf)

      if (!active) return

      if (matchingProfilesError || !matchingProfiles || matchingProfiles.length === 0) {
        setTrialLessonEligible(false)
        setTrialLessonChecked(true)
        return
      }

      const { count, error: bookingsError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school.id)
        .in('student_id', matchingProfiles.map((profile) => profile.id))

      if (!active) return

      setTrialLessonEligible(!bookingsError && (count ?? 0) === 0)
      setTrialLessonChecked(true)
    })

    return () => {
      active = false
    }
  }, [authReady, school?.id, schoolRules?.trial_lesson_enabled])

  const SINGLE_STEPS = [t.wizard_step_product, t.wizard_step_instructor, t.wizard_step_date, t.wizard_step_slots, t.wizard_step_confirm] as const
  const PACKAGE_STEPS = [t.wizard_step_product, t.wizard_step_instructor, t.wizard_step_lessons, t.wizard_step_confirm] as const

  const isPackageFlow = wizard.selectionType === 'package' && !!wizard.selectedPackage
  const isTrialFlow = wizard.selectionType === 'trial'
  const activePackageLesson = wizard.packageLessons[wizard.activePackageLessonIndex] ?? null

  useEffect(() => {
    if (!isPackageFlow || wizard.step !== 3 || !packagePlannerRef.current) return

    const frame = window.requestAnimationFrame(() => {
      packagePlannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isPackageFlow, wizard.activePackageLessonIndex, wizard.step])

  const steps = isPackageFlow ? PACKAGE_STEPS : SINGLE_STEPS
  const finalStep = steps.length as 4 | 5
  const showStickyFooter = wizard.step < finalStep || (wizard.step > 1 && !navigationLocked)
  const primaryColor = school?.primary_color ?? '#0077b6'
  const ctaColor = school?.cta_color ?? '#f77f00'
  const bookingRules = useMemo(
    () => ({
      minimumBookingNoticeHours: schoolRules?.minimum_booking_notice_hours ?? getDefaultBookingRules().minimumBookingNoticeHours,
      bookingWindowDays: schoolRules?.booking_window_days ?? getDefaultBookingRules().bookingWindowDays,
    }),
    [schoolRules],
  )

  const eligibleInstructors = useMemo(() => {
    if (!isPackageFlow || !wizard.selectedPackage) return instructors
    const allowedIds = new Set((wizard.selectedPackage.instructors ?? []).map((item) => item.id))
    return instructors.filter((item) => allowedIds.has(item.id))
  }, [instructors, isPackageFlow, wizard.selectedPackage])

  function getAvailabilityForDate(instructor: Instructor, date: Date | null) {
    if (!date) return []

    return (instructor.availability ?? [])
      .find((item) => Number(item.weekday) === date.getDay())
      ?.time_slots ?? []
  }

  const singleAvailableInstructors = useMemo(() => {
    if (!wizard.selectedDate) return []
    return eligibleInstructors.filter((instructor) =>
      filterBookableSlots(
        wizard.selectedDate!,
        getAvailabilityForDate(instructor, wizard.selectedDate!),
        bookingRules,
      ).length > 0
    )
  }, [bookingRules, eligibleInstructors, wizard.selectedDate])

  useEffect(() => {
    const selectedDate = isPackageFlow ? activePackageLesson?.date ?? null : wizard.selectedDate
    if (!wizard.selectedInstructor || !selectedDate) {
      setSlotsLoading(false)
      setTakenSlots([])
      return
    }

    let ignore = false
    setSlotsLoading(true)
    getTakenSlots(wizard.selectedInstructor.id, selectedDate.toISOString().slice(0, 10)).then((slots) => {
      if (ignore) return
      setTakenSlots(slots)
      setSlotsLoading(false)
    })

    return () => {
      ignore = true
    }
  }, [activePackageLesson?.date, isPackageFlow, wizard.selectedDate, wizard.selectedInstructor])

  const currentDate = isPackageFlow ? activePackageLesson?.date ?? null : wizard.selectedDate
  const currentSlots = isPackageFlow ? activePackageLesson?.slots ?? [] : wizard.selectedSlots
  const slotOptions = !wizard.selectedInstructor || !currentDate
    ? []
    : filterBookableSlots(currentDate, getAvailabilityForDate(wizard.selectedInstructor, currentDate), bookingRules).map((time) => ({
        time,
        taken: takenSlots.includes(time),
      }))

  const completedPackageLessons = wizard.packageLessons.filter((item) => item.date && item.slots.length > 0).length
  const packageReady = isPackageFlow && wizard.packageLessons.length > 0 && completedPackageLessons === wizard.packageLessons.length
  const slots = wizard.selectedSlots.length
  const instr = wizard.selectedInstructor
  const totalAmount = isPackageFlow && wizard.selectedPackage
    ? Number(wizard.selectedPackage.price)
    : isTrialFlow
      ? 0
    : instr && slots > 0
      ? instr.hourly_price * slots
      : 0
  const pixTotalAmount = isTrialFlow ? 0
    : isPackageFlow && wizard.selectedPackage
      ? Number(wizard.selectedPackage.pix_price ?? wizard.selectedPackage.price)
      : instr && slots > 0
        ? (instr.pix_price ?? instr.hourly_price) * slots
        : totalAmount
  const cardTotalAmount = isTrialFlow ? 0
    : isPackageFlow && wizard.selectedPackage
      ? Number(wizard.selectedPackage.card_price ?? wizard.selectedPackage.price)
      : instr && slots > 0
        ? (instr.card_price ?? instr.hourly_price) * slots
        : totalAmount

  function resetForProduct() {
    setError(null)
    setPackageStepMessage(null)
    setTakenSlots([])
    setCalendarMonth(new Date())
  }

  function chooseSingle() {
    resetForProduct()
    setProductTab('single')
    setWizard((current) => ({
      ...current,
      selectionType: 'single',
      selectedPackage: null,
      selectedDate: null,
      selectedInstructor: null,
      selectedSlots: [],
      packageLessons: [],
      activePackageLessonIndex: 0,
      step: 1,
    }))
  }

  function chooseTrialLesson() {
    resetForProduct()
    setProductTab('single')
    setWizard((current) => ({
      ...current,
      selectionType: 'trial',
      selectedPackage: null,
      selectedDate: null,
      selectedInstructor: null,
      selectedSlots: [],
      packageLessons: [],
      activePackageLessonIndex: 0,
      step: 1,
    }))
  }

  function choosePackage(pkg: LessonPackage) {
    resetForProduct()
    setProductTab('package')
    setWizard((current) => ({
      ...current,
      selectionType: 'package',
      selectedPackage: pkg,
      selectedDate: null,
      selectedInstructor: null,
      selectedSlots: [],
      packageLessons: Array.from({ length: pkg.lesson_count }, (_, index) => ({ sequence: index + 1, date: null, slots: [] })),
      activePackageLessonIndex: 0,
      step: 1,
    }))
  }

  function goToStep(nextStep: number) {
    setError(null)
    setWizard((current) => ({ ...current, step: nextStep as 1 | 2 | 3 | 4 | 5 }))
  }

  function setSingleDate(date: Date) {
    setWizard((current) => ({ ...current, selectedDate: date, selectedSlots: [] }))
  }

  function setPackageLessonDate(index: number, date: Date) {
    setWizard((current) => ({
      ...current,
      packageLessons: current.packageLessons.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, date, slots: [] } : lesson
      ),
    }))
  }

  function selectInstructor(instructor: Instructor) {
    setError(null)
    setPackageStepMessage(isPackageFlow ? t.wizard_choose_lesson_date(1) : null)
    setWizard((current) => ({
      ...current,
      selectedInstructor: instructor,
      packageLessons: isPackageFlow
        ? current.packageLessons.map((lesson) => ({ ...lesson, date: null, slots: [] }))
        : current.packageLessons,
      activePackageLessonIndex: 0,
      selectedSlots: [],
      step: isPackageFlow ? 3 : 2,
    }))
  }

  function toggleCurrentSlot(time: string) {
    if (isPackageFlow) {
      setWizard((current) => {
        const nextLessons = current.packageLessons.map((lesson, lessonIndex) =>
          lessonIndex === current.activePackageLessonIndex
            ? { ...lesson, slots: [time] }
            : lesson
        )

        const nextIncompleteIndex = nextLessons.findIndex(
          (lesson, index) => index > current.activePackageLessonIndex && (!lesson.date || lesson.slots.length === 0)
        )

        if (nextIncompleteIndex >= 0) {
          const nextDate = nextLessons[nextIncompleteIndex]?.date
          setCalendarMonth(nextDate ?? currentDate ?? new Date())
          setPackageStepMessage(t.wizard_lesson_success_next(nextLessons[nextIncompleteIndex].sequence))
        } else {
          setPackageStepMessage(t.wizard_lesson_success_all)
        }

        return {
          ...current,
          packageLessons: nextLessons,
          activePackageLessonIndex: nextIncompleteIndex >= 0 ? nextIncompleteIndex : current.activePackageLessonIndex,
        }
      })
      return
    }

    setWizard((current) => ({
      ...current,
      selectedSlots: current.selectedSlots.includes(time)
        ? current.selectedSlots.filter((slot) => slot !== time)
        : [...current.selectedSlots, time].sort(),
    }))
  }

  function buildCalendar() {
    const todayKey = getSchoolNowDateKey()

    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const allowedWeekdays = new Set<number>()
    const source = isPackageFlow && wizard.selectedInstructor ? [wizard.selectedInstructor] : eligibleInstructors
    source.forEach((instructor) => instructor.availability?.forEach((item) => allowedWeekdays.add(Number(item.weekday))))

    const cells: Array<null | { day: number; date: Date; available: boolean; selected: boolean; past: boolean; inTrip: boolean }> = []
    for (let index = 0; index < firstDay; index += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)
      const dateKey = getDateKeyFromDate(date)
      const past = dateKey < todayKey
      const inTrip = !!(tripSettings?.trip_start_date && tripSettings?.trip_end_date &&
        dateKey >= tripSettings.trip_start_date && dateKey <= tripSettings.trip_end_date)
      const blockedByTrip = inTrip && tripSettings?.booking_mode === 'trip_only'
      cells.push({
        day,
        date,
        available: allowedWeekdays.has(date.getDay()) && !past && isDateWithinBookingWindow(date, bookingRules.bookingWindowDays) && !blockedByTrip,
        selected: currentDate?.getTime() === date.getTime(),
        past,
        inTrip,
      })
    }

    return { year, month, cells }
  }

  const { year, month, cells } = buildCalendar()

  function isDateInTripPeriod(date: Date | null): boolean {
    if (!date || !tripSettings?.trip_start_date || !tripSettings?.trip_end_date) return false
    const key = getDateKeyFromDate(date)
    return key >= tripSettings.trip_start_date && key <= tripSettings.trip_end_date
  }

  const selectedDateInTrip = isDateInTripPeriod(wizard.selectedDate)
  const tripOnlyMode = tripSettings?.booking_mode === 'trip_only'
  const showTripWarning = selectedDateInTrip && tripOnlyMode
  const showTripNote = selectedDateInTrip && !tripOnlyMode
  const todayKey = getSchoolNowDateKey()
  const schoolCurrentlyInTrip = !!(tripSettings?.trip_start_date && tripSettings?.trip_end_date &&
    todayKey >= tripSettings.trip_start_date && todayKey <= tripSettings.trip_end_date)

  function canAdvance() {
    if (wizard.step === 1) return !!wizard.selectionType
    if (!isPackageFlow && wizard.step === 2) return !!wizard.selectedInstructor
    if (isPackageFlow && wizard.step === 2) return !!wizard.selectedInstructor
    if (!isPackageFlow && wizard.step === 3) return !!wizard.selectedDate
    if (isPackageFlow && wizard.step === 3) return packageReady
    if (!isPackageFlow && wizard.step === 4) return wizard.selectedSlots.length > 0
    return false
  }

  function buildGoogleCalendarUrl(input: {
    title: string
    description: string
    date: Date
    slots: string[]
  }) {
    if (input.slots.length === 0) return null

    const sortedSlots = [...input.slots].sort()
    const [startHour, startMinute] = sortedSlots[0].split(':').map(Number)
    const [lastHour, lastMinute] = sortedSlots[sortedSlots.length - 1].split(':').map(Number)

    const start = new Date(input.date)
    start.setHours(startHour, startMinute, 0, 0)

    const end = new Date(input.date)
    end.setHours(lastHour + 1, lastMinute, 0, 0)

    const encodeCalendarDate = (date: Date) =>
      `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`

    const url = new URL('https://calendar.google.com/calendar/render')
    url.searchParams.set('action', 'TEMPLATE')
    url.searchParams.set('text', input.title)
    url.searchParams.set('details', input.description)
    url.searchParams.set('dates', `${encodeCalendarDate(start)}/${encodeCalendarDate(end)}`)
    return url.toString()
  }

  const singleCalendarUrl = !isPackageFlow && wizard.selectedDate && wizard.selectedSlots.length > 0 && school && wizard.selectedInstructor
    ? buildGoogleCalendarUrl({
        title: t.wizard_gcal_lesson_at(school.name),
        description: `${t.wizard_gcal_instructor(wizard.selectedInstructor.full_name)}\n${t.wizard_gcal_slots(wizard.selectedSlots.join(', '))}`,
        date: wizard.selectedDate,
        slots: wizard.selectedSlots,
      })
    : null

  const selectedInstructorName = wizard.selectedInstructor?.full_name ?? 'Instrutor'

  const packageCalendarLinks = isPackageFlow && school && wizard.selectedInstructor
    ? wizard.packageLessons
        .filter((lesson) => lesson.date && lesson.slots.length > 0)
        .map((lesson) => ({
          sequence: lesson.sequence,
          label: t.wizard_lesson_seq(lesson.sequence),
          url: buildGoogleCalendarUrl({
            title: `${wizard.selectedPackage?.name ?? t.wizard_packages_fallback} - ${school.name}`,
            description: `${t.wizard_gcal_instructor(selectedInstructorName)}\n${t.wizard_gcal_slots(lesson.slots.join(', '))}`,
            date: lesson.date!,
            slots: lesson.slots,
          }),
        }))
        .filter((lesson): lesson is { sequence: number; label: string; url: string } => Boolean(lesson.url))
    : []

  if (!authReady || !school) {
    return (
      <div className="min-h-dvh bg-[#f4f5f7] pb-24">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/96 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => router.push(`/${slug || ''}`)} className="text-[16px] font-semibold text-slate-900">
            {school?.name ?? 'vamosurfar'}
          </button>
        </header>
        <div className="mx-auto w-full max-w-md px-3 py-6 sm:max-w-2xl sm:px-5">
          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-6 text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            {t.wizard_loading}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f4f5f7] pb-36">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 sm:max-w-2xl">
        <button type="button" onClick={() => router.push(`/${slug}`)} className="text-[16px] font-semibold text-slate-900">{school?.name ?? 'vamosurfar'}</button>
        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400">
          {steps.map((label, index) => {
            const n = index + 1
            const active = wizard.step === n
            const done = wizard.step > n
            return (
              <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${done ? 'bg-emerald-500 text-white' : active ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={active ? { background: ctaColor } : undefined}>
                  {done ? <Check size={12} /> : n}
                </div>
                <span className={active ? 'text-slate-700' : 'hidden sm:block'}>{label}</span>
              </div>
            )
          })}
        </div>
        </div>
      </header>

      <div className={`mx-auto w-full max-w-md px-3 py-4 ${showStickyFooter ? 'pb-28 sm:pb-32' : 'pb-8 sm:pb-10'} sm:max-w-2xl sm:px-5`}>
        <main className="space-y-6">
          {error && <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{error}</div>}

          {schoolCurrentlyInTrip && (
            <div className="rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">🏄 A escola está em trip!</div>
              <p className="mt-0.5 text-[13px]">
                {tripSettings?.location_note
                  ? tripSettings.location_note
                  : tripOnlyMode
                    ? 'Agendamentos normais estão suspensos durante este período. Confira as trips disponíveis!'
                    : 'Durante este período a escola está em trip. Agendamentos normais continuam disponíveis.'}
              </p>
            </div>
          )}

          {school.address && (
            <div className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <MapPin size={15} />
              </span>
              <div>
                <div className="text-[12px] font-medium text-slate-500">{t.wizard_location}</div>
                <div className="mt-1 text-[14px] font-medium">{school.address}</div>
              </div>
            </div>
          )}

          {wizard.step === 1 && (
            <section className="space-y-4">
              <div>
                <h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_choose_service}</h1>
                <p className="mt-1 text-[14px] text-slate-500">{t.wizard_choose_service_sub}</p>
              </div>

              <div className="inline-flex rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setProductTab('single')}
                  className={`rounded-[10px] px-4 py-2 text-[14px] font-medium transition-colors ${productTab === 'single' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'single' ? { background: primaryColor } : undefined}
                >
                  {t.wizard_tab_lessons}
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab('package')}
                  className={`rounded-[10px] px-4 py-2 text-[14px] font-medium transition-colors ${productTab === 'package' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'package' ? { background: ctaColor } : undefined}
                >
                  {t.wizard_tab_packages}
                </button>
              </div>

              {productTab === 'single' && schoolRules?.trial_lesson_enabled && trialLessonChecked && trialLessonEligible && (
                <button type="button" onClick={chooseTrialLesson} className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={wizard.selectionType === 'trial' ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}>
                  <div className="flex items-start gap-3"><div className="rounded-[14px] p-3 text-white" style={{ background: ctaColor }}><Check size={18} /></div><div className="flex-1"><div className="flex items-start justify-between gap-3"><div className="text-[16px] font-semibold text-slate-900">{t.wizard_trial_name}</div><div className="text-[16px] font-semibold" style={{ color: ctaColor }}>{formatPrice(0)}</div></div><p className="mt-1 text-[13px] text-slate-500">{t.wizard_trial_desc}</p></div></div>
                </button>
              )}

              {productTab === 'single' ? (
                <button type="button" onClick={chooseSingle} className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={wizard.selectionType === 'single' ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}>
                  <div className="flex items-start gap-3"><div className="rounded-[14px] p-3 text-white" style={{ background: primaryColor }}><Clock size={18} /></div><div><div className="text-[16px] font-semibold text-slate-900">{t.wizard_single_name}</div><p className="mt-1 text-[13px] text-slate-500">{t.wizard_single_desc}</p></div></div>
                </button>
              ) : packages.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-[14px] text-slate-500">
                  {t.wizard_no_packages}
                </div>
              ) : (
                packages.map((pkg) => (
                  <button key={pkg.id} type="button" onClick={() => choosePackage(pkg)} className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={wizard.selectedPackage?.id === pkg.id ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}>
                    <div className="flex items-start gap-3"><div className="rounded-[14px] p-3 text-white" style={{ background: ctaColor }}><Package size={18} /></div><div className="flex-1"><div className="flex items-start justify-between gap-3"><div className="text-[16px] font-semibold text-slate-900">{pkg.name}</div><div className="text-[16px] font-semibold" style={{ color: primaryColor }}>{formatPrice(Number(pkg.price))}</div></div><p className="mt-1 text-[13px] text-slate-500">{t.wizard_package_lessons_count(pkg.lesson_count)}</p>{pkg.description && <p className="mt-2 text-[13px] text-slate-500">{pkg.description}</p>}</div></div>
                  </button>
                ))
              )}
            </section>
          )}

          {((!isPackageFlow && wizard.step === 2) || (isPackageFlow && wizard.step === 2)) && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_choose_pro}</h1><p className="mt-1 text-[14px] text-slate-500">{isPackageFlow ? t.wizard_choose_pro_sub_package : t.wizard_choose_pro_sub_single}</p></div>
              {eligibleInstructors.map((instructor) => (
                <div
                  key={instructor.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectInstructor(instructor)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectInstructor(instructor)
                    }
                  }}
                  className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                  style={wizard.selectedInstructor?.id === instructor.id ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (instructor.photo_url) {
                          setPreviewImage({ src: instructor.photo_url, alt: instructor.full_name })
                        }
                      }}
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[12px] text-sm font-bold text-white"
                      style={{ background: instructor.color }}
                    >
                      {instructor.photo_url ? <img src={instructor.photo_url} alt={instructor.full_name} className="h-full w-full object-cover" /> : initials(instructor.full_name)}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-slate-900">{instructor.full_name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!isPackageFlow && wizard.step === 3 && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_choose_date}</h1><p className="mt-1 text-[14px] text-slate-500">{t.wizard_choose_date_sub}</p></div>
              <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={setSingleDate} ctaColor={ctaColor} months={t.months} weekdays={t.weekdays} />
              {showTripWarning && (
                <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <div className="font-semibold">⚠️ A escola estará em trip nesta data</div>
                  <p className="mt-1 text-[13px]">
                    {tripSettings?.location_note
                      ? tripSettings.location_note
                      : 'Neste período os agendamentos normais não estão disponíveis. Confira as trips abertas!'}
                  </p>
                </div>
              )}
              {showTripNote && (
                <div className="rounded-[14px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  <div className="font-semibold">🏄 A escola estará em trip nesta data</div>
                  <p className="mt-1 text-[13px]">
                    {tripSettings?.location_note
                      ? tripSettings.location_note
                      : 'O agendamento normal continua disponível, mas você também pode conferir as trips abertas!'}
                  </p>
                </div>
              )}
            </section>
          )}

          {isPackageFlow && wizard.step === 3 && wizard.selectedInstructor && activePackageLesson && (
            <section className="space-y-5">
              <div><h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_build_package}</h1><p className="mt-1 text-[14px] text-slate-500">{t.wizard_build_package_sub(wizard.packageLessons.length)}</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                {wizard.packageLessons.map((lesson, index) => {
                  const complete = !!lesson.date && lesson.slots.length > 0
                  return (
                    <button
                      key={lesson.sequence}
                      type="button"
                      onClick={() => {
                        setPackageStepMessage(`{t.wizard_choose_lesson_date(lesson.sequence)}`)
                        setWizard((current) => ({ ...current, activePackageLessonIndex: index }))
                        setCalendarMonth(lesson.date ?? new Date())
                      }}
                      className="rounded-[16px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                      style={wizard.activePackageLessonIndex === index ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}
                    >
                      <div className="flex items-center justify-between gap-3"><div className="text-[16px] font-semibold text-slate-900">{t.wizard_lesson_label(lesson.sequence)}</div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{complete ? t.wizard_lesson_done : t.wizard_lesson_pending}</span></div>
                      <div className="mt-3 text-[13px] text-slate-500">{lesson.date ? formatDate(lesson.date) : t.wizard_no_date}</div>
                      <div className="mt-1 text-[13px] text-slate-500">{lesson.slots.length > 0 ? lesson.slots.join(', ') : t.wizard_no_slots}</div>
                    </button>
                  )
                })}
              </div>
              <div ref={packagePlannerRef} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="mb-4 flex items-center gap-3"><div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">{t.wizard_lesson_of(activePackageLesson.sequence, wizard.packageLessons.length)}</div><div className="text-[13px] text-slate-500">{t.wizard_lessons_filled(completedPackageLessons, wizard.packageLessons.length)}</div></div>
                {packageStepMessage && (
                  <div className="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                    {packageStepMessage}
                  </div>
                )}
                <div className="space-y-4">
                  <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={(date) => setPackageLessonDate(wizard.activePackageLessonIndex, date)} ctaColor={ctaColor} months={t.months} weekdays={t.weekdays} />
                  <div className="text-[13px] text-slate-500">{t.wizard_slot_hint}</div>
                  <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
                </div>
              </div>
            </section>
          )}

          {!isPackageFlow && wizard.step === 4 && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_choose_slots}</h1><p className="mt-1 text-[14px] text-slate-500">{t.wizard_choose_slots_sub}</p></div>
              <div className="rounded-[16px] border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">{wizard.selectedInstructor.full_name} - {wizard.selectedDate ? formatDate(wizard.selectedDate) : ''}</div>
              <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
            </section>
          )}

          {wizard.step === finalStep && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">{t.wizard_confirm_title}</h1><p className="mt-1 text-[14px] text-slate-500">{isTrialFlow ? t.wizard_confirm_sub_trial : t.wizard_confirm_sub_default}</p></div>
              <MercadoPagoCheckoutBrick
                schoolSlug={slug}
                schoolId={school!.id}
                selectionType={isPackageFlow ? 'package' : 'single'}
                amount={totalAmount}
                pixAmount={isTrialFlow ? null : pixTotalAmount}
                cardAmount={isTrialFlow ? null : cardTotalAmount}
                title={isPackageFlow ? wizard.selectedPackage?.name ?? t.wizard_packages_fallback : isTrialFlow ? t.wizard_trial_title : t.wizard_single_title}
                onlineEnabled={false}
                description={isPackageFlow
                  ? `${wizard.packageLessons.length} aulas com ${wizard.selectedInstructor.full_name}`
                  : `${formatDate(wizard.selectedDate!)} • ${wizard.selectedSlots.join(', ')}`}
                instructorId={wizard.selectedInstructor.id}
                selectedDate={wizard.selectedDate?.toISOString().slice(0, 10)}
                selectedSlots={wizard.selectedSlots}
                packageId={wizard.selectedPackage?.id ?? null}
                lessons={isPackageFlow ? wizard.packageLessons.map((lesson) => ({
                  lessonDate: lesson.date!.toISOString().slice(0, 10),
                  timeSlots: lesson.slots,
                })) : undefined}
                payerEmail={studentEmail}
                payOnSiteOnly={isTrialFlow}
                payOnSiteLabel={isTrialFlow ? t.wizard_pay_trial_label : undefined}
                payOnSiteHint={isTrialFlow ? t.wizard_pay_trial_hint : undefined}
                isTrialLesson={isTrialFlow}
                onApproved={() => { setError(null) }}
                onPending={() => { setError(null) }}
                onFailure={(message) => { setError(message) }}
                onNavigationLockChange={setNavigationLocked}
              />
            </section>
          )}
        </main>
      </div>

      {showStickyFooter && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md gap-3 sm:max-w-2xl">
          {wizard.step > 1 && !navigationLocked && (
            <button
              type="button"
              onClick={() => goToStep(wizard.step - 1)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-[15px] font-medium text-slate-700"
            >
              {t.wizard_back}
            </button>
          )}
          {wizard.step < finalStep && <button type="button" disabled={!canAdvance()} onClick={() => goToStep(wizard.step + 1)} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-medium text-white disabled:opacity-40" style={{ background: primaryColor }}>{t.wizard_next}<ArrowRight size={15} /></button>}
        </div>
      </div>
      )}

      {previewImage && (
        <button
          type="button"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-[20px] bg-white">
            <img src={previewImage.src} alt={previewImage.alt} className="max-h-[90vh] w-full object-contain" />
          </div>
        </button>
      )}
    </div>
  )
}

function CalendarSelector({
  year,
  month,
  cells,
  onPrev,
  onNext,
  onSelect,
  ctaColor,
  months,
  weekdays,
}: {
  year: number
  month: number
  cells: Array<null | { day: number; date: Date; available: boolean; selected: boolean; past: boolean; inTrip?: boolean }>
  onPrev: () => void
  onNext: () => void
  onSelect: (date: Date) => void
  ctaColor: string
  months: readonly string[]
  weekdays: readonly string[]
}) {
  return (
    <div className="space-y-3 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50"><ChevronLeft size={16} /></button>
        <div className="text-[16px] font-semibold text-slate-900">{months[month]} {year}</div>
        <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">{weekdays.map((day) => <div key={day} className="py-1 text-center text-[10px] font-medium text-slate-400">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) =>
          cell ? (
            <button
              key={`${cell.day}-${index}`}
              type="button"
              disabled={!cell.available}
              onClick={() => onSelect(cell.date)}
              title={cell.inTrip ? '🏄 Trip' : undefined}
              className={`relative aspect-square rounded-[12px] text-[13px] ${cell.selected ? 'text-white' : cell.available ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'} ${!cell.selected && cell.inTrip && cell.available ? 'bg-amber-50' : !cell.selected ? 'bg-slate-50' : ''}`}
              style={cell.selected ? { background: ctaColor } : undefined}
            >
              {cell.day}
              {cell.inTrip && !cell.selected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
              )}
            </button>
          ) : (
            <div key={`empty-${index}`} />
          )
        )}
      </div>
      {cells.some((c) => c?.inTrip) && (
        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-600">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Dias em trip
        </div>
      )}
    </div>
  )
}

function SlotsGrid({
  slots,
  selectedSlots,
  onToggle,
  loading,
}: {
  slots: Array<{ time: string; taken: boolean }>
  selectedSlots: string[]
  onToggle: (time: string) => void
  loading: boolean
}) {
  const { t } = useLanguage()
  if (loading) {
    return <div className="rounded-[18px] border border-slate-200 bg-white p-6 text-center text-[14px] font-medium text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">{t.wizard_slots_loading}</div>
  }

  if (slots.length === 0) {
    return <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-center text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">{t.wizard_slots_empty}</div>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map(({ time, taken }) => {
        const selected = selectedSlots.includes(time)
        return (
          <button key={time} type="button" disabled={taken} onClick={() => !taken && onToggle(time)} className={`rounded-[14px] border px-2 py-3 text-[14px] font-medium shadow-[0_4px_10px_rgba(15,23,42,0.03)] ${taken ? 'border-slate-200 bg-slate-50 text-slate-300' : selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {time}
          </button>
        )
      })}
    </div>
  )
}

function ConfirmationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}





