'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatMonthYear } from '@/lib/utils'
import type { BookingMetric } from '@/lib/types'

interface Props {
  data: BookingMetric[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <p className="font-bold text-slate-800">
        R$ {Number(payload[0].value).toFixed(2).replace('.', ',')}
      </p>
    </div>
  )
}

export function RevenueChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    month: formatMonthYear(d.month),
    total_revenue: Number(d.total_revenue),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={v => 'R$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total_revenue"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#revGrad)"
          dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
