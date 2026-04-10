'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BookingStatusActions } from '@/components/dashboard/BookingStatusActions'
import type { Booking, BookingStatus, Instructor } from '@/lib/types'

const HOUR_START = 5
const HOUR_END = 22
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const CELL_H = 64 // px per hour

const STATUS_CHIP: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending:   { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'Pendente' },
  confirmed: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a', label: 'Confirmada' },
  completed: { bg: '#d1fae5', border: '#10b981', text: '#064e3b', label: 'Concluída' },
  cancelled: { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8', label: 'Cancelada' },
}

const QUICK_FILTERS: { label: string; value: BookingStatus | 'pending_payment' | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Ag. pagamento', value: 'pending_payment' },
]

interface Props {
  bookings: Booking[]
  instructors: Instructor[]
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function slotToHour(slot: string): number {
  return parseInt(slot.split(':')[0], 10)
}

function slotEnd(slots: string[]): string {
  return `${String(slotToHour(slots[slots.length - 1]) + 1).padStart(2, '0')}:00`
}

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function BookingsDayInstructorCalendar({ bookings, instructors }: Props) {
  const [day, setDay] = useState(todayMidnight)
  const [quickFilter, setQuickFilter] = useState<BookingStatus | 'pending_payment' | ''>('')
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const dayKey    = toDateKey(day)
  const todayKey  = toDateKey(new Date())
  const isToday   = dayKey === todayKey

  const nowTopPx      = ((nowMinutes / 60 - HOUR_START) * CELL_H)
  const showNowLine   = isToday && nowMinutes / 60 >= HOUR_START && nowMinutes / 60 <= HOUR_END

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (b.lesson_date !== dayKey) return false
      if (quickFilter === 'pending_payment') {
        return b.status !== 'cancelled' && b.status !== 'completed' &&
          (b.payment_status === 'pending' || b.status === 'pending')
      }
      if (quickFilter && b.status !== quickFilter) return false
      return true
    })
  }, [bookings, dayKey, quickFilter])

  const byInstructor = useMemo(() => {
    return filtered.reduce<Record<string, Booking[]>>((acc, b) => {
      acc[b.instructor_id] ??= []
      acc[b.instructor_id].push(b)
      return acc
    }, {})
  }, [filtered])

  const dateLabel = day.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const colCount = instructors.length || 1
  const gridCols = `48px repeat(${colCount}, minmax(140px, 1fr))`

  return (
    <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, -1))}
            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="font-condensed text-base font-bold uppercase tracking-wide text-slate-800 capitalize sm:text-lg">
            {dateLabel}
          </span>
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, 1))}
            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={15} />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDay(todayMidnight())}
              className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Quick filters + legend */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtro:</span>
        {QUICK_FILTERS.map((f) => {
          const active = quickFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setQuickFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          )
        })}
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          {Object.entries(STATUS_CHIP)
            .filter(([k]) => k !== 'cancelled')
            .map(([, s]) => (
              <span key={s.label} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ backgroundColor: s.bg, borderColor: s.border }} />
                {s.label}
              </span>
            ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: colCount * 140 + 48 }}>
          {/* Instructor headers — sticky */}
          <div
            className="sticky top-0 z-10 grid border-b border-slate-200 bg-white shadow-sm"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="border-r border-slate-100" />
            {instructors.map((ins) => {
              const dayCount = (byInstructor[ins.id] ?? []).length
              return (
                <div
                  key={ins.id}
                  className="flex flex-col items-center gap-1.5 border-r border-slate-100 px-2 py-3 last:border-r-0"
                >
                  {ins.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ins.photo_url}
                      alt={ins.full_name}
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white"
                      style={{ backgroundColor: ins.color }}
                    >
                      {ins.full_name[0]}
                    </div>
                  )}
                  <span className="max-w-full truncate text-center text-[11px] font-semibold leading-tight text-slate-700">
                    {ins.full_name}
                  </span>
                  {dayCount > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: ins.color }}>
                      {dayCount}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scrollable hour rows */}
          <div className="relative" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {/* Current time indicator */}
            {showNowLine && (
              <div
                className="pointer-events-none absolute z-[5] flex items-center"
                style={{ top: nowTopPx, left: 48, right: 0 }}
              >
                <div className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-rose-500" />
                <div className="flex-1 border-t-2 border-rose-400" />
              </div>
            )}

            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid border-b border-slate-100 last:border-b-0"
                style={{ gridTemplateColumns: gridCols, minHeight: CELL_H }}
              >
                {/* Time label */}
                <div className="border-r border-slate-100 pr-2 pt-1 text-right text-[10px] font-semibold text-slate-300 select-none">
                  {String(hour).padStart(2, '0')}:00
                </div>

                {instructors.map((ins) => {
                  const insBookings = byInstructor[ins.id] ?? []
                  const chips = insBookings.filter(
                    (b) => b.time_slots.length > 0 && slotToHour(b.time_slots[0]) === hour,
                  )

                  return (
                    <div
                      key={ins.id}
                      className="relative border-r border-slate-100 last:border-r-0"
                      style={{ minHeight: CELL_H }}
                    >
                      {/* Half-hour dashed line */}
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100" />

                      {chips.map((booking, idx) => {
                        const spanHours = booking.time_slots.length
                        const chipH    = spanHours * CELL_H - 4
                        const chipStyle = STATUS_CHIP[booking.status] ?? STATUS_CHIP.pending
                        const total    = chips.length
                        const w        = 100 / total
                        const l        = idx * w

                        return (
                          <div
                            key={booking.id}
                            className="group absolute top-0.5 overflow-hidden rounded border text-left"
                            style={{
                              height: chipH,
                              left: `${l + 1}%`,
                              width: `${w - 2}%`,
                              backgroundColor: chipStyle.bg,
                              borderColor: chipStyle.border,
                              zIndex: 1,
                            }}
                          >
                            {/* Info */}
                            <div className="flex h-full flex-col px-1.5 py-1">
                              <span
                                className="block truncate text-[10px] font-bold leading-tight"
                                style={{ color: chipStyle.text }}
                              >
                                {booking.time_slots[0]}–{slotEnd(booking.time_slots)}
                              </span>
                              <span
                                className="mt-0.5 block truncate text-[10px] font-semibold leading-tight"
                                style={{ color: chipStyle.text }}
                              >
                                {booking.student?.full_name ?? '—'}
                              </span>
                            </div>
                            {/* Menu button — absolute, appears on hover */}
                            <div className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <BookingStatusActions
                                bookingId={booking.id}
                                status={booking.status}
                                booking={booking}
                                instructors={instructors}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
