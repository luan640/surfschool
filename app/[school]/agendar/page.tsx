'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Clock, MapPin, Package, User } from 'lucide-react'
import { getTakenSlots } from '@/actions/bookings'
import { getPublicMercadoPagoConnectionBySlug, getPublicSchoolRulesBySlug } from '@/actions/dashboard'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { getPublicLessonPackagesBySchoolSlug } from '@/actions/packages'
import { MercadoPagoCheckoutBrick } from '@/components/checkout/MercadoPagoCheckoutBrick'
import { filterBookableSlots, getDateKeyFromDate, getDefaultBookingRules, getSchoolNowDateKey, isDateWithinBookingWindow } from '@/lib/booking-rules'
import { createClient } from '@/lib/supabase/client'
import type { BookingWizardState, Instructor, LessonPackage, SchoolRules } from '@/lib/types'
import { formatDate, formatPrice, initials, MONTHS_PT, WEEKDAYS_PT } from '@/lib/utils'

const SINGLE_STEPS = ['Produto', 'Instrutor', 'Data', 'Horarios', 'Confirmar'] as const
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
  const [studentEmail, setStudentEmail] = useState<string | null>(null)
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
    setPackageStepMessage(isPackageFlow ? 'Agora escolha a data da aula 1.' : null)
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
      <div className="min-h-dvh bg-[#f4f5f7] pb-24">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/96 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => router.push(`/${slug || ''}`)} className="text-[16px] font-semibold text-slate-900">
            {school?.name ?? 'vamosurfar'}
          </button>
        </header>
        <div className="mx-auto w-full max-w-md px-3 py-6 sm:max-w-2xl sm:px-5">
          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-6 text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            Carregando sua area de agendamento...
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

      <div className="mx-auto w-full max-w-md px-3 py-4 pb-28 sm:max-w-2xl sm:px-5 sm:pb-32">
        <main className="space-y-6">
          {error && <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{error}</div>}

          {school.address && (
            <div className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <MapPin size={15} />
              </span>
              <div>
                <div className="text-[12px] font-medium text-slate-500">Localizacao</div>
                <div className="mt-1 text-[14px] font-medium">{school.address}</div>
              </div>
            </div>
          )}

          {wizard.step === 1 && (
            <section className="space-y-4">
              <div>
                <h1 className="text-[24px] font-semibold text-slate-900">Escolha o serviço</h1>
                <p className="mt-1 text-[14px] text-slate-500">Selecione o formato de reserva para continuar.</p>
              </div>

              <div className="inline-flex rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setProductTab('single')}
                  className={`rounded-[10px] px-4 py-2 text-[14px] font-medium transition-colors ${productTab === 'single' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'single' ? { background: primaryColor } : undefined}
                >
                  Aulas
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab('package')}
                  className={`rounded-[10px] px-4 py-2 text-[14px] font-medium transition-colors ${productTab === 'package' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={productTab === 'package' ? { background: ctaColor } : undefined}
                >
                  Pacotes
                </button>
              </div>

              {productTab === 'single' ? (
                <button type="button" onClick={chooseSingle} className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={wizard.selectionType === 'single' ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}>
                  <div className="flex items-start gap-3"><div className="rounded-[14px] p-3 text-white" style={{ background: primaryColor }}><Clock size={18} /></div><div><div className="text-[16px] font-semibold text-slate-900">Aula avulsa</div><p className="mt-1 text-[13px] text-slate-500">Escolha dia, instrutor e horário para uma única aula.</p></div></div>
                </button>
              ) : packages.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-[14px] text-slate-500">
                  Nenhum pacote disponivel no momento.
                </div>
              ) : (
                packages.map((pkg) => (
                  <button key={pkg.id} type="button" onClick={() => choosePackage(pkg)} className="w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={wizard.selectedPackage?.id === pkg.id ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}>
                    <div className="flex items-start gap-3"><div className="rounded-[14px] p-3 text-white" style={{ background: ctaColor }}><Package size={18} /></div><div className="flex-1"><div className="flex items-start justify-between gap-3"><div className="text-[16px] font-semibold text-slate-900">{pkg.name}</div><div className="text-[16px] font-semibold" style={{ color: primaryColor }}>{formatPrice(Number(pkg.price))}</div></div><p className="mt-1 text-[13px] text-slate-500">{pkg.lesson_count} aulas planejadas agora.</p>{pkg.description && <p className="mt-2 text-[13px] text-slate-500">{pkg.description}</p>}</div></div>
                  </button>
                ))
              )}
            </section>
          )}

          {((!isPackageFlow && wizard.step === 2) || (isPackageFlow && wizard.step === 2)) && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">Escolha o profissional</h1><p className="mt-1 text-[14px] text-slate-500">{isPackageFlow ? 'O instrutor sera o mesmo em todas as aulas do pacote.' : 'A disponibilidade considera o dia escolhido.'}</p></div>
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
              <div><h1 className="text-[24px] font-semibold text-slate-900">Escolha o dia</h1><p className="mt-1 text-[14px] text-slate-500">Selecione uma data com disponibilidade.</p></div>
              <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={setSingleDate} ctaColor={ctaColor} />
            </section>
          )}

          {isPackageFlow && wizard.step === 3 && wizard.selectedInstructor && activePackageLesson && (
            <section className="space-y-5">
              <div><h1 className="text-[24px] font-semibold text-slate-900">Monte as aulas do pacote</h1><p className="mt-1 text-[14px] text-slate-500">Preencha todas as {wizard.packageLessons.length} aulas. Voce pode editar qualquer uma antes de confirmar.</p></div>
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
                      className="rounded-[16px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                      style={wizard.activePackageLessonIndex === index ? { borderColor: ctaColor, boxShadow: `0 0 0 1px ${ctaColor} inset` } : undefined}
                    >
                      <div className="flex items-center justify-between gap-3"><div className="text-[16px] font-semibold text-slate-900">Aula {lesson.sequence}</div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{complete ? 'Concluida' : 'Pendente'}</span></div>
                      <div className="mt-3 text-[13px] text-slate-500">{lesson.date ? formatDate(lesson.date) : 'Data nao escolhida'}</div>
                      <div className="mt-1 text-[13px] text-slate-500">{lesson.slots.length > 0 ? lesson.slots.join(', ') : 'Horarios nao escolhidos'}</div>
                    </button>
                  )
                })}
              </div>
              <div ref={packagePlannerRef} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="mb-4 flex items-center gap-3"><div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">Aula {activePackageLesson.sequence} de {wizard.packageLessons.length}</div><div className="text-[13px] text-slate-500">{completedPackageLessons}/{wizard.packageLessons.length} preenchidas</div></div>
                {packageStepMessage && (
                  <div className="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                    {packageStepMessage}
                  </div>
                )}
                <div className="space-y-4">
                  <CalendarSelector year={year} month={month} cells={cells} onPrev={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} onNext={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} onSelect={(date) => setPackageLessonDate(wizard.activePackageLessonIndex, date)} ctaColor={ctaColor} />
                  <div className="text-[13px] text-slate-500">Escolha apenas 1 horario para cada aula. Ao selecionar, o sistema avanca para a proxima aula.</div>
                  <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
                </div>
              </div>
            </section>
          )}

          {!isPackageFlow && wizard.step === 4 && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">Escolha os horarios</h1><p className="mt-1 text-[14px] text-slate-500">Selecione um ou mais slots para a aula.</p></div>
              <div className="rounded-[16px] border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">{wizard.selectedInstructor.full_name} - {wizard.selectedDate ? formatDate(wizard.selectedDate) : ''}</div>
              <SlotsGrid slots={slotOptions} selectedSlots={currentSlots} onToggle={toggleCurrentSlot} loading={slotsLoading} />
            </section>
          )}

          {wizard.step === finalStep && wizard.selectedInstructor && (
            <section className="space-y-4">
              <div><h1 className="text-[24px] font-semibold text-slate-900">Confirmar agendamento</h1><p className="mt-1 text-[14px] text-slate-500">Revise o agendamento e escolha se prefere pagar agora ou pagar na hora.</p></div>
              {false && (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Produto</div><div className="font-semibold text-slate-900">{isPackageFlow ? wizard.selectedPackage?.name : 'Aula avulsa'}</div></div>
                <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Instrutor</div><div className="font-semibold text-slate-900">{wizard.selectedInstructor?.full_name ?? ''}</div></div>
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
                    <div className="border-b border-slate-100 px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Data</div><div className="font-semibold text-slate-900">{wizard.selectedDate ? formatDate(wizard.selectedDate ?? new Date()) : ''}</div></div>
                    <div className="px-4 py-3"><div className="text-[11px] font-bold uppercase text-slate-400">Horarios</div><div className="font-semibold text-slate-900">{wizard.selectedSlots.join(', ')}</div></div>
                  </>
                )}
                <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><span className="font-condensed text-lg font-bold uppercase">Total</span><span className="font-condensed text-3xl font-bold">{formatPrice(totalAmount)}</span></div>
                </div>
              )}
              <MercadoPagoCheckoutBrick
                schoolSlug={slug}
                schoolId={school!.id}
                selectionType={isPackageFlow ? 'package' : 'single'}
                amount={totalAmount}
                title={isPackageFlow ? wizard.selectedPackage?.name ?? 'Pacote de aulas' : 'Aula avulsa'}
                onlineEnabled={mercadoPagoReady}
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
                onApproved={() => { setError(null) }}
                onPending={() => { setError(null) }}
                onFailure={(message) => { setError(message) }}
                onNavigationLockChange={setNavigationLocked}
              />
            </section>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md gap-3 sm:max-w-2xl">
          {wizard.step > 1 && !navigationLocked && (
            <button
              type="button"
              onClick={() => goToStep(wizard.step - 1)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-[15px] font-medium text-slate-700"
            >
              Voltar
            </button>
          )}
          {wizard.step < finalStep && <button type="button" disabled={!canAdvance()} onClick={() => goToStep(wizard.step + 1)} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-medium text-white disabled:opacity-40" style={{ background: primaryColor }}>Proximo<ArrowRight size={15} /></button>}
        </div>
      </div>

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
    <div className="space-y-3 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50"><ChevronLeft size={16} /></button>
        <div className="text-[16px] font-semibold text-slate-900">{MONTHS_PT[month]} {year}</div>
        <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">{WEEKDAYS_PT.map((day) => <div key={day} className="py-1 text-center text-[10px] font-medium text-slate-400">{day.slice(0, 3)}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) =>
          cell ? (
            <button key={`${cell.day}-${index}`} type="button" disabled={!cell.available} onClick={() => onSelect(cell.date)} className={`aspect-square rounded-[12px] text-[13px] ${cell.selected ? 'text-white' : cell.available ? 'bg-slate-50 text-slate-700 hover:bg-slate-100' : 'bg-slate-50 text-slate-300'}`} style={cell.selected ? { background: ctaColor } : undefined}>
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
    return <div className="rounded-[18px] border border-slate-200 bg-white p-6 text-center text-[14px] font-medium text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">Carregando horarios disponiveis...</div>
  }

  if (slots.length === 0) {
    return <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-center text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">Sem horarios disponiveis.</div>
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
