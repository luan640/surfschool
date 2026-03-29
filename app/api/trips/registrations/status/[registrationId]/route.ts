import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ registrationId: string }>
}

export async function GET(_: Request, { params }: RouteContext) {
  const { registrationId } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('trip_registrations')
    .select('id, status, payment_status, mercadopago_status, mercadopago_status_detail')
    .eq('id', registrationId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Inscricao nao encontrada.' }, { status: 404 })
  }

  return NextResponse.json(data, { status: 200 })
}
