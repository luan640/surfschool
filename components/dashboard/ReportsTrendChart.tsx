'use client'

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar, Legend } from 'recharts'
import type { ReportTrendPoint } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

interface Props {
  data: ReportTrendPoint[]
}

export function ReportsRevenueTrendChart({ data }: Props) {
  const chartData = data.map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="reportsRevenueGrossGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="reportsRevenueNetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => value >= 1000 ? `R$${Math.round(value / 1000)}k` : `R$${value}`}
        />
        <Tooltip
          formatter={(value: number, name: string, item) => {
            if (item?.dataKey === 'fee_amount') {
              return [formatPrice(Number(value)), 'Taxas']
            }

            return [formatPrice(Number(value)), name === 'gross_revenue' ? 'Bruto' : 'Liquido']
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString('pt-BR') : ''}
        />
        <Area type="monotone" dataKey="gross_revenue" stroke="#f59e0b" fill="url(#reportsRevenueGrossGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="net_revenue" stroke="var(--primary)" fill="url(#reportsRevenueNetGradient)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ReportsVolumeChart({ data }: Props) {
  const chartData = data.map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="bookings" name="Aulas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="discount_amount" name="Descontos" fill="var(--cta)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
