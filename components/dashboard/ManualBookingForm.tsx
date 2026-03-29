'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User } from 'lucide-react'
import { createManualBooking, getTakenSlots } from '@/actions/bookings'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import type { Instructor, StudentProfile } from '@/lib/types'
import { WEEKDAYS_PT } from '@/lib/utils'

interface Props {
  students: Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]
  instructors: Instructor[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function ManualBookingForm({ students, instructors, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? '')
  const [lessonDate, setLessonDate] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [takenSlots, setTakenSlots] = useState<string[]>([])
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
      return
    }

    getTakenSlots(selectedInstructor.id, lessonDate).then(setTakenSlots)
  }, [lessonDate, selectedInstructor])

  useEffect(() => {
    setSelectedSlots([])
  }, [instructorId, lessonDate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('student_id', studentId)
    formData.set('instructor_id', instructorId)
    formData.set('lesson_date', lessonDate)
    selectedSlots.forEach((slot) => formData.append('time_slots', slot))

    const result = await createManualBooking(formData)

    if (!result.success) {
      setError(result.error)
      showError('Nao foi possivel criar o agendamento.', result.error)
      setLoading(false)
      return
    }

    success('Agendamento criado com sucesso.')
    if (onSuccess) {
      onSuccess()
      router.refresh()
      return
    }

    router.push('/dashboard/bookings')
    router.refresh()
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
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Dados da aula</h2>
          <p className="mt-1 text-sm text-slate-500">Crie uma aula avulsa manualmente para um aluno ja cadastrado.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Aluno *</label>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}{student.phone ? ` • ${student.phone}` : ''}
                </option>
              ))}
            </select>
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
          <p className="mt-1 text-sm text-slate-500">Selecione um ou mais slots livres para a aula manual.</p>
        </div>

        {lessonDate && availableSlots.length === 0 ? (
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
            <span>Valor por hora do instrutor: R$ {Number(selectedInstructor.hourly_price).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading || !studentId || !instructorId || !lessonDate || selectedSlots.length === 0}>
          {loading ? 'Salvando...' : 'Criar agendamento'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onCancel) {
              onCancel()
              return
            }

            router.push('/dashboard/bookings')
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
