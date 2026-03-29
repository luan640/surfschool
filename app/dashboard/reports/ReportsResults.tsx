import { Activity, Clock3, DollarSign, ReceiptText, TicketPercent, Users } from 'lucide-react'
import { getReportsData } from '@/actions/reports'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ReportsRevenueTrendChart, ReportsVolumeChart } from '@/components/dashboard/ReportsTrendChart'
import { formatPrice } from '@/lib/utils'

interface ReportsResultsProps {
  from?: string
  to?: string
  instructorId?: string
  couponId?: string
}

export async function ReportsResults({
  from,
  to,
  instructorId,
  couponId,
}: ReportsResultsProps) {
  const report = await getReportsData({
    from,
    to,
    instructorId,
    couponId,
  })

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Faturamento" value={formatPrice(report.kpis.totalRevenue)} icon={<DollarSign size={18} />} />
        <KpiCard label="Ticket medio" value={formatPrice(report.kpis.averageTicket)} icon={<ReceiptText size={18} />} />
        <KpiCard label="Aulas no periodo" value={String(report.kpis.totalBookings)} icon={<Activity size={18} />} />
        <KpiCard label="Alunos unicos" value={String(report.kpis.uniqueStudents)} icon={<Users size={18} />} />
        <KpiCard label="Cupons usados" value={String(report.kpis.couponRedemptions)} icon={<TicketPercent size={18} />} />
        <KpiCard label="Descontos" value={formatPrice(report.kpis.totalDiscounts)} icon={<TicketPercent size={18} />} />
        <KpiCard label="Finalizadas" value={String(report.kpis.completedBookings)} icon={<Clock3 size={18} />} />
        <KpiCard label="Pendentes" value={String(report.kpis.pendingBookings)} icon={<Clock3 size={18} />} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Faturamento por dia</h2>
          <ReportsRevenueTrendChart data={report.trend} />
        </div>
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Volume e descontos</h2>
          <ReportsVolumeChart data={report.trend} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Desempenho por instrutor</h2>
          {report.instructorSummary.length === 0 ? (
            <p className="py-10 text-sm text-slate-400">Nenhum dado encontrado para os filtros atuais.</p>
          ) : (
            <div className="space-y-3">
              {report.instructorSummary.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                    <div>
                      <div className="font-semibold text-slate-800">{item.full_name}</div>
                      <div className="text-xs text-slate-400">{item.bookings} aula{item.bookings !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="font-condensed text-2xl font-bold text-slate-900">{formatPrice(item.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Uso de cupons</h2>
          {report.couponSummary.length === 0 ? (
            <p className="py-10 text-sm text-slate-400">Nenhum cupom utilizado no periodo filtrado.</p>
          ) : (
            <div className="space-y-3">
              {report.couponSummary.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-800">{item.code}</div>
                    <div className="text-xs text-slate-400">{item.name} - {item.redemptions} uso{item.redemptions !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-condensed text-2xl font-bold text-slate-900">{formatPrice(item.discount_amount)}</div>
                    <div className="text-xs text-slate-400">desconto aplicado</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
