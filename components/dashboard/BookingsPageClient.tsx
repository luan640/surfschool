'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, Search, Users, Waves, X } from 'lucide-react'
import { BookingStatusActions } from '@/components/dashboard/BookingStatusActions'
import { ManualBookingForm } from '@/components/dashboard/ManualBookingForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaginationControls } from '@/components/ui/pagination-controls'
import type { Booking, BookingStatus, Instructor, StudentProfile } from '@/lib/types'
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
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
}

interface Props {
  bookings: Booking[]
  students: Pick<StudentProfile, 'id' | 'full_name' | 'phone'>[]
  instructors: Instructor[]
  bookingRules: {
    minimumBookingNoticeHours: number
    bookingWindowDays: number
  }
}

export function BookingsPageClient({ bookings, students, instructors, bookingRules }: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const canCreateBooking = students.length > 0 && instructors.length > 0
  const [currentPage, setCurrentPage] = useState(1)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [originFilter, setOriginFilter] = useState<'online' | 'presencial' | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<'paid' | 'pending' | ''>('')
  const [lessonDateFilter, setLessonDateFilter] = useState('')
  const pageSize = 10

  function resetFilters() {
    setQuery('')
    setStatusFilter('')
    setOriginFilter('')
    setPaymentFilter('')
    setLessonDateFilter('')
    setCurrentPage(1)
  }

  const hasActiveFilters = query || statusFilter || originFilter || paymentFilter || lessonDateFilter

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (normalizedQuery) {
        const haystack = `${booking.student?.full_name ?? ''} ${booking.instructor?.full_name ?? ''}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }
      if (statusFilter && booking.status !== statusFilter) return false
      if (originFilter === 'online' && !booking.payment_transaction_id) return false
      if (originFilter === 'presencial' && booking.payment_transaction_id) return false
      if (paymentFilter && booking.payment_status !== paymentFilter) return false
      if (lessonDateFilter && booking.lesson_date !== lessonDateFilter) return false
      return true
    })
  }, [bookings, query, statusFilter, originFilter, paymentFilter, lessonDateFilter])

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBookings.slice(start, start + pageSize)
  }, [filteredBookings, currentPage])

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
              Agendamentos
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {filteredBookings.length !== bookings.length
                ? `${filteredBookings.length} de ${bookings.length} agendamento${bookings.length !== 1 ? 's' : ''}`
                : `${bookings.length} agendamento${bookings.length !== 1 ? 's' : ''} encontrado${bookings.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/bookings/today">
                Hoje
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus size={15} /> Agendar aula manualmente
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Buscar por aluno ou instrutor..."
              icon={<Search size={14} />}
              className="h-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={lessonDateFilter}
              onChange={(e) => { setLessonDateFilter(e.target.value); setCurrentPage(1) }}
              title="Filtrar por data da aula"
              className="h-10 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as BookingStatus | ''); setCurrentPage(1) }}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Concluida</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <select
              value={originFilter}
              onChange={(e) => { setOriginFilter(e.target.value as 'online' | 'presencial' | ''); setCurrentPage(1) }}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300"
            >
              <option value="">Toda origem</option>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value as 'paid' | 'pending' | ''); setCurrentPage(1) }}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300"
            >
              <option value="">Todo pagamento</option>
              <option value="pending">Pagamento pendente</option>
              <option value="paid">Pago</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:border-slate-300"
              >
                <X size={13} /> Limpar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-slate-400">Nenhum agendamento encontrado.</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Nenhum agendamento encontrado com os filtros aplicados.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Data da aula</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Aluno</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Instrutor</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Horarios</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Origem</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Pagamento</th>
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Criado em</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{booking.student?.full_name ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{booking.instructor?.full_name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {booking.time_slots.map((slot) => (
                              <span key={slot} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium">{slot}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{getBookingOriginLabel(booking)}</td>
                        <td className="px-4 py-3 text-slate-700">{getBookingPaymentLabel(booking)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--primary)]">{formatPrice(booking.total_amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(booking.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <BookingStatusActions
                            bookingId={booking.id}
                            status={booking.status}
                            booking={booking}
                            instructors={instructors}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {paginatedBookings.map((booking) => (
                  <article key={booking.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {booking.student?.full_name ?? '-'}
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Instrutor</div>
                        <div>{booking.instructor?.full_name ?? '-'}</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Horarios</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {booking.time_slots.map((slot) => (
                            <span
                              key={slot}
                              className="rounded bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Origem</div>
                        <div>{getBookingOriginLabel(booking)}</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pagamento</div>
                        <div>{getBookingPaymentLabel(booking)}</div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</div>
                        <div className="font-condensed text-2xl font-bold text-[var(--primary)]">
                          {formatPrice(booking.total_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
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
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredBookings.length}
                onPageChange={setCurrentPage}
                itemLabel="agendamentos"
              />
            </>
          )}
        </div>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Novo agendamento manual
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Selecione aluno, instrutor e horarios livres sem sair da listagem.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(false)} aria-label="Fechar modal de agendamento manual">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6">
              {canCreateBooking ? (
                <ManualBookingForm
                  students={students}
                  instructors={instructors}
                  bookingRules={bookingRules}
                  onCancel={() => setCreateModalOpen(false)}
                  onSuccess={() => setCreateModalOpen(false)}
                />
              ) : (
                <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
                  <h3 className="font-condensed text-2xl font-bold uppercase tracking-wide text-slate-800">
                    Falta configurar a base
                  </h3>
                  <p className="text-sm text-slate-500">
                    Para criar um agendamento manual voce precisa ter pelo menos um aluno e um instrutor ativo.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {students.length === 0 && (
                      <Button asChild variant="primary">
                        <Link href="/dashboard/students/new">
                          <Users size={15} /> Cadastrar aluno
                        </Link>
                      </Button>
                    )}
                    {instructors.length === 0 && (
                      <Button asChild variant="primary">
                        <Link href="/dashboard/instructors/new">
                          <Waves size={15} /> Cadastrar instrutor
                        </Link>
                      </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getBookingOriginLabel(booking: Booking) {
  return booking.payment_transaction_id ? 'Online' : 'Presencial'
}

function getBookingPaymentLabel(booking: Booking) {
  return booking.payment_method ? PAYMENT_METHOD_LABEL[booking.payment_method] ?? 'Não informado' : 'Não informado'
}
