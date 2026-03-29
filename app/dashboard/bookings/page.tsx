import Link from 'next/link'
import { getBookings } from '@/actions/bookings'
import { formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookingStatusActions } from '@/components/dashboard/BookingStatusActions'
import { Plus } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}
const STATUS_VARIANT: Record<string, 'neutral' | 'default' | 'success' | 'danger'> = {
  pending:   'neutral',
  confirmed: 'default',
  completed: 'success',
  cancelled: 'danger',
}

export default async function BookingsPage() {
  const bookings = await getBookings()

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
            Agendamentos
          </h1>
          <p className="text-slate-400 text-sm mt-1">{bookings.length} agendamento{bookings.length !== 1 ? 's' : ''} encontrado{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/bookings/new">
            <Plus size={15} /> Agendar aula manualmente
          </Link>
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-400">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Aluno</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Instrutor</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Horários</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{b.student?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{b.instructor?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {b.time_slots.map(s => (
                          <span key={s} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--primary)]">{formatPrice(b.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusActions bookingId={b.id} status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
