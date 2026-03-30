'use client'

import Link from 'next/link'
import { CalendarDays, Clock, CreditCard, MapPin, User, Waves } from 'lucide-react'
import { BookingStatusActions } from '@/components/dashboard/BookingStatusActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Booking, Instructor } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
}

const STATUS_VARIANT: Record<string, 'neutral' | 'default' | 'success' | 'danger'> = {
  pending: 'neutral',
  confirmed: 'default',
  completed: 'success',
  cancelled: 'danger',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartao de credito',
  debit_card: 'Cartao de debito',
}

interface Props {
  bookings: Booking[]
  instructors: Instructor[]
}

export function TodayBookingsPageClient({ bookings, instructors }: Props) {
  return (
    <div className="dashboard-page">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
            Agendamentos do dia
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tela otimizada para acompanhar a operacao de hoje no celular.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/bookings">
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Hoje" value={new Date().toLocaleDateString('pt-BR')} icon={<CalendarDays size={16} />} />
        <SummaryCard label="Aulas" value={String(bookings.length)} icon={<Waves size={16} />} />
      </div>

      {bookings.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-white px-5 py-16 text-center">
          <div className="mb-3 text-4xl">📅</div>
          <div className="font-condensed text-2xl font-bold uppercase text-slate-800">Nada para hoje</div>
          <p className="mt-2 text-sm text-slate-400">Nao ha agendamentos pagos para o dia atual.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Aluno</div>
                  <div className="mt-1 font-condensed text-xl font-bold uppercase text-slate-900">
                    {booking.student?.full_name ?? '-'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {booking.student?.phone ?? 'Sem telefone informado'}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoCard label="Instrutor" value={booking.instructor?.full_name ?? '-'} icon={<User size={14} />} />
                <InfoCard label="Horarios" value={booking.time_slots.join(', ')} icon={<Clock size={14} />} />
                <InfoCard label="Origem" value={getBookingOriginLabel(booking)} icon={<MapPin size={14} />} />
                <InfoCard label="Pagamento" value={getBookingPaymentLabel(booking)} icon={<CreditCard size={14} />} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Total</div>
                  <div className="font-condensed text-2xl font-bold text-[var(--primary)]">
                    {formatPrice(booking.total_amount)}
                  </div>
                </div>
                <BookingStatusActions
                  bookingId={booking.id}
                  status={booking.status}
                  booking={booking}
                  instructors={instructors}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="mt-3 font-condensed text-2xl font-bold text-slate-800">{value}</div>
    </div>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function getBookingOriginLabel(booking: Booking) {
  return booking.payment_transaction_id ? 'Online' : 'Presencial'
}

function getBookingPaymentLabel(booking: Booking) {
  return booking.payment_method ? PAYMENT_METHOD_LABEL[booking.payment_method] ?? 'Nao informado' : 'Nao informado'
}
