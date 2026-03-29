'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatMonthYear } from '@/lib/utils'
import type { BookingMetric } from '@/lib/types'

export function BookingsChart({ data }: { data: BookingMetric[] }) {
  const formatted = data.map(d => ({
    ...d,
    month: formatMonthYear(d.month),
    total_bookings: Number(d.total_bookings),
    completed:      Number(d.completed),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="total_bookings" name="Total" fill="var(--primary)" opacity={0.3} radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed"      name="Concluídas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
