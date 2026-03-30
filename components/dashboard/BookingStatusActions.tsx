'use client'

import { useState } from 'react'
import { updateBookingStatus } from '@/actions/bookings'
import { useToast } from '@/components/ui/toaster'
import type { Booking, BookingStatus, Instructor } from '@/lib/types'
import { Check, CalendarClock, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RescheduleBookingForm } from '@/components/dashboard/RescheduleBookingForm'

interface Props {
  bookingId: string
  status: BookingStatus
  booking?: Booking
  instructors?: Instructor[]
}

export function BookingStatusActions({ bookingId, status, booking, instructors = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const { success, error: showError } = useToast()

  async function change(next: BookingStatus) {
    setLoading(true)
    const result = await updateBookingStatus(bookingId, next)
    if (!result.success) {
      showError('Nao foi possivel atualizar o agendamento.', result.error)
      setLoading(false)
      return
    }
    success(
      next === 'completed'
        ? 'Aula marcada como concluida.'
        : next === 'confirmed'
          ? 'Aula confirmada com sucesso.'
          : 'Aula cancelada com sucesso.',
    )
    setLoading(false)
  }

  if (status === 'cancelled') return null

  return (
    <>
      <div className="flex items-center gap-1">
        {status !== 'completed' && booking && instructors.length > 0 && (
          <button
            onClick={() => setRescheduleOpen(true)}
            disabled={loading}
            title="Reagendar"
            className="p-1.5 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors disabled:opacity-50"
          >
            <CalendarClock size={13} />
          </button>
        )}
        {status !== 'completed' && (
        <button
          onClick={() => change('completed')}
          disabled={loading}
          title="Marcar como concluída"
          className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <Check size={13} />
        </button>
        )}
        {status !== 'confirmed' && status !== 'completed' && (
        <button
          onClick={() => change('confirmed')}
          disabled={loading}
          title="Confirmar"
          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
        </button>
        )}
        <button
          onClick={() => change('cancelled')}
          disabled={loading}
          title="Cancelar"
          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <X size={13} />
        </button>
      </div>

      {rescheduleOpen && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Reagendar aula
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Altere data, horario ou instrutor sem sair da listagem.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRescheduleOpen(false)} aria-label="Fechar modal de reagendamento">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6">
              <RescheduleBookingForm
                booking={booking}
                instructors={instructors}
                onCancel={() => setRescheduleOpen(false)}
                onSuccess={() => setRescheduleOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
