'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, Check, CircleDollarSign, MoreHorizontal, RotateCcw, X } from 'lucide-react'
import { confirmBookingPayment, updateBookingStatus } from '@/actions/bookings'
import { RescheduleBookingForm } from '@/components/dashboard/RescheduleBookingForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import type { Booking, BookingStatus, Instructor } from '@/lib/types'

interface Props {
  bookingId: string
  status: BookingStatus
  booking?: Booking
  instructors?: Instructor[]
}

function formatBookingDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

export function BookingStatusActions({ bookingId, status, booking, instructors = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [agreedAmount, setAgreedAmount] = useState(() =>
    booking ? Number(booking.total_amount).toFixed(2).replace('.', ',') : '',
  )
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const { success, error: showError } = useToast()

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation()
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setMenuOpen((v) => !v)
  }

  async function change(next: BookingStatus) {
    setLoading(true)
    const result = await updateBookingStatus(bookingId, next)
    if (!result.success) {
      showError('Não foi possível atualizar o agendamento.', result.error)
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
    const normalizedAmount = parseCurrencyInput(agreedAmount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      showError('Não foi possível confirmar o pagamento.', 'Informe o valor acordado para o pagamento presencial.')
      return false
    }
    setLoading(true)
    const result = await confirmBookingPayment(bookingId, normalizedAmount, paymentMethod)
    if (!result.success) {
      showError('Não foi possível confirmar o pagamento.', result.error)
      setLoading(false)
      return false
    }
    success('Pagamento confirmado com sucesso.')
    setLoading(false)
    return true
  }

  if (status === 'cancelled') return null

  const canConfirmPayment = Boolean(
    booking && !booking.payment_transaction_id && booking.payment_status === 'pending',
  )
  const canConfirmBooking = Boolean(
    booking && booking.payment_status === 'paid' && status !== 'confirmed' && status !== 'completed',
  )
  const paymentConfirmed = Boolean(booking && booking.payment_status === 'paid')

  const menuItems: { label: string; icon: React.ElementType; color: string; disabled?: boolean; onClick: () => void }[] = [
    ...(canConfirmPayment ? [{
      label: 'Confirmar pagamento',
      icon: CircleDollarSign,
      color: 'text-emerald-600',
      onClick: () => { setMenuOpen(false); setPaymentOpen(true) },
    }] : []),
    ...(status !== 'completed' && booking && instructors.length > 0 ? [{
      label: 'Reagendar',
      icon: CalendarClock,
      color: 'text-violet-600',
      onClick: () => { setMenuOpen(false); setRescheduleOpen(true) },
    }] : []),
    ...(status !== 'completed' ? [{
      label: 'Concluir aula',
      icon: Check,
      color: 'text-emerald-600',
      disabled: !paymentConfirmed,
      onClick: () => { if (paymentConfirmed) { setMenuOpen(false); setCompleteOpen(true) } },
    }] : []),
    ...(canConfirmBooking ? [{
      label: 'Confirmar',
      icon: RotateCcw,
      color: 'text-blue-600',
      onClick: () => { setMenuOpen(false); setConfirmOpen(true) },
    }] : []),
    {
      label: 'Cancelar aula',
      icon: X,
      color: 'text-rose-600',
      onClick: () => { setMenuOpen(false); setCancelOpen(true) },
    },
  ]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        disabled={loading}
        title="Ações"
        aria-label="Abrir menu de ações"
        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Dropdown menu */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 200 }}
          className="min-w-[190px] overflow-hidden rounded border border-slate-200 bg-white py-1 shadow-lg"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors
                ${item.disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : `text-slate-700 hover:bg-slate-50 ${item.color}`
                }`}
            >
              <item.icon size={13} className={item.disabled ? 'text-slate-300' : item.color} />
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* ── Modals ── */}

      {rescheduleOpen && booking && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Reagendar aula</h2>
                <p className="mt-1 text-sm text-slate-400">Altere data, horario ou instrutor sem sair da listagem.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRescheduleOpen(false)} aria-label="Fechar">
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
        </div>,
        document.body,
      )}

      {paymentOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Confirmar pagamento</h2>
                <p className="mt-1 text-sm text-slate-500">Esta ação vai marcar o agendamento presencial como pago.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPaymentOpen(false)} aria-label="Fechar">
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {booking && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Aluno:</span> {booking.student?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Instrutor:</span> {booking.instructor?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}</p>
                  <p><span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}</p>
                </div>
              )}
              {booking && !booking.payment_transaction_id && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor acordado</label>
                    <Input value={agreedAmount} onChange={(e) => setAgreedAmount(e.target.value)} inputMode="decimal" placeholder="0,00" />
                    <p className="text-xs text-slate-500">O valor presencial pode ser ajustado aqui antes de confirmar o pagamento.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Método de pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'cash', label: 'Dinheiro' },
                        { value: 'pix', label: 'Pix' },
                        { value: 'debit_card', label: 'Cartão de débito' },
                        { value: 'credit_card', label: 'Cartão de crédito' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`rounded border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            paymentMethod === opt.value
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setPaymentOpen(false)} disabled={loading}>Cancelar</Button>
                <Button variant="success" onClick={async () => { const ok = await handleConfirmPayment(); if (ok) setPaymentOpen(false) }} disabled={loading}>
                  {loading ? 'Confirmando...' : 'Confirmar pagamento'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Confirmar aula</h2>
                <p className="mt-1 text-sm text-slate-500">Esta acao vai marcar o agendamento como confirmado.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(false)} aria-label="Fechar">
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {booking && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Aluno:</span> {booking.student?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Instrutor:</span> {booking.instructor?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}</p>
                  <p><span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>Cancelar</Button>
                <Button onClick={async () => { await change('confirmed'); setConfirmOpen(false) }} disabled={loading}>
                  {loading ? 'Confirmando...' : 'Confirmar aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {completeOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Concluir aula</h2>
                <p className="mt-1 text-sm text-slate-500">Esta ação vai marcar o agendamento como concluido.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCompleteOpen(false)} aria-label="Fechar">
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {booking && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Aluno:</span> {booking.student?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Instrutor:</span> {booking.instructor?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}</p>
                  <p><span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setCompleteOpen(false)} disabled={loading}>Voltar</Button>
                <Button variant="success" onClick={async () => { await change('completed'); setCompleteOpen(false) }} disabled={loading}>
                  {loading ? 'Concluindo...' : 'Concluir aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {cancelOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Cancelar aula</h2>
                <p className="mt-1 text-sm text-slate-500">Esta acao vai cancelar o agendamento.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCancelOpen(false)} aria-label="Fechar">
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {booking && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Aluno:</span> {booking.student?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Instrutor:</span> {booking.instructor?.full_name ?? 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-800">Data:</span> {formatBookingDate(booking.lesson_date)}</p>
                  <p><span className="font-semibold text-slate-800">Horario:</span> {booking.time_slots.join(', ')}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={loading}>Voltar</Button>
                <Button variant="danger" onClick={async () => { await change('cancelled'); setCancelOpen(false) }} disabled={loading}>
                  {loading ? 'Cancelando...' : 'Cancelar aula'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
