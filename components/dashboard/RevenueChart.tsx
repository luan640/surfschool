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
  const entries = payload as Array<{ value: number; dataKey?: string }>
  const gross = Number(entries.find((entry) => entry.dataKey === 'gross_revenue')?.value ?? 0)
  const net = Number(entries.find((entry) => entry.dataKey === 'net_revenue')?.value ?? 0)
  const fee = Number(entries.find((entry) => entry.dataKey === 'fee_amount')?.value ?? 0)
  return (
    <div className="bg-white border border-slate-200 rounded shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      <p className="font-bold text-slate-800">Bruto: R$ {gross.toFixed(2).replace('.', ',')}</p>
      <p className="font-semibold text-emerald-700">Liquido: R$ {net.toFixed(2).replace('.', ',')}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Taxas: R$ {fee.toFixed(2).replace('.', ',')}</p>
    </div>
  )
}

export function RevenueChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    month: formatMonthYear(d.month),
    gross_revenue: Number(d.gross_revenue),
    fee_amount: Number(d.fee_amount),
    net_revenue: Number(d.net_revenue),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="revNetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.24} />
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
          dataKey="gross_revenue"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#revGrossGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="net_revenue"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#revNetGrad)"
          dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
