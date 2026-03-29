import { initials, formatPrice } from '@/lib/utils'
import type { InstructorRankRow } from '@/lib/types'
import { Trophy } from 'lucide-react'

export function InstructorRankTable({ data }: { data: InstructorRankRow[] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-400 text-center py-8">Nenhum instrutor cadastrado.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left pb-3 text-xs font-bold uppercase tracking-wide text-slate-400">#</th>
            <th className="text-left pb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Instrutor</th>
            <th className="text-right pb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Aulas</th>
            <th className="text-right pb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Faturamento</th>
            <th className="text-right pb-3 text-xs font-bold uppercase tracking-wide text-slate-400 hidden md:table-cell">Média h</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-3">
                {i === 0
                  ? <Trophy size={14} className="text-amber-400" />
                  : <span className="text-slate-300 font-bold">{i + 1}</span>
                }
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-condensed text-xs font-bold flex-shrink-0"
                    style={{ background: (row as { color?: string }).color ?? 'var(--primary)' }}
                  >
                    {initials(row.full_name)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">{row.full_name}</div>
                    <div className="text-slate-400 text-[11px]">{formatPrice(row.hourly_price)}/h</div>
                  </div>
                </div>
              </td>
              <td className="py-3 text-right font-semibold text-slate-700">{row.total_bookings}</td>
              <td className="py-3 text-right font-bold text-[var(--primary)]">{formatPrice(Number(row.total_revenue))}</td>
              <td className="py-3 text-right text-slate-400 hidden md:table-cell">
                {Number(row.avg_hours).toFixed(1)}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
