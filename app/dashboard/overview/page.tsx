import { Suspense } from 'react'
import { getDashboardKPIs, getRevenueMetrics, getInstructorRanking, getUpcomingBookings, getDashboardCalendarData } from '@/actions/dashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { BookingsChart } from '@/components/dashboard/BookingsChart'
import { InstructorRankTable } from '@/components/dashboard/InstructorRankTable'
import { BookingsCalendar } from '@/components/dashboard/BookingsCalendar'
import { formatPrice, formatDate, WEEKDAYS_LONG_PT } from '@/lib/utils'
import { DollarSign, CalendarDays, Users, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

export default async function OverviewPage() {
  const [kpis, revenue, ranking, upcoming, calendar] = await Promise.all([
    getDashboardKPIs(),
    getRevenueMetrics(6),
    getInstructorRanking(),
    getUpcomingBookings(6),
    getDashboardCalendarData(),
  ])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Visão Geral
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Faturamento este mês"
          value={formatPrice(kpis.revenueThisMonth)}
          current={kpis.revenueThisMonth}
          previous={kpis.revenueLastMonth}
          icon={<DollarSign size={18} />}
        />
        <KpiCard
          label="Aulas este mês"
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
          label="Próximas aulas"
          value={String(kpis.upcomingLessons)}
          icon={<Clock size={18} />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-5">
          <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-4">
            Faturamento Mensal
          </h2>
          <Suspense fallback={<div className="h-52 animate-pulse bg-slate-100 rounded" />}>
            <RevenueChart data={revenue} />
          </Suspense>
        </div>
        <div className="bg-white border border-slate-200 rounded p-5">
          <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-4">
            Agendamentos
          </h2>
          <Suspense fallback={<div className="h-44 animate-pulse bg-slate-100 rounded" />}>
            <BookingsChart data={revenue} />
          </Suspense>
        </div>
      </div>

      <div className="mb-6 rounded border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide">
            Calendario de Aulas
          </h2>
          <p className="mt-1 text-sm text-slate-400">Visualize as aulas agendadas e finalizadas, filtrando por instrutor ou exibindo toda a escola.</p>
        </div>
        <BookingsCalendar bookings={calendar.bookings} instructors={calendar.instructors} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming lessons */}
        <div className="bg-white border border-slate-200 rounded p-5">
          <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-4">
            Próximas Aulas
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhuma aula agendada.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded bg-slate-50 border border-slate-100">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-condensed text-xs font-bold shrink-0"
                    style={{ background: b.instructor?.color ?? 'var(--primary)' }}
                  >
                    {b.instructor?.full_name?.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{b.student?.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('pt-BR')} · {(b.time_slots as string[]).join(', ')}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[b.status] ?? 'neutral'} className="shrink-0 text-[10px]">
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructor ranking */}
        <div className="bg-white border border-slate-200 rounded p-5">
          <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-4">
            Ranking de Instrutores
          </h2>
          <InstructorRankTable data={ranking} />
        </div>
      </div>
    </div>
  )
}
