'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Clock3, User2 } from 'lucide-react'
import type { DashboardCalendarBooking, Instructor } from '@/lib/types'
import { formatPrice, MONTHS_PT, WEEKDAYS_PT } from '@/lib/utils'

interface Props {
  bookings: DashboardCalendarBooking[]
  instructors: Pick<Instructor, 'id' | 'full_name' | 'color'>[]
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  confirmed: 'border-sky-200 bg-sky-50 text-sky-900',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Finalizada',
}

export function BookingsCalendar({ bookings, instructors }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedInstructorId, setSelectedInstructorId] = useState('all')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => selectedInstructorId === 'all' || booking.instructor?.id === selectedInstructorId),
    [bookings, selectedInstructorId]
  )

  const bookingsByDate = useMemo(() => {
    return filteredBookings.reduce<Record<string, DashboardCalendarBooking[]>>((acc, booking) => {
      const key = booking.lesson_date
      acc[key] = [...(acc[key] ?? []), booking].sort((a, b) => a.time_slots[0].localeCompare(b.time_slots[0]))
      return acc
    }, {})
  }, [filteredBookings])

  const monthCells = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<Date | null> = []

    for (let index = 0; index < firstDay; index += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day))

    return cells
  }, [currentMonth])

  const selectedDateKey = toDateKey(selectedDate)
  const selectedDayBookings = bookingsByDate[selectedDateKey] ?? []

  function moveMonth(offset: number) {
    setCurrentMonth((value) => {
      const next = new Date(value.getFullYear(), value.getMonth() + offset, 1)
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1))
      return next
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* Calendar column */}
      <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white">
        <div className="shrink-0 flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => moveMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 text-slate-600">
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="font-condensed text-2xl font-bold uppercase text-slate-900">{MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
              <div className="text-sm text-slate-500">Calendário de aulas agendadas e finalizadas.</div>
            </div>
            <button type="button" onClick={() => moveMonth(1)} className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 text-slate-600">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="instructor-filter" className="text-xs font-bold uppercase tracking-wide text-slate-400">Instrutor</label>
            <select
              id="instructor-filter"
              value={selectedInstructorId}
              onChange={(event) => setSelectedInstructorId(event.target.value)}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
            >
              <option value="all">Todos</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS_PT.map((day) => (
            <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{day}</div>
          ))}
        </div>

        {/* Calendar grid — fixed height, scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
          <div className="grid grid-cols-7">
            {monthCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-16 border-b border-r border-slate-100 bg-slate-50/60" />
              }

              const dateKey = toDateKey(date)
              const items = bookingsByDate[dateKey] ?? []
              const isSelected = dateKey === selectedDateKey
              const isToday = dateKey === toDateKey(new Date())

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`h-16 border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors ${isSelected ? 'bg-slate-950/5' : 'bg-white hover:bg-slate-50'}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${isToday ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </span>
                  {items.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 1).map((booking) => (
                        <div key={booking.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${STATUS_STYLES[booking.status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          {booking.time_slots[0]}
                        </div>
                      ))}
                      {items.length > 1 && (
                        <div className="text-[10px] font-semibold text-slate-400">+{items.length - 1}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Day detail column */}
      <aside className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white" style={{ maxHeight: 520 }}>
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="font-condensed text-2xl font-bold uppercase text-slate-900">
            {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
          </div>
          <div className="text-sm text-slate-500">
            {selectedDayBookings.length} aula{selectedDayBookings.length !== 1 ? 's' : ''} neste dia
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedDayBookings.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">Nenhuma aula agendada para o filtro atual.</div>
          ) : (
            <div className="space-y-3 px-5 py-4">
              {selectedDayBookings.map((booking) => (
                <div key={booking.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-condensed text-lg font-bold uppercase text-slate-900">{booking.time_slots.join(', ')}</div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${STATUS_STYLES[booking.status] ?? 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABEL[booking.status] ?? booking.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <User2 size={14} />
                      <span>{booking.student?.full_name ?? 'Aluno'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} />
                      <span>{booking.instructor?.full_name ?? 'Instrutor'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={14} />
                      <span>{booking.instructor?.specialty ?? 'Aula de surf'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-right font-condensed text-2xl font-bold text-slate-900">{formatPrice(booking.total_amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
