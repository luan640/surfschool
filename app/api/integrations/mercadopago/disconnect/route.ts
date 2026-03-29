import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectMercadoPagoConnection, getPublicAppBaseUrl } from '@/lib/payments/mercadopago'

export async function POST(request: Request) {
  const origin = getPublicAppBaseUrl()
  const settingsUrl = '/dashboard/settings/payment-methods'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.redirect(new URL('/auth/login', origin))
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!school) {
    return NextResponse.redirect(new URL(`${settingsUrl}?mp=error`, origin))
  }

  await disconnectMercadoPagoConnection({
    schoolId: school.id,
    status: 'disconnected',
    lastError: null,
  })

  return NextResponse.redirect(new URL(`${settingsUrl}?mp=disconnected`, origin))
}
