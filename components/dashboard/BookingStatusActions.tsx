'use client'

import { useState } from 'react'
import { confirmBookingPayment, updateBookingStatus } from '@/actions/bookings'
import { useToast } from '@/components/ui/toaster'
import type { Booking, BookingStatus, Instructor } from '@/lib/types'
import { Check, CalendarClock, CircleDollarSign, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RescheduleBookingForm } from '@/components/dashboard/RescheduleBookingForm'

interface Props {
  bookingId: string
  status: BookingStatus
  booking?: Booking
  instructors?: Instructor[]
}

function formatBookingDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')
}

export function BookingStatusActions({ bookingId, status, booking, instructors = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
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

  async function handleConfirmPayment() {
    setLoading(true)
    const result = await confirmBookingPayment(bookingId)
    if (!result.success) {
      showError('Nao foi possivel confirmar o pagamento.', result.error)
      setLoading(false)
      return
    }
    success('Pagamento confirmado com sucesso.')
    setLoading(false)
  }

  if (status === 'cancelled') return null

  const canConfirmPayment = Boolean(
    booking
    && !booking.payment_transaction_id
    && booking.payment_status === 'pending',
  )
  const canConfirmBooking = Boolean(
    booking
    && booking.payment_status === 'paid'
    && status !== 'confirmed'
    && status !== 'completed',
  )

  return (
    <>
      <div className="flex items-center gap-1">
        {canConfirmPayment && (
          <Button
            type="button"
            size="sm"
            variant="success"
            onClick={() => setPaymentOpen(true)}
            disabled={loading}
            className="h-8 gap-1.5 px-3 text-[11px]"
          >
            <CircleDollarSign size={13} />
            Confirmar pagamento
          </Button>
        )}
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
          onClick={() => setCompleteOpen(true)}
          disabled={loading}
          title="Marcar como concluída"
          className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <Check size={13} />
        </button>
        )}
        {canConfirmBooking && (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          title="Confirmar"
          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
        </button>
        )}
        <button
          onClick={() => setCancelOpen(true)}
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

      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Confirmar pagamento
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta acao vai marcar o agendamento presencial como pago.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPaymentOpen(false)} aria-label="Fechar modal de pagamento">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {booking ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Aluno:</span>{' '}
                    {booking.student?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Instrutor:</span>{' '}
                    {booking.instructor?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Deseja confirmar o pagamento deste agendamento agora?
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setPaymentOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  variant="success"
                  onClick={async () => {
                    await handleConfirmPayment()
                    setPaymentOpen(false)
                  }}
                  disabled={loading}
                >
                  {loading ? 'Confirmando...' : 'Confirmar pagamento'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Confirmar aula
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta acao vai marcar o agendamento como confirmado.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(false)} aria-label="Fechar modal de confirmacao">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {booking ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Aluno:</span>{' '}
                    {booking.student?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Instrutor:</span>{' '}
                    {booking.instructor?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Deseja confirmar este agendamento agora?
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    await change('confirmed')
                    setConfirmOpen(false)
                  }}
                  disabled={loading}
                >
                  {loading ? 'Confirmando...' : 'Confirmar aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Concluir aula
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta ação vai marcar o agendamento como concluido.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCompleteOpen(false)} aria-label="Fechar modal de conclusao">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {booking ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Aluno:</span>{' '}
                    {booking.student?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Instrutor:</span>{' '}
                    {booking.instructor?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Deseja concluir este agendamento agora?
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setCompleteOpen(false)} disabled={loading}>
                  Voltar
                </Button>
                <Button
                  variant="success"
                  onClick={async () => {
                    await change('completed')
                    setCompleteOpen(false)
                  }}
                  disabled={loading}
                >
                  {loading ? 'Concluindo...' : 'Concluir aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Cancelar aula
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Esta acao vai cancelar o agendamento.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCancelOpen(false)} aria-label="Fechar modal de cancelamento">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {booking ? (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Aluno:</span>{' '}
                    {booking.student?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Instrutor:</span>{' '}
                    {booking.instructor?.full_name ?? 'Nao informado'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Deseja cancelar este agendamento agora?
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={loading}>
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await change('cancelled')
                    setCancelOpen(false)
                  }}
                  disabled={loading}
                >
                  {loading ? 'Cancelando...' : 'Cancelar aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
