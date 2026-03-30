import Link from 'next/link'
import { Suspense } from 'react'
import {
  getDashboardCalendarData,
  getDashboardKPIs,
  getInstructorRanking,
  getMercadoPagoConnection,
  getRevenueMetrics,
  getUpcomingBookings,
} from '@/actions/dashboard'
import { BookingsCalendar } from '@/components/dashboard/BookingsCalendar'
import { BookingsChart } from '@/components/dashboard/BookingsChart'
import { InstructorRankTable } from '@/components/dashboard/InstructorRankTable'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { AlertTriangle, CalendarDays, Clock, DollarSign, Receipt, Users } from 'lucide-react'

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

export default async function OverviewPage() {
  const [kpis, revenue, ranking, latestCompleted, calendar, paymentConnection] = await Promise.all([
    getDashboardKPIs(),
    getRevenueMetrics(6),
    getInstructorRanking(),
    getUpcomingBookings(6),
    getDashboardCalendarData(),
    getMercadoPagoConnection(),
  ])

  const paymentPending = paymentConnection?.status !== 'connected'

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Visao Geral
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {paymentPending && (
        <Link
          href="/dashboard/settings/payment-methods"
          className="mb-8 flex items-center gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.15)] transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-200 text-amber-700">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              Voce tem pendencias
            </p>
            <p className="mt-1 font-condensed text-xl font-bold uppercase tracking-wide">
              Clique aqui para configurar metodo de pagamento
            </p>
          </div>
        </Link>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Faturamento bruto no mes"
          value={formatPrice(kpis.grossRevenueThisMonth)}
          current={kpis.grossRevenueThisMonth}
          previous={kpis.grossRevenueLastMonth}
          icon={<DollarSign size={18} />}
        />
        <KpiCard
          label="Taxas Mercado Pago"
          value={formatPrice(kpis.mercadoPagoFeesThisMonth)}
          current={kpis.mercadoPagoFeesThisMonth}
          previous={kpis.mercadoPagoFeesLastMonth}
          icon={<Receipt size={18} />}
        />
        <KpiCard
          label="Faturamento liquido no mes"
          value={formatPrice(kpis.netRevenueThisMonth)}
          current={kpis.netRevenueThisMonth}
          previous={kpis.netRevenueLastMonth}
          icon={<DollarSign size={18} />}
        />
        <KpiCard
          label="Aulas pagas no mes"
          value={String(kpis.bookingsThisMonth)}
          current={kpis.bookingsThisMonth}
          previous={kpis.bookingsLastMonth}
          icon={<CalendarDays size={18} />}
        />
        <KpiCard
          label="Instrutores ativos"
          value={String(kpis.activeInstructors)}
          icon={<Users size={18} />}
        />
        <KpiCard
          label="Aulas pagas concluidas"
          value={String(kpis.upcomingLessons)}
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Aulas pagas agendadas"
          value={String(kpis.paidScheduledLessons)}
          icon={<Clock size={18} />}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Faturamento Mensal Bruto x Liquido
          </h2>
          <Suspense fallback={<div className="h-52 rounded bg-slate-100 animate-pulse" />}>
            <RevenueChart data={revenue} />
          </Suspense>
        </div>
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Agendamentos
          </h2>
          <Suspense fallback={<div className="h-44 rounded bg-slate-100 animate-pulse" />}>
            <BookingsChart data={revenue} />
          </Suspense>
        </div>
      </div>

      <div className="mb-6 rounded border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Calendario de Aulas Pagas
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Visualize as aulas pagas da escola, sejam agendadas ou concluidas, filtrando por instrutor.
          </p>
        </div>
        <BookingsCalendar bookings={calendar.bookings} instructors={calendar.instructors} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Últimas Aulas Concluídas
          </h2>
          {latestCompleted.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma aula paga e concluívejda encontrada.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {latestCompleted.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded border border-slate-100 bg-slate-50 p-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: booking.instructor?.color ?? 'var(--primary)' }}
                  >
                    {booking.instructor?.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {booking.student?.full_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString('pt-BR')} ·{' '}
                      {booking.time_slots.join(', ')}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[booking.status] ?? 'neutral'} className="shrink-0 text-[10px]">
                    {STATUS_LABEL[booking.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Ranking de Instrutores
          </h2>
          <InstructorRankTable data={ranking} />
        </div>
      </div>
    </div>
  )
}
