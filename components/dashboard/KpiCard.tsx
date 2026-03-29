import { cn, formatPrice, percentChange } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label:      string
  value:      string
  previous?:  number
  current?:   number
  icon:       React.ReactNode
  format?:    'currency' | 'number'
  className?: string
}

export function KpiCard({ label, value, previous, current, icon, className }: KpiCardProps) {
  const change = (previous !== undefined && current !== undefined)
    ? percentChange(current, previous)
    : null

  return (
    <div className={cn('bg-white border border-slate-200 rounded p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <div className="w-9 h-9 rounded-sm bg-slate-50 flex items-center justify-center text-slate-400">
          {icon}
        </div>
      </div>

      <div>
        <div className="font-condensed text-3xl font-bold text-slate-800">{value}</div>
        {change !== null && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs font-semibold',
            change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-slate-400',
          )}>
            {change > 0 ? <TrendingUp size={13} /> : change < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
            {change > 0 ? '+' : ''}{change}% vs. mês passado
          </div>
        )}
      </div>
    </div>
  )
}
