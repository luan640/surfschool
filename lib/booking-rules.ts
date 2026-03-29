const SCHOOL_TIME_ZONE = 'America/Sao_Paulo'

interface BookingRulesInput {
  minimumBookingNoticeHours: number
  bookingWindowDays: number
}

interface SchoolNowParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getSchoolNowParts(now = new Date()): SchoolNowParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

function buildDateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function parseLessonDate(input: string | Date) {
  if (typeof input === 'string') {
    const [year, month, day] = input.split('-').map(Number)
    return { year, month, day }
  }

  return {
    year: input.getFullYear(),
    month: input.getMonth() + 1,
    day: input.getDate(),
  }
}

function parseSlotMinutes(slot: string) {
  const [hour, minute] = slot.split(':').map(Number)
  return { hour, minute, totalMinutes: hour * 60 + minute }
}

function toComparableMinutes(input: { year: number; month: number; day: number; hour: number; minute: number }) {
  return Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) / 60000
}

export function getDefaultBookingRules(): BookingRulesInput {
  return {
    minimumBookingNoticeHours: 2,
    bookingWindowDays: 90,
  }
}

export function isDateWithinBookingWindow(
  lessonDate: string | Date,
  bookingWindowDays: number,
  now = new Date(),
) {
  const lesson = parseLessonDate(lessonDate)
  const current = getSchoolNowParts(now)
  const lessonComparable = Date.UTC(lesson.year, lesson.month - 1, lesson.day)
  const currentComparable = Date.UTC(current.year, current.month - 1, current.day)
  const diffDays = Math.floor((lessonComparable - currentComparable) / 86400000)

  return diffDays >= 0 && diffDays <= bookingWindowDays
}

export function isSlotBookable(
  lessonDate: string | Date,
  slot: string,
  rules: BookingRulesInput,
  now = new Date(),
) {
  if (!isDateWithinBookingWindow(lessonDate, rules.bookingWindowDays, now)) {
    return false
  }

  const lesson = parseLessonDate(lessonDate)
  const slotParts = parseSlotMinutes(slot)
  const current = getSchoolNowParts(now)

  const slotComparable = toComparableMinutes({
    year: lesson.year,
    month: lesson.month,
    day: lesson.day,
    hour: slotParts.hour,
    minute: slotParts.minute,
  })

  const nowComparable = toComparableMinutes(current)
  const minimumLeadMinutes = Math.max(0, rules.minimumBookingNoticeHours) * 60

  return slotComparable - nowComparable >= minimumLeadMinutes
}

export function filterBookableSlots(
  lessonDate: string | Date,
  slots: string[],
  rules: BookingRulesInput,
  now = new Date(),
) {
  return slots.filter((slot) => isSlotBookable(lessonDate, slot, rules, now))
}

export function getSchoolNowDateKey(now = new Date()) {
  return buildDateKey(getSchoolNowParts(now))
}

export function getDateKeyFromDate(date: Date) {
  return buildDateKey({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  })
}
