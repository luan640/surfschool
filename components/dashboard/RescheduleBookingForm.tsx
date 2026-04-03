'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Calendar, Clock, User } from 'lucide-react'
import { getTakenSlotsForBooking, rescheduleBooking } from '@/actions/bookings'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import type { Booking, Instructor } from '@/lib/types'
import { WEEKDAYS_PT } from '@/lib/utils'

interface Props {
  booking: Booking
  instructors: Instructor[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function RescheduleBookingForm({ booking, instructors, onSuccess, onCancel }: Props) {
  const { success, error: showError } = useToast()
  const [instructorId, setInstructorId] = useState(booking.instructor_id)
  const [lessonDate, setLessonDate] = useState(booking.lesson_date)
  const [selectedSlots, setSelectedSlots] = useState<string[]>(booking.time_slots)
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedInstructor = useMemo(
    () => instructors.find((item) => item.id === instructorId) ?? null,
    [instructorId, instructors],
  )

  const availableSlots = useMemo(() => {
    if (!selectedInstructor || !lessonDate) return []
    const weekday = new Date(`${lessonDate}T00:00:00`).getDay()
    return selectedInstructor.availability?.find((item) => Number(item.weekday) === weekday)?.time_slots ?? []
  }, [lessonDate, selectedInstructor])

  useEffect(() => {
    if (!selectedInstructor || !lessonDate) {
      setTakenSlots([])
      setLoadingSlots(false)
      return
    }

    setLoadingSlots(true)
    getTakenSlotsForBooking(selectedInstructor.id, lessonDate, booking.id).then((slots) => {
      setTakenSlots(slots)
      setLoadingSlots(false)
    })
  }, [booking.id, lessonDate, selectedInstructor])

  useEffect(() => {
    setSelectedSlots((current) => current.filter((slot) => availableSlots.includes(slot)))
  }, [availableSlots])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('booking_id', booking.id)
    formData.set('instructor_id', instructorId)
    formData.set('lesson_date', lessonDate)
    selectedSlots.forEach((slot) => formData.append('time_slots', slot))

    const result = await rescheduleBooking(formData)

    if (!result.success) {
      setError(result.error)
      showError('Nao foi possivel reagendar a aula.', result.error)
      setLoading(false)
      return
    }

    success('Agendamento reagendado com sucesso.')
    setLoading(false)
    onSuccess?.()
  }

  function toggleSlot(slot: string) {
    setSelectedSlots((current) =>
      current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot].sort(),
    )
  }

  const weekdayLabel = lessonDate ? WEEKDAYS_PT[new Date(`${lessonDate}T00:00:00`).getDay()] : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Reagendar aula</h2>
          <p className="mt-1 text-sm text-slate-500">Troque instrutor, data e horarios mantendo o agendamento atual.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Aluno</div>
            <div className="mt-1 font-medium text-slate-800">{booking.student?.full_name ?? 'Aluno'}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Instrutor *</label>
            <select
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
              className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Data *</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Calendar size={14} />
              </span>
              <input
                type="date"
                value={lessonDate}
                onChange={(event) => setLessonDate(event.target.value)}
                className="h-11 w-full rounded-sm border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
            </div>
            {weekdayLabel && <p className="text-xs text-slate-400">Disponibilidade de {weekdayLabel.toLowerCase()}.</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Horarios disponiveis</h2>
          <p className="mt-1 text-sm text-slate-500">Selecione um ou mais slots livres para o novo agendamento.</p>
        </div>

        {loadingSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {availableSlots.map((slot) => (
              <div key={slot} className="animate-pulse rounded border-2 border-slate-200 bg-slate-100 px-2 py-3" />
            ))}
          </div>
        ) : lessonDate && availableSlots.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            O instrutor nao possui horarios disponiveis nesse dia.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {availableSlots.map((slot) => {
              const disabled = takenSlots.includes(slot)
              const selected = selectedSlots.includes(slot)

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSlot(slot)}
                  className={`rounded border-2 px-2 py-3 text-sm font-bold ${
                    disabled
                      ? 'border-slate-200 bg-slate-50 text-slate-300'
                      : selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} />
                    {slot}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedInstructor && (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="inline-flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            <span>Instrutor selecionado: {selectedInstructor.full_name}</span>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !instructorId || !lessonDate || selectedSlots.length === 0}>
          {loading ? 'Salvando...' : 'Salvar reagendamento'}
        </Button>
      </div>
    </form>
  )
}
