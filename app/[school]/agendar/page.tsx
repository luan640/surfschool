'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Clock, MapPin, Package, User, Waves } from 'lucide-react'
import { getStudentProfile, getTakenSlots } from '@/actions/bookings'
import { getPublicSchoolRulesBySlug } from '@/actions/dashboard'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { getPublicLessonPackagesBySchoolSlug } from '@/actions/packages'
import { MercadoPagoCheckoutBrick } from '@/components/checkout/MercadoPagoCheckoutBrick'
import { filterBookableSlots, getDateKeyFromDate, getDefaultBookingRules, getSchoolNowDateKey, isDateWithinBookingWindow } from '@/lib/booking-rules'
import { createClient } from '@/lib/supabase/client'
import type { BookingWizardState, Instructor, LessonPackage, SchoolRules } from '@/lib/types'
import { formatDate, formatPrice, initials, MONTHS_PT, WEEKDAYS_PT } from '@/lib/utils'

const SINGLE_STEPS = ['Produto', 'Data', 'Instrutor', 'Horarios', 'Confirmar'] as const
const PACKAGE_STEPS = ['Produto', 'Instrutor', 'Aulas', 'Confirmar'] as const

interface Props {
  params: Promise<{ school: string }>
}

export default function BookingWizardPage({ params: paramsPromise }: Props) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [school, setSchool] = useState<{ id: string; name: string; address: string | null; primary_color: string; cta_color: string } | null>(null)
  const [schoolRules, setSchoolRules] = useState<SchoolRules | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [packages, setPackages] = useState<LessonPackage[]>([])
  const [student, setStudent] = useState<{ id: string; full_name: string } | null>(null)
  const [studentEmail, setStudentEmail] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [packageStepMessage, setPackageStepMessage] = useState<string | null>(null)
  const [paymentState, setPaymentState] = useState<'approved' | 'pending' | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [productTab, setProductTab] = useState<'single' | 'package'>('single')
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
    if (!school) return
    getStudentProfile(school.id).then((profile) => {
      if (profile) setStudent({ id: profile.id, full_name: profile.full_name })
    })
  }, [school])

  const isPackageFlow = wizard.selectionType === 'package' && !!wizard.selectedPackage
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
  const totalAmount = isPackageFlow && wizard.selectedPackage
    ? Number(wizard.selectedPackage.price)
    : wizard.selectedInstructor && wizard.selectedSlots.length > 0
      ? wizard.selectedInstructor.hourly_price * wizard.selectedSlots.length
      : 0

  function resetForProduct() {
    setError(null)
    setSuccessMessage(null)
    setPackageStepMessage(null)
    setPaymentState(null)
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
    setWizard((current) => ({ ...current, selectedDate: date, selectedInstructor: null, selectedSlots: [] }))
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
    setPackageStepMessage(isPackageFlow ? 'Agora escolha a data da aula 1.' : null)
    setWizard((current) => ({
      ...current,
      selectedInstructor: instructor,
      packageLessons: isPackageFlow
        ? current.packageLessons.map((lesson) => ({ ...lesson, date: null, slots: [] }))
        : current.packageLessons,
      activePackageLessonIndex: 0,
      selectedSlots: [],
      step: isPackageFlow ? 3 : 4,
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
          setPackageStepMessage(`Sucesso! Agora escolha a data da aula ${nextLessons[nextIncompleteIndex].sequence}.`)
        } else {
          setPackageStepMessage('Sucesso! Todas as aulas do pacote foram preenchidas.')
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

    const cells: Array<null | { day: number; date: Date; available: boolean; selected: boolean; past: boolean }> = []
    for (let index = 0; index < firstDay; index += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)
      const dateKey = getDateKeyFromDate(date)
      const past = dateKey < todayKey
      cells.push({
        day,
        date,
        available: allowedWeekdays.has(date.getDay()) && !past && isDateWithinBookingWindow(date, bookingRules.bookingWindowDays),
        selected: currentDate?.getTime() === date.getTime(),
        past,
      })
    }

    return { year, month, cells }
  }

  const { year, month, cells } = buildCalendar()

  function canAdvance() {
    if (wizard.step === 1) return !!wizard.selectionType
    if (!isPackageFlow && wizard.step === 2) return !!wizard.selectedDate
    if (isPackageFlow && wizard.step === 2) return !!wizard.selectedInstructor
    if (!isPackageFlow && wizard.step === 3) return !!wizard.selectedInstructor
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
        title: `Aula na ${school.name}`,
        description: `Instrutor: ${wizard.selectedInstructor.full_name}\nHorarios: ${wizard.selectedSlots.join(', ')}`,
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
          label: `Aula ${lesson.sequence}`,
          url: buildGoogleCalendarUrl({
            title: `${wizard.selectedPackage?.name ?? 'Pacote de aulas'} - ${school.name}`,
            description: `Instrutor: ${selectedInstructorName}\nHorarios: ${lesson.slots.join(', ')}`,
            date: lesson.date!,
            slots: lesson.slots,
          }),
        }))
        .filter((lesson): lesson is { sequence: number; label: string; url: string } => Boolean(lesson.url))
    : []

  if (!authReady || !school) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-950 px-4 text-white">
          <button type="button" onClick={() => router.push(`/${slug || ''}`)} className="font-condensed text-lg font-bold uppercase">
            {school?.name ?? 'vamosurfar'}
          </button>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            Carregando sua area de agendamento...
          </div>
        </div>
      </div>
    )
  }

  if (paymentState === 'approved') {
    return (
      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-950 px-4 text-white">
          <button type="button" onClick={() => router.push(`/${slug}`)} className="font-condensed text-lg font-bold uppercase">{school?.name ?? 'vamosurfar'}</button>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8">
          <section className="overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(145deg,#e0f2fe_0%,#dbeafe_38%,#f0fdf4_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="relative px-6 py-8 sm:px-10 sm:py-10">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-300/35 blur-3xl" />
              <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-emerald-300/30 blur-3xl" />

              <div className="relative">
                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="relative mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0284c7,#0f172a)] text-white shadow-[0_18px_45px_rgba(2,132,199,0.35)]">
                    <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white/70">
                      <Check size={18} />
                    </div>
                    <div className="flex flex-col items-center">
                      <Waves size={28} />
                      <span className="mt-1 font-condensed text-xl font-bold uppercase">{student ? initials(student.full_name) : 'SB'}</span>
                    </div>
                  </div>
                  <div className="mb-2 inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    Pagamento aprovado
                  </div>
                  <h1 className="font-condensed text-4xl font-bold uppercase tracking-wide text-slate-900 sm:text-5xl">
                    Aula confirmada
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    {successMessage ?? 'Seu agendamento foi confirmado com sucesso.'} Agora ficou facil acompanhar suas aulas e nao esquecer o horario.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/80 bg-white/75 p-5 backdrop-blur-sm">
                    <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Resumo do agendamento</div>
                    <div className="space-y-3">
                      <ConfirmationRow label="Produto" value={isPackageFlow ? wizard.selectedPackage?.name ?? 'Pacote' : 'Aula avulsa'} />
                      <ConfirmationRow label="Instrutor" value={wizard.selectedInstructor?.full_name ?? '--'} />
                      {!isPackageFlow && (
                        <>
                          <ConfirmationRow label="Data" value={wizard.selectedDate ? formatDate(wizard.selectedDate) : '--'} />
                          <ConfirmationRow label="Horario" value={wizard.selectedSlots[0] ?? '--'} />
                        </>
                      )}
                      {isPackageFlow && <ConfirmationRow label="Aulas" value={`${wizard.packageLessons.length} aulas planejadas`} />}
                      <ConfirmationRow label="Total pago" value={formatPrice(totalAmount)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/80 bg-white/75 p-5 backdrop-blur-sm">
                    <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Proximos passos</div>
                    <div className="space-y-3">
                      <Link
                        href={`/${slug}/minhas-aulas`}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold uppercase text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
                      >
                        Ir para minhas aulas
                      </Link>
                      {!isPackageFlow && singleCalendarUrl && (
                        <a
                          href={singleCalendarUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold uppercase text-white"
                        >
                          Adicionar ao Google Calendar
                        </a>
                      )}
                      {isPackageFlow && packageCalendarLinks.length > 0 && (
                        <div className="space-y-2">
                          {packageCalendarLinks.map((lesson) => (
                            <a
                              key={lesson.sequence}
                              href={lesson.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold uppercase text-white"
                            >
                              {lesson.label} no Google Calendar
                            </a>
                          ))}
                        </div>
                      )}
                      <Link
                        href={`/${slug}`}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold uppercase text-slate-700"
                      >
                        Voltar para a escola
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-950 px-4 text-white">
        <button type="button" onClick={() => router.push(`/${slug}`)} className="font-condensed text-lg font-bold uppercase">{school?.name ?? 'vamosurfar'}</button>
        <div className="ml-auto flex items-center gap-2 text-xs uppercase text-white/60">
          {steps.map((label, index) => {
            const n = index + 1
            const active = wizard.step === n
            const done = wizard.step > n
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'text-white' : 'bg-white/10 text-white/40'}`} style={active ? { background: ctaColor } : undefined}>
                  {done ? <Check size={12} /> : n}
                </div>
                <span className={active ? 'text-white' : 'hidden md:block'}>{label}</span>
              </div>
            )
          })}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <main className="space-y-6">
          {successMessage && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}
          {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {school.address && (
            <div className="flex items-start gap-3 rounded border border-sky-200 bg-sky-50 px-4 py-4 text-sky-900">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <MapPin size={16} />
              </span>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Localizacao da escola</div>
                <div className="mt-1 text-sm font-medium">{school.address}</div>
              </div>
            </div>
          )}

          {wizard.step === 1 && (
            <section className="space-y-4">
              <div>
                <h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Escolha o produto</h1>
                <p className="text-sm text-slate-500">A aula avulsa segue o fluxo simples. O pacote exige a montagem de todas as aulas antes do pagamento.</p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setProductTab('single')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold uppercase transition-colors ${productTab === 'single' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'single' ? { background: primaryColor } : undefined}
                >
                  Aulas
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab('package')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold uppercase transition-colors ${productTab === 'package' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'package' ? { background: ctaColor } : undefined}
                >
                  Pacotes
                </button>
              </div>

              {productTab === 'single' ? (
                <button type="button" onClick={chooseSingle} className="w-full rounded border-2 bg-white p-5 text-left" style={wizard.selectionType === 'single' ? { borderColor: ctaColor } : undefined}>
                  <div className="flex items-start gap-4"><div className="rounded-xl p-3 text-white" style={{ background: primaryColor }}><Clock size={22} /></div><div><div className="font-condensed text-xl font-bold uppercase text-slate-900">Aula avulsa</div><p className="text-sm text-slate-500">Escolha dia, instrutor e horarios para uma unica aula.</p></div></div>
                </button>
              ) : packages.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Nenhum pacote disponivel no momento.
                </div>
              ) : (
                packages.map((pkg) => (
                  <button key={pkg.id} type="button" onClick={() => choosePackage(pkg)} className="w-full rounded border-2 bg-white p-5 text-left" style={wizard.selectedPackage?.id === pkg.id ? { borderColor: ctaColor } : undefined}>
                    <div className="flex items-start gap-4"><div className="rounded-xl p-3 text-white" style={{ background: ctaColor }}><Package size={22} /></div><div className="flex-1"><div className="flex items-center justify-between gap-4"><div className="font-condensed text-xl font-bold uppercase text-slate-900">{pkg.name}</div><div className="font-condensed text-2xl font-bold" style={{ color: primaryColor }}>{formatPrice(Number(pkg.price))}</div></div><p className="text-sm text-slate-500">{pkg.lesson_count} aulas planejadas agora.</p>{pkg.description && <p className="mt-2 text-sm text-slate-500">{pkg.description}</p>}</div></div>
                  </button>
                ))
              )}
            </section>
          )}

          {!isPackageFlow && wizard.step === 2 && (
            <section className="space-y-4">
              <div><h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Escolha o dia</h1><p className="text-sm text-slate-500">Selecione uma data com disponibilidade.</p></div>
              <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={setSingleDate} ctaColor={ctaColor} />
            </section>
          )}

          {((!isPackageFlow && wizard.step === 3) || (isPackageFlow && wizard.step === 2)) && (
            <section className="space-y-4">
              <div><h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Escolha o instrutor</h1><p className="text-sm text-slate-500">{isPackageFlow ? 'O instrutor sera o mesmo em todas as aulas do pacote.' : 'A disponibilidade considera o dia escolhido.'}</p></div>
              {(isPackageFlow ? eligibleInstructors : singleAvailableInstructors).map((instructor) => (
                <button key={instructor.id} type="button" onClick={() => selectInstructor(instructor)} className="w-full rounded border-2 bg-white p-5 text-left" style={wizard.selectedInstructor?.id === instructor.id ? { borderColor: ctaColor } : undefined}>
                  <div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white" style={{ background: instructor.color }}>{instructor.photo_url ? <img src={instructor.photo_url} alt={instructor.full_name} className="h-full w-full object-cover" /> : initials(instructor.full_name)}</div><div className="flex-1"><div className="flex items-center justify-between gap-4"><div className="font-condensed text-xl font-bold uppercase text-slate-900">{instructor.full_name}</div><div className="font-condensed text-2xl font-bold" style={{ color: primaryColor }}>{isPackageFlow && wizard.selectedPackage ? formatPrice(Number(wizard.selectedPackage.price)) : formatPrice(instructor.hourly_price)}</div></div>{instructor.specialty && <p className="text-xs font-bold uppercase" style={{ color: primaryColor }}>{instructor.specialty}</p>}{instructor.bio && <p className="mt-2 text-sm text-slate-500">{instructor.bio}</p>}
                    {!isPackageFlow && wizard.selectedDate && (
                      <div className="mt-3">
                        <div className="text-[11px] font-bold uppercase text-slate-400">Horarios em {formatDate(wizard.selectedDate)}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {filterBookableSlots(wizard.selectedDate, getAvailabilityForDate(instructor, wizard.selectedDate), bookingRules).length > 0 ? (
                            filterBookableSlots(wizard.selectedDate, getAvailabilityForDate(instructor, wizard.selectedDate), bookingRules).map((slot) => (
                              <span key={slot} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {slot}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">Sem horarios disponiveis nesse dia.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div></div>
                </button>
              ))}
            </section>
          )}

          {isPackageFlow && wizard.step === 3 && wizard.selectedInstructor && activePackageLesson && (
            <section className="space-y-5">
              <div><h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Monte as aulas do pacote</h1><p className="text-sm text-slate-500">Preencha todas as {wizard.packageLessons.length} aulas. Voce pode editar qualquer uma antes de confirmar.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                {wizard.packageLessons.map((lesson, index) => {
                  const complete = !!lesson.date && lesson.slots.length > 0
                  return (
                    <button
                      key={lesson.sequence}
                      type="button"
                      onClick={() => {
                        setPackageStepMessage(`Agora escolha a data da aula ${lesson.sequence}.`)
                        setWizard((current) => ({ ...current, activePackageLessonIndex: index }))
                        setCalendarMonth(lesson.date ?? new Date())
                      }}
                      className="rounded border-2 bg-white p-4 text-left"
                      style={wizard.activePackageLessonIndex === index ? { borderColor: ctaColor } : undefined}
                    >
                      <div className="flex items-center justify-between gap-3"><div className="font-condensed text-lg font-bold uppercase text-slate-900">Aula {lesson.sequence}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{complete ? 'Concluida' : 'Pendente'}</span></div>
                      <div className="mt-3 text-sm text-slate-500">{lesson.date ? formatDate(lesson.date) : 'Data nao escolhida'}</div>
                      <div className="mt-1 text-sm text-slate-500">{lesson.slots.length > 0 ? lesson.slots.join(', ') : 'Horarios nao escolhidos'}</div>
                    </button>
                  )
                })}
              </div>
              <div ref={packagePlannerRef} className="rounded border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-3"><div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">Aula {activePackageLesson.sequence} de {wizard.packageLessons.length}</div><div className="text-sm text-slate-500">{completedPackageLessons}/{wizard.packageLessons.length} preenchidas</div></div>
                {packageStepMessage && (
                  <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {packageStepMessage}
                  </div>
                )}
                <div className="space-y-4">
                  <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={(date) => setPackageLessonDate(wizard.activePackageLessonIndex, date)} ctaColor={ctaColor} />
                  <div className="text-sm text-slate-500">Escolha apenas 1 horario para cada aula. Ao selecionar, o sistema avanca para a proxima aula.</div>
                  <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
                </div>
              </div>
            </section>
          )}

          {!isPackageFlow && wizard.step === 4 && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Escolha os horarios</h1><p className="text-sm text-slate-500">Selecione um ou mais slots para a aula.</p></div>
              <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">{wizard.selectedInstructor.full_name} • {wizard.selectedDate ? formatDate(wizard.selectedDate) : ''}</div>
              <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
            </section>
          )}

          {wizard.step === finalStep && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Confirmar e pagar</h1><p className="text-sm text-slate-500">Revise o agendamento antes de concluir.</p></div>
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Produto</div><div className="font-semibold text-slate-900">{isPackageFlow ? wizard.selectedPackage?.name : 'Aula avulsa'}</div></div>
                <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Instrutor</div><div className="font-semibold text-slate-900">{wizard.selectedInstructor.full_name}</div></div>
                {isPackageFlow ? (
                  <div className="px-4 py-3">
                    <div className="mb-3 text-[11px] font-bold uppercase text-slate-400">Aulas planejadas</div>
                    <div className="space-y-2">
                      {wizard.packageLessons.map((lesson) => (
                        <div key={lesson.sequence} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          Aula {lesson.sequence}: {lesson.date ? formatDate(lesson.date) : 'Sem data'} • {lesson.slots.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Data</div><div className="font-semibold text-slate-900">{wizard.selectedDate ? formatDate(wizard.selectedDate) : ''}</div></div>
                    <div className="px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Horarios</div><div className="font-semibold text-slate-900">{wizard.selectedSlots.join(', ')}</div></div>
                  </>
                )}
                <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><span className="font-condensed text-lg font-bold uppercase">Total</span><span className="font-condensed text-3xl font-bold">{formatPrice(totalAmount)}</span></div>
              </div>
              <MercadoPagoCheckoutBrick
                schoolId={school!.id}
                selectionType={isPackageFlow ? 'package' : 'single'}
                amount={totalAmount}
                title={isPackageFlow ? wizard.selectedPackage?.name ?? 'Pacote de aulas' : 'Aula avulsa'}
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
                onApproved={(message) => { setError(null); setPaymentState('approved'); setSuccessMessage(message) }}
                onPending={(message) => { setError(null); setPaymentState('pending'); setSuccessMessage(message) }}
                onFailure={(message) => { setPaymentState(null); setSuccessMessage(null); setError(message) }}
              />
            </section>
          )}
        </main>
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl gap-3">
          <button type="button" onClick={() => { if (wizard.step === 1) router.push(`/${slug}`); else goToStep(wizard.step - 1) }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded border border-slate-200 font-bold uppercase text-slate-600"><ArrowLeft size={15} />Voltar</button>
          {wizard.step < finalStep && <button type="button" disabled={!canAdvance()} onClick={() => goToStep(wizard.step + 1)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded font-bold uppercase text-white disabled:opacity-40" style={{ background: primaryColor }}>Proximo<ArrowRight size={15} /></button>}
        </div>
      </div>
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
}: {
  year: number
  month: number
  cells: Array<null | { day: number; date: Date; available: boolean; selected: boolean; past: boolean }>
  onPrev: () => void
  onNext: () => void
  onSelect: (date: Date) => void
  ctaColor: string
}) {
  return (
    <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} className="flex h-9 w-9 items-center justify-center rounded border border-slate-200"><ChevronLeft size={16} /></button>
        <div className="font-condensed text-xl font-bold uppercase text-slate-900">{MONTHS_PT[month]} {year}</div>
        <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded border border-slate-200"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">{WEEKDAYS_PT.map((day) => <div key={day} className="py-1 text-center text-[10px] font-bold uppercase text-slate-400">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) =>
          cell ? (
            <button key={`${cell.day}-${index}`} type="button" disabled={!cell.available} onClick={() => onSelect(cell.date)} className={`aspect-square rounded text-sm ${cell.selected ? 'text-white' : cell.available ? 'bg-slate-50 text-slate-700 hover:bg-slate-100' : 'bg-slate-50 text-slate-300'}`} style={cell.selected ? { background: ctaColor } : undefined}>
              {cell.day}
            </button>
          ) : (
            <div key={`empty-${index}`} />
          )
        )}
      </div>
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
  if (loading) {
    return <div className="rounded border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">Carregando horarios disponiveis...</div>
  }

  if (slots.length === 0) {
    return <div className="rounded border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Sem horarios disponiveis.</div>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map(({ time, taken }) => {
        const selected = selectedSlots.includes(time)
        return (
          <button key={time} type="button" disabled={taken} onClick={() => !taken && onToggle(time)} className={`rounded border-2 px-2 py-3 text-sm font-bold ${taken ? 'border-slate-200 bg-slate-50 text-slate-300' : selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
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
