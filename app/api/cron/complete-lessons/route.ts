import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const brFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const [today, , currentTime] = brFormatter.format(now).split(' ')


  const { data: schools } = await admin
    .from('school_rules')
    .select('school_id')
    .eq('auto_complete_lessons', true)

  if (!schools || schools.length === 0) {
    return NextResponse.json({ completed: 0 })
  }

  const schoolIds = schools.map((s) => s.school_id)

  const [{ data: pastBookings }, { data: todayBookings }] = await Promise.all([
    admin
      .from('bookings')
      .select('id')
      .in('school_id', schoolIds)
      .in('status', ['pending', 'confirmed'])
      .lt('lesson_date', today),
    admin
      .from('bookings')
      .select('id, time_slots')
      .in('school_id', schoolIds)
      .in('status', ['pending', 'confirmed'])
      .eq('lesson_date', today),
  ])

  const todayDone = (todayBookings ?? []).filter((booking) => {
    const slots = booking.time_slots as string[]
    if (!slots || slots.length === 0) return false
    const lastSlot = [...slots].sort().at(-1)!
    return lastSlot < currentTime
  })

  const ids = [
    ...(pastBookings ?? []).map((b) => b.id),
    ...todayDone.map((b) => b.id),
  ]

  if (ids.length === 0) {
    return NextResponse.json({ completed: 0 })
  }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'completed', payment_status: 'paid' })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ completed: ids.length })
}
